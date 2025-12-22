"""
GPU Diagnostic Script
Run this to check if your PyTorch installation supports GPU
"""
import torch
import sys

print("="*70)
print("PYTORCH GPU DIAGNOSTIC TOOL")
print("="*70)

# Check PyTorch version
print(f"\n1. PyTorch Version: {torch.__version__}")

# Check CUDA availability
cuda_available = torch.cuda.is_available()
print(f"\n2. CUDA Available: {cuda_available}")

if cuda_available:
    print(f"   ✅ CUDA is working!")
    print(f"\n3. CUDA Details:")
    print(f"   - CUDA Version: {torch.version.cuda}")
    print(f"   - cuDNN Version: {torch.backends.cudnn.version()}")
    print(f"   - Number of GPUs: {torch.cuda.device_count()}")
    
    for i in range(torch.cuda.device_count()):
        props = torch.cuda.get_device_properties(i)
        print(f"\n   GPU {i}: {props.name}")
        print(f"   - Compute Capability: {props.major}.{props.minor}")
        print(f"   - Total Memory: {props.total_memory / 1024**3:.2f} GB")
        print(f"   - Multiprocessors: {props.multi_processor_count}")
    
    # Test GPU computation
    print(f"\n4. Testing GPU Computation:")
    try:
        x = torch.randn(1000, 1000).cuda()
        y = torch.randn(1000, 1000).cuda()
        z = torch.matmul(x, y)
        print(f"   ✅ GPU computation test PASSED")
        print(f"   Result tensor device: {z.device}")
    except Exception as e:
        print(f"   ❌ GPU computation test FAILED: {e}")
else:
    print(f"   ❌ CUDA is NOT available")
    print(f"\n3. Why CUDA might not be available:")
    print(f"   - PyTorch was installed WITHOUT CUDA support (CPU-only version)")
    print(f"   - NVIDIA drivers are not installed")
    print(f"   - CUDA toolkit is not installed")
    print(f"   - GPU is not compatible with installed CUDA version")
    
    print(f"\n4. How to Fix:")
    print(f"   Step 1: Check if you have an NVIDIA GPU")
    print(f"   - Open Device Manager > Display adapters")
    print(f"   - Look for 'NVIDIA' in the name")
    
    print(f"\n   Step 2: Install/Update NVIDIA Drivers")
    print(f"   - Visit: https://www.nvidia.com/Download/index.aspx")
    print(f"   - Download and install latest drivers for your GPU")
    
    print(f"\n   Step 3: Reinstall PyTorch with CUDA support")
    print(f"   - Visit: https://pytorch.org/get-started/locally/")
    print(f"   - Select your CUDA version (usually CUDA 11.8 or 12.1)")
    print(f"   - Copy the pip install command and run it")
    print(f"   - Example for CUDA 11.8:")
    print(f"     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
    print(f"   - Example for CUDA 12.1:")
    print(f"     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")

print("\n" + "="*70)
print("DIAGNOSTIC COMPLETE")
print("="*70)






