# Firebase Admin SDK Setup for Backend

## Why This Setup?

**No more CORS issues!** The backend now handles Firebase Storage uploads, so the frontend never directly accesses Firebase Storage. This eliminates CORS problems completely.

## Setup Steps

### Option 1: Using Service Account Key (Recommended for Production)

1. **Get Firebase Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project: `burn-scar-ai`
   - Go to **Project Settings** (gear icon) → **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file

2. **Place the Key File:**
   - Rename it to `firebase-service-account.json`
   - Place it in the `backend/` folder
   - **IMPORTANT:** Add it to `.gitignore` (never commit this file!)

3. **Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Run the Backend:**
   ```bash
   python api.py
   ```

### Option 2: Using Default Credentials (For Local Development)

1. **Install Google Cloud SDK:**
   - Download: https://cloud.google.com/sdk/docs/install

2. **Authenticate:**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

3. **Set Project:**
   ```bash
   gcloud config set project burn-scar-ai
   ```

4. **Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

5. **Run the Backend:**
   ```bash
   python api.py
   ```

## How It Works Now

1. **Frontend** sends image + userId to **Backend** (`/analyze`)
2. **Backend** analyzes the image (ML model)
3. **Backend** uploads image to Firebase Storage (no CORS!)
4. **Backend** returns analysis results + image URL
5. **Frontend** saves to Firestore with the image URL

## Benefits

✅ **No CORS configuration needed**  
✅ **Backend handles all Firebase Storage operations**  
✅ **Frontend never directly accesses Firebase Storage**  
✅ **More secure** (service account credentials stay on backend)  
✅ **Simpler frontend code**

## Troubleshooting

### "Firebase Admin SDK initialization failed"

- **Option 1:** Make sure `firebase-service-account.json` exists in `backend/` folder
- **Option 2:** Run `gcloud auth application-default login`

### "Permission denied" when uploading

- Check that your service account has **Storage Admin** role in Firebase Console
- Or ensure your gcloud account has proper permissions

### Backend can't find the service account file

- Make sure the file is named exactly: `firebase-service-account.json`
- Make sure it's in the `backend/` folder (same folder as `api.py`)
