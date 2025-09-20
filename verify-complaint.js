// Verify ML analysis for specific complaint
const mongoose = require('mongoose');

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
  imageUrl: {
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

// Use existing model to avoid compilation conflicts
let Complaint;
try {
  Complaint = mongoose.model('Complaint');
} catch (error) {
  Complaint = mongoose.model('Complaint', complaintSchema);
}

async function verifyComplaint(complaintId) {
  try {
    console.log(`🔌 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    console.log(`🔍 Finding complaint: ${complaintId}`);
    const complaint = await Complaint.findById(complaintId);
    
    if (!complaint) {
      throw new Error(`Complaint with ID ${complaintId} not found`);
    }

    console.log(`\n📋 Complaint Details:`);
    console.log(`   Title: ${complaint.Title}`);
    console.log(`   Description: ${complaint.Description}`);
    console.log(`   Location: ${complaint.location}`);
    console.log(`   Image URL: ${complaint.imageUrl}`);
    console.log(`   Status: ${complaint.status}`);
    console.log(`   Created: ${complaint.CreatedAt}`);
    console.log(`   Updated: ${complaint.updatedAt}`);

    console.log(`\n🤖 ML Verification Results:`);
    if (complaint.mlVerification) {
      console.log(`   Verified: ${complaint.mlVerification.verified}`);
      console.log(`   Confidence: ${Math.round((complaint.mlVerification.confidence || 0) * 100)}%`);
      console.log(`   Severity: ${complaint.mlVerification.severity}`);
      console.log(`   Status: ${complaint.mlVerification.status}`);
      console.log(`   Analysis: ${complaint.mlVerification.analysis}`);
      console.log(`   Verified At: ${complaint.mlVerification.verifiedAt}`);
      console.log(`   Pending: ${complaint.mlVerification.pending}`);
    } else {
      console.log(`   ❌ No ML verification data found`);
    }

    console.log(`\n✅ Verification completed successfully!`);

  } catch (error) {
    console.error(`❌ Verification failed:`, error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Main execution
async function main() {
  const complaintId = process.argv[2];
  
  if (!complaintId) {
    console.log('❌ Please provide a complaint ID');
    console.log('Usage: node verify-complaint.js <complaintId>');
    console.log('Example: node verify-complaint.js 68ce4bfabc5b6f7dd3846ad4');
    process.exit(1);
  }

  await verifyComplaint(complaintId);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { verifyComplaint };
