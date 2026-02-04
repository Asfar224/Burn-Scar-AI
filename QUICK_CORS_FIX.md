# Quick CORS Fix for Firebase Storage

## The Problem
You're seeing CORS errors when uploading images. This happens because Firebase Storage needs to be configured to allow requests from `http://localhost:3000`.

## Quick Solution (Choose One)

### Option 1: Run the Setup Script (Easiest)

**Windows:**
1. Double-click `setup-cors.bat` in this folder
2. Follow the prompts
3. Wait 2-3 minutes for changes to take effect
4. Refresh your browser and try again

**Or PowerShell:**
```powershell
.\setup-cors.ps1
```

### Option 2: Manual Setup

1. **Install Google Cloud SDK** (if not installed):
   - Download: https://cloud.google.com/sdk/docs/install
   - Or: `npm install -g firebase-tools`

2. **Run these commands:**
   ```bash
   gcloud auth login
   gcloud config set project burn-scar-ai
   gsutil cors set cors-config.json gs://burn-scar-ai.firebasestorage.app
   ```

3. **If that doesn't work, try:**
   ```bash
   gsutil cors set cors-config.json gs://burn-scar-ai.appspot.com
   ```

4. **Verify it worked:**
   ```bash
   gsutil cors get gs://burn-scar-ai.firebasestorage.app
   ```

### Option 3: Check Your Bucket Name

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `burn-scar-ai`
3. Go to **Storage**
4. Look at the bucket URL shown
5. Use that exact bucket name in the gsutil command

## After Setup

- Wait 2-3 minutes for changes to propagate
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh the page
- Try uploading an image again

## Still Not Working?

1. Check you have **Storage Admin** permissions in Firebase Console
2. Make sure you're authenticated: `gcloud auth list`
3. Check the bucket name matches exactly
4. Try the alternative bucket name (`appspot.com` instead of `firebasestorage.app`)

## Need Help?

Check `FIREBASE_STORAGE_CORS_SETUP.md` for detailed instructions.
