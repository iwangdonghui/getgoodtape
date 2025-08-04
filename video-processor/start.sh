#!/bin/bash

# Debug environment variables
echo "=== Environment Debug ==="
echo "PORT: $PORT"
echo "PYTHONUNBUFFERED: $PYTHONUNBUFFERED"
echo "RAILWAY: $RAILWAY"
echo "========================="

# Set default port if not provided
PORT=${PORT:-8000}

# Validate PORT is a number
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo "Error: PORT '$PORT' is not a valid number, using default 8000"
    PORT=8000
fi

echo "Starting video processor on port $PORT"

# Configure DNS for proper Decodo resolution
echo "Configuring DNS..."
echo "nameserver 8.8.8.8" > /tmp/resolv.conf.new
echo "nameserver 1.1.1.1" >> /tmp/resolv.conf.new
echo "nameserver 208.67.222.222" >> /tmp/resolv.conf.new

# Test DNS resolution
echo "Testing Decodo DNS resolution..."
nslookup gate.decodo.com 8.8.8.8 || echo "DNS test failed, continuing anyway..."

# Start the application
exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT
