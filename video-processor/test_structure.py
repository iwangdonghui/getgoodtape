#!/usr/bin/env python3
"""
Test script to validate the project structure and basic functionality
without requiring external dependencies
"""

import os
import sys

def test_project_structure():
    """Test that all required files exist"""
    required_files = [
        'main.py',
        'requirements.txt', 
        'Dockerfile',
        '.dockerignore',
        'dev.py',
        'README.md'
    ]
    
    print("Testing project structure...")
    for file in required_files:
        if os.path.exists(file):
            print(f"✓ {file} exists")
        else:
            print(f"✗ {file} missing")
            return False
    
    return True

def test_main_py_syntax():
    """Test that main.py has valid Python syntax"""
    print("\nTesting main.py syntax...")
    try:
        with open('main.py', 'r') as f:
            code = f.read()
        
        # Compile to check syntax
        compile(code, 'main.py', 'exec')
        print("✓ main.py has valid syntax")
        return True
    except SyntaxError as e:
        print(f"✗ Syntax error in main.py: {e}")
        return False
    except Exception as e:
        print(f"✗ Error reading main.py: {e}")
        return False

def test_requirements():
    """Test that requirements.txt contains expected packages"""
    print("\nTesting requirements.txt...")
    try:
        with open('requirements.txt', 'r') as f:
            requirements = f.read()
        
        expected_packages = ['fastapi', 'uvicorn', 'yt-dlp', 'pydantic']
        
        for package in expected_packages:
            if package in requirements:
                print(f"✓ {package} found in requirements")
            else:
                print(f"✗ {package} missing from requirements")
                return False
        
        return True
    except Exception as e:
        print(f"✗ Error reading requirements.txt: {e}")
        return False

def test_dockerfile():
    """Test that Dockerfile contains expected components"""
    print("\nTesting Dockerfile...")
    try:
        with open('Dockerfile', 'r') as f:
            dockerfile = f.read()
        
        expected_components = ['FROM python', 'ffmpeg', 'COPY requirements.txt', 'pip install']
        
        for component in expected_components:
            if component in dockerfile:
                print(f"✓ {component} found in Dockerfile")
            else:
                print(f"✗ {component} missing from Dockerfile")
                return False
        
        return True
    except Exception as e:
        print(f"✗ Error reading Dockerfile: {e}")
        return False

def main():
    """Run all tests"""
    print("GetGoodTape Video Processor - Structure Test")
    print("=" * 50)
    
    tests = [
        test_project_structure,
        test_main_py_syntax,
        test_requirements,
        test_dockerfile
    ]
    
    all_passed = True
    for test in tests:
        if not test():
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✓ All tests passed! Project structure is correct.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Install FFmpeg on your system")
        print("3. Run development server: python dev.py")
        print("4. Deploy to Railway using the Dockerfile")
    else:
        print("✗ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()