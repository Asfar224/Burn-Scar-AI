# Burn Scar Analysis Backend API

FastAPI backend for burn scar image analysis using Vision Transformer (ViT) model.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure your trained model is in the correct path:
- Model config: `../VIT trained model/vit_burn_model/config.json`
- Model weights: `../VIT trained model/vit_burn_model/model.safetensors`

3. Run the server:
```bash
python api.py
```

Or using uvicorn directly:
```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### GET /
Health check endpoint

### GET /health
Check API and model status

### POST /analyze
Analyze a burn image

**Request:**
- Multipart form data with `file` field containing the image

**Response:**
```json
{
  "burn_degree": "Second Degree",
  "healing_stage": "Mid Healing Stage",
  "progression_summary": "Scar shows moderate redness and texture improvement",
  "recommendations": [
    "Apply prescribed antibiotic ointments",
    "Keep blisters intact if possible",
    ...
  ]
}
```

## Model Information

- Model Type: Vision Transformer (ViT)
- Input Size: 224x224
- Classes: 3 (First Degree, Second Degree, Third Degree)
- Framework: PyTorch + Transformers

