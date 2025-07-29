#!/bin/bash

# Set default port if not provided
PORT=${PORT:-8000}

echo "Starting video processor on port $PORT"

# Start the application
exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT
