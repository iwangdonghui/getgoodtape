#!/bin/bash

# Development script for GetGoodTape
# This script starts both the Next.js frontend and Cloudflare Workers in development mode

echo "🚀 Starting GetGoodTape development environment..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping development servers..."
    kill $FRONTEND_PID $WORKERS_PID 2>/dev/null
    exit
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start Next.js frontend
echo "📱 Starting Next.js frontend..."
npm run dev &
FRONTEND_PID=$!

# Start Cloudflare Workers
echo "⚡ Starting Cloudflare Workers..."
cd workers && npm run dev &
WORKERS_PID=$!
cd ..

echo "✅ Development servers started!"
echo "Frontend: http://localhost:3000"
echo "Workers API: http://localhost:8789"
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait