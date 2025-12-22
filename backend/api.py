from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
from transformers import ViTImageProcessor, ViTForImageClassification
from PIL import Image
import io
import numpy as np
from typing import List
import os

app = FastAPI(title="Burn Scar Analysis API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths (absolute path from backend folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
MODEL_PATH = os.path.join(PARENT_DIR, "VIT trained model", "vit_burn_model")
CONFIG_PATH = os.path.join(MODEL_PATH, "config.json")
MODEL_FILE = os.path.join(MODEL_PATH, "model.safetensors")

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
async def analyze_burn_image(file: UploadFile = File(...)):
    """
    Analyze burn image and return degree, healing stage, progression, and recommendations
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
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
        
        return JSONResponse({
            "burn_degree": burn_degree,
            "burn_degree_index": burn_degree_idx,
            "confidence": round(confidence * 100, 2),
            "confidence_breakdown": confidence_breakdown,
            "healing_stage": healing_stage,
            "progression_summary": progression_summary,
            "recommendations": recommendations,
            "burn_info": burn_info
        })
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in analyze endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


