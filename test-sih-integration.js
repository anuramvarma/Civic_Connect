// Test SIH ML Integration
// This script tests the complete workflow from image upload to ML processing

const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect';

// Schema (same as server.js)
const complaintSchema = new mongoose.Schema({
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  Title: {
    type: String,
    required: true
  },
  Description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  imageUrl : {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: "Pending",
    enum: ['Pending', 'Received', 'In-progress', 'Completed', 'Assigned']
  },
  department: {
    type: String,
    default: 'General'
  },
  assignedTo: {
    type: String,
    default: null
  },
  mlVerification: {
    verified: { type: Boolean, default: false },
    confidence: { type: Number, min: 0, max: 1 },
    analysis: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    pending: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] }
  },
  CreatedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true },
  Phone: { type: String },
  role: { type: String, default: 'citizen' },
  createdAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
const User = mongoose.model('user', userSchema);

// Test complaints with real image URLs
const testComplaints = [
  {
    Title: 'Large pothole on Main Street',
    Description: 'Deep pothole causing vehicle damage and traffic delays on Main Street near the hospital',
    location: 'Main Street, Near City Hospital',
    imageUrl: 'http://localhost:5000/uploads/1757774100253-PHOTO.jpg', // Use existing uploaded image
    department: 'Road Department'
  },
  {
    Title: 'Multiple potholes on Highway 101',
    Description: 'Several potholes on Highway 101 causing traffic issues',
    location: 'Highway 101, Mile Marker 15-17',
    imageUrl: 'http://localhost:5000/uploads/1758001578954-AA.jpg', // Use existing uploaded image
    department: 'Road Department'
  }
];

// Test Flask model health
async function testFlaskModelHealth() {
  try {
    console.log('🔍 Testing Flask YOLO model health...');
    const response = await axios.get('http://localhost:5000/health', {
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log('✅ Flask YOLO model is healthy:', response.data);
      return true;
    } else {
      console.log('❌ Flask YOLO model health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Flask YOLO model is not running:', error.message);
    console.log('💡 Start Flask model: cd SIH && python app.py');
    return false;
  }
}

// Test ML processing
async function testMLProcessing() {
  try {
    console.log('🤖 Testing ML processing...');
    const response = await axios.get('http://localhost:5000/process_all', {
      timeout: 120000 // 2 minutes timeout
    });
    
    if (response.status === 200) {
      console.log('✅ ML processing completed:', response.data);
      return response.data;
    } else {
      console.log('❌ ML processing failed');
      return null;
    }
  } catch (error) {
    console.log('❌ ML processing error:', error.message);
    return null;
  }
}

// Test CivicConnect API
async function testCivicConnectAPI() {
  try {
    console.log('🌐 Testing CivicConnect API...');
    const response = await axios.get('http://localhost:3000/api/complaints', {
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log('✅ CivicConnect API is working');
      return response.data;
    } else {
      console.log('❌ CivicConnect API failed');
      return null;
    }
  } catch (error) {
    console.log('❌ CivicConnect API error:', error.message);
    console.log('💡 Start CivicConnect: node server.js');
    return null;
  }
}

// Main test function
async function testSIHIntegration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    console.log('\n🧪 Testing SIH ML Integration...\n');

    // Test 1: Flask Model Health
    console.log('1️⃣ Testing Flask YOLO Model Health');
    const flaskHealthy = await testFlaskModelHealth();
    
    if (!flaskHealthy) {
      console.log('❌ Flask model is not running. Please start it first.');
      console.log('💡 Run: cd SIH && python app.py');
      return;
    }

    // Test 2: CivicConnect API
    console.log('\n2️⃣ Testing CivicConnect API');
    const apiWorking = await testCivicConnectAPI();
    
    if (!apiWorking) {
      console.log('❌ CivicConnect API is not running. Please start it first.');
      console.log('💡 Run: node server.js');
      return;
    }

    // Test 3: Create test complaints
    console.log('\n3️⃣ Creating test complaints...');
    let testUser = await User.findOne({ Email: 'test@civicconnect.com' });
    if (!testUser) {
      testUser = new User({
        Name: 'Test User',
        Email: 'test@civicconnect.com',
        Password: 'testpassword',
        Phone: '+1-555-0123',
        role: 'citizen'
      });
      await testUser.save();
      console.log('✅ Created test user');
    }

    const createdComplaints = [];
    for (const complaintData of testComplaints) {
      const complaint = new Complaint({
        UserId: testUser._id,
        ...complaintData,
        mlVerification: {
          verified: false,
          confidence: 0,
          analysis: null,
          severity: 'low',
          pending: true,
          verifiedAt: null,
          status: 'pending'
        }
      });
      
      await complaint.save();
      createdComplaints.push(complaint);
      console.log(`✅ Created complaint: ${complaint.Title}`);
    }

    // Test 4: ML Processing
    console.log('\n4️⃣ Testing ML Processing...');
    const mlResults = await testMLProcessing();
    
    if (mlResults && mlResults.inserted) {
      console.log(`✅ ML processing completed for ${mlResults.inserted.length} complaints`);
      
      // Show results
      mlResults.inserted.forEach(result => {
        console.log(`   📊 Complaint ${result.complaintId}: ${result.potholeCount} potholes detected (${result.status})`);
      });
    }

    // Test 5: Check updated complaints
    console.log('\n5️⃣ Checking updated complaints...');
    const updatedComplaints = await Complaint.find({ UserId: testUser._id }).sort({ CreatedAt: -1 });
    
    console.log('📋 Updated Complaints:');
    updatedComplaints.forEach(complaint => {
      const ml = complaint.mlVerification;
      console.log(`   ${complaint.Title}:`);
      console.log(`     Status: ${complaint.status}`);
      console.log(`     ML Verified: ${ml.verified ? 'Yes' : 'No'}`);
      console.log(`     Confidence: ${ml.confidence ? Math.round(ml.confidence * 100) + '%' : 'N/A'}`);
      console.log(`     Severity: ${ml.severity || 'N/A'}`);
      console.log(`     Analysis: ${ml.analysis || 'N/A'}`);
    });

    console.log('\n🎉 SIH ML Integration Test Completed Successfully!');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Open CivicConnect admin dashboard');
    console.log('   2. Check ML-verified complaints');
    console.log('   3. View pothole detection results');
    console.log('   4. Test with your own images');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testSIHIntegration();
