# Installation Script for ML-Powered CivicConnect

echo "🚀 Installing dependencies for ML-Powered CivicConnect..."

# Install axios dependency
echo "📦 Installing axios..."
npm install axios

echo "✅ Installation complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Start your server: node server.js"
echo "2. Test ML workflow: node test-ml-workflow.js"
echo "3. Run ML service: node ml-service.js"
echo ""
echo "📋 Available Scripts:"
echo "- npm start          # Start the main server"
echo "- node ml-service.js # Run ML processing service"
echo "- node test-ml-workflow.js # Test the complete workflow"
echo ""
echo "🔧 Configuration:"
echo "Update ML model URLs in ml-service.js:"
echo "- POTHOLE_MODEL_URL: Your pothole detection model endpoint"
echo "- SANITATION_MODEL_URL: Your sanitation detection model endpoint"
echo ""
echo "🎉 Ready to go!"
