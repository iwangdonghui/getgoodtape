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

# Start the application
exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT
