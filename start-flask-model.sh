#!/bin/bash

# SIH Flask YOLO Model Startup Script
echo "🚀 Starting SIH Flask YOLO Model..."

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "❌ pip is not installed. Please install pip first."
    exit 1
fi

# Navigate to SIH directory
cd SIH

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found in SIH directory"
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Check if best.pt model exists
if [ ! -f "best.pt" ]; then
    echo "⚠️ best.pt model file not found. Make sure your trained model is in the SIH directory."
    echo "💡 If you need to download it, update the MODEL_URL in app.py"
fi

# Start Flask server
echo "🤖 Starting Flask YOLO model server on port 5000..."
echo "🌐 Health check: http://localhost:5000/health"
echo "🔄 Process endpoint: http://localhost:5000/process_all"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python app.py
