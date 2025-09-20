#!/usr/bin/env node

/**
 * Complete Workflow Test for ML Queue Implementation
 * Tests the complete flow: Complaint Creation → ML Queue → Processing → Database Update → Admin Dashboard
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

// Test Server Health
async function testServerHealth() {
  try {
    console.log('\n🔍 Testing Server Health...');
    const response = await axios.get('http://localhost:5000/api/health', { timeout: 10000 });
    
    if (response.status === 200) {
      console.log('✅ Server is healthy:', response.data);
      return true;
    } else {
      console.log('❌ Server health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server not available:', error.message);
    console.log('💡 Make sure server is running: node server.js');
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

// Create Test Pothole Complaint
async function createTestPotholeComplaint() {
  try {
    console.log('\n📝 Creating test pothole complaint...');
    
    const testComplaint = {
      UserId: new mongoose.Types.ObjectId(), // Create a dummy user ID
      Title: 'Critical Pothole on Main Street',
      Description: 'Large pothole causing vehicle damage. Multiple potholes visible in the area. Road surface is severely damaged.',
      location: 'Main Street, Downtown Area',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=300&fit=crop',
      status: 'Pending',
      department: 'Road Department'
    };
    
    const response = await axios.post('http://localhost:5000/api/complaints', testComplaint);
    
    if (response.status === 201) {
      console.log('✅ Test pothole complaint created:', response.data);
      return response.data;
    } else {
      console.log('❌ Failed to create test complaint:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating test complaint:', error.message);
    return null;
  }
}

// Create Test Non-Pothole Complaint
async function createTestNonPotholeComplaint() {
  try {
    console.log('\n📝 Creating test non-pothole complaint...');
    
    const testComplaint = {
      UserId: new mongoose.Types.ObjectId(), // Create a dummy user ID
      Title: 'Water Supply Issue',
      Description: 'No water supply in residential area. Water pressure is very low.',
      location: 'Residential Area, Suburb',
      imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&h=300&fit=crop',
      status: 'Pending',
      department: 'Water Department'
    };
    
    const response = await axios.post('http://localhost:5000/api/complaints', testComplaint);
    
    if (response.status === 201) {
      console.log('✅ Test non-pothole complaint created:', response.data);
      return response.data;
    } else {
      console.log('❌ Failed to create test complaint:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating test complaint:', error.message);
    return null;
  }
}

// Check ML Queue Status
async function checkMLQueueStatus() {
  try {
    console.log('\n🔍 Checking ML Queue Status...');
    const response = await axios.get('http://localhost:5000/api/ml-queue');
    
    if (response.status === 200) {
      console.log('✅ ML Queue Status:', response.data);
      return response.data;
    } else {
      console.log('❌ Failed to get ML queue status:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Error checking ML queue:', error.message);
    return null;
  }
}

// Check ML Stats
async function checkMLStats() {
  try {
    console.log('\n🔍 Checking ML Stats...');
    const response = await axios.get('http://localhost:5000/api/ml-stats');
    
    if (response.status === 200) {
      console.log('✅ ML Stats:', response.data);
      return response.data;
    } else {
      console.log('❌ Failed to get ML stats:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Error checking ML stats:', error.message);
    return null;
  }
}

// Check All Complaints
async function checkAllComplaints() {
  try {
    console.log('\n🔍 Checking All Complaints...');
    const response = await axios.get('http://localhost:5000/api/complaints');
    
    if (response.status === 200) {
      const complaints = response.data;
      console.log(`✅ Found ${complaints.length} total complaints`);
      
      const mlVerified = complaints.filter(c => c.mlVerification && c.mlVerification.verified);
      const mlPending = complaints.filter(c => c.mlVerification && c.mlVerification.pending);
      const mlFailed = complaints.filter(c => c.mlVerification && c.mlVerification.status === 'failed');
      
      console.log(`   ML Verified: ${mlVerified.length}`);
      console.log(`   ML Pending: ${mlPending.length}`);
      console.log(`   ML Failed: ${mlFailed.length}`);
      
      return complaints;
    } else {
      console.log('❌ Failed to get complaints:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Error checking complaints:', error.message);
    return null;
  }
}

// Test ML Processing for Specific Complaint
async function testMLProcessing(complaintId) {
  try {
    console.log(`\n🤖 Testing ML processing for complaint: ${complaintId}`);
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

// Wait for ML Processing
async function waitForMLProcessing(complaintId, maxWaitTime = 30000) {
  console.log(`\n⏳ Waiting for ML processing to complete for complaint: ${complaintId}`);
  
  const startTime = Date.now();
  const checkInterval = 2000; // Check every 2 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(`http://localhost:5000/api/complaints/${complaintId}`);
      const complaint = response.data;
      
      if (complaint.mlVerification) {
        if (complaint.mlVerification.status === 'completed') {
          console.log('✅ ML processing completed!');
          console.log('📊 ML Results:', {
            verified: complaint.mlVerification.verified,
            confidence: complaint.mlVerification.confidence,
            severity: complaint.mlVerification.severity,
            analysis: complaint.mlVerification.analysis
          });
          return complaint;
        } else if (complaint.mlVerification.status === 'failed') {
          console.log('❌ ML processing failed');
          return complaint;
        } else {
          console.log(`⏳ ML processing status: ${complaint.mlVerification.status}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.log('❌ Error checking ML processing status:', error.message);
      break;
    }
  }
  
  console.log('⏰ Timeout waiting for ML processing');
  return null;
}

// Main Test Function
async function runCompleteWorkflowTest() {
  console.log('🚀 Starting Complete ML Workflow Test...');
  console.log('=' .repeat(70));
  
  // Step 1: Connect to Database
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.log('❌ Cannot proceed without database connection');
    return;
  }
  
  // Step 2: Test Server Health
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log('❌ Cannot proceed without server');
    return;
  }
  
  // Step 3: Test Flask Model Health
  const flaskHealthy = await testFlaskModelHealth();
  if (!flaskHealthy) {
    console.log('⚠️ Flask model not available, but continuing with other tests...');
  }
  
  // Step 4: Check Initial State
  console.log('\n📊 Checking Initial State...');
  const initialQueue = await checkMLQueueStatus();
  const initialStats = await checkMLStats();
  const initialComplaints = await checkAllComplaints();
  
  // Step 5: Create Test Pothole Complaint
  console.log('\n🚧 Creating Test Pothole Complaint...');
  const potholeComplaint = await createTestPotholeComplaint();
  if (!potholeComplaint) {
    console.log('❌ Failed to create pothole complaint');
    return;
  }
  
  // Step 6: Create Test Non-Pothole Complaint
  console.log('\n💧 Creating Test Non-Pothole Complaint...');
  const nonPotholeComplaint = await createTestNonPotholeComplaint();
  if (!nonPotholeComplaint) {
    console.log('❌ Failed to create non-pothole complaint');
    return;
  }
  
  // Step 7: Check Queue After Creation
  console.log('\n📊 Checking Queue After Complaint Creation...');
  const queueAfterCreation = await checkMLQueueStatus();
  const statsAfterCreation = await checkMLStats();
  
  // Step 8: Wait for ML Processing
  if (flaskHealthy && potholeComplaint._id) {
    console.log('\n🤖 Waiting for ML Processing...');
    const processedComplaint = await waitForMLProcessing(potholeComplaint._id);
    
    if (processedComplaint) {
      console.log('\n✅ ML Processing Results:');
      console.log(`   Complaint ID: ${processedComplaint.complaintId}`);
      console.log(`   Title: ${processedComplaint.title}`);
      console.log(`   ML Verified: ${processedComplaint.mlVerification.verified}`);
      console.log(`   Confidence: ${Math.round(processedComplaint.mlVerification.confidence * 100)}%`);
      console.log(`   Severity: ${processedComplaint.mlVerification.severity}`);
      console.log(`   Analysis: ${processedComplaint.mlVerification.analysis}`);
      console.log(`   Status: ${processedComplaint.status}`);
    }
  }
  
  // Step 9: Final State Check
  console.log('\n📊 Final State Check...');
  const finalQueue = await checkMLQueueStatus();
  const finalStats = await checkMLStats();
  const finalComplaints = await checkAllComplaints();
  
  // Step 10: Summary
  console.log('\n' + '=' .repeat(70));
  console.log('🎉 Complete Workflow Test Summary:');
  console.log('');
  console.log('📝 Complaint Creation:');
  console.log(`   ✅ Pothole Complaint Created: ${potholeComplaint ? 'Yes' : 'No'}`);
  console.log(`   ✅ Non-Pothole Complaint Created: ${nonPotholeComplaint ? 'Yes' : 'No'}`);
  console.log('');
  console.log('🤖 ML Processing:');
  console.log(`   ✅ Flask Model Available: ${flaskHealthy ? 'Yes' : 'No'}`);
  console.log(`   ✅ ML Queue Working: ${queueAfterCreation ? 'Yes' : 'No'}`);
  console.log(`   ✅ ML Stats Available: ${finalStats ? 'Yes' : 'No'}`);
  console.log('');
  console.log('📊 Database Updates:');
  console.log(`   ✅ Total Complaints: ${finalComplaints ? finalComplaints.length : 'Unknown'}`);
  console.log(`   ✅ ML Verified: ${finalStats ? finalStats.mlVerifiedComplaints : 'Unknown'}`);
  console.log(`   ✅ ML Pending: ${finalStats ? finalStats.mlPendingComplaints : 'Unknown'}`);
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Open http://localhost:5000 in your browser');
  console.log('2. Navigate to Complaints section');
  console.log('3. Check ML Verified tab for processed complaints');
  console.log('4. Click ML Analysis button to see detailed results');
  console.log('5. Verify complaints appear with correct priority and status');
  
  // Cleanup
  await mongoose.disconnect();
  console.log('\n✅ Database disconnected');
}

// Run the test
if (require.main === module) {
  runCompleteWorkflowTest().catch(console.error);
}

module.exports = { runCompleteWorkflowTest };
