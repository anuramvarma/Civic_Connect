// Test Script for ML-Powered Complaint Workflow
// This script demonstrates the complete workflow from complaint creation to ML processing

const mongoose = require('mongoose');

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

// Test complaints data
const testComplaints = [
  {
    Title: 'Large pothole on Highway 101',
    Description: 'Deep pothole causing vehicle damage and traffic delays on Highway 101 near mile marker 15',
    location: 'Highway 101, Mile Marker 15-17',
    imageUrl: 'http://localhost:5000/uploads/pothole-highway.jpg',
    department: 'Road Department'
  },
  {
    Title: 'Garbage accumulation in commercial area',
    Description: 'Significant garbage buildup in commercial district causing hygiene issues',
    location: 'Commercial Street, Shop No. 15-20',
    imageUrl: 'http://localhost:5000/uploads/garbage-commercial.jpg',
    department: 'Sanitation Department'
  },
  {
    Title: 'Street light malfunction',
    Description: 'Street light not working properly causing safety concerns',
    location: 'Oak Avenue, Block 5',
    imageUrl: 'http://localhost:5000/uploads/street-light.jpg',
    department: 'Electrical Department'
  },
  {
    Title: 'Multiple potholes on Main Street',
    Description: 'Several potholes on Main Street near the hospital entrance',
    location: 'Main Street, Near City Hospital',
    imageUrl: 'http://localhost:5000/uploads/potholes-main.jpg',
    department: 'Road Department'
  },
  {
    Title: 'Waste management issue',
    Description: 'Garbage not being collected regularly in residential area',
    location: 'Residential Area, Block A',
    imageUrl: 'http://localhost:5000/uploads/waste-residential.jpg',
    department: 'Sanitation Department'
  }
];

// Simulate ML processing
async function simulateMLProcessing(complaint) {
  console.log(`🤖 Simulating ML processing for: ${complaint.Title}`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const title = complaint.Title.toLowerCase();
  const description = complaint.Description.toLowerCase();
  
  const isPothole = title.includes('pothole') || description.includes('pothole') || 
                   title.includes('road') || description.includes('road') ||
                   title.includes('street') || description.includes('street') ||
                   title.includes('highway') || description.includes('highway');
  
  const isSanitation = title.includes('garbage') || description.includes('garbage') ||
                      title.includes('sanitation') || description.includes('sanitation') ||
                      title.includes('waste') || description.includes('waste');
  
  let mlResult = {
    verified: false,
    confidence: 0,
    analysis: 'No ML analysis available',
    severity: 'low',
    pending: false,
    verifiedAt: null,
    status: 'completed'
  };
  
  if (isPothole || isSanitation) {
    const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
    const severity = confidence > 0.9 ? 'high' : confidence > 0.8 ? 'medium' : 'low';
    
    let analysis = '';
    if (isPothole) {
      analysis = confidence > 0.9 ? 
        'Deep pothole detected in image analysis. Severe damage requiring immediate attention.' :
        confidence > 0.8 ?
        'Pothole confirmed in image analysis. Moderate severity requiring attention within 24 hours.' :
        'Possible pothole detected. Low confidence - manual verification recommended.';
    } else if (isSanitation) {
      analysis = confidence > 0.9 ?
        'Significant garbage accumulation confirmed in images. High priority cleanup required.' :
        confidence > 0.8 ?
        'Garbage accumulation confirmed in images. Moderate severity requiring attention within 24 hours.' :
        'Possible sanitation issue detected. Low confidence - manual verification recommended.';
    }
    
    mlResult = {
      verified: true,
      confidence: confidence,
      analysis: analysis,
      severity: severity,
      pending: false,
      verifiedAt: new Date(),
      status: 'completed'
    };
  }
  
  return mlResult;
}

// Main test function
async function testMLWorkflow() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    // Create a test user if not exists
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

    console.log('\n📋 Testing ML-Powered Complaint Workflow...\n');

    const createdComplaints = [];

    // Step 1: Create complaints (Citizen posts complaints)
    console.log('👤 Step 1: Citizen posts complaints...');
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

    console.log(`\n📊 Created ${createdComplaints.length} complaints`);

    // Step 2: ML Processing (ML model processes complaints)
    console.log('\n🤖 Step 2: ML model processes complaints...');
    for (const complaint of createdComplaints) {
      const mlResult = await simulateMLProcessing(complaint);
      
      // Update complaint with ML results
      await Complaint.findByIdAndUpdate(complaint._id, {
        mlVerification: mlResult,
        updatedAt: new Date()
      });
      
      console.log(`✅ ML processed: ${complaint.Title} (${mlResult.severity} severity, ${Math.round(mlResult.confidence * 100)}% confidence)`);
    }

    // Step 3: Display results (Admin dashboard view)
    console.log('\n📊 Step 3: Admin dashboard results...');
    
    const allComplaints = await Complaint.find({ UserId: testUser._id }).sort({ CreatedAt: -1 });
    
    console.log('\n🎯 ML Verification Summary:');
    const mlVerified = allComplaints.filter(c => c.mlVerification.verified);
    const mlPending = allComplaints.filter(c => c.mlVerification.pending);
    
    console.log(`   Total Complaints: ${allComplaints.length}`);
    console.log(`   ML Verified: ${mlVerified.length}`);
    console.log(`   ML Pending: ${mlPending.length}`);
    console.log(`   Verification Rate: ${Math.round((mlVerified.length / allComplaints.length) * 100)}%`);

    console.log('\n🔍 Detailed Results:');
    allComplaints.forEach(complaint => {
      const ml = complaint.mlVerification;
      const status = ml.verified ? '✅ Verified' : '❌ Not Verified';
      const severity = ml.severity ? ` (${ml.severity} severity)` : '';
      const confidence = ml.confidence ? ` - ${Math.round(ml.confidence * 100)}% confidence` : '';
      
      console.log(`   ${status}${severity}${confidence}: ${complaint.Title}`);
      if (ml.analysis) {
        console.log(`      Analysis: ${ml.analysis}`);
      }
    });

    // Step 4: Show admin dashboard metrics
    console.log('\n📈 Admin Dashboard Metrics:');
    
    const severityStats = allComplaints.reduce((acc, complaint) => {
      const severity = complaint.mlVerification.severity || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    console.log('   Severity Distribution:');
    Object.entries(severityStats).forEach(([severity, count]) => {
      console.log(`     ${severity}: ${count} complaints`);
    });

    const avgConfidence = mlVerified.reduce((sum, c) => sum + c.mlVerification.confidence, 0) / mlVerified.length;
    console.log(`   Average Confidence: ${Math.round(avgConfidence * 100)}%`);

    console.log('\n🎉 ML Workflow Test Completed Successfully!');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Integrate your actual ML models');
    console.log('   2. Deploy the system to production');
    console.log('   3. Monitor ML processing performance');
    console.log('   4. Add real-time updates to admin dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testMLWorkflow();
