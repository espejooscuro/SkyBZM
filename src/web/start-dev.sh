#!/bin/bash

echo "🚀 Starting SkyBZM Web Development Server..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Start the development server
echo "🌐 Starting Vite development server..."
echo "📍 Dashboard will be available at: http://localhost:7392"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
