# Quick Start Guide

## Starting the Backend Server

The backend server needs to be running on port 8000 for the frontend to work.

### Step 1: Install Dependencies (First Time Only)

Open a terminal in the `backend` folder and run:

```bash
pip install -r requirements.txt
```

**Note:** This may take a few minutes as it downloads PyTorch and other large packages.

### Step 2: Start the Server

**Option A: Using Python directly**
```bash
python api.py
```

**Option B: Using uvicorn directly**
```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

**Option C: Using the batch file (Windows)**
Double-click `start_server.bat` or run:
```bash
start_server.bat
```

### Step 3: Verify Server is Running

You should see output like:
```
INFO:     Started server process
INFO:     Waiting for application startup.
✅ Model loaded successfully!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Troubleshooting

1. **Port 8000 already in use?**
   - Close any other application using port 8000
   - Or change the port in `api.py` and update `API_URL` in `Analyze.js`

2. **Model not found?**
   - Make sure `vit_burn_model` folder exists in `../VIT trained model/vit_burn_model/`
   - Check that `config.json` and `model.safetensors` are present

3. **Dependencies error?**
   - Make sure you're using Python 3.8 or higher
   - Try: `pip install --upgrade pip` first
   - Then: `pip install -r requirements.txt`

4. **Connection refused?**
   - Make sure the backend server is running
   - Check that it's running on `http://localhost:8000`
   - Verify the frontend `API_URL` in `Analyze.js` matches

