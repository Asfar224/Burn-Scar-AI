#!/bin/bash
echo "Fixing dependencies..."
cd "$(dirname "$0")"

echo "Uninstalling old packages..."
pip uninstall -y transformers torch fastapi uvicorn python-multipart pillow numpy safetensors 2>/dev/null

echo ""
echo "Installing fresh dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "Done! Try running: python api.py"

