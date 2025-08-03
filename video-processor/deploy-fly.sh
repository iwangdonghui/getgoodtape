#!/bin/bash

# Fly.io deployment script for video-processor service

echo "🚀 Starting Fly.io deployment for video-processor..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 Please log in to Fly.io first:"
    echo "   flyctl auth login"
    exit 1
fi

# Create app if it doesn't exist
echo "📱 Creating Fly.io app..."
flyctl apps create getgoodtape-video-processor --org personal 2>/dev/null || echo "App already exists"

# Set environment variables
echo "🔧 Setting environment variables..."

# YouTube API
flyctl secrets set YOUTUBE_API_KEY="$YOUTUBE_API_KEY" -a getgoodtape-video-processor

# Decodo proxy configuration (restore from Railway)
flyctl secrets set RESIDENTIAL_PROXY_USER="$RESIDENTIAL_PROXY_USER" -a getgoodtape-video-processor
flyctl secrets set RESIDENTIAL_PROXY_PASS="$RESIDENTIAL_PROXY_PASS" -a getgoodtape-video-processor  
flyctl secrets set RESIDENTIAL_PROXY_ENDPOINT="$RESIDENTIAL_PROXY_ENDPOINT" -a getgoodtape-video-processor

# Deploy the application
echo "🚀 Deploying application..."
flyctl deploy -a getgoodtape-video-processor

# Allocate static IP
echo "🌐 Allocating static IP address..."
flyctl ips allocate-v4 -a getgoodtape-video-processor

# Show deployment status
echo "✅ Deployment complete!"
echo ""
echo "📊 App status:"
flyctl status -a getgoodtape-video-processor

echo ""
echo "🌐 App URL:"
flyctl info -a getgoodtape-video-processor | grep Hostname

echo ""
echo "📋 Static IP addresses:"
flyctl ips list -a getgoodtape-video-processor

echo ""
echo "🔍 To view logs:"
echo "   flyctl logs -a getgoodtape-video-processor"

echo ""
echo "🧪 Test the deployment:"
echo "   curl https://getgoodtape-video-processor.fly.dev/health"
