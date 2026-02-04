from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
            print(f"Loading model from: {MODEL_PATH}")
            print(f"Model file exists: {os.path.exists(MODEL_FILE)}")
            print(f"Config file exists: {os.path.exists(CONFIG_PATH)}")
            
            # Check if model files exist
            if not os.path.exists(MODEL_FILE):
                raise FileNotFoundError(f"Model file not found at: {MODEL_FILE}")
            if not os.path.exists(CONFIG_PATH):
                raise FileNotFoundError(f"Config file not found at: {CONFIG_PATH}")
            
            # Load processor - try from model path, fallback to creating from config
            try:
                processor = ViTImageProcessor.from_pretrained(MODEL_PATH)
                print("Processor loaded successfully")
            except Exception as proc_error:
                print(f"Processor not found in model path, creating from config: {proc_error}")
                # Create processor from config
                from transformers import ViTImageProcessor
                processor = ViTImageProcessor(
                    size={"height": 224, "width": 224},
                    image_mean=[0.5, 0.5, 0.5],
                    image_std=[0.5, 0.5, 0.5]
                )
                print("Processor created from config")
            
            # Load model
            model = ViTForImageClassification.from_pretrained(MODEL_PATH)
            model.eval()
            print("Model loaded successfully!")
            print(f"Model labels: {model.config.id2label}")
        except Exception as e:
            print(f"Error loading model: {e}")
            import traceback
            traceback.print_exc()
            raise

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
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

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

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_model()

@app.get("/")
async def root():
    return {"message": "Burn Scar Analysis API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/analyze")
async def analyze_burn_image(
    file: UploadFile = File(...),
    userId: Optional[str] = Form(None)
):
    """
    Analyze burn image and return degree, healing stage, progression, and recommendations.
    Also uploads image to Firebase Storage if userId is provided.
    """
    image_url = None
    
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data (we need it for both analysis and upload)
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Upload to Firebase Storage using Admin SDK (OPTIONAL - frontend handles uploads primarily)
        # Backend upload is optional since frontend uses Firebase SDK directly
        image_url = None  # Default to None - frontend will handle upload
        
        if userId and firebase_initialized:
            # Try backend upload if available (optional)
            # Firebase is initialized - try to upload
            try:
                timestamp = int(datetime.now().timestamp() * 1000)
                # Sanitize filename to avoid path issues
                safe_filename = file.filename.replace('/', '_').replace('\\', '_')
                storage_path = f"analysis-images/{userId}/{timestamp}_{safe_filename}"
                
                print(f"[INFO] Uploading image to Firebase Storage via Admin SDK: {storage_path}")
                print(f"[INFO] File size: {len(image_data)} bytes")
                
                # Get storage bucket - use explicit bucket name if we have it
                try:
                    if storage_bucket_name:
                        bucket = storage.bucket(storage_bucket_name)
                    else:
                        bucket = storage.bucket()
                    print(f"[OK] Storage bucket accessed: {bucket.name}")
                except Exception as bucket_error:
                    print(f"[ERROR] Cannot access storage bucket: {bucket_error}")
                    print(f"[INFO] Trying to use default bucket from project...")
                    # Try to get default bucket
                    try:
                        import json
                        cred_path = os.path.join(BASE_DIR, "firebase-service-account.json")
                        if os.path.exists(cred_path):
                            with open(cred_path, 'r') as f:
                                cred_data = json.load(f)
                                project_id = cred_data.get('project_id', 'burn-scar-ai')
                                default_bucket = f'{project_id}.appspot.com'
                                bucket = storage.bucket(default_bucket)
                                storage_bucket_name = default_bucket
                                print(f"[OK] Using default bucket: {bucket.name}")
                        else:
                            raise Exception("Cannot determine bucket name")
                    except Exception as fallback_error:
                        print(f"[ERROR] Fallback bucket access failed: {fallback_error}")
                        raise Exception(f"Firebase Storage not accessible: {bucket_error}")
                
                blob = bucket.blob(storage_path)
                
                # Set content type
                blob.content_type = file.content_type or 'image/jpeg'
                
                # Upload image data using Admin SDK (no CORS, no direct HTTP requests)
                print(f"[INFO] Uploading {len(image_data)} bytes...")
                blob.upload_from_string(image_data, content_type=file.content_type)
                print(f"[OK] Image uploaded successfully via Admin SDK")
                
                # Make the blob publicly accessible so frontend can display it
                blob.make_public()
                image_url = blob.public_url
                
                print(f"[OK] Image URL generated: {image_url}")
            except Exception as upload_error:
                print(f"[ERROR] Failed to upload to Firebase Storage: {upload_error}")
                print(f"[ERROR] Error type: {type(upload_error).__name__}")
                print(f"[ERROR] Error details: {str(upload_error)}")
                import traceback
                traceback.print_exc()
                # Set image_url to None so frontend knows upload failed
                image_url = None
        
        # Predict burn degree
        burn_degree_idx, confidence, all_probs = predict_burn_degree(image)
        burn_degree = BURN_DEGREES[burn_degree_idx]
        
        # Determine healing stage
        healing_stage = determine_healing_stage(burn_degree_idx, image)
        
        # Get progression summary
        progression_summary = get_progression_summary(burn_degree_idx, healing_stage)
        
        # Get treatment recommendations
        recommendations = get_treatment_recommendations(burn_degree_idx, healing_stage)
        
        # Get detailed burn information
        burn_info = get_burn_degree_info(burn_degree_idx)
        
        # Create confidence breakdown
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
            "burn_info": burn_info
        }
        
        # Always include imageUrl (even if None/empty) so frontend knows the status
        response_data["imageUrl"] = image_url if image_url else ""
        
        if not image_url and userId:
            print(f"⚠️ WARNING: imageUrl is empty - image was not uploaded to Firebase Storage")
            print(f"⚠️ Fix: Add firebase-service-account.json to backend/ folder")
            print(f"⚠️ OR run: gcloud auth application-default login")
            print(f"⚠️ See QUICK_SETUP.md for details")
        
        return JSONResponse(response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in analyze endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


