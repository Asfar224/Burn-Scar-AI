import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from tqdm import tqdm
import os
import random
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from PIL import Image
import numpy as np
from torch.cuda.amp import autocast, GradScaler  # Use old API for compatibility

# -----------------------------
# CONFIGURATION
# -----------------------------
DATA_DIR = "processed_dataset"
BATCH_SIZE = 16  # Smaller batch size for sequences
EPOCHS = 50  # More epochs for better learning
LEARNING_RATE = 2e-4  # Slightly higher learning rate
SEQUENCE_LENGTH = 3  # Sequence length
FEATURE_DIM = 1280  # EfficientNet-B0 feature dimension
HIDDEN_DIM = 512
NUM_LAYERS = 2
NUM_CLASSES = 3
MODEL_SAVE_PATH = "cnn_lstm_burn_model"
EARLY_STOPPING_PATIENCE = 12  # Stop if no improvement for 12 epochs
USE_MIXED_PRECISION = True  # Use mixed precision for faster training
GRADIENT_CLIP = 1.0  # Gradient clipping value

# GPU Configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {DEVICE}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")

# -----------------------------
# DATA PREPROCESSING
# -----------------------------
train_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.3),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# -----------------------------
# SEQUENCE DATASET
# -----------------------------
class BurnSequenceDataset(Dataset):
    def __init__(self, data_dir, split="train", sequence_length=3, transform=None, num_sequences_per_epoch=2000):
        self.data_dir = data_dir
        self.split = split
        self.sequence_length = sequence_length
        self.transform = transform
        self.num_sequences_per_epoch = num_sequences_per_epoch

        # Load all images by class
        self.class_images = {}
        self.class_names = []

        for class_name in sorted(os.listdir(os.path.join(data_dir, split))):
            class_dir = os.path.join(data_dir, split, class_name)
            if os.path.isdir(class_dir):
                images = [os.path.join(class_dir, img) for img in os.listdir(class_dir)
                         if img.lower().endswith(('.jpg', '.jpeg', '.png'))]
                if len(images) > 0:  # Only add classes with images
                    self.class_images[class_name] = images
                    self.class_names.append(class_name)

        print(f"Loaded {len(self.class_names)} classes for {split}:")
        for class_name, images in self.class_images.items():
            print(f"  {class_name}: {len(images)} images")

        # Class mapping for labels
        self.class_to_idx = {class_name: idx for idx, class_name in enumerate(self.class_names)}
        self.idx_to_class = {idx: class_name for class_name, idx in self.class_to_idx.items()}

    def __len__(self):
        return self.num_sequences_per_epoch

    def __getitem__(self, idx):
        # FIXED: Create sequences where we predict the actual class
        # Strategy: Randomly select a target class, then create a sequence
        # with images from that class (with variations/augmentations)
        target_class_idx = random.randint(0, len(self.class_names) - 1)
        target_class_name = self.idx_to_class[target_class_idx]
        
        # Get images from the target class
        target_images = self.class_images[target_class_name]
        
        # Create sequence: use multiple images from the same class
        # This helps the model learn to recognize the class from sequences
        sequence_images = []
        
        # If we have enough images, use different images; otherwise repeat with augmentation
        if len(target_images) >= self.sequence_length:
            selected_images = random.sample(target_images, self.sequence_length)
        else:
            # Repeat images if not enough, augmentation will make them different
            selected_images = random.choices(target_images, k=self.sequence_length)
        
        for img_path in selected_images:
            image = Image.open(img_path).convert('RGB')
            if self.transform:
                image = self.transform(image)
            sequence_images.append(image)

        # Stack images into sequence tensor: [sequence_length, channels, height, width]
        sequence_tensor = torch.stack(sequence_images)
        
        # Return the actual target class label (FIXED: was hardcoded to 1)
        return sequence_tensor, target_class_idx

# -----------------------------
# CNN-LSTM MODEL
# -----------------------------
class CNNLSTMModel(nn.Module):
    def __init__(self, feature_dim=1280, hidden_dim=512, num_layers=2, num_classes=3, dropout=0.3):
        super(CNNLSTMModel, self).__init__()

        # CNN Feature Extractor (EfficientNet-B0 without classifier)
        self.cnn = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        self.cnn.classifier = nn.Identity()  # Remove classifier to get features

        # Progressive unfreezing strategy
        # Freeze CNN layers initially
        for param in self.cnn.parameters():
            param.requires_grad = False

        # Unfreeze the last few blocks for better adaptation
        for param in self.cnn.features[5:].parameters():  # Unfreeze last 3 blocks
            param.requires_grad = True

        # LSTM for sequence processing
        self.lstm = nn.LSTM(
            input_size=feature_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=True
        )

        # Attention mechanism
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1)
        )

        # Classifier
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, x):
        batch_size, seq_len, c, h, w = x.size()

        # Extract features for each image in sequence
        features = []
        for i in range(seq_len):
            seq_features = self.cnn(x[:, i])  # [batch_size, feature_dim]
            features.append(seq_features)

        # Stack features: [batch_size, seq_len, feature_dim]
        features = torch.stack(features, dim=1)

        # LSTM processing
        lstm_out, (h_n, c_n) = self.lstm(features)

        # Attention mechanism
        attention_weights = self.attention(lstm_out)  # [batch_size, seq_len, 1]
        attention_weights = torch.softmax(attention_weights, dim=1)

        # Apply attention
        attended_features = torch.sum(lstm_out * attention_weights, dim=1)  # [batch_size, hidden_dim*2]

        # Classification
        output = self.classifier(attended_features)
        return output

if __name__ == "__main__":
    # -----------------------------
    # DATA LOADERS
    # -----------------------------
    print("Creating datasets...")
    train_dataset = BurnSequenceDataset(DATA_DIR, "train", SEQUENCE_LENGTH, train_transform, num_sequences_per_epoch=3000)
    val_dataset = BurnSequenceDataset(DATA_DIR, "val", SEQUENCE_LENGTH, val_transform, num_sequences_per_epoch=800)

    # Use num_workers=0 on Windows to avoid multiprocessing issues
    import platform
    num_workers = 0 if platform.system() == 'Windows' else (4 if torch.cuda.is_available() else 0)

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        drop_last=True
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available()
    )

    # -----------------------------
    # MODEL SETUP
    # -----------------------------
    print("Setting up CNN-LSTM model...")
    model = CNNLSTMModel(
        feature_dim=FEATURE_DIM,
        hidden_dim=HIDDEN_DIM,
        num_layers=NUM_LAYERS,
        num_classes=NUM_CLASSES
    )

    model = model.to(DEVICE)

    # Count parameters
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Trainable parameters: {trainable_params:,}")
    print(f"Total parameters: {total_params:,}")

    # -----------------------------
    # LOSS & OPTIMIZER
    # -----------------------------
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    # Different learning rates for different parts
    optimizer = optim.AdamW([
        {'params': model.cnn.parameters(), 'lr': LEARNING_RATE / 5},  # Lower LR for CNN backbone
        {'params': model.lstm.parameters(), 'lr': LEARNING_RATE},     # Normal LR for LSTM
        {'params': model.attention.parameters(), 'lr': LEARNING_RATE},
        {'params': model.classifier.parameters(), 'lr': LEARNING_RATE}
    ], weight_decay=1e-3, eps=1e-8)

    # Scheduler
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, 
        T_0=10,  # Initial restart period
        T_mult=2,  # Period multiplier
        eta_min=1e-6  # Minimum learning rate
    )

    # Mixed precision scaler - use old API for compatibility
    scaler = GradScaler() if USE_MIXED_PRECISION and torch.cuda.is_available() else None

    # -----------------------------
    # TRAINING FUNCTIONS
    # -----------------------------
    def train_epoch(model, loader, optimizer, criterion, device, scaler=None, gradient_clip=None):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for sequences, labels in tqdm(loader, desc="Training"):
            sequences, labels = sequences.to(device), labels.to(device)

            optimizer.zero_grad()
            
            # Mixed precision training
            if scaler is not None:
                with autocast():
                    outputs = model(sequences)
                    loss = criterion(outputs, labels)
                
                scaler.scale(loss).backward()
                if gradient_clip is not None:
                    scaler.unscale_(optimizer)
                    torch.nn.utils.clip_grad_norm_(model.parameters(), gradient_clip)
                scaler.step(optimizer)
                scaler.update()
            else:
                outputs = model(sequences)
                loss = criterion(outputs, labels)
                loss.backward()
                if gradient_clip is not None:
                    torch.nn.utils.clip_grad_norm_(model.parameters(), gradient_clip)
                optimizer.step()

            running_loss += loss.item() * sequences.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

        epoch_loss = running_loss / len(loader.dataset)
        epoch_acc = 100. * correct / total
        return epoch_loss, epoch_acc

    def validate_epoch(model, loader, criterion, device):
        model.eval()
        running_loss = 0.0
        correct = 0
        total = 0
        all_preds = []
        all_labels = []

        with torch.no_grad():
            for sequences, labels in tqdm(loader, desc="Validating"):
                sequences, labels = sequences.to(device), labels.to(device)

                outputs = model(sequences)
                loss = criterion(outputs, labels)

                running_loss += loss.item() * sequences.size(0)
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()

                all_preds.extend(predicted.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        epoch_loss = running_loss / len(loader.dataset)
        epoch_acc = 100. * correct / total
        return epoch_loss, epoch_acc, all_preds, all_labels

    # -----------------------------
    # TRAINING LOOP
    # -----------------------------
    print("Starting CNN-LSTM training...")
    best_acc = 0.0
    train_losses = []
    val_losses = []
    train_accs = []
    val_accs = []
    patience_counter = 0

    for epoch in range(EPOCHS):
        print(f"\n{'='*60}")
        print(f"Epoch {epoch+1}/{EPOCHS}")
        print(f"{'='*60}")

        # Progressive unfreezing: unfreeze more CNN layers after epoch 15
        if epoch == 15:
            print("🔓 Unfreezing more CNN layers for fine-tuning...")
            for param in model.cnn.features[3:].parameters():  # Unfreeze last 5 blocks
                param.requires_grad = True
            # Update optimizer to include newly unfrozen parameters
            optimizer = optim.AdamW([
                {'params': model.cnn.parameters(), 'lr': LEARNING_RATE / 5},
                {'params': model.lstm.parameters(), 'lr': LEARNING_RATE},
                {'params': model.attention.parameters(), 'lr': LEARNING_RATE},
                {'params': model.classifier.parameters(), 'lr': LEARNING_RATE}
            ], weight_decay=1e-3, eps=1e-8)
            scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
                optimizer, T_0=10, T_mult=2, eta_min=1e-6
            )
            if scaler is not None:
                scaler = GradScaler()

        # Train
        train_loss, train_acc = train_epoch(
            model, train_loader, optimizer, criterion, DEVICE,
            scaler=scaler, gradient_clip=GRADIENT_CLIP
        )
        train_losses.append(train_loss)
        train_accs.append(train_acc)

        # Validate
        val_loss, val_acc, _, _ = validate_epoch(model, val_loader, criterion, DEVICE)
        val_losses.append(val_loss)
        val_accs.append(val_acc)

        # Learning rate scheduling
        scheduler.step()

        current_lr = optimizer.param_groups[0]['lr']
        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        print(f"Learning Rate: {current_lr:.6f}")

        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            patience_counter = 0
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'best_acc': best_acc,
                'class_names': train_dataset.class_names
            }, f"{MODEL_SAVE_PATH}_best.pth")
            print(f"✓ Saved best model with validation accuracy: {best_acc:.2f}%")
        else:
            patience_counter += 1
            print(f"⚠ No improvement. Patience: {patience_counter}/{EARLY_STOPPING_PATIENCE}")

        # Early stopping
        if patience_counter >= EARLY_STOPPING_PATIENCE:
            print(f"\n⚠ Early stopping triggered after {epoch+1} epochs")
            print(f"Best validation accuracy: {best_acc:.2f}%")
            break

    # -----------------------------
    # FINAL EVALUATION
    # -----------------------------
    print("\n" + "="*50)
    print("FINAL EVALUATION - CNN-LSTM")
    print("="*50)

    # Load best model
    checkpoint = torch.load(f"{MODEL_SAVE_PATH}_best.pth", map_location=DEVICE)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()

    # Get predictions
    _, _, all_preds, all_labels = validate_epoch(model, val_loader, criterion, DEVICE)

    # Calculate metrics
    accuracy = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='weighted')

    print("\n📊 FINAL METRICS:")
    print(f"Accuracy: {accuracy*100:.2f}%")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1-Score: {f1:.4f}")

    # Classification report
    print("\n📋 CLASSIFICATION REPORT:")
    print(classification_report(all_labels, all_preds, target_names=train_dataset.class_names))

    # Confusion matrix
    cm = confusion_matrix(all_labels, all_preds)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt="d", xticklabels=train_dataset.class_names, yticklabels=train_dataset.class_names, cmap="Blues")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("Confusion Matrix - CNN-LSTM")
    plt.tight_layout()
    plt.savefig(f"{MODEL_SAVE_PATH}_confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.show()

    # Training curves
    plt.figure(figsize=(12, 4))

    plt.subplot(1, 2, 1)
    plt.plot(train_losses, label='Train Loss')
    plt.plot(val_losses, label='Val Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('Training and Validation Loss')
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(train_accs, label='Train Accuracy')
    plt.plot(val_accs, label='Val Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy (%)')
    plt.title('Training and Validation Accuracy')
    plt.legend()

    plt.tight_layout()
    plt.savefig(f"{MODEL_SAVE_PATH}_training_curves.png", dpi=300, bbox_inches='tight')
    plt.show()

    # Save final model
    torch.save(model.state_dict(), f"{MODEL_SAVE_PATH}_final.pth")
    print(f"\n✅ CNN-LSTM Training completed!")
    print(f"📁 Models saved as: {MODEL_SAVE_PATH}_best.pth and {MODEL_SAVE_PATH}_final.pth")
    print(f"📊 Best validation accuracy: {best_acc:.2f}%")