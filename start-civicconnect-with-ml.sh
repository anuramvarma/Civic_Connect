#!/bin/bash

# CivicConnect with SIH ML Integration - Complete Startup Script
echo "🚀 Starting CivicConnect with SIH ML Integration..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start Flask model in background
start_flask_model() {
    echo "🤖 Starting SIH Flask YOLO Model..."
    cd SIH
    
    # Install dependencies if needed
    if [ ! -d "venv" ]; then
        echo "📦 Creating Python virtual environment..."
        python -m venv venv
    fi
    
    source venv/bin/activate
    pip install -r requirements.txt
    
    # Start Flask server in background
    python app.py &
    FLASK_PID=$!
    echo "✅ Flask YOLO model started (PID: $FLASK_PID)"
    cd ..
}

# Function to start Node.js server
start_node_server() {
    echo "🌐 Starting CivicConnect Node.js server..."
    
    # Install Node.js dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing Node.js dependencies..."
        npm install
    fi
    
    # Start Node.js server
    node server.js &
    NODE_PID=$!
    echo "✅ Node.js server started (PID: $NODE_PID)"
}

# Check if ports are available
if check_port 5000; then
    echo "⚠️ Port 5000 is already in use. Flask model might already be running."
    echo "💡 You can check: http://localhost:5000/health"
else
    start_flask_model
fi

if check_port 5000; then
    echo "⚠️ Port 5000 is still in use. Please stop the existing service first."
    exit 1
fi

if check_port 3000; then
    echo "⚠️ Port 3000 is already in use. Node.js server might already be running."
    echo "💡 You can check: http://localhost:3000"
else
    start_node_server
fi

# Wait a moment for servers to start
sleep 3

echo ""
echo "🎉 CivicConnect with SIH ML Integration is running!"
echo ""
echo "📊 Services Status:"
echo "   🤖 Flask YOLO Model: http://localhost:5000"
echo "   🌐 CivicConnect Web: http://localhost:3000"
echo "   🔍 Health Check: http://localhost:5000/health"
echo "   🔄 ML Processing: http://localhost:5000/process_all"
echo ""
echo "📋 Available Endpoints:"
echo "   GET  /api/complaints - Get all complaints"
echo "   GET  /api/ml-queue - ML processing queue status"
echo "   GET  /api/ml-stats - ML statistics"
echo "   POST /api/ml-process/:id - Process specific complaint"
echo ""
echo "🛑 To stop all services, press Ctrl+C"
echo ""

# Keep script running and handle cleanup
trap 'echo "🛑 Stopping services..."; kill $FLASK_PID $NODE_PID 2>/dev/null; exit' INT

# Wait for user interrupt
wait
