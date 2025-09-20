// Process New Pothole Complaint with SIH YOLO Model
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

async function processNewPotholeComplaint() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🚧 Processing New Pothole Complaint...\n');

    // The new complaint ID from your database
    const complaintId = '68cd2281ef99b2f8ced05117';
    
    // Find the complaint
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      console.log('❌ Complaint not found');
      return;
    }

    console.log('📋 Found new complaint:', {
      id: complaint._id,
      title: complaint.Title,
      description: complaint.Description,
      imageUrl: complaint.imageUrl,
      status: complaint.status,
      mlVerification: complaint.mlVerification,
      createdAt: complaint.CreatedAt
    });

    // Check if it's a pothole complaint
    const isPotholeComplaint = complaint.Title.toLowerCase().includes('pothole') || 
                              complaint.Description.toLowerCase().includes('pothole') ||
                              complaint.Title.toLowerCase().includes('road') ||
                              complaint.Description.toLowerCase().includes('road');

    if (!isPotholeComplaint) {
      console.log('⚠️ This is not a pothole complaint');
      return;
    }

    console.log('✅ Pothole complaint detected, processing with SIH YOLO model...');

    // Step 1: Check Flask model health
    console.log('\n1️⃣ Checking Flask YOLO Model Health...');
    try {
      const healthResponse = await axios.get('http://localhost:5001/health', { timeout: 10000 });
      if (healthResponse.status === 200) {
        console.log('✅ Flask YOLO model is healthy:', healthResponse.data);
      } else {
        console.log('❌ Flask model health check failed');
        return;
      }
    } catch (error) {
      console.log('❌ Flask model not available:', error.message);
      console.log('💡 Make sure Flask model is running: cd SIH && python app.py');
      return;
    }

    // Step 2: Process with Flask YOLO model
    console.log('\n2️⃣ Processing with SIH YOLO Model...');
    try {
      const processResponse = await axios.get('http://localhost:5001/process_all', { timeout: 120000 });
      if (processResponse.status === 200) {
        console.log('✅ Flask YOLO processing completed:', processResponse.data);
        
        // Find our specific complaint in the results
        const complaintResult = processResponse.data.inserted.find(item => 
          item.complaintId === complaintId
        );

        if (complaintResult) {
          console.log('📊 Found our complaint result:', complaintResult);
          
          // Calculate ML verification data
          const potholeCount = complaintResult.potholeCount || 0;
          const verified = potholeCount > 0;
          const confidence = verified ? Math.min(0.7 + (potholeCount * 0.1), 0.95) : 0.1;
          const severity = verified ? (potholeCount > 2 ? 'high' : potholeCount > 1 ? 'medium' : 'low') : 'low';
          
          let analysis = '';
          if (verified) {
            if (potholeCount > 2) {
              analysis = `SIH YOLO model detected ${potholeCount} potholes. Multiple potholes requiring immediate attention.`;
            } else if (potholeCount > 1) {
              analysis = `SIH YOLO model detected ${potholeCount} potholes. Moderate severity requiring attention within 24 hours.`;
            } else {
              analysis = `SIH YOLO model detected ${potholeCount} pothole. Low severity requiring attention.`;
            }
          } else {
            analysis = 'SIH YOLO model did not detect any potholes in the image.';
          }

          // Update the complaint with ML results
          const updatedComplaint = await Complaint.findByIdAndUpdate(
            complaintId,
            {
              'mlVerification.verified': verified,
              'mlVerification.confidence': confidence,
              'mlVerification.analysis': analysis,
              'mlVerification.severity': severity,
              'mlVerification.pending': false,
              'mlVerification.status': 'completed',
              'mlVerification.verifiedAt': new Date(),
              'status': verified ? 'Accepted' : 'Not Accepted',
              updatedAt: new Date()
            },
            { new: true }
          );

          console.log('\n✅ ML Processing Complete!');
          console.log('📊 Results:', {
            verified: verified,
            confidence: Math.round(confidence * 100) + '%',
            severity: severity,
            potholeCount: potholeCount,
            analysis: analysis,
            status: updatedComplaint.status
          });

        } else {
          console.log('⚠️ Our complaint was not found in the processing results');
        }
      } else {
        console.log('❌ Flask processing failed');
      }
    } catch (error) {
      console.log('❌ Flask processing error:', error.message);
    }

    // Step 3: Verify the update
    console.log('\n3️⃣ Verifying Updated Complaint...');
    const updatedComplaint = await Complaint.findById(complaintId);
    console.log('📋 Updated complaint:', {
      id: updatedComplaint._id,
      title: updatedComplaint.Title,
      status: updatedComplaint.status,
      mlVerification: updatedComplaint.mlVerification
    });

    console.log('\n🎉 New Pothole Complaint Processing Complete!');

  } catch (error) {
    console.error('❌ Error processing complaint:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the processing
processNewPotholeComplaint();
