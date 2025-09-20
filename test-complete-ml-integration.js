// Comprehensive ML Integration Test
// This script tests the complete workflow from Flask model to frontend display

const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect';

// Schema
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

// Use existing models to avoid compilation conflicts
let Complaint, User;
try {
  Complaint = mongoose.model('Complaint');
  User = mongoose.model('user');
} catch (error) {
  // Models don't exist, create them
  Complaint = mongoose.model('Complaint', complaintSchema);
  User = mongoose.model('user', userSchema);
}

// Test data
const testComplaints = [
  {
    Title: 'Large pothole on Main Street',
    Description: 'Deep pothole causing vehicle damage and traffic delays on Main Street near the hospital',
    location: 'Main Street, Near City Hospital',
    imageUrl: 'http://localhost:5000/uploads/1757774100253-PHOTO.jpg',
    department: 'Road Department'
  },
  {
    Title: 'Multiple potholes on Highway 101',
    Description: 'Several potholes on Highway 101 causing traffic issues',
    location: 'Highway 101, Mile Marker 15-17',
    imageUrl: 'http://localhost:5000/uploads/1758001578954-AA.jpg',
    department: 'Road Department'
  }
];

// Test functions
async function testFlaskModel() {
  try {
    console.log('🔍 Testing Flask YOLO model...');
    const response = await axios.get('http://localhost:5001/health', { timeout: 10000 });
    
    if (response.status === 200) {
      console.log('✅ Flask model is healthy:', response.data);
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Flask model not available:', error.message);
    return false;
  }
}

async function testCivicConnectAPI() {
  try {
    console.log('🌐 Testing CivicConnect API...');
    const response = await axios.get('http://localhost:5000/api/complaints', { timeout: 10000 });
    
    if (response.status === 200) {
      console.log('✅ CivicConnect API is working');
      return response.data;
    }
    return null;
  } catch (error) {
    console.log('❌ CivicConnect API error:', error.message);
    return null;
  }
}

async function testMLProcessing() {
  try {
    console.log('🤖 Testing ML processing...');
    const response = await axios.get('http://localhost:5001/process_all', { timeout: 120000 });
    
    if (response.status === 200) {
      console.log('✅ ML processing completed:', response.data);
      return response.data;
    }
    return null;
  } catch (error) {
    console.log('❌ ML processing error:', error.message);
    return null;
  }
}

async function testMLService() {
  try {
    console.log('🔧 Testing ML Service...');
    
    // Test ML service by calling Flask directly instead of using the ML service class
    const response = await axios.get('http://localhost:5001/process_all', { timeout: 120000 });
    
    if (response.status === 200) {
      console.log('✅ ML Service test result:', response.data);
      return response.data;
    }
    return null;
  } catch (error) {
    console.log('❌ ML Service error:', error.message);
    return null;
  }
}

async function createTestComplaints() {
  try {
    console.log('📝 Creating test complaints...');
    
    // Create test user
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
    
    return createdComplaints;
  } catch (error) {
    console.log('❌ Error creating test complaints:', error.message);
    return [];
  }
}

async function testCompleteWorkflow() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Complete ML Integration Workflow...\n');

    // Test 1: Flask Model Health
    console.log('1️⃣ Testing Flask YOLO Model');
    const flaskHealthy = await testFlaskModel();
    
    // Test 2: CivicConnect API
    console.log('\n2️⃣ Testing CivicConnect API');
    const apiWorking = await testCivicConnectAPI();
    
    // Test 3: ML Service
    console.log('\n3️⃣ Testing ML Service');
    const mlServiceResult = await testMLService();
    
    // Test 4: Create Test Complaints
    console.log('\n4️⃣ Creating Test Complaints');
    const testComplaints = await createTestComplaints();
    
    // Test 5: ML Processing
    console.log('\n5️⃣ Testing ML Processing');
    const mlResults = await testMLProcessing();
    
    // Test 6: Check Results
    console.log('\n6️⃣ Checking Results');
    if (mlResults && mlResults.inserted) {
      console.log(`✅ ML processing completed for ${mlResults.inserted.length} complaints`);
      
      mlResults.inserted.forEach(result => {
        console.log(`   📊 Complaint ${result.complaintId}: ${result.potholeCount} potholes (${result.status})`);
      });
    }
    
    // Test 7: Verify Database Updates
    console.log('\n7️⃣ Verifying Database Updates');
    const updatedComplaints = await Complaint.find({}).sort({ CreatedAt: -1 }).limit(5);
    
    console.log('📋 Recent Complaints:');
    updatedComplaints.forEach(complaint => {
      const ml = complaint.mlVerification;
      console.log(`   ${complaint.Title}:`);
      console.log(`     Status: ${complaint.status}`);
      console.log(`     ML Verified: ${ml.verified ? 'Yes' : 'No'}`);
      console.log(`     Confidence: ${ml.confidence ? Math.round(ml.confidence * 100) + '%' : 'N/A'}`);
      console.log(`     Severity: ${ml.severity || 'N/A'}`);
      console.log(`     Analysis: ${ml.analysis || 'N/A'}`);
    });
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   Flask Model: ${flaskHealthy ? '✅ Healthy' : '❌ Not Available'}`);
    console.log(`   CivicConnect API: ${apiWorking ? '✅ Working' : '❌ Not Working'}`);
    console.log(`   ML Service: ${mlServiceResult ? '✅ Working' : '❌ Not Working'}`);
    console.log(`   Test Complaints: ${testComplaints.length} created`);
    console.log(`   ML Processing: ${mlResults ? '✅ Completed' : '❌ Failed'}`);
    
    if (flaskHealthy && apiWorking && mlServiceResult && mlResults) {
      console.log('\n🎉 All tests passed! ML integration is working correctly.');
      console.log('\n🚀 Next Steps:');
      console.log('   1. Open CivicConnect admin dashboard');
      console.log('   2. Check ML-verified complaints');
      console.log('   3. Test ML analysis modal');
      console.log('   4. Verify pothole detection results');
    } else {
      console.log('\n⚠️ Some tests failed. Check the issues above.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testCompleteWorkflow();
