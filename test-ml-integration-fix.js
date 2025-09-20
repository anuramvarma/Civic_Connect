#!/usr/bin/env node

/**
 * Test Script for ML Integration Fix
 * Tests the complete pothole ML model analysis and admin dashboard display
 */

const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect';

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
}

// Test Flask Model Health
async function testFlaskModelHealth() {
  try {
    console.log('\n🔍 Testing Flask Model Health...');
    const response = await axios.get('http://localhost:5001/health', { timeout: 10000 });
    
    if (response.status === 200) {
      console.log('✅ Flask model is healthy:', response.data);
      return true;
    } else {
      console.log('❌ Flask model health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Flask model not available:', error.message);
    console.log('💡 Make sure Flask model is running: cd SIH && python app.py');
    return false;
  }
}

// Test Individual Complaint Processing
async function testIndividualComplaintProcessing(complaintId) {
  try {
    console.log(`\n🔍 Testing individual complaint processing for: ${complaintId}`);
    const response = await axios.get(`http://localhost:5001/process_complaint/${complaintId}`, { timeout: 120000 });
    
    if (response.status === 200) {
      console.log('✅ Individual complaint processing successful:', response.data);
      return response.data;
    } else {
      console.log('❌ Individual complaint processing failed:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Individual complaint processing error:', error.message);
    return null;
  }
}

// Test Process All Complaints
async function testProcessAllComplaints() {
  try {
    console.log('\n🔍 Testing process all complaints...');
    const response = await axios.get('http://localhost:5001/process_all', { timeout: 120000 });
    
    if (response.status === 200) {
      console.log('✅ Process all complaints successful:', response.data);
      return response.data;
    } else {
      console.log('❌ Process all complaints failed:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Process all complaints error:', error.message);
    return null;
  }
}

// Test Server API Endpoints
async function testServerAPIEndpoints() {
  try {
    console.log('\n🔍 Testing Server API Endpoints...');
    
    // Test complaints endpoint
    const complaintsResponse = await axios.get('http://localhost:5000/api/complaints');
    console.log('✅ Complaints API working:', complaintsResponse.data.length, 'complaints found');
    
    // Test ML stats endpoint
    const mlStatsResponse = await axios.get('http://localhost:5000/api/ml-stats');
    console.log('✅ ML Stats API working:', mlStatsResponse.data);
    
    // Test ML queue endpoint
    const mlQueueResponse = await axios.get('http://localhost:5000/api/ml-queue');
    console.log('✅ ML Queue API working:', mlQueueResponse.data);
    
    return true;
  } catch (error) {
    console.log('❌ Server API test failed:', error.message);
    return false;
  }
}

// Test ML Processing for Specific Complaint
async function testMLProcessingForComplaint(complaintId) {
  try {
    console.log(`\n🔍 Testing ML processing for complaint: ${complaintId}`);
    const response = await axios.post(`http://localhost:5000/api/ml-process/${complaintId}`);
    
    if (response.status === 200) {
      console.log('✅ ML processing successful:', response.data);
      return response.data;
    } else {
      console.log('❌ ML processing failed:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ ML processing error:', error.message);
    return null;
  }
}

// Create Test Complaint
async function createTestComplaint() {
  try {
    console.log('\n🔍 Creating test pothole complaint...');
    
    const Complaint = mongoose.model('Complaint', new mongoose.Schema({
      UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      Title: { type: String, required: true },
      Description: { type: String, required: true },
      location: { type: String, required: true },
      imageUrl: { type: String, required: true },
      status: { type: String, default: "Pending" },
      department: { type: String, default: 'General' },
      assignedTo: { type: String, default: null },
      mlVerification: {
        verified: { type: Boolean, default: false },
        confidence: { type: Number, min: 0, max: 1 },
        analysis: { type: String },
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        pending: { type: Boolean, default: false },
        verifiedAt: { type: Date }
      },
      CreatedAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }));
    
    // Create a test user first
    const User = mongoose.model('user', new mongoose.Schema({
      Name: { type: String, required: true },
      Email: { type: String, required: true, unique: true },
      Password: { type: String, required: true },
      Phone: { type: String },
      role: { type: String, default: 'citizen' },
      createdAt: { type: Date, default: Date.now }
    }));
    
    let testUser = await User.findOne({ Email: 'test@mlintegration.com' });
    if (!testUser) {
      testUser = new User({
        Name: 'ML Test User',
        Email: 'test@mlintegration.com',
        Password: 'testpassword123',
        Phone: '1234567890'
      });
      await testUser.save();
      console.log('✅ Test user created');
    }
    
    const testComplaint = new Complaint({
      UserId: testUser._id,
      Title: 'Test Pothole Complaint for ML Analysis',
      Description: 'Large pothole on main road causing vehicle damage. Multiple potholes visible in the area.',
      location: 'Test Street, Test City',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=300&fit=crop',
      status: 'Pending',
      department: 'Road Department',
      mlVerification: {
        pending: true,
        status: 'pending'
      }
    });
    
    await testComplaint.save();
    console.log('✅ Test complaint created:', testComplaint._id.toString());
    return testComplaint._id.toString();
  } catch (error) {
    console.log('❌ Error creating test complaint:', error.message);
    return null;
  }
}

// Main Test Function
async function runMLIntegrationTest() {
  console.log('🚀 Starting ML Integration Test...');
  console.log('=' .repeat(60));
  
  // Step 1: Connect to Database
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.log('❌ Cannot proceed without database connection');
    return;
  }
  
  // Step 2: Test Flask Model Health
  const flaskHealthy = await testFlaskModelHealth();
  if (!flaskHealthy) {
    console.log('⚠️ Flask model not available, but continuing with other tests...');
  }
  
  // Step 3: Test Server API Endpoints
  const serverAPIOk = await testServerAPIEndpoints();
  if (!serverAPIOk) {
    console.log('❌ Server API not working, make sure server is running: node server.js');
    return;
  }
  
  // Step 4: Create Test Complaint
  const testComplaintId = await createTestComplaint();
  if (!testComplaintId) {
    console.log('❌ Cannot create test complaint');
    return;
  }
  
  // Step 5: Test ML Processing
  if (flaskHealthy) {
    console.log('\n🤖 Testing ML Processing...');
    
    // Test individual complaint processing
    const individualResult = await testIndividualComplaintProcessing(testComplaintId);
    
    // Test process all complaints
    const processAllResult = await testProcessAllComplaints();
    
    // Test server-side ML processing
    const serverMLResult = await testMLProcessingForComplaint(testComplaintId);
    
    console.log('\n📊 ML Processing Results Summary:');
    console.log('Individual Processing:', individualResult ? '✅ Success' : '❌ Failed');
    console.log('Process All:', processAllResult ? '✅ Success' : '❌ Failed');
    console.log('Server ML Processing:', serverMLResult ? '✅ Success' : '❌ Failed');
  }
  
  // Step 6: Test Admin Dashboard Display
  console.log('\n📊 Testing Admin Dashboard Display...');
  try {
    const complaintsResponse = await axios.get('http://localhost:5000/api/complaints');
    const complaints = complaintsResponse.data;
    
    const mlVerifiedComplaints = complaints.filter(c => 
      c.mlVerification && c.mlVerification.verified
    );
    
    const mlPendingComplaints = complaints.filter(c => 
      c.mlVerification && c.mlVerification.pending
    );
    
    console.log('✅ Admin Dashboard Data:');
    console.log(`   Total Complaints: ${complaints.length}`);
    console.log(`   ML Verified: ${mlVerifiedComplaints.length}`);
    console.log(`   ML Pending: ${mlPendingComplaints.length}`);
    
    if (mlVerifiedComplaints.length > 0) {
      console.log('\n🎯 ML Verified Complaints:');
      mlVerifiedComplaints.forEach(complaint => {
        const ml = complaint.mlVerification;
        console.log(`   ✅ ${complaint.title}`);
        console.log(`      Confidence: ${Math.round(ml.confidence * 100)}%`);
        console.log(`      Severity: ${ml.severity}`);
        console.log(`      Analysis: ${ml.analysis}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Admin dashboard test failed:', error.message);
  }
  
  // Step 7: Test ML Analysis Modal
  console.log('\n🔍 Testing ML Analysis Modal...');
  try {
    const complaintsResponse = await axios.get('http://localhost:5000/api/complaints');
    const complaints = complaintsResponse.data;
    
    const mlVerifiedComplaint = complaints.find(c => 
      c.mlVerification && c.mlVerification.verified
    );
    
    if (mlVerifiedComplaint) {
      console.log('✅ ML Analysis Modal Test Data Available:');
      console.log(`   Complaint: ${mlVerifiedComplaint.title}`);
      console.log(`   ML Verification: ${JSON.stringify(mlVerifiedComplaint.mlVerification, null, 2)}`);
      console.log('   ✅ ML Analysis Modal should display correctly in browser');
    } else {
      console.log('⚠️ No ML verified complaints found for modal test');
    }
    
  } catch (error) {
    console.log('❌ ML Analysis Modal test failed:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 ML Integration Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Open http://localhost:5000 in your browser');
  console.log('2. Navigate to the Complaints section');
  console.log('3. Look for ML verified complaints (they should appear at the top)');
  console.log('4. Click "ML Analysis" button on verified complaints to see the modal');
  console.log('5. Check the ML Verified tab for prioritized complaints');
  
  // Cleanup
  await mongoose.disconnect();
  console.log('\n✅ Database disconnected');
}

// Run the test
if (require.main === module) {
  runMLIntegrationTest().catch(console.error);
}

module.exports = { runMLIntegrationTest };
