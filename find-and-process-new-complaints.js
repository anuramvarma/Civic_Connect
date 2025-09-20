// Find and Process All New Unprocessed Complaints
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

async function findAndProcessNewComplaints() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Finding All New Unprocessed Complaints...\n');

    // Find all complaints that haven't been processed by ML
    const unprocessedComplaints = await Complaint.find({
      $or: [
        { 'mlVerification.status': { $exists: false } },
        { 'mlVerification.status': 'pending' },
        { 'mlVerification.status': { $exists: false } }
      ]
    }).sort({ CreatedAt: -1 });

    console.log(`📋 Found ${unprocessedComplaints.length} unprocessed complaints`);

    if (unprocessedComplaints.length === 0) {
      console.log('✅ All complaints have been processed!');
      return;
    }

    // Show all unprocessed complaints
    console.log('\n📋 Unprocessed Complaints:');
    unprocessedComplaints.forEach((complaint, index) => {
      console.log(`   ${index + 1}. ID: ${complaint._id}`);
      console.log(`      Title: ${complaint.Title}`);
      console.log(`      Description: ${complaint.Description}`);
      console.log(`      Status: ${complaint.status}`);
      console.log(`      Created: ${complaint.CreatedAt}`);
      console.log(`      ML Status: ${complaint.mlVerification?.status || 'Not processed'}`);
      console.log('');
    });

    // Filter for pothole complaints
    const potholeComplaints = unprocessedComplaints.filter(complaint => {
      const title = complaint.Title.toLowerCase();
      const description = complaint.Description.toLowerCase();
      return title.includes('pothole') || description.includes('pothole') ||
             title.includes('road') || description.includes('road');
    });

    console.log(`🚧 Found ${potholeComplaints.length} pothole-related complaints`);

    if (potholeComplaints.length === 0) {
      console.log('⚠️ No pothole complaints found to process');
      return;
    }

    // Check Flask model health
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

    // Process with Flask YOLO model
    console.log('\n2️⃣ Processing with SIH YOLO Model...');
    try {
      const processResponse = await axios.get('http://localhost:5001/process_all', { timeout: 120000 });
      if (processResponse.status === 200) {
        console.log('✅ Flask YOLO processing completed');
        
        const processedResults = processResponse.data.inserted;
        console.log(`📊 Processed ${processedResults.length} complaints`);

        // Update each pothole complaint with ML results
        for (const complaint of potholeComplaints) {
          const complaintResult = processedResults.find(item => 
            item.complaintId === complaint._id.toString()
          );

          if (complaintResult) {
            console.log(`\n📋 Processing complaint: ${complaint.Title}`);
            console.log(`   ID: ${complaint._id}`);
            console.log(`   Pothole Count: ${complaintResult.potholeCount}`);
            console.log(`   Status: ${complaintResult.status}`);

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
            await Complaint.findByIdAndUpdate(
              complaint._id,
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
              }
            );

            console.log(`   ✅ Updated: ${verified ? 'Pothole Detected' : 'No Pothole Detected'} (${Math.round(confidence * 100)}% confidence)`);
          } else {
            console.log(`\n⚠️ No result found for complaint: ${complaint.Title} (${complaint._id})`);
          }
        }

        console.log('\n🎉 All New Complaints Processing Complete!');
        
        // Show summary
        const updatedComplaints = await Complaint.find({
          _id: { $in: potholeComplaints.map(c => c._id) }
        });

        console.log('\n📊 Processing Summary:');
        updatedComplaints.forEach(complaint => {
          const mlVerification = complaint.mlVerification || {};
          console.log(`   - ${complaint.Title}: ${mlVerification.verified ? 'Pothole Detected' : 'No Pothole Detected'} (${Math.round((mlVerification.confidence || 0) * 100)}% confidence)`);
        });

      } else {
        console.log('❌ Flask processing failed');
      }
    } catch (error) {
      console.log('❌ Flask processing error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error processing complaints:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the processing
findAndProcessNewComplaints();
