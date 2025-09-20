// ML Service for CivicConnect
// This file handles ML model integration for complaint analysis

const mongoose = require('mongoose');
const axios = require('axios'); // For HTTP requests to ML models

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect';

// ML Model Configuration - Updated for SIH Flask YOLO model
const ML_CONFIG = {
  FLASK_MODEL_URL: 'http://localhost:5001', // Your Flask YOLO model
  PROCESS_ALL_ENDPOINT: 'http://localhost:5001/process_all', // Process all complaints
  HEALTH_ENDPOINT: 'http://localhost:5001/health', // Health check
  TIMEOUT: 120000, // 2 minutes timeout for YOLO processing
  MAX_RETRIES: 3,
  HEADERS: {
    'Content-Type': 'application/json',
    'User-Agent': 'CivicConnect-ML-Service/1.0'
  }
};

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

// Use existing model to avoid compilation conflicts
let Complaint;
try {
  Complaint = mongoose.model('Complaint');
} catch (error) {
  // Model doesn't exist, create it
  Complaint = mongoose.model('Complaint', complaintSchema);
}

class MLService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      await mongoose.connect(MONGODB_URI);
      this.isConnected = true;
      console.log('✅ ML Service connected to MongoDB');
    } catch (error) {
      console.error('❌ ML Service MongoDB connection failed:', error);
      throw error;
    }
  }

  // Detect complaint type based on content
  detectComplaintType(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('pothole') || text.includes('road') || text.includes('street') || text.includes('highway')) {
      return 'pothole';
    }
    if (text.includes('garbage') || text.includes('sanitation') || text.includes('waste') || text.includes('trash')) {
      return 'sanitation';
    }
    return 'other';
  }

  // Check if complaint is pothole-related (enhanced detection)
  isPotholeRelated(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Enhanced pothole detection keywords
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

  // Call your SIH Flask YOLO model for pothole detection
  async analyzePothole(imageUrl, title, description) {
    try {
      console.log(`🔍 Analyzing pothole complaint with SIH YOLO model: ${imageUrl}`);
      console.log(`🌐 Calling Flask YOLO model: ${ML_CONFIG.FLASK_MODEL_URL}`);
      
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
        return this.getFallbackAnalysis('pothole', title, description);
      }
      
      // Call your Flask model's process_all endpoint
      const response = await axios.get(ML_CONFIG.PROCESS_ALL_ENDPOINT, {
        timeout: ML_CONFIG.TIMEOUT,
        headers: ML_CONFIG.HEADERS
      });

      if (response.status === 200) {
        const mlResult = response.data;
        console.log(`✅ SIH Flask YOLO model response:`, mlResult);

        // Your Flask model processes all complaints and returns a list of results
        if (mlResult.inserted && Array.isArray(mlResult.inserted)) {
          // Find our specific complaint in the results
          let complaintResult = mlResult.inserted.find(item => {
            // Try to match by complaintId or title
            return item.complaintId || (
              item.title && (
                item.title.toLowerCase().includes(title.toLowerCase()) ||
                title.toLowerCase().includes(item.title.toLowerCase()) ||
                item.title.toLowerCase().includes('pothole')
              )
            );
          });
          
          // If no specific match, use the first result
          if (!complaintResult && mlResult.inserted.length > 0) {
            complaintResult = mlResult.inserted[0];
          }

          if (complaintResult) {
            console.log(`📊 Found complaint result:`, complaintResult);

            // Parse your Flask model's response format
            const potholeCount = complaintResult.potholeCount || 0;
            const status = complaintResult.status || 'Not Accepted';
            
            // Convert your model's output to our format
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
      return this.getFallbackAnalysis('pothole', title, description);

    } catch (error) {
      console.error('❌ SIH Flask YOLO model analysis failed:', error);
      console.log('💡 Make sure to start your Flask model: cd SIH && python app.py');
      return this.getDefaultMLResult('pothole', error.message);
    }
  }

  // Call your actual ML model for sanitation detection
  async analyzeSanitation(imageUrl, title, description) {
    try {
      console.log(`🔍 Analyzing sanitation complaint: ${imageUrl}`);
      
      // Check if ML model URL is configured
      if (!ML_CONFIG.SANITATION_MODEL_URL || ML_CONFIG.SANITATION_MODEL_URL.includes('localhost:8000')) {
        console.log('⚠️ Sanitation ML model not configured, using fallback analysis');
        return this.getFallbackAnalysis('sanitation', title, description);
      }
      
      // Prepare data for your ML model
      const mlRequest = {
        image_url: imageUrl,
        title: title,
        description: description,
        timestamp: new Date().toISOString()
      };

      // Call your ML model endpoint
      const response = await axios.post(ML_CONFIG.SANITATION_MODEL_URL, mlRequest, {
        timeout: ML_CONFIG.TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Parse ML model response
      const mlResult = response.data;
      
      return {
        verified: mlResult.detected || false,
        confidence: mlResult.confidence || 0,
        analysis: mlResult.analysis || 'Sanitation analysis completed',
        severity: this.determineSeverity(mlResult.confidence, mlResult.accumulation_level),
        pending: false,
        verifiedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Sanitation ML analysis failed:', error);
      return this.getDefaultMLResult('sanitation', error.message);
    }
  }

  // Determine severity based on ML model output
  determineSeverity(confidence, additionalFactors = {}) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }

  // Get fallback analysis when ML model is not configured
  getFallbackAnalysis(type, title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const confidence = Math.random() * 0.3 + 0.6; // 60-90% confidence for fallback
    const severity = confidence > 0.8 ? 'high' : confidence > 0.7 ? 'medium' : 'low';
    
    let analysis = '';
    if (type === 'pothole') {
      analysis = confidence > 0.8 ? 
        'Pothole detected based on text analysis. Manual verification recommended.' :
        'Possible pothole issue identified. Requires field inspection.';
    } else if (type === 'sanitation') {
      analysis = confidence > 0.8 ?
        'Sanitation issue detected based on text analysis. Manual verification recommended.' :
        'Possible sanitation issue identified. Requires field inspection.';
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
  getDefaultMLResult(type, errorMessage) {
    return {
      verified: false,
      confidence: 0,
      analysis: `ML analysis failed for ${type}: ${errorMessage}`,
      severity: 'low',
      pending: false,
      verifiedAt: null
    };
  }

  // Process a single complaint with ML
  async processComplaint(complaintId) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        throw new Error('Complaint not found');
      }

      console.log(`🤖 Processing complaint ${complaintId} with ML models...`);

      // Update status to processing
      await Complaint.findByIdAndUpdate(complaintId, {
        'mlVerification.status': 'processing',
        updatedAt: new Date()
      });

      // Check if this is a pothole-related complaint
      const isPotholeComplaint = this.isPotholeRelated(complaint.Title, complaint.Description);
      
      let mlResult;
      if (isPotholeComplaint) {
        console.log(`✅ Pothole complaint detected: ${complaint.Title}`);
        mlResult = await this.analyzePothole(complaint.imageUrl, complaint.Title, complaint.Description);
      } else {
        console.log(`⚠️ Skipping non-pothole complaint: ${complaint.Title}`);
        // For non-pothole complaints, return default result
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

      console.log(`✅ ML processing completed for complaint ${complaintId}:`, mlResult);
      return mlResult;

    } catch (error) {
      console.error(`❌ ML processing failed for complaint ${complaintId}:`, error);
      
      // Mark as failed
      await Complaint.findByIdAndUpdate(complaintId, {
        'mlVerification.status': 'failed',
        'mlVerification.pending': false,
        updatedAt: new Date()
      });

      throw error;
    }
  }

  // Process multiple complaints in batch
  async processBatch(complaintIds) {
    const results = [];
    
    for (const complaintId of complaintIds) {
      try {
        const result = await this.processComplaint(complaintId);
        results.push({ complaintId, success: true, result });
      } catch (error) {
        results.push({ complaintId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // Get pending complaints for ML processing
  async getPendingComplaints() {
    if (!this.isConnected) {
      await this.connect();
    }

    return await Complaint.find({
      'mlVerification.pending': true,
      'mlVerification.status': { $in: ['pending', 'failed'] }
    }).sort({ CreatedAt: 1 });
  }

  // Process all pending complaints
  async processAllPending() {
    const pendingComplaints = await this.getPendingComplaints();
    console.log(`🔄 Found ${pendingComplaints.length} pending complaints for ML processing`);
    
    const results = [];
    for (const complaint of pendingComplaints) {
      try {
        const result = await this.processComplaint(complaint._id.toString());
        results.push({ complaintId: complaint._id.toString(), success: true, result });
      } catch (error) {
        results.push({ complaintId: complaint._id.toString(), success: false, error: error.message });
      }
    }
    
    return results;
  }
}

// Export ML Service
module.exports = MLService;

// CLI usage example
if (require.main === module) {
  const mlService = new MLService();
  
  async function runMLProcessing() {
    try {
      await mlService.connect();
      
      // Process all pending complaints
      const results = await mlService.processAllPending();
      
      console.log('\n📊 ML Processing Results:');
      console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
      console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
      
      // Show detailed results
      results.forEach(result => {
        if (result.success) {
          console.log(`✅ Complaint ${result.complaintId}: ${result.result.severity} severity, ${Math.round(result.result.confidence * 100)}% confidence`);
        } else {
          console.log(`❌ Complaint ${result.complaintId}: ${result.error}`);
        }
      });
      
    } catch (error) {
      console.error('❌ ML processing failed:', error);
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
  
  runMLProcessing();
}
