import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import matplotlib.pyplot as plt
import numpy as np
import cv2
import os
from pathlib import Path

# -----------------------------
# GRAD-CAM IMPLEMENTATION
# -----------------------------
class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.features = None

        # Hook to capture gradients
        target_layer.register_forward_hook(self.save_features)
        target_layer.register_backward_hook(self.save_gradients)

    def save_features(self, module, input, output):
        self.features = output

    def save_gradients(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def __call__(self, input_tensor, target_class=None):
        # Forward pass
        output = self.model(input_tensor)

        if target_class is None:
            target_class = output.argmax(dim=1).item()

        # Zero gradients
        self.model.zero_grad()

        # Backward pass for target class
        one_hot = torch.zeros_like(output)
        one_hot[0, target_class] = 1
        output.backward(gradient=one_hot, retain_graph=True)

        # Get gradients and features
        gradients = self.gradients.detach().cpu().numpy()[0]
        features = self.features.detach().cpu().numpy()[0]

        # Global average pooling of gradients
        weights = np.mean(gradients, axis=(1, 2))

        # Weighted sum of feature maps
        cam = np.zeros(features.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * features[i]

        # ReLU and normalize
        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))
        cam = cam - np.min(cam)
        cam = cam / np.max(cam)

        return cam, target_class

# -----------------------------
# MODEL LOADING FUNCTIONS
# -----------------------------
def load_efficientnet_model(model_path, num_classes=3, device='cuda'):
    """Load trained EfficientNet-B0 model"""
    model = models.efficientnet_b0(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(model.classifier[1].in_features, num_classes)
    )

    checkpoint = torch.load(model_path, map_location=device)
    if 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        model.load_state_dict(checkpoint)

    model.eval()
    return model

def load_resnet_model(model_path, num_classes=3, device='cuda'):
    """Load trained ResNet model"""
    model = models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)

    checkpoint = torch.load(model_path, map_location=device)
    if 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        model.load_state_dict(checkpoint)

    model.eval()
    return model

# -----------------------------
# VISUALIZATION FUNCTIONS
# -----------------------------
def preprocess_image(image_path):
    """Preprocess image for model input"""
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    image = Image.open(image_path).convert('RGB')
    original_image = np.array(image)
    input_tensor = transform(image).unsqueeze(0)
    return input_tensor, original_image

def generate_heatmap(cam, original_image):
    """Generate heatmap overlay on original image"""
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    heatmap = np.float32(heatmap) / 255

    # Resize heatmap to match original image
    original_size = (original_image.shape[1], original_image.shape[0])  # (width, height)
    heatmap = cv2.resize(heatmap, original_size)

    # Overlay heatmap on original image
    superimposed_img = heatmap * 0.4 + np.float32(original_image) / 255
    superimposed_img = np.clip(superimposed_img, 0, 1)

    return superimposed_img, heatmap

def visualize_gradcam(image_path, model, gradcam, class_names, save_path=None):
    """Complete Grad-CAM visualization pipeline"""
    # Preprocess image
    input_tensor, original_image = preprocess_image(image_path)

    # Move to device
    device = next(model.parameters()).device
    input_tensor = input_tensor.to(device)

    # Generate Grad-CAM
    cam, predicted_class = gradcam(input_tensor)

    # Generate heatmap overlay
    superimposed_img, heatmap = generate_heatmap(cam, original_image)

    # Create visualization
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    # Original image
    axes[0].imshow(original_image)
    axes[0].set_title('Original Image')
    axes[0].axis('off')

    # Heatmap
    axes[1].imshow(heatmap)
    axes[1].set_title('Grad-CAM Heatmap')
    axes[1].axis('off')

    # Overlay
    axes[2].imshow(superimposed_img)
    axes[2].set_title(f'Overlay\nPredicted: {class_names[predicted_class]}')
    axes[2].axis('off')

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Visualization saved to: {save_path}")

    plt.show()

    return predicted_class

# -----------------------------
# BATCH VISUALIZATION
# -----------------------------
def visualize_multiple_images(image_dir, model, gradcam, class_names, num_images=5, save_dir=None):
    """Visualize Grad-CAM for multiple images"""
    if save_dir:
        os.makedirs(save_dir, exist_ok=True)

    # Get all images
    image_paths = []
    for root, dirs, files in os.walk(image_dir):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                image_paths.append(os.path.join(root, file))

    # Randomly select images
    selected_images = np.random.choice(image_paths, min(num_images, len(image_paths)), replace=False)

    predictions = []
    for i, image_path in enumerate(selected_images):
        print(f"\nProcessing image {i+1}/{len(selected_images)}: {os.path.basename(image_path)}")

        save_path = None
        if save_dir:
            save_path = os.path.join(save_dir, f"gradcam_{i+1}_{os.path.basename(image_path)}")

        pred_class = visualize_gradcam(image_path, model, gradcam, class_names, save_path)
        predictions.append(pred_class)

    # Summary
    print("
📊 SUMMARY:")
    print(f"Total images processed: {len(selected_images)}")
    unique_preds, counts = np.unique(predictions, return_counts=True)
    for pred, count in zip(unique_preds, counts):
        print(f"  {class_names[pred]}: {count} images")

# -----------------------------
# MAIN DEMONSTRATION
# -----------------------------
def main():
    # Configuration
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {DEVICE}")

    # Choose model type and path
    model_type = "efficientnet"  # or "resnet"
    model_path = "efficientnet_b0_burn_model_best.pth"  # Update path as needed
    class_names = ["first_degree", "second_degree", "third_degree"]

    # Load model
    if model_type == "efficientnet":
        model = load_efficientnet_model(model_path, device=DEVICE)
        # For EfficientNet, use the last feature layer
        target_layer = model.features[7]  # Last convolution block
    else:
        model = load_resnet_model(model_path, device=DEVICE)
        # For ResNet, use layer4
        target_layer = model.layer4

    model = model.to(DEVICE)

    # Initialize Grad-CAM
    gradcam = GradCAM(model, target_layer)

    # Example 1: Single image visualization
    print("\n" + "="*50)
    print("GRAD-CAM VISUALIZATION DEMO")
    print("="*50)

    # Test on a sample image
    test_image_path = "processed_dataset/val/second_degree/img0.jpg"  # Update path
    if os.path.exists(test_image_path):
        print(f"\n🔍 Analyzing: {test_image_path}")
        visualize_gradcam(test_image_path, model, gradcam, class_names,
                         save_path="gradcam_single_example.png")
    else:
        print(f"⚠ Test image not found: {test_image_path}")

    # Example 2: Batch visualization
    print("
🔍 Batch visualization on validation set...")
    visualize_multiple_images(
        "processed_dataset/val",
        model,
        gradcam,
        class_names,
        num_images=3,
        save_dir="gradcam_batch_results"
    )

    print("\n✅ Grad-CAM visualization completed!")
    print("📁 Results saved in current directory")

if __name__ == "__main__":
    main()