# Firebase Storage CORS Configuration Setup

## Problem
You're getting CORS errors when trying to upload images to Firebase Storage from `http://localhost:3000`.

## Solution
Configure CORS for Firebase Storage using `gsutil`.

## Steps

### 1. Install Google Cloud SDK (if not already installed)
- Download from: https://cloud.google.com/sdk/docs/install
- Or use: `npm install -g firebase-tools` (if you have Firebase CLI)

### 2. Authenticate with Google Cloud
```bash
gcloud auth login
```

### 3. Set your project
```bash
gcloud config set project burn-scar-ai
```

### 4. Apply CORS Configuration
Navigate to your project directory and run:

```bash
gsutil cors set cors-config.json gs://burn-scar-ai.firebasestorage.app
```

**OR** if the bucket name is different, use:
```bash
gsutil cors set cors-config.json gs://burn-scar-ai.appspot.com
```

### 5. Verify CORS Configuration
```bash
gsutil cors get gs://burn-scar-ai.firebasestorage.app
```

## Alternative: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Login to Firebase
firebase login

# Set CORS (you may need to use gsutil anyway)
gsutil cors set cors-config.json gs://burn-scar-ai.firebasestorage.app
```

## Important Notes

1. **Bucket Name**: The bucket name might be `burn-scar-ai.appspot.com` instead of `burn-scar-ai.firebasestorage.app`. Check your Firebase Console → Storage to see the exact bucket name.

2. **For Production**: When deploying, add your production domain to the `origin` array in `cors-config.json`:
   ```json
   "origin": [
     "http://localhost:3000",
     "https://yourdomain.com"
   ]
   ```

3. **After applying**: You may need to wait a few minutes for changes to propagate, or clear your browser cache.

## Troubleshooting

If you get permission errors:
- Make sure you're authenticated: `gcloud auth login`
- Make sure you have Storage Admin permissions in Firebase/Google Cloud Console
- Try: `gcloud auth application-default login`

If the bucket name is wrong:
- Go to Firebase Console → Storage
- Check the bucket URL shown there
- Use that exact bucket name in the gsutil command
