Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Storage CORS Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Checking if gsutil is installed..." -ForegroundColor Yellow
$gsutilPath = Get-Command gsutil -ErrorAction SilentlyContinue
if (-not $gsutilPath) {
    Write-Host ""
    Write-Host "ERROR: gsutil is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Google Cloud SDK:"
    Write-Host "1. Download from: https://cloud.google.com/sdk/docs/install"
    Write-Host "2. Or install via: npm install -g firebase-tools"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ gsutil is installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Authenticating with Google Cloud..." -ForegroundColor Yellow
gcloud auth login
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Authentication failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 3: Setting project to burn-scar-ai..." -ForegroundColor Yellow
gcloud config set project burn-scar-ai
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Could not set project. You may need to set it manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 4: Applying CORS configuration..." -ForegroundColor Yellow
Write-Host "Trying bucket: gs://burn-scar-ai.firebasestorage.app" -ForegroundColor Gray
gsutil cors set cors-config.json gs://burn-scar-ai.firebasestorage.app

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Trying alternative bucket: gs://burn-scar-ai.appspot.com" -ForegroundColor Gray
    gsutil cors set cors-config.json gs://burn-scar-ai.appspot.com
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Could not apply CORS configuration!" -ForegroundColor Red
        Write-Host "Please check:"
        Write-Host "1. Your Firebase project name is correct"
        Write-Host "2. You have Storage Admin permissions"
        Write-Host "3. The bucket name in Firebase Console"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Step 5: Verifying CORS configuration..." -ForegroundColor Yellow
gsutil cors get gs://burn-scar-ai.firebasestorage.app
if ($LASTEXITCODE -ne 0) {
    gsutil cors get gs://burn-scar-ai.appspot.com
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CORS Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please wait a few minutes for changes to propagate." -ForegroundColor Yellow
Write-Host "Then refresh your browser and try uploading an image again." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
