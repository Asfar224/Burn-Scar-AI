from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import torch
from transformers import ViTImageProcessor, ViTForImageClassification
from PIL import Image
import io
import numpy as np
from typing import List, Optional
import os
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, storage

app = FastAPI(title="Burn Scar Analysis API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths (absolute path from backend folder) - MUST BE DEFINED FIRST
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
MODEL_PATH = os.path.join(PARENT_DIR, "Trained Models", "vit_burn_model")
CONFIG_PATH = os.path.join(MODEL_PATH, "config.json")
MODEL_FILE = os.path.join(MODEL_PATH, "model.safetensors")

# CNN and CNN-LSTM model files
cnn_model_file = os.path.join(PARENT_DIR, "Trained Models", "cnn_model", "efficientnet_b0_burn_model_final.pth")
cnn_lstm_model_file = os.path.join(PARENT_DIR, "Trained Models", "cnn_ltsm_model", "cnn_lstm_burn_model_final.pth")

# Initialize Firebase Admin SDK
firebase_initialized = False
firebase_app = None
storage_bucket_name = None

def get_storage_bucket_name(cred_path):
    """Try to determine the correct storage bucket name"""
    import json
    # Try common bucket name formats
    bucket_names = [
        'burn-scar-ai.appspot.com',  # Standard Firebase Storage bucket
        'burn-scar-ai.firebasestorage.app',  # Newer format
    ]
    
    # Try to read project_id from service account
    try:
        if os.path.exists(cred_path):
            with open(cred_path, 'r') as f:
                cred_data = json.load(f)
                project_id = cred_data.get('project_id', 'burn-scar-ai')
                bucket_names.insert(0, f'{project_id}.appspot.com')
    except:
        pass
    
    return bucket_names

def verify_firebase_storage(bucket_name=None):
    """Verify Firebase Storage is actually accessible"""
    try:
        if bucket_name:
            bucket = storage.bucket(bucket_name)
        else:
            bucket = storage.bucket()
        # Just accessing the bucket to verify it works
        _ = bucket.name
        return True, bucket.name
    except Exception as e:
        return False, str(e)

try:
    # Try to use service account key file if it exists
    cred_path = os.path.join(BASE_DIR, "firebase-service-account.json")
    if os.path.exists(cred_path):
        print(f"[INFO] Found service account file: {cred_path}")
        cred = credentials.Certificate(cred_path)
        
        # Read project_id from service account to determine bucket name
        import json
        project_id = 'burn-scar-ai'
        try:
            with open(cred_path, 'r') as f:
                cred_data = json.load(f)
                project_id = cred_data.get('project_id', 'burn-scar-ai')
        except Exception as json_error:
            print(f"[WARN] Could not read project_id from service account: {json_error}")
        
        # Try both bucket name formats (newer .firebasestorage.app and older .appspot.com)
        # Frontend config shows: storageBucket: "burn-scar-ai.firebasestorage.app"
        bucket_names_to_try = [
            f'{project_id}.firebasestorage.app',  # Newer format (matches frontend)
            f'{project_id}.appspot.com',  # Older format (fallback)
        ]
        
        initialized = False
        for bucket_name in bucket_names_to_try:
            try:
                print(f"[INFO] Trying bucket: {bucket_name}")
                # Delete any existing app before trying new one
                try:
                    firebase_admin.delete_app(firebase_app)
                except:
                    pass
                
                firebase_app = firebase_admin.initialize_app(cred, {
                    'storageBucket': bucket_name
                }, name='default')
                
                # Verify it actually works by trying to access the bucket
                works, result = verify_firebase_storage(bucket_name)
                if works:
                    firebase_initialized = True
                    storage_bucket_name = bucket_name
                    print(f"[OK] Firebase Admin SDK initialized with bucket: {result}")
                    initialized = True
                    break
                else:
                    print(f"[WARN] Bucket {bucket_name} verification failed: {result}")
                    try:
                        firebase_admin.delete_app(firebase_app)
                    except:
                        pass
            except Exception as init_error:
                print(f"[WARN] Failed to initialize with bucket {bucket_name}: {init_error}")
                try:
                    firebase_admin.delete_app(firebase_app)
                except:
                    pass
                continue
        
        if not initialized:
            firebase_initialized = False
            print(f"[ERROR] Could not initialize Firebase with any bucket format")
            print(f"[INFO] Make sure Firebase Storage is enabled in Firebase Console")
            print(f"[INFO] Go to: https://console.firebase.google.com/project/{project_id}/storage")
            print(f"[INFO] Click 'Get Started' to enable Storage (creates default bucket)")
    else:
        print(f"[WARN] Service account file not found: {cred_path}")
        # Use default credentials (for local development with gcloud auth)
        try:
            print("[INFO] Trying default credentials...")
            # Try both bucket formats
            bucket_names_to_try = [
                'burn-scar-ai.firebasestorage.app',  # Newer format (matches frontend)
                'burn-scar-ai.appspot.com',  # Older format
            ]
            
            initialized = False
            for bucket_name in bucket_names_to_try:
                try:
                    print(f"[INFO] Trying bucket: {bucket_name}")
                    firebase_app = firebase_admin.initialize_app(options={
                        'storageBucket': bucket_name
                    }, name='default')
                    # Verify it actually works
                    works, result = verify_firebase_storage(bucket_name)
                    if works:
                        firebase_initialized = True
                        storage_bucket_name = bucket_name
                        print(f"[OK] Firebase Admin SDK initialized with default credentials, bucket: {result}")
                        initialized = True
                        break
                    else:
                        try:
                            firebase_admin.delete_app(firebase_app)
                        except:
                            pass
                except Exception as bucket_error:
                    print(f"[WARN] Failed with bucket {bucket_name}: {bucket_error}")
                    try:
                        firebase_admin.delete_app(firebase_app)
                    except:
                        pass
                    continue
            
            if not initialized:
                firebase_initialized = False
                print(f"[ERROR] Could not initialize with any bucket format")
        except Exception as default_error:
            print(f"[ERROR] Default credentials failed: {default_error}")
            print("[INFO] To fix: Run 'gcloud auth application-default login' or add firebase-service-account.json")
            firebase_initialized = False
except Exception as e:
    print(f"[ERROR] Firebase Admin SDK initialization failed: {e}")
    print("[WARN] Image uploads to Firebase Storage will be skipped")
    print("[INFO] To fix: Add firebase-service-account.json to backend/ folder or run 'gcloud auth application-default login'")
    firebase_initialized = False

# Global variables for model
model = None
processor = None
cnn_model = None
cnn_lstm_model = None

# Safe print function to handle encoding issues with Windows console
def safe_print(msg: str):
    """Print with UTF-8 encoding to handle special characters"""
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        # Fallback: remove non-ASCII characters
        print(msg.encode('ascii', errors='replace').decode('ascii'), flush=True)

# Burn degree mapping (based on config.json labels)
BURN_DEGREES = {
    0: "First Degree",
    1: "Second Degree",
    2: "Third Degree"
}

def load_model():
    """Load the trained ViT model"""
    global model, processor
    
    if model is None:
        try:
            safe_print(f"Loading model from: {MODEL_PATH}")
            safe_print(f"Model file exists: {os.path.exists(MODEL_FILE)}")
            safe_print(f"Config file exists: {os.path.exists(CONFIG_PATH)}")
            
            # Check if model files exist
            if not os.path.exists(MODEL_FILE):
                raise FileNotFoundError(f"Model file not found at: {MODEL_FILE}")
            if not os.path.exists(CONFIG_PATH):
                raise FileNotFoundError(f"Config file not found at: {CONFIG_PATH}")
            
            # Load processor - try from model path, fallback to creating from config
            try:
                processor = ViTImageProcessor.from_pretrained(MODEL_PATH)
                safe_print("Processor loaded successfully")
            except Exception as proc_error:
                safe_print(f"Processor not found in model path, creating from config: {proc_error}")
                # Create processor from config
                processor = ViTImageProcessor(
                    size={"height": 224, "width": 224},
                    image_mean=[0.5, 0.5, 0.5],
                    image_std=[0.5, 0.5, 0.5]
                )
                safe_print("Processor created from config")
            
            # Load model
            model = ViTForImageClassification.from_pretrained(MODEL_PATH)
            model.eval()
            safe_print("Model loaded successfully!")
            safe_print(f"Model labels: {model.config.id2label}")
        except Exception as e:
            safe_print(f"Error loading model: {e}")
            import traceback
            traceback.print_exc()
            raise

def load_cnn_model(device='cpu'):
    """Load EfficientNet-based CNN model from Trained Models/cnn_model"""
    global cnn_model
    if cnn_model is not None:
        return cnn_model

    try:
        safe_print(f"Loading CNN model from: {cnn_model_file}")
        if not os.path.exists(cnn_model_file):
            raise FileNotFoundError(f"CNN model file not found at: {cnn_model_file}")

        from torchvision import models
        import torch.nn as nn

        cnn_model_local = models.efficientnet_b0(weights=None)
        # Replace classifier for 3 classes
        cnn_model_local.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(cnn_model_local.classifier[1].in_features, 3)
        )

        checkpoint = torch.load(cnn_model_file, map_location=device)
        if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
            cnn_model_local.load_state_dict(checkpoint['model_state_dict'])
        else:
            cnn_model_local.load_state_dict(checkpoint)

        cnn_model_local.eval()
        cnn_model = cnn_model_local.to(device)
        safe_print("CNN model loaded successfully")
        return cnn_model
    except Exception as e:
        safe_print(f"Failed to load CNN model: {e}")
        raise

def load_cnn_lstm_model(device='cpu'):
    """Load the CNN-LSTM model matching the training script (EfficientNet-B0 backbone).
    Returns the model on success or None on failure.
    """
    global cnn_lstm_model
    if cnn_lstm_model is not None:
        return cnn_lstm_model

    try:
        safe_print(f"Loading CNN-LSTM model from: {cnn_lstm_model_file}")
        if not os.path.exists(cnn_lstm_model_file):
            raise FileNotFoundError(f"CNN-LSTM model file not found at: {cnn_lstm_model_file}")

        import torch.nn as nn
        from torchvision import models as tv_models

        class CNNLSTMModel(nn.Module):
            def __init__(self, feature_dim=1280, hidden_dim=512, num_layers=2, num_classes=3, dropout=0.3):
                super(CNNLSTMModel, self).__init__()
                # EfficientNet-B0 backbone
                try:
                    self.cnn = tv_models.efficientnet_b0(weights=None)
                except Exception:
                    # Fallback for older torchvision
                    self.cnn = tv_models.efficientnet_b0(pretrained=False)
                self.cnn.classifier = nn.Identity()

                # LSTM
                self.lstm = nn.LSTM(
                    input_size=feature_dim,
                    hidden_size=hidden_dim,
                    num_layers=num_layers,
                    batch_first=True,
                    dropout=dropout if num_layers > 1 else 0,
                    bidirectional=True
                )

                # Attention
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
                features = []
                for i in range(seq_len):
                    seq_features = self.cnn(x[:, i])
                    features.append(seq_features)

                features = torch.stack(features, dim=1)
                lstm_out, (h_n, c_n) = self.lstm(features)
                attention_weights = self.attention(lstm_out)
                attention_weights = torch.softmax(attention_weights, dim=1)
                attended_features = torch.sum(lstm_out * attention_weights, dim=1)
                output = self.classifier(attended_features)
                return output

        model_local = CNNLSTMModel(feature_dim=1280, hidden_dim=512, num_layers=2, num_classes=3)
        checkpoint = torch.load(cnn_lstm_model_file, map_location=device)

        # Extract state_dict
        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                state_dict = checkpoint['model_state_dict']
            elif 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
            else:
                state_dict = checkpoint
        else:
            state_dict = checkpoint

        # Normalize keys (strip 'module.' if present)
        new_sd = {}
        for k, v in state_dict.items():
            new_key = k
            if new_key.startswith('module.'):
                new_key = new_key[len('module.'):]
            new_sd[new_key] = v

        try:
            model_local.load_state_dict(new_sd)
        except Exception as e_load:
            safe_print(f"[WARN] Strict load failed for CNN-LSTM model: {e_load}; trying non-strict load")
            model_local.load_state_dict(new_sd, strict=False)

        model_local.eval()
        cnn_lstm_model = model_local.to(device)
        safe_print("CNN-LSTM model loaded successfully")
        return cnn_lstm_model
    except Exception as e:
        safe_print(f"Failed to load CNN-LSTM model: {e}")
        return None

def preprocess_image(image: Image.Image) -> torch.Tensor:
    """Preprocess image for model input"""
    if processor is None:
        raise HTTPException(status_code=500, detail="Model processor not loaded")
    
    # Resize, normalize, and convert to RGB
    inputs = processor(images=image, return_tensors="pt")
    return inputs

def predict_burn_degree(image: Image.Image) -> tuple:
    """Predict burn degree from image and return class index with confidence scores"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        inputs = preprocess_image(image)
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            # Apply softmax to get probabilities
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
            predicted_class = torch.argmax(logits, dim=-1).item()
            confidence = probabilities[0][predicted_class].item()
            # Get all class probabilities
            all_probs = probabilities[0].tolist()
        
        return predicted_class, confidence, all_probs
    except Exception as e:
        safe_print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

def predict_with_cnn(image: Image.Image, device='cpu'):
    """Predict burn degree using CNN model"""
    global cnn_model
    
    if cnn_model is None:
        cnn_model = load_cnn_model(device)
    
    # Preprocess
    from torchvision import transforms
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    img_tensor = transform(image).unsqueeze(0).to(device)
    
    # Predict
    with torch.no_grad():
        outputs = cnn_model(img_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        predicted_class = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0][predicted_class].item()
        all_probs = probabilities[0].cpu().numpy().tolist()
    
    return predicted_class, confidence, all_probs

def analyze_sequence_with_cnn(images: list, device='cpu'):
    """Analyze sequence of images with CNN, return per-image predictions and trend"""
    global cnn_model
    
    if cnn_model is None:
        cnn_model = load_cnn_model(device)
    
    predictions = []
    burn_indices = []
    for idx, img in enumerate(images):
        burn_idx, conf, probs = predict_with_cnn(img, device)
        # Ensure probabilities are native lists for JSON serialization
        if hasattr(probs, 'tolist'):
            probs_list = probs.tolist()
        else:
            probs_list = list(probs)
        pred = {
            'index': idx,
            'burn_degree_index': int(burn_idx),
            'burn_degree': BURN_DEGREES.get(int(burn_idx), 'Unknown'),
            'confidence': round(float(conf) * 100, 2),
            'probs': probs_list
        }
        predictions.append(pred)
        burn_indices.append(int(burn_idx))

    # Analyze trend (compare last vs first)
    trend = 'stable'
    if len(burn_indices) >= 2:
        if burn_indices[-1] > burn_indices[0]:
            trend = 'worsening'
        elif burn_indices[-1] < burn_indices[0]:
            trend = 'improving'
        else:
            trend = 'stable'

    # Log debug summary
    try:
        safe_print(f"[DEBUG] Sequence predictions indices: {burn_indices}")
        safe_print(f"[DEBUG] Sequence predictions details: {[ (p['burn_degree'], p['burn_degree_index'], p['confidence']) for p in predictions ]}")
    except Exception:
        pass

    return predictions, trend


def predict_with_cnn_lstm(images: list, device='cpu'):
    """Predict sequence using loaded cnn_lstm_model. Returns predicted class index, confidence, and probs for the final timestep."""
    global cnn_lstm_model
    if cnn_lstm_model is None:
        cnn_lstm_model = load_cnn_lstm_model(device)
    if cnn_lstm_model is None:
        raise RuntimeError('CNN-LSTM model not available')

    # Preprocess each image
    from torchvision import transforms
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    tensors = []
    for img in images:
        t = transform(img).unsqueeze(0)  # 1 x C x H x W
        tensors.append(t)

    # Stack into (1, seq_len, C, H, W)
    seq = torch.cat(tensors, dim=0).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = cnn_lstm_model(seq)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        predicted_class = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0][predicted_class].item()
        all_probs = probabilities[0].cpu().numpy().tolist()

    return predicted_class, confidence, all_probs


def build_progression_report(predictions: list, trend: str) -> str:
    """Create a human-readable progression report comparing first and last predictions."""
    if not predictions or len(predictions) < 2:
        return "Not enough images to determine progression."

    first = predictions[0]
    last = predictions[-1]

    first_deg = first.get('burn_degree', 'Unknown')
    last_deg = last.get('burn_degree', 'Unknown')
    first_conf = first.get('confidence', 0)
    last_conf = last.get('confidence', 0)

    if first_deg == last_deg:
        change = 'stayed the same'
    else:
        # compare indices if available
        try:
            if last.get('burn_degree_index', -1) > first.get('burn_degree_index', -1):
                change = 'worsened'
            elif last.get('burn_degree_index', -1) < first.get('burn_degree_index', -1):
                change = 'improved'
            else:
                change = 'changed'
        except Exception:
            change = 'changed'

    summary = f"Progression: The condition has {change} from {first_deg} ({first_conf}% confidence) to {last_deg} ({last_conf}% confidence). Overall trend detected: {trend}."

    # Add short guidance
    if change == 'worsened' or trend == 'worsening':
        summary += " Recommend seeking medical attention if deterioration continues."
    elif change == 'improved' or trend == 'improving':
        summary += " Continue conservative care and monitor for infection."
    else:
        summary += " Continue monitoring and follow care recommendations provided."

    return summary

def determine_healing_stage(burn_degree: int, image: Image.Image) -> str:
    """Determine healing stage based on burn degree and image analysis"""
    # This is a simplified rule-based approach
    # In a real system, you might use additional models or image analysis
    
    if burn_degree == 0:  # First Degree
        return "Early Healing Stage"
    elif burn_degree == 1:  # Second Degree
        return "Mid Healing Stage"
    else:  # Third Degree
        return "Early Healing Stage"  # Third degree burns need immediate care

def get_progression_summary(burn_degree: int, healing_stage: str) -> str:
    """Generate progression summary based on burn degree and healing stage"""
    summaries = {
        (0, "Early Healing Stage"): "First-degree burn showing initial redness. Minimal tissue damage observed. Healing process has begun with slight inflammation.",
        (0, "Mid Healing Stage"): "First-degree burn in recovery phase. Redness is reducing, and skin texture is improving. Healing progressing normally.",
        (0, "Late Healing Stage"): "First-degree burn nearly healed. Minimal redness remains. Skin returning to normal appearance.",
        (1, "Early Healing Stage"): "Second-degree burn in early healing. Blistering and redness present. Wound requires careful monitoring and protection.",
        (1, "Mid Healing Stage"): "Second-degree burn showing moderate healing progress. Blistering reducing, new skin formation beginning. Moderate redness and texture improvement observed.",
        (1, "Late Healing Stage"): "Second-degree burn in advanced healing. Significant improvement in skin texture and color. Scar tissue forming, continuing to mature.",
        (2, "Early Healing Stage"): "Third-degree burn requiring immediate medical attention. Severe tissue damage observed. Professional medical care essential.",
        (2, "Mid Healing Stage"): "Third-degree burn in critical healing phase. Extensive tissue damage. Requires specialized medical treatment and monitoring.",
        (2, "Late Healing Stage"): "Third-degree burn in long-term recovery. Significant scarring expected. Ongoing medical supervision required.",
    }
    
    return summaries.get((burn_degree, healing_stage), 
                        f"{BURN_DEGREES[burn_degree]} burn in {healing_stage}. Monitor healing progress closely.")

def get_burn_degree_info(burn_degree: int) -> dict:
    """Get detailed information about the burn degree"""
    burn_info_map = {
        0: {
            "name": "First Degree Burn",
            "description": "First-degree burns affect only the outer layer of skin (epidermis). They cause pain, redness, and swelling.",
            "symptoms": [
                "Red, painful skin",
                "Mild swelling",
                "No blisters",
                "Skin may peel after a day or two"
            ],
            "severity": "Mild",
            "healing_time": "3-6 days",
            "color": "#ef4444"  # Red for first degree
        },
        1: {
            "name": "Second Degree Burn",
            "description": "Second-degree burns affect both the epidermis and the underlying layer of skin (dermis). They cause pain, redness, swelling, and blisters.",
            "symptoms": [
                "Red, white, or splotchy skin",
                "Pain and swelling",
                "Blisters",
                "Wet-looking or weeping skin"
            ],
            "severity": "Moderate",
            "healing_time": "2-3 weeks",
            "color": "#f97316"  # Orange for second degree
        },
        2: {
            "name": "Third Degree Burn",
            "description": "Third-degree burns destroy the epidermis and dermis and may go into the subcutaneous tissue. They may appear white, black, or charred.",
            "symptoms": [
                "White, black, or charred skin",
                "May be painless (nerve damage)",
                "Dry, leathery texture",
                "Swelling"
            ],
            "severity": "Severe",
            "healing_time": "Requires medical treatment",
            "color": "#dc2626"  # Dark red for third degree
        }
    }
    return burn_info_map.get(burn_degree, {})

def get_treatment_recommendations(burn_degree: int, healing_stage: str) -> List[str]:
    """Generate treatment recommendations based on burn degree and healing stage"""
    recommendations = []
    
    # General recommendations
    recommendations.append("Keep the wound clean and dry")
    recommendations.append("Avoid picking at scabs or blisters")
    recommendations.append("Protect from direct sunlight")
    
    # Degree-specific recommendations
    if burn_degree == 0:  # First Degree
        recommendations.append("Apply cool (not cold) compresses")
        recommendations.append("Use aloe vera or moisturizing lotion")
        recommendations.append("Take over-the-counter pain relievers if needed")
        if healing_stage == "Early Healing Stage":
            recommendations.append("Monitor for signs of infection")
    elif burn_degree == 1:  # Second Degree
        recommendations.append("Apply prescribed antibiotic ointments")
        recommendations.append("Keep blisters intact if possible")
        recommendations.append("Change dressings regularly")
        recommendations.append("Consult healthcare provider for proper wound care")
        if healing_stage == "Early Healing Stage":
            recommendations.append("Seek medical attention if blisters are large or numerous")
        elif healing_stage == "Mid Healing Stage":
            recommendations.append("Continue prescribed moisturizing treatments")
            recommendations.append("Gently massage area to prevent scar tissue buildup")
    else:  # Third Degree
        recommendations.append("Seek immediate professional medical care")
        recommendations.append("Do not attempt self-treatment")
        recommendations.append("Follow all medical instructions precisely")
        recommendations.append("Prepare for potential surgical intervention")
        recommendations.append("Long-term follow-up with burn specialist required")
    
    # Stage-specific recommendations
    if healing_stage == "Late Healing Stage":
        recommendations.append("Use silicone gel sheets for scar management")
        recommendations.append("Consider physical therapy if movement is restricted")
        recommendations.append("Continue scar care routine as recommended by healthcare provider")
    
    return recommendations

# Lifespan handler for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    safe_print("[INFO] Application starting up...")
    load_model()
    safe_print("[INFO] Application startup complete.")
    yield
    # Shutdown
    safe_print("[INFO] Application shutting down...")

# Recreate app with lifespan
app = FastAPI(title="Burn Scar Analysis API", lifespan=lifespan)

# Re-apply CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Burn Scar Analysis API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/analyze")
async def analyze_burn_image(request: Request):
    """
    Analyze burn image and return degree, healing stage, progression, and recommendations.
    Supports single image (ViT/CNN) or multiple images for sequence analysis (CNN-LSTM).
    """
    image_url = None
    
    try:
        # Parse form data manually to be tolerant of different client field names
        form = await request.form()
        # Log keys for debugging
        try:
            keys = list(form.keys())
            safe_print(f"[DEBUG] Received form keys: {keys}")
        except Exception:
            safe_print("[DEBUG] Could not list form keys")

        # Extract model and userId from form (support variations)
        model = (form.get('model') or form.get('model[]') or form.get('model_type') or 'vit')
        userId = form.get('userId') or form.get('user_id') or form.get('userid')

        selected_model = (model or 'vit').lower()
        safe_print(f"[INFO] Analysis requested with model: {selected_model}")

        # Collect uploaded files from form (support various field names)
        uploaded_files = []
        upload_file = None
        image_bytes_for_upload = None
        try:
            # Log request headers for debugging
            try:
                safe_print(f"[DEBUG] Request content-type: {request.headers.get('content-type')}")
            except Exception:
                pass

            # Use multi_items() to reliably get all (key, value) pairs including multiple files
            for key, value in form.multi_items():
                # Duck-type check for uploaded file (starlette/fastapi UploadFile)
                is_file_like = hasattr(value, 'filename') and hasattr(value, 'read') and callable(getattr(value, 'read'))
                if is_file_like:
                    uploaded_files.append((key, value))
                    safe_print(f"[DEBUG] Collected uploaded file for key: {key}, filename: {getattr(value, 'filename', None)}")
                else:
                    # Log non-file form values for debugging
                    safe_print(f"[DEBUG] Form field: {key} -> {type(value)}")
        except Exception as e:
            safe_print(f"[WARN] Error while collecting uploaded files: {e}")

        # Determine sequence images vs single image
        sequence_images = []
        # If model is cnn_lstm, prefer files with keys like 'files' or 'files[]' or multiple uploads
        if selected_model == 'cnn_lstm':
            # gather all UploadFile objects
            files_only = [uf for _, uf in uploaded_files]
            safe_print(f"[DEBUG] Uploaded files count: {len(files_only)}")
            if files_only:
                for f in files_only:
                    if not f.content_type.startswith('image/'):
                        raise HTTPException(status_code=400, detail="All files must be images for sequence analysis")
                    data = await f.read()
                    # Save first file bytes for optional upload
                    if image_bytes_for_upload is None:
                        image_bytes_for_upload = data
                    img = Image.open(io.BytesIO(data))
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    sequence_images.append(img)

        # For single-image flows use the first uploaded file if sequence_images is empty
        image = None
        if not sequence_images:
            # pick first available UploadFile
            first_file = None
            if uploaded_files:
                first_file = uploaded_files[0][1]
            # save reference for potential upload
            upload_file = first_file
            if first_file is None:
                raise HTTPException(status_code=400, detail="No image file provided")
            if not first_file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="File must be an image")

            image_data = await first_file.read()
            image_bytes_for_upload = image_data
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
        
        # Upload to Firebase Storage (optional)
        image_url = None
        if userId and firebase_initialized and upload_file and image_bytes_for_upload:
            try:
                timestamp = int(datetime.now().timestamp() * 1000)
                safe_filename = upload_file.filename.replace('/', '_').replace('\\', '_')
                storage_path = f"analysis-images/{userId}/{timestamp}_{safe_filename}"
                
                safe_print(f"[INFO] Uploading image to Firebase Storage: {storage_path}")
                
                try:
                    if storage_bucket_name:
                        bucket = storage.bucket(storage_bucket_name)
                    else:
                        bucket = storage.bucket()
                    safe_print(f"[OK] Storage bucket accessed")
                except Exception as bucket_error:
                    safe_print(f"[ERROR] Cannot access storage bucket: {bucket_error}")
                    image_url = None
                    raise
                
                blob = bucket.blob(storage_path)
                blob.content_type = upload_file.content_type or 'image/jpeg'
                blob.upload_from_string(image_bytes_for_upload, content_type=upload_file.content_type)
                blob.make_public()
                image_url = blob.public_url
                safe_print(f"[OK] Image uploaded successfully")
            except Exception as upload_error:
                safe_print(f"[WARN] Firebase upload failed: {upload_error}")
                image_url = None
        
        # Prediction based on model type
        response_data = {}
        
        if selected_model == 'vit':
            # Single image ViT analysis
            burn_degree_idx, confidence, all_probs = predict_burn_degree(image)
            burn_degree = BURN_DEGREES[burn_degree_idx]
            healing_stage = determine_healing_stage(burn_degree_idx, image)
            progression_summary = get_progression_summary(burn_degree_idx, healing_stage)
            recommendations = get_treatment_recommendations(burn_degree_idx, healing_stage)
            burn_info = get_burn_degree_info(burn_degree_idx)
            
            confidence_breakdown = {
                BURN_DEGREES[0]: round(all_probs[0] * 100, 2),
                BURN_DEGREES[1]: round(all_probs[1] * 100, 2),
                BURN_DEGREES[2]: round(all_probs[2] * 100, 2)
            }
            
            response_data = {
                "burn_degree": burn_degree,
                "burn_degree_index": burn_degree_idx,
                "confidence": round(confidence * 100, 2),
                "confidence_breakdown": confidence_breakdown,
                "healing_stage": healing_stage,
                "progression_summary": progression_summary,
                "recommendations": recommendations,
                "burn_info": burn_info,
                "model_used": "vit",
                "imageUrl": image_url or ""
            }
        
        elif selected_model == 'cnn':
            # Single image CNN analysis
            burn_degree_idx, confidence, all_probs = predict_with_cnn(image)
            burn_degree = BURN_DEGREES[burn_degree_idx]
            healing_stage = determine_healing_stage(burn_degree_idx, image)
            progression_summary = get_progression_summary(burn_degree_idx, healing_stage)
            recommendations = get_treatment_recommendations(burn_degree_idx, healing_stage)
            burn_info = get_burn_degree_info(burn_degree_idx)
            
            confidence_breakdown = {
                BURN_DEGREES[0]: round(all_probs[0] * 100, 2),
                BURN_DEGREES[1]: round(all_probs[1] * 100, 2),
                BURN_DEGREES[2]: round(all_probs[2] * 100, 2)
            }
            
            response_data = {
                "burn_degree": burn_degree,
                "burn_degree_index": burn_degree_idx,
                "confidence": round(confidence * 100, 2),
                "confidence_breakdown": confidence_breakdown,
                "healing_stage": healing_stage,
                "progression_summary": progression_summary,
                "recommendations": recommendations,
                "burn_info": burn_info,
                "model_used": "cnn",
                "imageUrl": image_url or ""
            }
        
        elif selected_model == 'cnn_lstm':
            # Sequence analysis (CNN-LSTM or fallback CNN per-image)
            if not sequence_images:
                raise HTTPException(status_code=400, detail="CNN-LSTM requires multiple images")

            # Prefer using a trained CNN-LSTM model when available
            try:
                cnnlstm = load_cnn_lstm_model()
            except Exception as load_err:
                safe_print(f"[WARN] Error while loading CNN-LSTM model: {load_err}")
                cnnlstm = None

            # Always compute per-image CNN predictions for detailed progression
            predictions, trend = analyze_sequence_with_cnn(sequence_images)

            progression_report = build_progression_report(predictions, trend)

            # If we have a cnn_lstm model, get its overall sequence prediction
            sequence_prediction = None
            used_model_tag = 'cnn_fallback'
            if cnnlstm is not None:
                try:
                    last_idx, last_conf, last_probs = predict_with_cnn_lstm(sequence_images)
                    sequence_prediction = {
                        'burn_degree_index': last_idx,
                        'burn_degree': BURN_DEGREES.get(last_idx, 'Unknown'),
                        'confidence': round(last_conf * 100, 2),
                        'probs': last_probs
                    }
                    used_model_tag = 'cnn_lstm'
                    safe_print(f"[INFO] CNN-LSTM model used for sequence prediction: {sequence_prediction}")
                except Exception as seq_err:
                    safe_print(f"[WARN] CNN-LSTM inference failed, falling back to per-image CNN: {seq_err}")
                    used_model_tag = 'cnn_fallback'

            # Build top-level summary using the last per-image prediction as main status
            last_pred = predictions[-1] if predictions else None
            if last_pred:
                burn_degree_idx = last_pred.get('burn_degree_index', -1)
                confidence = last_pred.get('confidence', 0)
                probs = last_pred.get('probs', [])
                confidence_breakdown = {
                    BURN_DEGREES[0]: round(float(probs[0]) * 100, 2) if len(probs) > 0 else 0,
                    BURN_DEGREES[1]: round(float(probs[1]) * 100, 2) if len(probs) > 1 else 0,
                    BURN_DEGREES[2]: round(float(probs[2]) * 100, 2) if len(probs) > 2 else 0,
                }
                burn_degree = BURN_DEGREES.get(burn_degree_idx, 'Unknown')
                healing_stage = determine_healing_stage(burn_degree_idx, sequence_images[-1])
                progression_summary = get_progression_summary(burn_degree_idx, healing_stage)
                recommendations = get_treatment_recommendations(burn_degree_idx, healing_stage)
                burn_info = get_burn_degree_info(burn_degree_idx)
            else:
                burn_degree_idx = -1
                confidence = 0
                confidence_breakdown = {BURN_DEGREES[0]:0, BURN_DEGREES[1]:0, BURN_DEGREES[2]:0}
                burn_degree = 'Unknown'
                healing_stage = 'N/A'
                progression_summary = ''
                recommendations = []
                burn_info = None

            response_data = {
                'model_used': used_model_tag,
                'sequence_length': len(sequence_images),
                'predictions': predictions,
                'trend': trend,
                'sequence_prediction': sequence_prediction,
                'progression_report': progression_report,
                # Top-level fields for frontend compatibility
                'burn_degree': burn_degree,
                'burn_degree_index': burn_degree_idx,
                'confidence': confidence,
                'confidence_breakdown': confidence_breakdown,
                'healing_stage': healing_stage,
                'progression_summary': progression_report,
                'recommendations': recommendations,
                'burn_info': burn_info,
                'imageUrl': image_url or ''
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {selected_model}")
        
        safe_print(f"[INFO] Analysis complete for model: {selected_model}")
        return JSONResponse(response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        safe_print(f"[ERROR] Error in analyze endpoint: {e}")
        import traceback
        traceback.print_exc()
        
        # Build a UTF-8 safe detail string
        try:
            raw_detail = f"Analysis failed: {str(e)}"
            safe_detail = raw_detail.encode('utf-8', errors='replace').decode('utf-8')
            try:
                safe_detail.encode('ascii')
            except UnicodeEncodeError:
                safe_detail = "Analysis failed: (see server logs)"
        except Exception:
            safe_detail = "Analysis failed: (unknown error)"
        
        raise HTTPException(status_code=500, detail=safe_detail)

if __name__ == "__main__":
    import uvicorn
    import socket

    # Try ports 8000-8004 to avoid bind errors if 8000 is in use
    port = 8000
    max_attempts = 5
    for attempt in range(max_attempts):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        if result != 0:  # Port is free
            safe_print(f"[INFO] Starting server on port {port}")
            break
        else:
            safe_print(f"[WARN] Port {port} in use, trying {port + 1}")
            port += 1
    else:
        safe_print(f"[ERROR] Could not find available port after {max_attempts} attempts")
        raise SystemExit(1)

    uvicorn.run(app, host="0.0.0.0", port=port)


