#!/bin/bash

# CivicConnect ML Integration - Complete Startup Script
echo "🚀 Starting CivicConnect with SIH ML Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - $service_name not ready yet...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Function to start Flask YOLO model
start_flask_model() {
    echo -e "${BLUE}🤖 Starting SIH Flask YOLO Model...${NC}"
    
    # Check if SIH directory exists
    if [ ! -d "SIH" ]; then
        echo -e "${RED}❌ SIH directory not found!${NC}"
        return 1
    fi
    
    cd SIH
    
    # Check if Python is installed
    if ! command -v python &> /dev/null; then
        echo -e "${RED}❌ Python is not installed. Please install Python first.${NC}"
        return 1
    fi
    
    # Check if requirements.txt exists
    if [ ! -f "requirements.txt" ]; then
        echo -e "${RED}❌ requirements.txt not found in SIH directory${NC}"
        return 1
    fi
    
    # Install Python dependencies
    echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    
    # Check if best.pt model exists
    if [ ! -f "best.pt" ]; then
        echo -e "${YELLOW}⚠️ best.pt model file not found. Make sure your trained model is in the SIH directory.${NC}"
        echo -e "${YELLOW}💡 If you need to download it, update the MODEL_URL in app.py${NC}"
    fi
    
    # Start Flask server in background
    echo -e "${BLUE}🚀 Starting Flask YOLO model server on port 5000...${NC}"
    python app.py &
    FLASK_PID=$!
    
    cd ..
    
    # Wait for Flask to be ready
    if wait_for_service "http://localhost:5000/health" "Flask YOLO Model"; then
        echo -e "${GREEN}✅ Flask YOLO model started successfully (PID: $FLASK_PID)${NC}"
        return 0
    else
        echo -e "${RED}❌ Flask YOLO model failed to start${NC}"
        kill $FLASK_PID 2>/dev/null
        return 1
    fi
}

# Function to start Node.js server
start_node_server() {
    echo -e "${BLUE}🌐 Starting CivicConnect Node.js server...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
        return 1
    fi
    
    # Install Node.js dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
        npm install
    fi
    
    # Start Node.js server in background
    echo -e "${BLUE}🚀 Starting Node.js server on port 3000...${NC}"
    node server.js &
    NODE_PID=$!
    
    # Wait for Node.js to be ready
    if wait_for_service "http://localhost:3000/api/health" "CivicConnect API"; then
        echo -e "${GREEN}✅ Node.js server started successfully (PID: $NODE_PID)${NC}"
        return 0
    else
        echo -e "${RED}❌ Node.js server failed to start${NC}"
        kill $NODE_PID 2>/dev/null
        return 1
    fi
}

# Function to run integration test
run_integration_test() {
    echo -e "${BLUE}🧪 Running ML integration test...${NC}"
    
    if [ -f "test-complete-ml-integration.js" ]; then
        node test-complete-ml-integration.js
    else
        echo -e "${YELLOW}⚠️ Integration test file not found${NC}"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}🎯 CivicConnect ML Integration Startup${NC}"
    echo -e "${GREEN}=====================================${NC}"
    
    # Check if ports are available
    if check_port 5000; then
        echo -e "${YELLOW}⚠️ Port 5000 is already in use. Flask model might already be running.${NC}"
        echo -e "${YELLOW}💡 You can check: http://localhost:5000/health${NC}"
    else
        if ! start_flask_model; then
            echo -e "${RED}❌ Failed to start Flask model. Exiting.${NC}"
            exit 1
        fi
    fi
    
    if check_port 3000; then
        echo -e "${YELLOW}⚠️ Port 3000 is already in use. Node.js server might already be running.${NC}"
        echo -e "${YELLOW}💡 You can check: http://localhost:3000${NC}"
    else
        if ! start_node_server; then
            echo -e "${RED}❌ Failed to start Node.js server. Exiting.${NC}"
            kill $FLASK_PID 2>/dev/null
            exit 1
        fi
    fi
    
    # Wait a moment for both services to stabilize
    sleep 3
    
    echo -e "${GREEN}🎉 CivicConnect with SIH ML Integration is running!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${BLUE}📊 Services Status:${NC}"
    echo -e "   🤖 Flask YOLO Model: ${GREEN}http://localhost:5000${NC}"
    echo -e "   🌐 CivicConnect Web: ${GREEN}http://localhost:3000${NC}"
    echo -e "   🔍 Health Check: ${GREEN}http://localhost:5000/health${NC}"
    echo -e "   🔄 ML Processing: ${GREEN}http://localhost:5000/process_all${NC}"
    echo ""
    echo -e "${BLUE}📋 Available Endpoints:${NC}"
    echo -e "   GET  /api/complaints - Get all complaints"
    echo -e "   GET  /api/ml-queue - ML processing queue status"
    echo -e "   GET  /api/ml-stats - ML statistics"
    echo -e "   POST /api/ml-process/:id - Process specific complaint"
    echo ""
    echo -e "${BLUE}🧪 Testing:${NC}"
    echo -e "   Run: ${YELLOW}node test-complete-ml-integration.js${NC}"
    echo ""
    echo -e "${BLUE}🛑 To stop all services, press Ctrl+C${NC}"
    echo ""
    
    # Run integration test
    run_integration_test
    
    # Keep script running and handle cleanup
    trap 'echo -e "${RED}🛑 Stopping services...${NC}"; kill $FLASK_PID $NODE_PID 2>/dev/null; exit' INT
    
    # Wait for user interrupt
    wait
}

# Run main function
main
