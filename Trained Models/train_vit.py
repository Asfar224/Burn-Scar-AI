import torch
import torch.nn as nn
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from transformers import ViTForImageClassification
from tqdm import tqdm
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import os

# -----------------------------
# CONFIG
# -----------------------------
DATA_DIR = "processed_dataset"
BATCH_SIZE = 16
EPOCHS = 10
LR = 2e-5
IMG_SIZE = 224
# -----------------------------
# GPU DIAGNOSTICS
# -----------------------------
print("="*60)
print("GPU DIAGNOSTICS")
print("="*60)
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU count: {torch.cuda.device_count()}")
    for i in range(torch.cuda.device_count()):
        print(f"  GPU {i}: {torch.cuda.get_device_name(i)}")
        print(f"    Memory: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.2f} GB")
else:
    print("⚠️  WARNING: CUDA not available!")
    print("   This means PyTorch was installed WITHOUT GPU support (CPU-only version)")
    print("   To use GPU, you need to reinstall PyTorch with CUDA support")
    print("   Visit: https://pytorch.org/get-started/locally/")
print("="*60)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"\nUsing device: {DEVICE}")
if DEVICE == "cpu":
    print("⚠️  Training will be SLOW on CPU. Consider installing GPU version of PyTorch.\n")

# -----------------------------
# TRANSFORMS
# -----------------------------
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize([0.5]*3, [0.5]*3)
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.5]*3, [0.5]*3)
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

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE)

class_names = train_ds.classes
num_classes = len(class_names)

print("Classes:", class_names)

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

# Verify model is on correct device
next_param_device = next(model.parameters()).device
print(f"Model device: {next_param_device}")
if DEVICE == "cuda" and next_param_device.type != "cuda":
    print("⚠️  WARNING: Model is not on GPU despite CUDA being available!")
elif DEVICE == "cuda":
    print("✅ Model successfully loaded on GPU")

# -----------------------------
# OPTIMIZER & LOSS
# -----------------------------
optimizer = torch.optim.AdamW(model.parameters(), lr=LR)
criterion = nn.CrossEntropyLoss()

# -----------------------------
# TRAINING
# -----------------------------
for epoch in range(EPOCHS):
    model.train()
    total_loss = 0

    loop = tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}")
    for imgs, labels in loop:
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)

        outputs = model(pixel_values=imgs)
        loss = criterion(outputs.logits, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        loop.set_postfix(loss=loss.item())

    print(f"Epoch {epoch+1} - Avg Loss: {total_loss/len(train_loader):.4f}")

# -----------------------------
# VALIDATION
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

print("\nClassification Report:")
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
model.save_pretrained("vit_burn_model")
print("✅ Model saved as vit_burn_model")
