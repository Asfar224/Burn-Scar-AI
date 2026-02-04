import os
import shutil
import random

RAW_DATASET = "raw_dataset"
OUTPUT_DATASET = "processed_dataset1"

TRAIN_RATIO = 0.85  # 85% train, 15% validation

CLASS_MAP = {
    0: "first_degree",
    1: "second_degree",
    2: "third_degree"
}

# Create output directories
for split in ["train", "val"]:
    for cls in CLASS_MAP.values():
        os.makedirs(os.path.join(OUTPUT_DATASET, split, cls), exist_ok=True)

# Collect all image files
images = [f for f in os.listdir(RAW_DATASET) if f.lower().endswith((".jpg", ".jpeg"))]
random.shuffle(images)

split_index = int(len(images) * TRAIN_RATIO)
train_images = images[:split_index]
val_images = images[split_index:]

def get_image_label(txt_path):
    """
    Read YOLO txt file and return highest class id
    """
    max_class = 0
    with open(txt_path, "r") as f:
        for line in f.readlines():
            line = line.strip()
            if not line:  # Skip empty lines
                continue
            class_id = int(line.split()[0])
            max_class = max(max_class, class_id)
    return max_class

def process_images(image_list, split):
    for img_name in image_list:
        # Handle both .jpg and .jpeg extensions
        if img_name.lower().endswith(".jpeg"):
            txt_name = img_name.replace(".jpeg", ".txt").replace(".JPEG", ".txt")
        else:
            txt_name = img_name.replace(".jpg", ".txt").replace(".JPG", ".txt")

        img_path = os.path.join(RAW_DATASET, img_name)
        txt_path = os.path.join(RAW_DATASET, txt_name)

        if not os.path.exists(txt_path):
            print(f"⚠ Missing label for {img_name}, skipping")
            continue

        label_id = get_image_label(txt_path)
        
        if label_id not in CLASS_MAP:
            print(f"⚠ Invalid class ID {label_id} for {img_name}, skipping")
            continue
            
        label_name = CLASS_MAP[label_id]

        dest_path = os.path.join(
            OUTPUT_DATASET, split, label_name, img_name
        )

        shutil.copy(img_path, dest_path)

process_images(train_images, "train")
process_images(val_images, "val")

print("✅ Dataset preparation complete!")
