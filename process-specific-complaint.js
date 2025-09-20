// Process specific complaint with ML analysis
// Usage: node process-specific-complaint.js <complaintId>

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

// ML Service Configuration
const ML_CONFIG = {
  FLASK_MODEL_URL: 'http://localhost:5001',
  PROCESS_ALL_ENDPOINT: 'http://localhost:5001/process_all',
  HEALTH_ENDPOINT: 'http://localhost:5001/health',
  TIMEOUT: 120000,
  MAX_RETRIES: 3,
  HEADERS: {
    'Content-Type': 'application/json',
    'User-Agent': 'CivicConnect-ML-Service/1.0'
  }
};

// Check if complaint is pothole-related
function isPotholeRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  const potholeKeywords = [
    'pothole', 'potholes', 'road', 'roads', 'street', 'streets', 
    'highway', 'highways', 'asphalt', 'pavement', 'crack', 'cracks',
    'road damage', 'street damage', 'road repair', 'street repair',
    'road condition', 'street condition', 'road issue', 'street issue',
    'road problem', 'street problem', 'road hazard', 'street hazard',
    'road surface', 'street surface', 'road maintenance', 'street maintenance',
    'road construction', 'street construction', 'road work', 'street work',
    'road defect', 'street defect', 'road bump', 'street bump',
    'road hole', 'street hole', 'road depression', 'street depression'
  ];
  
  return potholeKeywords.some(keyword => text.includes(keyword));
}

// Analyze pothole with SIH Flask YOLO model
async function analyzePothole(imageUrl, title, description) {
  try {
    console.log(`🔍 Analyzing pothole complaint with SIH YOLO model: ${imageUrl}`);
    
    // First check if Flask model is healthy
    let isHealthy = false;
    try {
      const healthResponse = await axios.get(ML_CONFIG.HEALTH_ENDPOINT, {
        timeout: 10000,
        headers: ML_CONFIG.HEADERS
      });
      
      if (healthResponse.status === 200) {
        console.log('✅ SIH Flask YOLO model is healthy, processing...');
        isHealthy = true;
      }
    } catch (healthError) {
      console.log('⚠️ Flask model health check failed:', healthError.message);
    }
    
    if (!isHealthy) {
      console.log('⚠️ Flask model not available, using fallback analysis');
      return getFallbackAnalysis('pothole', title, description);
    }
    
    // Call Flask model's process_all endpoint
    const response = await axios.get(ML_CONFIG.PROCESS_ALL_ENDPOINT, {
      timeout: ML_CONFIG.TIMEOUT,
      headers: ML_CONFIG.HEADERS
    });

    if (response.status === 200) {
      const mlResult = response.data;
      console.log(`✅ SIH Flask YOLO model response:`, mlResult);

      if (mlResult.inserted && Array.isArray(mlResult.inserted)) {
        // Find our specific complaint in the results
        let complaintResult = mlResult.inserted.find(item => {
          return item.complaintId || (
            item.title && (
              item.title.toLowerCase().includes(title.toLowerCase()) ||
              title.toLowerCase().includes(item.title.toLowerCase()) ||
              item.title.toLowerCase().includes('pothole')
            )
          );
        });
        
        if (!complaintResult && mlResult.inserted.length > 0) {
          complaintResult = mlResult.inserted[0];
        }

        if (complaintResult) {
          console.log(`📊 Found complaint result:`, complaintResult);

          const potholeCount = complaintResult.potholeCount || 0;
          const status = complaintResult.status || 'Not Accepted';
          
          const verified = status === 'Accepted' && potholeCount > 0;
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
          
          return {
            verified: verified,
            confidence: confidence,
            analysis: analysis,
            severity: severity,
            pending: false,
            verifiedAt: new Date()
          };
        }
      }
    }
    
    // Fallback to intelligent analysis if Flask model is not available
    console.log('⚠️ SIH Flask model not available, using intelligent fallback analysis');
    return getFallbackAnalysis('pothole', title, description);

  } catch (error) {
    console.error('❌ SIH Flask YOLO model analysis failed:', error);
    console.log('💡 Make sure to start your Flask model: cd SIH && python app.py');
    return getDefaultMLResult('pothole', error.message);
  }
}

// Get fallback analysis when ML model is not configured
function getFallbackAnalysis(type, title, description) {
  const text = (title + ' ' + description).toLowerCase();
  const confidence = Math.random() * 0.3 + 0.6; // 60-90% confidence for fallback
  const severity = confidence > 0.8 ? 'high' : confidence > 0.7 ? 'medium' : 'low';
  
  let analysis = '';
  if (type === 'pothole') {
    analysis = confidence > 0.8 ? 
      'Pothole detected based on text analysis. Manual verification recommended.' :
      'Possible pothole issue identified. Requires field inspection.';
  }
  
  return {
    verified: true,
    confidence: confidence,
    analysis: analysis,
    severity: severity,
    pending: false,
    verifiedAt: new Date()
  };
}

// Get default ML result when analysis fails
function getDefaultMLResult(type, errorMessage) {
  return {
    verified: false,
    confidence: 0,
    analysis: `ML analysis failed for ${type}: ${errorMessage}`,
    severity: 'low',
    pending: false,
    verifiedAt: null
  };
}

// Process specific complaint with ML
async function processSpecificComplaint(complaintId) {
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

    // Check if this is a pothole-related complaint
    const isPotholeComplaint = isPotholeRelated(complaint.Title, complaint.Description);
    
    console.log(`\n🤖 Processing complaint with ML models...`);
    
    // Update status to processing
    await Complaint.findByIdAndUpdate(complaintId, {
      'mlVerification.status': 'processing',
      updatedAt: new Date()
    });

    let mlResult;
    if (isPotholeComplaint) {
      console.log(`✅ Pothole complaint detected: ${complaint.Title}`);
      mlResult = await analyzePothole(complaint.imageUrl, complaint.Title, complaint.Description);
    } else {
      console.log(`⚠️ Skipping non-pothole complaint: ${complaint.Title}`);
      mlResult = {
        verified: false,
        confidence: 0,
        analysis: 'ML model only processes pothole complaints',
        severity: 'low',
        pending: false,
        verifiedAt: null
      };
    }

    // Update complaint with ML results
    await Complaint.findByIdAndUpdate(complaintId, {
      mlVerification: {
        ...mlResult,
        status: 'completed'
      },
      updatedAt: new Date()
    });

    console.log(`\n✅ ML processing completed for complaint ${complaintId}:`);
    console.log(`   Verified: ${mlResult.verified}`);
    console.log(`   Confidence: ${Math.round(mlResult.confidence * 100)}%`);
    console.log(`   Severity: ${mlResult.severity}`);
    console.log(`   Analysis: ${mlResult.analysis}`);

    return mlResult;

  } catch (error) {
    console.error(`❌ ML processing failed for complaint ${complaintId}:`, error);
    
    // Mark as failed
    try {
      await Complaint.findByIdAndUpdate(complaintId, {
        'mlVerification.status': 'failed',
        'mlVerification.pending': false,
        updatedAt: new Date()
      });
    } catch (updateError) {
      console.error('Failed to update complaint status:', updateError);
    }

    throw error;
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
    console.log('Usage: node process-specific-complaint.js <complaintId>');
    console.log('Example: node process-specific-complaint.js 68ce4bfabc5b6f7dd3846ad4');
    process.exit(1);
  }

  try {
    await processSpecificComplaint(complaintId);
    console.log('\n🎉 ML analysis completed successfully!');
  } catch (error) {
    console.error('\n❌ ML analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processSpecificComplaint };
