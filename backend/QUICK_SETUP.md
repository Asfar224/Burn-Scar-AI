# Quick Firebase Setup for Backend

## Current Setup
✅ Backend uses **Firebase Admin SDK** to upload images (no CORS needed!)
✅ No gcloud or manual CORS configuration required
✅ All uploads happen server-side

## Setup (Choose One)

### Option 1: Service Account Key (Easiest - 2 minutes)

1. Go to: https://console.firebase.google.com/project/burn-scar-ai/settings/serviceaccounts/adminsdk
2. Click **"Generate New Private Key"**
3. Save the downloaded JSON file
4. Rename it to: `firebase-service-account.json`
5. Move it to: `backend/` folder (same folder as `api.py`)
6. Restart backend: `python api.py`

**Done!** Backend will now upload images automatically.

### Option 2: Default Credentials

```bash
gcloud auth application-default login
```

Then restart backend.

## Verify It Works

Run this to check:
```bash
python check_firebase.py
```

You should see: `[OK] All checks passed!`

## How It Works

1. **Frontend** sends image + userId to **Backend**
2. **Backend** analyzes image (ML model)
3. **Backend** uploads image to Firebase Storage using **Admin SDK** (no CORS!)
4. **Backend** returns analysis + imageUrl
5. **Frontend** saves to Firestore with imageUrl

**No CORS configuration needed!** Backend handles everything.
