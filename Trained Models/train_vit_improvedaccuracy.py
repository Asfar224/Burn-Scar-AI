import torch
import torch.nn as nn
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from transformers import ViTForImageClassification
from tqdm import tqdm
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
import os
import numpy as np
import platform
import warnings

# -----------------------------
# CONFIG
# -----------------------------
DATA_DIR = "processed_dataset"
BATCH_SIZE = 16
EPOCHS = 18  # Training epochs
LR = 2e-5
BACKBONE_LR = 1e-5  # Lower LR for pretrained backbone
HEAD_LR = 5e-5  # Higher LR for new classifier head
IMG_SIZE = 224
EARLY_STOPPING_PATIENCE = 5  # Stop if no improvement for 5 epochs

# Suppress CUDA capability warnings (they're just warnings, not errors)
warnings.filterwarnings('ignore', category=UserWarning, module='torch.cuda')

# Check CUDA availability and compatibility
def get_device():
    if torch.cuda.is_available():
        try:
            # Test if CUDA actually works by creating a small tensor and doing an operation
            test_tensor = torch.zeros(1).cuda()
            result = test_tensor + 1
            del test_tensor, result
            torch.cuda.empty_cache()
            # Also check compute capability
            compute_cap = torch.cuda.get_device_capability(0)
            print(f"CUDA Compute Capability: {compute_cap[0]}.{compute_cap[1]}")
            if compute_cap[0] > 9:  # sm_100+ not supported by most PyTorch builds
                print("⚠️  GPU compute capability too new for this PyTorch version")
                print("⚠️  Falling back to CPU (update PyTorch for GPU support)")
                return "cpu"
            return "cuda"
        except RuntimeError as e:
            error_msg = str(e).lower()
            if "no kernel image" in error_msg or "cuda" in error_msg:
                print(f"⚠️  CUDA error detected: {e}")
                print("⚠️  Falling back to CPU (GPU not compatible with this PyTorch version)")
                print("💡 To use GPU, update PyTorch: pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
                return "cpu"
            raise
    return "cpu"

DEVICE = get_device()
print("Using device:", DEVICE)
if DEVICE == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")
else:
    print("⚠️  Training on CPU (will be slower but will work)")

# -----------------------------
# TRANSFORMS - Enhanced Augmentation
# -----------------------------
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE + 32, IMG_SIZE + 32)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
    transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # ImageNet stats
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# -----------------------------
# DATASETS
# -----------------------------
train_ds = datasets.ImageFolder(
    os.path.join(DATA_DIR, "train"),
    transform=train_transform
)

val_ds = datasets.ImageFolder(
    os.path.join(DATA_DIR, "val"),
    transform=val_transform
)

# Use num_workers=0 on Windows to avoid multiprocessing issues
NUM_WORKERS = 0 if platform.system() == 'Windows' else 2
PIN_MEMORY = False if NUM_WORKERS == 0 else True

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY)
val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY)

class_names = train_ds.classes
num_classes = len(class_names)

# Calculate class weights for imbalanced data
class_counts = [0] * num_classes
for _, label in train_ds:
    class_counts[label] += 1
total_samples = sum(class_counts)
class_weights = [total_samples / (num_classes * count) for count in class_counts]
class_weights_tensor = torch.FloatTensor(class_weights).to(DEVICE)

print("Classes:", class_names)
print("Class distribution:", {class_names[i]: class_counts[i] for i in range(num_classes)})
print("Class weights:", {class_names[i]: f"{class_weights[i]:.3f}" for i in range(num_classes)})

# -----------------------------
# MODEL
# -----------------------------
# We override the original 1000-class head with our 3-class head.
# ignore_mismatched_sizes=True tells Transformers to discard the old head
# (bias of size 1000) and initialize a new one with size num_classes.
model = ViTForImageClassification.from_pretrained(
    "google/vit-base-patch16-224",
    num_labels=num_classes,
    ignore_mismatched_sizes=True,
)

model.to(DEVICE)

# -----------------------------
# OPTIMIZER & LOSS - Different LRs for backbone vs head
# -----------------------------
# Separate parameters: backbone (pretrained) vs classifier head (new)
backbone_params = []
head_params = []
for name, param in model.named_parameters():
    if 'classifier' in name:
        head_params.append(param)
    else:
        backbone_params.append(param)

optimizer = torch.optim.AdamW([
    {'params': backbone_params, 'lr': BACKBONE_LR},
    {'params': head_params, 'lr': HEAD_LR}
], weight_decay=0.01)

# Learning rate scheduler
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='max', factor=0.5, patience=3, verbose=False
)

# Weighted loss to handle class imbalance
criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)

# -----------------------------
# MAIN TRAINING FUNCTION
# -----------------------------
def main():
    best_val_acc = 0.0
    patience_counter = 0
    best_model_state = None
    train_losses = []  # Store training loss per epoch

    # Create results directory
    os.makedirs("results", exist_ok=True)

    for epoch in range(EPOCHS):
        # Training phase
        model.train()
        total_loss = 0

        loop = tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS} [Train]")
        for imgs, labels in loop:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)

            outputs = model(pixel_values=imgs)
            loss = criterion(outputs.logits, labels)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)  # Gradient clipping
            optimizer.step()

            total_loss += loss.item()
            loop.set_postfix(loss=loss.item())

        train_loss = total_loss / len(train_loader)
        train_losses.append(train_loss)  # Store training loss
        
        # Validation phase
        model.eval()
        val_loss = 0
        y_true, y_pred = [], []
        
        with torch.no_grad():
            val_loop = tqdm(val_loader, desc=f"Epoch {epoch+1}/{EPOCHS} [Val]")
            for imgs, labels in val_loop:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(pixel_values=imgs)
                loss = criterion(outputs.logits, labels)
                preds = torch.argmax(outputs.logits, dim=1)
                
                val_loss += loss.item()
                y_true.extend(labels.cpu().numpy())
                y_pred.extend(preds.cpu().numpy())
        
        val_loss /= len(val_loader)
        val_acc = accuracy_score(y_true, y_pred)
        
        # Learning rate scheduling
        scheduler.step(val_acc)
        
        print(f"Epoch {epoch+1}/{EPOCHS} - Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f}")
        
        # Early stopping & save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            best_model_state = model.state_dict().copy()
            print(f"✅ New best validation accuracy: {best_val_acc:.4f}")
        else:
            patience_counter += 1
            if patience_counter >= EARLY_STOPPING_PATIENCE:
                print(f"⏹ Early stopping triggered. Best val acc: {best_val_acc:.4f}")
                break

    # Load best model
    if best_model_state is not None:
        model.load_state_dict(best_model_state)
        print(f"✅ Loaded best model with validation accuracy: {best_val_acc:.4f}")

    # -----------------------------
    # FINAL VALIDATION EVALUATION
    # -----------------------------
    model.eval()
    y_true, y_pred = [], []

    with torch.no_grad():
        for imgs, labels in val_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            outputs = model(pixel_values=imgs)
            preds = torch.argmax(outputs.logits, dim=1)

            y_true.extend(labels.cpu().numpy())
            y_pred.extend(preds.cpu().numpy())

    # Save evaluation outputs
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    np.save("results/y_true.npy", y_true)
    np.save("results/y_pred.npy", y_pred)
    print("✅ Saved y_true and y_pred to results/")

    # Save training losses
    np.save("results/train_loss.npy", np.array(train_losses))
    print("✅ Saved training losses to results/train_loss.npy")

    final_acc = accuracy_score(y_true, y_pred)
    print(f"\n{'='*60}")
    print(f"FINAL VALIDATION ACCURACY: {final_acc:.4f} ({final_acc*100:.2f}%)")
    print(f"{'='*60}\n")
    print("Classification Report:")
    print(classification_report(y_true, y_pred, target_names=class_names))

    # -----------------------------
    # CONFUSION MATRIX
    # -----------------------------
    cm = confusion_matrix(y_true, y_pred)
    sns.heatmap(cm, annot=True, fmt="d", xticklabels=class_names, yticklabels=class_names)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("Confusion Matrix")
    plt.show()

    # -----------------------------
    # SAVE MODEL
    # -----------------------------
    model.save_pretrained("trained_model")
    print("✅ Model saved as trained_model")

if __name__ == '__main__':
    main()
