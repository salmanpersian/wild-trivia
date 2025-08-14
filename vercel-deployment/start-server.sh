#!/bin/bash

# Wild Trivia Server Startup Script for cPanel
echo "🎮 Starting Wild Trivia Server..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please contact your hosting provider to enable Node.js"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version too old. Need version 16 or higher."
    echo "Current version: $(node --version)"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create data directory if it doesn't exist
mkdir -p data

# Set permissions
chmod 755 data

# Start the server
echo "✅ Server starting on port 8080..."
echo "🌐 Access your game at: http://yourdomain.com:8080"
echo "📝 Press Ctrl+C to stop the server"
echo ""

node server.js
