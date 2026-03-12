#!/bin/bash

echo "🚀 Starting SkyBZM Web Development Server..."
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building production version..."
npm run build

echo ""
echo "✅ Build complete!"
echo "The application is ready to be served by the Express server."
echo ""
echo "To start the full bot with web interface:"
echo "  cd ../../.. && node src/Launcher.js"
echo ""
echo "For development with hot reload:"
echo "  npm run dev"
