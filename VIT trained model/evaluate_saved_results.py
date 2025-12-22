import numpy as np
import matplotlib.pyplot as plt

def accuracy_score(y_true, y_pred):
    """Calculate accuracy score"""
    return np.mean(y_true == y_pred)

def confusion_matrix(y_true, y_pred, labels=None):
    """Compute confusion matrix"""
    if labels is None:
        labels = np.unique(np.concatenate([y_true, y_pred]))
    n_classes = len(labels)
    cm = np.zeros((n_classes, n_classes), dtype=int)
    label_to_idx = {label: idx for idx, label in enumerate(labels)}
    for true_label, pred_label in zip(y_true, y_pred):
        cm[label_to_idx[true_label], label_to_idx[pred_label]] += 1
    return cm

def classification_report(y_true, y_pred, target_names=None):
    """Generate classification report"""
    labels = np.unique(np.concatenate([y_true, y_pred]))
    if target_names is None:
        target_names = [f"Class {i}" for i in labels]
    
    n_classes = len(labels)
    precisions = []
    recalls = []
    f1_scores = []
    supports = []
    
    # Calculate metrics for each class
    report_lines = ["              precision    recall  f1-score   support\n"]
    
    for i, label in enumerate(labels):
        tp = np.sum((y_true == label) & (y_pred == label))
        fp = np.sum((y_true != label) & (y_pred == label))
        fn = np.sum((y_true == label) & (y_pred != label))
        support = np.sum(y_true == label)
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        precisions.append(precision)
        recalls.append(recall)
        f1_scores.append(f1)
        supports.append(support)
        
        report_lines.append(f"{target_names[i]:15s} {precision:8.2f} {recall:8.2f} {f1:8.2f} {support:8d}\n")
    
    # Calculate weighted averages
    total_support = len(y_true)
    weighted_precision = np.average(precisions, weights=supports) if total_support > 0 else 0.0
    weighted_recall = np.average(recalls, weights=supports) if total_support > 0 else 0.0
    weighted_f1 = np.average(f1_scores, weights=supports) if total_support > 0 else 0.0
    
    report_lines.append(f"\n{'    avg / total':15s} {weighted_precision:8.2f} {weighted_recall:8.2f} {weighted_f1:8.2f} {total_support:8d}\n")
    
    return "".join(report_lines)

# Load saved results
y_true = np.load("results/y_true.npy")
y_pred = np.load("results/y_pred.npy")

class_names = ["first_degree", "second_degree", "third_degree"]

# Accuracy
acc = accuracy_score(y_true, y_pred)
print(f"Accuracy: {acc*100:.2f}%")

# Classification report
print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=class_names))

# Confusion matrix
labels = np.unique(np.concatenate([y_true, y_pred]))
cm = confusion_matrix(y_true, y_pred, labels=labels)
plt.figure(figsize=(6, 5))
im = plt.imshow(cm, interpolation='nearest', cmap='Blues')
plt.colorbar(im)
tick_marks = np.arange(len(class_names))
plt.xticks(tick_marks, class_names)
plt.yticks(tick_marks, class_names)
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix")

# Add text annotations
thresh = cm.max() / 2.
for i in range(cm.shape[0]):
    for j in range(cm.shape[1]):
        plt.text(j, i, format(cm[i, j], 'd'),
                horizontalalignment="center",
                color="white" if cm[i, j] > thresh else "black")

plt.tight_layout()
plt.savefig("results/confusion_matrix.png")
plt.show()
