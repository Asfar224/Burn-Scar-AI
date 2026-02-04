#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick script to check if Firebase Admin SDK is properly configured
"""
import os
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("=" * 50)
print("Firebase Admin SDK Configuration Check")
print("=" * 50)
print()

# Check for service account file
cred_path = os.path.join(BASE_DIR, "firebase-service-account.json")
if os.path.exists(cred_path):
    print("[OK] firebase-service-account.json found")
    print(f"   Path: {cred_path}")
else:
    print("[X] firebase-service-account.json NOT found")
    print(f"   Expected at: {cred_path}")
    print()

# Try to import firebase_admin
try:
    import firebase_admin
    from firebase_admin import credentials, storage
    print("[OK] firebase-admin package is installed")
except ImportError:
    print("[X] firebase-admin package is NOT installed")
    print("   Run: pip install firebase-admin")
    sys.exit(1)

# Try to initialize
print()
print("Attempting to initialize Firebase Admin SDK...")
try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'burn-scar-ai.firebasestorage.app'
        })
        print("[OK] Firebase Admin SDK initialized with service account")
    else:
        try:
            firebase_admin.initialize_app(options={
                'storageBucket': 'burn-scar-ai.firebasestorage.app'
            })
            print("[OK] Firebase Admin SDK initialized with default credentials")
        except Exception as e:
            print(f"[X] Default credentials failed: {e}")
            print()
            print("To fix:")
            print("1. Add firebase-service-account.json to backend/ folder")
            print("   OR")
            print("2. Run: gcloud auth application-default login")
            sys.exit(1)
    
    # Test storage access
    print()
    print("Testing Firebase Storage access...")
    bucket = storage.bucket()
    print(f"[OK] Storage bucket accessed: {bucket.name}")
    print()
    print("=" * 50)
    print("[OK] All checks passed! Firebase is ready to upload images.")
    print("=" * 50)
    
except Exception as e:
    print(f"[X] Firebase initialization failed: {e}")
    print()
    print("To fix:")
    print("1. Get service account key from Firebase Console")
    print("2. Save as firebase-service-account.json in backend/ folder")
    print("   OR")
    print("3. Run: gcloud auth application-default login")
    sys.exit(1)
