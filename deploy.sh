#!/bin/bash

# Wild Trivia Deployment Script
echo "🚀 Deploying Wild Trivia..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create data directory if it doesn't exist
echo "📁 Creating data directory..."
mkdir -p data

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 data

# Start the server
echo "🎮 Starting Wild Trivia server..."
echo "✅ Server is running at http://localhost:8080"
echo "📝 Press Ctrl+C to stop the server"
echo ""

node server.js
