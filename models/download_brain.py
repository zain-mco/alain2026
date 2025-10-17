#!/usr/bin/env python3
"""
🧠 Automatic Brain Model Downloader
This script helps you download a professional 3D brain model
"""

import os
import sys

def print_header():
    print("=" * 60)
    print("🧠 PROFESSIONAL 3D BRAIN MODEL DOWNLOADER")
    print("=" * 60)
    print()

def print_instructions():
    print("📋 DOWNLOAD INSTRUCTIONS:")
    print()
    print("Since Sketchfab requires authentication to download,")
    print("please follow these manual steps:")
    print()
    print("OPTION 1 - Sketchfab (BEST QUALITY):")
    print("-" * 60)
    print("1. Visit: https://sketchfab.com/3d-models/human-brain-c9c9d4d671b94345952d012cc2ea7a24")
    print("2. Click 'Download 3D Model' button")
    print("3. Sign in or create free account")
    print("4. Select 'glTF' format")
    print("5. Download the file")
    print("6. Extract and rename to 'brain.glb'")
    print("7. Place in this folder: models/")
    print()
    
    print("OPTION 2 - Alternative Brain Model:")
    print("-" * 60)
    print("1. Visit: https://sketchfab.com/3d-models/brain-realistic-free-756bc05dd59e4f3ca1a93ffcc57a8994")
    print("2. Follow same download steps as Option 1")
    print()
    
    print("OPTION 3 - Free3D:")
    print("-" * 60)
    print("1. Visit: https://free3d.com/3d-model/brain-374702.html")
    print("2. Click 'Download' button")
    print("3. Extract and convert to GLB if needed")
    print()

def check_model_exists():
    """Check if brain model already exists"""
    model_path = "brain.glb"
    if os.path.exists(model_path):
        size_mb = os.path.getsize(model_path) / (1024 * 1024)
        print(f"✅ Brain model found: {model_path}")
        print(f"   File size: {size_mb:.2f} MB")
        print()
        return True
    else:
        print("❌ Brain model not found: brain.glb")
        print()
        return False

def provide_conversion_tips():
    print("🔧 FILE CONVERSION TIPS:")
    print("-" * 60)
    print("If you downloaded in different format (OBJ, FBX, etc.):")
    print()
    print("1. Use online converter:")
    print("   - https://products.aspose.app/3d/conversion")
    print("   - https://anyconv.com/3d-model-converter/")
    print()
    print("2. Or use Blender (free software):")
    print("   - Import your model")
    print("   - Export as 'glTF 2.0 (.glb)'")
    print()

def main():
    print_header()
    
    # Check if model exists
    exists = check_model_exists()
    
    if not exists:
        print_instructions()
        print()
        provide_conversion_tips()
        print()
        print("=" * 60)
        print("After downloading, place 'brain.glb' in this folder,")
        print("then refresh your browser (Ctrl+F5)")
        print("=" * 60)
    else:
        print("🎉 Your brain model is ready to use!")
        print("Just refresh your browser to see it in action!")
        print()
        print("To use a different model:")
        print("1. Delete or rename current brain.glb")
        print("2. Run this script again")
        print("3. Download a new model")

if __name__ == "__main__":
    main()
