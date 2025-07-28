#!/usr/bin/env python3
"""
Development script for running the video processor locally
"""

import subprocess
import sys
import os

def check_dependencies():
    """Check if required dependencies are installed"""
    print("Checking dependencies...")
    
    # Check Python packages
    try:
        import fastapi
        import uvicorn
        import yt_dlp
        print("✓ Python packages installed")
    except ImportError as e:
        print(f"✗ Missing Python package: {e}")
        print("Run: pip install -r requirements.txt")
        return False
    
    # Check FFmpeg
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True)
        if result.returncode == 0:
            print("✓ FFmpeg available")
        else:
            print("✗ FFmpeg not working properly")
            return False
    except FileNotFoundError:
        print("✗ FFmpeg not found")
        print("Install FFmpeg: https://ffmpeg.org/download.html")
        return False
    
    return True

def run_server():
    """Run the development server"""
    if not check_dependencies():
        sys.exit(1)
    
    print("\nStarting development server...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop\n")
    
    try:
        subprocess.run([
            "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == "__main__":
    run_server()