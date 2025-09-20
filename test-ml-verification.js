// Test script to add ML verification data to existing complaints
// Run this script to test the ML verification functionality

const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect';

// Schema (same as in server.js)
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
  // ML Verification fields for Potholes and Sanitation
  mlVerification: {
    verified: { type: Boolean, default: false },
    confidence: { type: Number, min: 0, max: 1 },
    analysis: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    pending: { type: Boolean, default: false },
    verifiedAt: { type: Date }
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

const Complaint = mongoose.model('Complaint', complaintSchema);

// Function to add ML verification to complaints
async function addMLVerificationToComplaints() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    // Get all complaints
    const complaints = await Complaint.find({});
    console.log(`📋 Found ${complaints.length} complaints`);

    let updatedCount = 0;

    for (const complaint of complaints) {
      const title = complaint.Title.toLowerCase();
      const description = complaint.Description.toLowerCase();
      
      // Check if it's a pothole or sanitation complaint
      const isPothole = title.includes('pothole') || description.includes('pothole') || 
                       title.includes('road') || description.includes('road') ||
                       title.includes('street') || description.includes('street') ||
                       title.includes('highway') || description.includes('highway');
      
      const isSanitation = title.includes('garbage') || description.includes('garbage') ||
                          title.includes('sanitation') || description.includes('sanitation') ||
                          title.includes('waste') || description.includes('waste') ||
                          title.includes('trash') || description.includes('trash');

      if (isPothole || isSanitation) {
        // Generate realistic ML verification data
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

        // Update the complaint with ML verification
        await Complaint.findByIdAndUpdate(complaint._id, {
          mlVerification: {
            verified: true,
            confidence: confidence,
            analysis: analysis,
            severity: severity,
            pending: false,
            verifiedAt: new Date()
          },
          updatedAt: new Date()
        });

        console.log(`✅ Updated complaint "${complaint.Title}" with ML verification (${severity} severity, ${Math.round(confidence * 100)}% confidence)`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 ML verification update completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total complaints: ${complaints.length}`);
    console.log(`   - Updated with ML verification: ${updatedCount}`);
    console.log(`   - Pothole/Sanitation complaints: ${updatedCount}`);
    
    console.log('\n🚀 You can now test the ML verification features in your frontend!');
    console.log('   - ML verified complaints will appear at the top');
    console.log('   - Confidence scores and analysis will be displayed');
    console.log('   - Priority tabs will work correctly');

  } catch (error) {
    console.error('❌ Error adding ML verification:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addMLVerificationToComplaints();
