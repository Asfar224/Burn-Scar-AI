import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from tqdm import tqdm
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
import numpy as np

# -----------------------------
# CONFIGURATION - OPTIMIZED FOR HIGHER ACCURACY
# -----------------------------
DATA_DIR = "processed_dataset"
BATCH_SIZE = 32  # Increased for better GPU utilization
EPOCHS = 40  # More epochs for better convergence
LEARNING_RATE = 1e-4  # Lower learning rate for fine-tuning
IMAGE_SIZE = 256  # Higher resolution for better accuracy
NUM_CLASSES = 3
MODEL_SAVE_PATH = "efficientnet_b0_burn_model_optimized"

# Advanced training parameters
WARMUP_EPOCHS = 5  # Learning rate warmup
PATIENCE = 12  # Early stopping patience
MIN_DELTA = 0.001  # Minimum improvement for early stopping

# GPU Configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {DEVICE}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")

# -----------------------------
# FOCAL LOSS IMPLEMENTATION
# -----------------------------
class FocalLoss(nn.Module):
    def __init__(self, alpha=1, gamma=2, reduction='mean'):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(inputs, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss

        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        else:
            return focal_loss

# -----------------------------
# DATA PREPROCESSING & AUGMENTATION - ENHANCED
# -----------------------------
# EfficientNet-B0 specific preprocessing (same as ImageNet)
train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),  # Higher resolution: 256x256
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.3),
    transforms.RandomRotation(degrees=20),  # Increased rotation
    transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.25, hue=0.1),
    transforms.RandomAffine(degrees=0, translate=(0.15, 0.15), scale=(0.85, 1.15)),  # More aggressive
    transforms.RandomErasing(p=0.2),  # Add random erasing for robustness
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # ImageNet stats
])

val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# -----------------------------
# DATA LOADERS
# -----------------------------
print("Loading datasets...")
train_dataset = datasets.ImageFolder(
    os.path.join(DATA_DIR, "train"),
    transform=train_transform
)

val_dataset = datasets.ImageFolder(
    os.path.join(DATA_DIR, "val"),
    transform=val_transform
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=4 if torch.cuda.is_available() else 0,
    pin_memory=torch.cuda.is_available(),
    drop_last=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=4 if torch.cuda.is_available() else 0,
    pin_memory=torch.cuda.is_available()
)

class_names = train_dataset.classes
print(f"Classes: {class_names}")
print(f"Train samples: {len(train_dataset)}")
print(f"Validation samples: {len(val_dataset)}")

# -----------------------------
# MODEL SETUP
# -----------------------------
print("Setting up EfficientNet-B0 model...")
model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

# Freeze early layers for better fine-tuning
for param in model.parameters():
    param.requires_grad = False

# Unfreeze the last few layers
for param in model.features[6:].parameters():  # Unfreeze last 2 blocks
    param.requires_grad = True

# Replace classifier
model.classifier = nn.Sequential(
    nn.Dropout(p=0.3),
    nn.Linear(model.classifier[1].in_features, NUM_CLASSES)
)

model = model.to(DEVICE)

# Count trainable parameters
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
total_params = sum(p.numel() for p in model.parameters())
print(f"Trainable parameters: {trainable_params:,}")
print(f"Total parameters: {total_params:,}")

# -----------------------------
# LOSS & OPTIMIZER - ENHANCED
# -----------------------------
# Use Focal Loss for better handling of class imbalance
criterion = FocalLoss(alpha=1, gamma=2)

# Use different learning rates for different parts
optimizer = optim.AdamW([
    {'params': model.features.parameters(), 'lr': LEARNING_RATE / 10},  # Lower LR for backbone
    {'params': model.classifier.parameters(), 'lr': LEARNING_RATE}     # Higher LR for classifier
], weight_decay=1e-4)

# Enhanced learning rate scheduling with warmup
def warmup_lr_scheduler(optimizer, warmup_epochs, base_lr):
    def lr_lambda(epoch):
        if epoch < warmup_epochs:
            return (epoch + 1) / warmup_epochs
        return 1.0
    return optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)

# Combined scheduler: Warmup + CosineAnnealing + ReduceLROnPlateau
warmup_scheduler = warmup_lr_scheduler(optimizer, WARMUP_EPOCHS, LEARNING_RATE)
cosine_scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=8, T_mult=2)
plateau_scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=4, min_lr=1e-7)

# -----------------------------
# TRAINING FUNCTIONS
# -----------------------------
def train_epoch(model, loader, optimizer, criterion, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for inputs, labels in tqdm(loader, desc="Training"):
        inputs, labels = inputs.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * inputs.size(0)
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
        for inputs, labels in tqdm(loader, desc="Validating"):
            inputs, labels = inputs.to(device), labels.to(device)

            outputs = model(inputs)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * inputs.size(0)
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
print("Starting Enhanced EfficientNet-B0 training...")
best_acc = 0.0
train_losses = []
val_losses = []
train_accs = []
val_accs = []
patience_counter = 0

for epoch in range(EPOCHS):
    print(f"\nEpoch {epoch+1}/{EPOCHS}")

    # Train
    train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, DEVICE)
    train_losses.append(train_loss)
    train_accs.append(train_acc)

    # Validate
    val_loss, val_acc, _, _ = validate_epoch(model, val_loader, criterion, DEVICE)
    val_losses.append(val_loss)
    val_accs.append(val_acc)

    print(".4f")
    print(".4f")

    # Enhanced learning rate scheduling
    if epoch < WARMUP_EPOCHS:
        warmup_scheduler.step()
        current_lr = optimizer.param_groups[0]['lr']
        print(".6f")
    else:
        # Use ReduceLROnPlateau based on validation accuracy
        plateau_scheduler.step(val_acc)
        current_lr = optimizer.param_groups[0]['lr']
        print(".6f")

    # Early stopping check
    if val_acc > best_acc + MIN_DELTA:
        best_acc = val_acc
        patience_counter = 0
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'best_acc': best_acc,
            'class_names': class_names,
            'image_size': IMAGE_SIZE
        }, f"{MODEL_SAVE_PATH}_best.pth")
        print(f"✓ Saved best model with validation accuracy: {best_acc:.2f}%")
    else:
        patience_counter += 1
        print(f"⏳ Early stopping counter: {patience_counter}/{PATIENCE}")

    # Early stopping
    if patience_counter >= PATIENCE:
        print(f"🛑 Early stopping triggered after {epoch+1} epochs")
        break

# -----------------------------
# FINAL EVALUATION
# -----------------------------
print("\n" + "="*50)
print("FINAL EVALUATION")
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
print(".2f")
print(".4f")
print(".4f")
print(".4f")

# Classification report
print("\n📋 CLASSIFICATION REPORT:")
print(classification_report(all_labels, all_preds, target_names=class_names))

# Confusion matrix
cm = confusion_matrix(all_labels, all_preds)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt="d", xticklabels=class_names, yticklabels=class_names, cmap="Blues")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix - EfficientNet-B0")
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
print(f"\n✅ Training completed!")
print(f"📁 Models saved as: {MODEL_SAVE_PATH}_best.pth and {MODEL_SAVE_PATH}_final.pth")
print(f"📊 Best validation accuracy: {best_acc:.2f}%")