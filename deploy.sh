#!/bin/bash

# GetGoodTape Deployment Script
# This script helps deploy the complete GetGoodTape application

set -e

echo "🚀 GetGoodTape Deployment Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI not found. Install with: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "Git not found. Please install Git."
        exit 1
    fi
    
    print_success "All dependencies found"
}

# Deploy video processor to Railway
deploy_video_processor() {
    print_status "Deploying video processor to Railway..."
    
    echo "Please follow these steps to deploy the video processor:"
    echo "1. Go to https://railway.app"
    echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
    echo "3. Select your repository"
    echo "4. Choose 'video-processor' as the root directory"
    echo "5. Set environment variables:"
    echo "   - PORT=8000"
    echo "   - PYTHONUNBUFFERED=1"
    echo ""
    echo "After deployment, you'll get a URL like: https://your-app.railway.app"
    echo ""
    read -p "Enter your Railway deployment URL (e.g., https://your-app.railway.app): " PROCESSOR_URL
    
    if [[ -z "$PROCESSOR_URL" ]]; then
        print_error "Processor URL is required"
        exit 1
    fi
    
    print_success "Video processor URL configured: $PROCESSOR_URL"
}

# Setup Cloudflare resources
setup_cloudflare() {
    print_status "Setting up Cloudflare resources..."
    
    cd workers
    
    # Create D1 database
    print_status "Creating D1 database..."
    wrangler d1 create getgoodtape-prod || print_warning "Database might already exist"
    
    # Create R2 bucket
    print_status "Creating R2 bucket..."
    wrangler r2 bucket create getgoodtape-files || print_warning "Bucket might already exist"
    
    # Create KV namespace
    print_status "Creating KV namespace..."
    wrangler kv:namespace create getgoodtape-cache || print_warning "Namespace might already exist"
    
    print_success "Cloudflare resources created"
    
    cd ..
}

# Deploy Workers API
deploy_workers() {
    print_status "Deploying Cloudflare Workers API..."
    
    cd workers
    
    # Update wrangler.toml with processor URL
    print_status "Updating Workers configuration..."
    
    # Create production vars
    cat > .prod.vars << EOF
ENVIRONMENT=production
PROCESSING_SERVICE_URL=$PROCESSOR_URL
EOF
    
    # Deploy to production
    print_status "Deploying to Cloudflare Workers..."
    wrangler deploy --env production
    
    print_success "Workers API deployed"
    
    cd ..
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test Workers API health
    print_status "Testing Workers API health..."
    if curl -f https://api.getgoodtape.com/health > /dev/null 2>&1; then
        print_success "Workers API is healthy"
    else
        print_warning "Workers API health check failed"
    fi
    
    # Test video processor health
    print_status "Testing video processor health..."
    if curl -f "$PROCESSOR_URL/health" > /dev/null 2>&1; then
        print_success "Video processor is healthy"
    else
        print_warning "Video processor health check failed"
    fi
}

# Main deployment flow
main() {
    echo "This script will help you deploy GetGoodTape to production."
    echo "Make sure you have:"
    echo "- Cloudflare account with Workers/D1/R2 access"
    echo "- Railway account (or alternative cloud platform)"
    echo "- Git repository with the latest code"
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi
    
    check_dependencies
    deploy_video_processor
    setup_cloudflare
    deploy_workers
    test_deployment
    
    print_success "Deployment completed!"
    echo ""
    echo "🎉 Your GetGoodTape application is now live!"
    echo "Frontend: https://getgoodtape.com"
    echo "API: https://api.getgoodtape.com"
    echo "Video Processor: $PROCESSOR_URL"
    echo ""
    echo "Next steps:"
    echo "1. Test the complete conversion flow"
    echo "2. Monitor logs and performance"
    echo "3. Set up monitoring and alerts"
}

# Run main function
main "$@"
