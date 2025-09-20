// Monitor YOLO processing progress for specific complaint
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

async function monitorYOLOProgress(complaintId) {
  try {
    console.log(`🔌 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    console.log(`\n🔍 Monitoring YOLO processing for complaint: ${complaintId}`);
    console.log(`⏳ Checking every 10 seconds...\n`);

    let previousStatus = null;
    let checkCount = 0;
    const maxChecks = 30; // Monitor for 5 minutes max

    const monitorInterval = setInterval(async () => {
      try {
        checkCount++;
        const complaint = await Complaint.findById(complaintId);
        
        if (!complaint) {
          console.log(`❌ Complaint ${complaintId} not found`);
          clearInterval(monitorInterval);
          return;
        }

        const currentStatus = complaint.mlVerification?.status || 'unknown';
        const currentAnalysis = complaint.mlVerification?.analysis || 'No analysis yet';
        const currentConfidence = complaint.mlVerification?.confidence || 0;
        const isPending = complaint.mlVerification?.pending || false;

        // Show progress if status changed
        if (currentStatus !== previousStatus) {
          console.log(`\n📊 Status Update (Check ${checkCount}):`);
          console.log(`   Status: ${currentStatus}`);
          console.log(`   Pending: ${isPending}`);
          console.log(`   Confidence: ${Math.round(currentConfidence * 100)}%`);
          console.log(`   Analysis: ${currentAnalysis}`);
          console.log(`   Updated: ${complaint.updatedAt}`);
          
          previousStatus = currentStatus;
        } else {
          // Show progress indicator
          const dots = '.'.repeat((checkCount % 4) + 1);
          process.stdout.write(`\r⏳ YOLO Processing${dots} (${checkCount}s)`);
        }

        // Check if processing is complete
        if (currentStatus === 'completed') {
          console.log(`\n\n🎉 YOLO Processing Complete!`);
          console.log(`\n📊 Final Results:`);
          console.log(`   Verified: ${complaint.mlVerification?.verified}`);
          console.log(`   Confidence: ${Math.round((complaint.mlVerification?.confidence || 0) * 100)}%`);
          console.log(`   Severity: ${complaint.mlVerification?.severity}`);
          console.log(`   Analysis: ${complaint.mlVerification?.analysis}`);
          console.log(`   Verified At: ${complaint.mlVerification?.verifiedAt}`);
          
          clearInterval(monitorInterval);
          await mongoose.disconnect();
          console.log('🔌 Disconnected from MongoDB');
          return;
        }

        // Check if processing failed
        if (currentStatus === 'failed') {
          console.log(`\n\n❌ YOLO Processing Failed!`);
          console.log(`   Analysis: ${currentAnalysis}`);
          clearInterval(monitorInterval);
          await mongoose.disconnect();
          console.log('🔌 Disconnected from MongoDB');
          return;
        }

        // Stop monitoring after max checks
        if (checkCount >= maxChecks) {
          console.log(`\n\n⏰ Monitoring timeout reached (${maxChecks * 10} seconds)`);
          console.log(`   Current Status: ${currentStatus}`);
          console.log(`   Analysis: ${currentAnalysis}`);
          console.log(`\n💡 YOLO processing may still be running. Check manually.`);
          clearInterval(monitorInterval);
          await mongoose.disconnect();
          console.log('🔌 Disconnected from MongoDB');
          return;
        }

      } catch (error) {
        console.error(`\n❌ Monitoring error:`, error.message);
        clearInterval(monitorInterval);
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
      }
    }, 10000); // Check every 10 seconds

  } catch (error) {
    console.error(`❌ Monitoring setup failed:`, error.message);
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Main execution
async function main() {
  const complaintId = process.argv[2];
  
  if (!complaintId) {
    console.log('❌ Please provide a complaint ID');
    console.log('Usage: node monitor-yolo.js <complaintId>');
    console.log('Example: node monitor-yolo.js 68ce4fa2bc5b6f7dd3846ad8');
    process.exit(1);
  }

  await monitorYOLOProgress(complaintId);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { monitorYOLOProgress };
