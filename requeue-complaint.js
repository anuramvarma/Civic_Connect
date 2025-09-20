// Requeue specific complaint for ML processing with real YOLO model
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

async function requeueComplaintForML(complaintId) {
  try {
    console.log(`🔌 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    console.log(`🔍 Finding complaint: ${complaintId}`);
    const complaint = await Complaint.findById(complaintId);
    
    if (!complaint) {
      throw new Error(`Complaint with ID ${complaintId} not found`);
    }

    console.log(`📋 Found complaint: ${complaint.Title}`);
    console.log(`📝 Description: ${complaint.Description}`);
    console.log(`📍 Location: ${complaint.location}`);
    console.log(`🖼️ Image URL: ${complaint.imageUrl}`);
    console.log(`📊 Current ML Status: ${complaint.mlVerification?.status || 'Not processed'}`);
    console.log(`📊 Current Analysis: ${complaint.mlVerification?.analysis || 'None'}`);

    // Reset ML verification to pending for reprocessing
    console.log(`\n🔄 Resetting ML verification to pending...`);
    
    await Complaint.findByIdAndUpdate(complaintId, {
      'mlVerification.pending': true,
      'mlVerification.status': 'pending',
      'mlVerification.verified': false,
      'mlVerification.confidence': 0,
      'mlVerification.analysis': null,
      'mlVerification.severity': 'low',
      'mlVerification.verifiedAt': null,
      updatedAt: new Date()
    });

    console.log(`✅ Complaint ${complaintId} reset and ready for ML reprocessing`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Make sure Flask YOLO model is running: cd SIH && python app.py`);
    console.log(`   2. The automatic ML queue will process this complaint within 30 seconds`);
    console.log(`   3. Check the database for updated ML results`);

    // Show the complaint details after reset
    const updatedComplaint = await Complaint.findById(complaintId);
    console.log(`\n📊 Updated ML Status:`);
    console.log(`   Pending: ${updatedComplaint.mlVerification?.pending}`);
    console.log(`   Status: ${updatedComplaint.mlVerification?.status}`);
    console.log(`   Verified: ${updatedComplaint.mlVerification?.verified}`);
    console.log(`   Analysis: ${updatedComplaint.mlVerification?.analysis || 'Will be updated by ML'}`);

  } catch (error) {
    console.error(`❌ Requeuing failed:`, error.message);
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
    console.log('Usage: node requeue-complaint.js <complaintId>');
    console.log('Example: node requeue-complaint.js 68ce4fa2bc5b6f7dd3846ad8');
    process.exit(1);
  }

  await requeueComplaintForML(complaintId);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { requeueComplaintForML };
