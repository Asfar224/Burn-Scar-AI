# Get Firebase Service Account Key - STEP BY STEP

## The Problem
Your backend needs Firebase credentials to upload images. Right now it's failing because credentials are missing.

## Solution: Get Service Account Key (2 minutes)

### Step 1: Go to Firebase Console
Open: https://console.firebase.google.com/project/burn-scar-ai/settings/serviceaccounts/adminsdk

### Step 2: Generate Key
1. You'll see a section called "Firebase Admin SDK"
2. Click the **"Generate New Private Key"** button
3. A warning popup will appear - click **"Generate Key"**

### Step 3: Save the File
1. A JSON file will download automatically
2. The file name will be something like: `burn-scar-ai-firebase-adminsdk-xxxxx-xxxxx.json`

### Step 4: Rename and Move
1. **Rename** the file to: `firebase-service-account.json`
2. **Move** it to: `D:\Usama project\Burn Scar app\burnscarapp\backend\`
3. Make sure it's in the same folder as `api.py`

### Step 5: Restart Backend
1. Stop your backend (Ctrl+C)
2. Start it again: `python api.py`
3. You should see: `✅ Firebase Admin SDK initialized and verified with service account`

## Verify It Works

After restarting, you should see in the backend logs:
```
✅ Firebase Admin SDK initialized and verified with service account
```

Then when you upload an image, you should see:
```
✅ Image uploaded successfully via Admin SDK
✅ Image URL generated: https://...
```

## That's It!

Once the service account file is in place, images will upload automatically and `imageUrl` will be populated in Firebase.
