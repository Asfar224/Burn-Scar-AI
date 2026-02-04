@echo off
echo ========================================
echo Firebase Storage CORS Setup
echo ========================================
echo.

echo Step 1: Checking if gsutil is installed...
where gsutil >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: gsutil is not installed!
    echo.
    echo Please install Google Cloud SDK:
    echo 1. Download from: https://cloud.google.com/sdk/docs/install
    echo 2. Or install via: npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)

echo ✓ gsutil is installed
echo.

echo Step 2: Authenticating with Google Cloud...
gcloud auth login
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Authentication failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Setting project to burn-scar-ai...
gcloud config set project burn-scar-ai
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Could not set project. You may need to set it manually.
)

echo.
echo Step 4: Applying CORS configuration...
echo Trying bucket: gs://burn-scar-ai.firebasestorage.app
gsutil cors set cors-config.json gs://burn-scar-ai.firebasestorage.app

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying alternative bucket: gs://burn-scar-ai.appspot.com
    gsutil cors set cors-config.json gs://burn-scar-ai.appspot.com
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Could not apply CORS configuration!
        echo Please check:
        echo 1. Your Firebase project name is correct
        echo 2. You have Storage Admin permissions
        echo 3. The bucket name in Firebase Console
        pause
        exit /b 1
    )
)

echo.
echo Step 5: Verifying CORS configuration...
gsutil cors get gs://burn-scar-ai.firebasestorage.app
if %ERRORLEVEL% NEQ 0 (
    gsutil cors get gs://burn-scar-ai.appspot.com
)

echo.
echo ========================================
echo CORS Configuration Complete!
echo ========================================
echo.
echo Please wait a few minutes for changes to propagate.
echo Then refresh your browser and try uploading an image again.
echo.
pause
