const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { type } = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully! ✅');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
});

// MongoDB Schemas - Updated to match app schema exactly
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

const userSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true },
  Phone: { type: String },
  role: { type: String, default: 'citizen' },
  createdAt: { type: Date, default: Date.now }
});

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  contactInfo: {
    phone: String,
    email: String,
    address: String
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Models - Updated to match app schema
const Complaint = mongoose.model('Complaint', complaintSchema);
const User = mongoose.model('user', userSchema); // lowercase 'user' to match app
const Department = mongoose.model('Department', departmentSchema);

// Routes

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ML Processing Queue Management
const mlProcessingQueue = new Map(); // In-memory queue (use Redis in production)

// ML Processing Status
const ML_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Add complaint to ML processing queue
async function addToMLQueue(complaintId, complaintData) {
  try {
    console.log(`🔄 Processing complaint ${complaintId}: ${complaintData.Title}`);
    
    // Check if this is a pothole complaint - enhanced detection
    const isPotholeComplaint = complaintData.Title.toLowerCase().includes('pothole') || 
                              complaintData.Description.toLowerCase().includes('pothole') ||
                              complaintData.Title.toLowerCase().includes('road') ||
                              complaintData.Description.toLowerCase().includes('road') ||
                              complaintData.Title.toLowerCase().includes('street') ||
                              complaintData.Description.toLowerCase().includes('street') ||
                              complaintData.Title.toLowerCase().includes('highway') ||
                              complaintData.Description.toLowerCase().includes('highway') ||
                              complaintData.Title.toLowerCase().includes('pavement') ||
                              complaintData.Description.toLowerCase().includes('pavement') ||
                              complaintData.Title.toLowerCase().includes('asphalt') ||
                              complaintData.Description.toLowerCase().includes('asphalt') ||
                              complaintData.Title.toLowerCase().includes('crack') ||
                              complaintData.Description.toLowerCase().includes('crack') ||
                              complaintData.Title.toLowerCase().includes('damage') ||
                              complaintData.Description.toLowerCase().includes('damage');

    if (isPotholeComplaint) {
      console.log(`🚧 Adding pothole complaint ${complaintId} to ML queue: ${complaintData.Title}`);
      
      // Mark as pending ML processing
      await Complaint.findByIdAndUpdate(complaintId, {
        'mlVerification.pending': true,
        'mlVerification.status': ML_STATUS.PENDING,
        'mlVerification.verified': false,
        'mlVerification.confidence': 0,
        'mlVerification.analysis': null,
        'mlVerification.severity': 'low',
        'mlVerification.verifiedAt': null,
        updatedAt: new Date()
      });

      // Add to processing queue
      mlProcessingQueue.set(complaintId, {
        complaintId,
        complaintData,
        status: ML_STATUS.PENDING,
        queuedAt: new Date(),
        attempts: 0,
        lastAttempt: null
      });

      console.log(`✅ Added pothole complaint ${complaintId} to ML queue. Queue size: ${mlProcessingQueue.size}`);
      
      // Trigger immediate processing if Flask model is available
      setTimeout(async () => {
        try {
          await processComplaintWithML(complaintId, complaintData);
        } catch (error) {
          console.error(`❌ Immediate processing failed for ${complaintId}:`, error);
        }
      }, 2000); // Wait 2 seconds for server to be ready
      
      return true;
    } else {
      console.log(`⚠️ Non-pothole complaint ${complaintId} - skipping ML processing: ${complaintData.Title}`);
      
      // Mark non-pothole complaints as not applicable for ML
      await Complaint.findByIdAndUpdate(complaintId, {
        'mlVerification.verified': false,
        'mlVerification.confidence': 0,
        'mlVerification.analysis': 'ML model only processes pothole complaints',
        'mlVerification.severity': 'low',
        'mlVerification.pending': false,
        'mlVerification.status': ML_STATUS.COMPLETED,
        'mlVerification.verifiedAt': new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Non-pothole complaint ${complaintId} marked as not applicable for ML`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error queuing complaint ${complaintId}:`, error);
    return false;
  }
}

// Scan database for unprocessed complaints and add them to ML queue
async function scanDatabaseForUnprocessedComplaints() {
  try {
    console.log(`🔍 Scanning database for unprocessed complaints...`);
    
    // Find complaints that haven't been processed by ML
    const unprocessedComplaints = await Complaint.find({
      $or: [
        { 'mlVerification.status': { $exists: false } },
        { 'mlVerification.status': null },
        { 'mlVerification.status': '' },
        { 'mlVerification.pending': { $exists: false } }
      ]
    }).sort({ CreatedAt: -1 });

    console.log(`📋 Found ${unprocessedComplaints.length} unprocessed complaints`);

    if (unprocessedComplaints.length > 0) {
      console.log(`🚧 Processing ${unprocessedComplaints.length} unprocessed complaints...`);
      
      for (const complaint of unprocessedComplaints) {
        console.log(`📋 Processing complaint: ${complaint.Title} (${complaint._id})`);
        
        // Check if it's a pothole complaint
        const isPotholeComplaint = complaint.Title.toLowerCase().includes('pothole') || 
                                  complaint.Description.toLowerCase().includes('pothole') ||
                                  complaint.Title.toLowerCase().includes('road') ||
                                  complaint.Description.toLowerCase().includes('road') ||
                                  complaint.Title.toLowerCase().includes('street') ||
                                  complaint.Description.toLowerCase().includes('street') ||
                                  complaint.Title.toLowerCase().includes('highway') ||
                                  complaint.Description.toLowerCase().includes('highway');

        if (isPotholeComplaint) {
          console.log(`✅ Pothole complaint detected: ${complaint.Title}`);
          
          // Mark as pending ML processing
          await Complaint.findByIdAndUpdate(complaint._id, {
            'mlVerification.pending': true,
            'mlVerification.status': ML_STATUS.PENDING,
            updatedAt: new Date()
          });

          // Add to processing queue
          mlProcessingQueue.set(complaint._id.toString(), {
            complaintId: complaint._id.toString(),
            complaintData: complaint,
            status: ML_STATUS.PENDING,
            queuedAt: new Date(),
            attempts: 0
          });

          console.log(`✅ Added to ML queue: ${complaint.Title}`);
        } else {
          console.log(`⚠️ Non-pothole complaint: ${complaint.Title}`);
          
          // Mark as not applicable for ML
          await Complaint.findByIdAndUpdate(complaint._id, {
            'mlVerification.verified': false,
            'mlVerification.confidence': 0,
            'mlVerification.analysis': 'ML model only processes pothole complaints',
            'mlVerification.severity': 'low',
            'mlVerification.pending': false,
            'mlVerification.status': 'completed',
            'mlVerification.verifiedAt': new Date(),
            updatedAt: new Date()
          });
        }
      }
      
      console.log(`✅ Database scan complete. Queue size: ${mlProcessingQueue.size}`);
    } else {
      console.log(`✅ No unprocessed complaints found`);
    }
  } catch (error) {
    console.error(`❌ Error scanning database:`, error);
  }
}

// Process ML queue (this would be called by your ML service)
async function processMLQueue() {
  try {
    console.log(`🔍 Processing ML queue... (${mlProcessingQueue.size} items)`);
    
    // First, scan database for any unprocessed complaints
    await scanDatabaseForUnprocessedComplaints();
    
    // Process items in the queue
    for (const [complaintId, queueItem] of mlProcessingQueue) {
      if (queueItem.status === ML_STATUS.PENDING) {
        try {
          console.log(`🚧 Processing complaint ${complaintId}: ${queueItem.complaintData.Title}`);
          
          // Check if this is a pothole complaint
          const complaint = await Complaint.findById(complaintId);
          if (!complaint) {
            console.log(`❌ Complaint ${complaintId} not found, removing from queue`);
            mlProcessingQueue.delete(complaintId);
            continue;
          }

          // Check if it's a pothole complaint
          const isPotholeComplaint = complaint.Title.toLowerCase().includes('pothole') || 
                                    complaint.Description.toLowerCase().includes('pothole') ||
                                    complaint.Title.toLowerCase().includes('road') ||
                                    complaint.Description.toLowerCase().includes('road') ||
                                    complaint.Title.toLowerCase().includes('street') ||
                                    complaint.Description.toLowerCase().includes('street') ||
                                    complaint.Title.toLowerCase().includes('highway') ||
                                    complaint.Description.toLowerCase().includes('highway');

          if (!isPotholeComplaint) {
            console.log(`⚠️ Skipping non-pothole complaint: ${complaint.Title}`);
            // Mark as not applicable for ML processing
            await Complaint.findByIdAndUpdate(complaintId, {
              'mlVerification.verified': false,
              'mlVerification.confidence': 0,
              'mlVerification.analysis': 'ML model only processes pothole complaints',
              'mlVerification.severity': 'low',
              'mlVerification.pending': false,
              'mlVerification.status': 'completed',
              'mlVerification.verifiedAt': new Date(),
              updatedAt: new Date()
            });
            mlProcessingQueue.delete(complaintId);
            continue;
          }

          console.log(`✅ Pothole complaint detected: ${complaint.Title}`);
          await processComplaintWithML(complaintId, queueItem.complaintData);
        } catch (error) {
          console.error(`❌ Error processing complaint ${complaintId} in queue:`, error);
          // Remove failed item from queue to prevent infinite retries
          mlProcessingQueue.delete(complaintId);
        }
      }
    }
    
    console.log(`✅ ML queue processing complete. Queue size: ${mlProcessingQueue.size}`);
  } catch (error) {
    console.error('❌ Error processing ML queue:', error);
  }
}

// Process complaint directly with Flask YOLO model
async function processComplaintDirectly(complaintId) {
  try {
    console.log(`🤖 Processing complaint ${complaintId} directly with Flask YOLO model...`);
    
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    // Check Flask model health
    const axios = require('axios');
    try {
      const healthResponse = await axios.get('http://localhost:5001/health', { timeout: 10000 });
      if (healthResponse.status !== 200) {
        throw new Error('Flask model not healthy');
      }
      console.log('✅ Flask YOLO model is healthy');
    } catch (error) {
      console.log('❌ Flask model not available:', error.message);
      console.log('💡 Make sure Flask model is running: cd SIH && python app.py');
      
      // Return fallback analysis
      return {
        verified: false,
        confidence: 0.1,
        analysis: 'Flask YOLO model not available. Please ensure the model is running.',
        severity: 'low',
        pending: false,
        verifiedAt: new Date()
      };
    }

    // Process with Flask YOLO model - try individual complaint first, then fallback to process_all
    try {
      let processResponse;
      try {
        // Try to process individual complaint first
        processResponse = await axios.get(`http://localhost:5001/process_complaint/${complaintId}`, { timeout: 120000 });
        console.log('✅ Individual complaint processing completed');
      } catch (individualError) {
        console.log('⚠️ Individual processing failed, trying process_all:', individualError.message);
        // Fallback to process_all
        processResponse = await axios.get('http://localhost:5001/process_all', { timeout: 120000 });
        console.log('✅ Process_all completed');
      }
      if (processResponse.status === 200) {
        console.log('✅ Flask YOLO processing completed');
        
        // Handle individual complaint response
        if (processResponse.data.complaintId) {
          console.log('📊 Individual complaint processing result:', processResponse.data);
          
          return {
            verified: processResponse.data.verified,
            confidence: processResponse.data.confidence,
            analysis: processResponse.data.analysis,
            severity: processResponse.data.severity,
            pending: false,
            verifiedAt: new Date()
          };
        }
        
        // Handle process_all response
        const complaintResult = processResponse.data.inserted?.find(item => 
          item.complaintId === complaintId.toString()
        );

        if (complaintResult) {
          console.log('📊 Found complaint result:', complaintResult);
          
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

          return {
            verified: verified,
            confidence: confidence,
            analysis: analysis,
            severity: severity,
            pending: false,
            verifiedAt: new Date()
          };
        } else {
          console.log('⚠️ Complaint not found in processing results, checking if ML data was updated directly');
          
          // Check if the complaint was updated directly by Flask model
          const updatedComplaint = await Complaint.findById(complaintId);
          if (updatedComplaint && updatedComplaint.mlVerification && updatedComplaint.mlVerification.status === 'completed') {
            console.log('✅ Found ML verification data updated by Flask model');
            return {
              verified: updatedComplaint.mlVerification.verified,
              confidence: updatedComplaint.mlVerification.confidence,
              analysis: updatedComplaint.mlVerification.analysis,
              severity: updatedComplaint.mlVerification.severity,
              pending: false,
              verifiedAt: updatedComplaint.mlVerification.verifiedAt
            };
          }
          
          return {
            verified: false,
            confidence: 0.1,
            analysis: 'Complaint not found in ML processing results.',
            severity: 'low',
            pending: false,
            verifiedAt: new Date()
          };
        }
      } else {
        console.log('❌ Flask processing failed');
        return {
          verified: false,
          confidence: 0.1,
          analysis: 'Flask YOLO processing failed.',
          severity: 'low',
          pending: false,
          verifiedAt: new Date()
        };
      }
    } catch (error) {
      console.log('❌ Flask processing error:', error.message);
      return {
        verified: false,
        confidence: 0.1,
        analysis: `Flask YOLO processing error: ${error.message}`,
        severity: 'low',
        pending: false,
        verifiedAt: new Date()
      };
    }
  } catch (error) {
    console.error(`❌ Direct ML processing failed for complaint ${complaintId}:`, error);
    return {
      verified: false,
      confidence: 0.1,
      analysis: `ML processing failed: ${error.message}`,
      severity: 'low',
      pending: false,
      verifiedAt: new Date()
    };
  }
}

// Process complaint with SIH Flask YOLO model
async function processComplaintWithML(complaintId, complaintData) {
  try {
    console.log(`🤖 Processing complaint ${complaintId} with SIH Flask YOLO model...`);
    
    // Update status to processing
    await Complaint.findByIdAndUpdate(complaintId, {
      'mlVerification.status': ML_STATUS.PROCESSING,
      'mlVerification.pending': true,
      updatedAt: new Date()
    });

    const queueItem = mlProcessingQueue.get(complaintId);
    if (queueItem) {
      queueItem.status = ML_STATUS.PROCESSING;
      queueItem.attempts++;
      queueItem.lastAttempt = new Date();
    }

    // Process complaint directly with Flask YOLO model
    const mlResult = await processComplaintDirectly(complaintId);

    // Update complaint with ML results
    if (mlResult) {
      const updateData = {
        'mlVerification.verified': mlResult.verified,
        'mlVerification.confidence': mlResult.confidence,
        'mlVerification.analysis': mlResult.analysis,
        'mlVerification.severity': mlResult.severity,
        'mlVerification.pending': false,
        'mlVerification.status': ML_STATUS.COMPLETED,
        'mlVerification.verifiedAt': new Date(),
        updatedAt: new Date()
      };

      // If pothole is verified, update complaint status to higher priority
      if (mlResult.verified) {
        if (mlResult.severity === 'high') {
          updateData.status = 'In-progress'; // High priority
          updateData.priority = 'High';
        } else if (mlResult.severity === 'medium') {
          updateData.status = 'Received'; // Medium priority
          updateData.priority = 'Medium';
        } else {
          updateData.status = 'Received'; // Low priority
          updateData.priority = 'Low';
        }
      }

      await Complaint.findByIdAndUpdate(complaintId, updateData);

      console.log(`✅ SIH ML processing completed for complaint ${complaintId}:`, {
        verified: mlResult.verified,
        severity: mlResult.severity,
        confidence: mlResult.confidence,
        status: updateData.status || 'Pending'
      });
    }

    // Remove from queue
    mlProcessingQueue.delete(complaintId);

    return mlResult;

  } catch (error) {
    console.error(`❌ SIH ML processing failed for complaint ${complaintId}:`, error);
    
    // Mark as failed
    await Complaint.findByIdAndUpdate(complaintId, {
      'mlVerification.status': ML_STATUS.FAILED,
      'mlVerification.pending': false,
      'mlVerification.analysis': `ML processing failed: ${error.message}`,
      updatedAt: new Date()
    });

    mlProcessingQueue.delete(complaintId);
    return null;
  }
}

// Process ML queue every 30 seconds
setInterval(processMLQueue, 30000);

// Initial database scan when server starts
setTimeout(async () => {
  console.log('🚀 Starting initial database scan for unprocessed complaints...');
  await scanDatabaseForUnprocessedComplaints();
  console.log('✅ Initial database scan complete');
}, 5000); // Wait 5 seconds after server starts

// API Routes

// Get all complaints
app.get('/api/complaints', async (req, res) => {
  try {
    console.log('Fetching complaints using Mongoose model...');
    
    // Use Mongoose model to fetch complaints with user population
    // Sort by ML confidence (descending) first, then by creation date (descending)
    const complaints = await Complaint.find().sort({ 
      'mlVerification.confidence': -1, 
      'mlVerification.verified': -1,
      CreatedAt: -1 
    });
    console.log('Found complaints:', complaints.length);
    
    if (complaints.length > 0) {
      console.log('Sample complaint:', JSON.stringify(complaints[0], null, 2));
    }
    
    // Transform the data to match frontend expectations and fetch user details
    const transformedComplaints = await Promise.all(complaints.map(async (complaint) => {
      // Fetch user details from users collection
      let userDetails = {
        name: 'Anonymous User',
        email: 'user@example.com',
        phone: 'Not provided'
      };
      
      try {
        if (complaint.UserId) {
          console.log('Looking for user with ID:', complaint.UserId, 'Type:', typeof complaint.UserId);
          // Use Mongoose model (we know this works from debug endpoint)
          const user = await User.findById(complaint.UserId);
          console.log('User lookup result:', user);
          if (user) {
            userDetails = {
              name: user.Name || 'Anonymous User',
              email: user.Email || 'user@example.com',
              phone: user.Phone || 'Not provided'
            };
            console.log('Found user for complaint:', userDetails.name);
          } else {
            console.log('No user found with ID:', complaint.UserId);
          }
        } else {
          console.log('No UserId found in complaint');
        }
      } catch (userError) {
        console.log('Error fetching user details:', userError.message);
      }
      
      // Detect category based on title and description
      const detectCategory = (title, description) => {
        const text = (title + ' ' + description).toLowerCase();
        if (text.includes('pothole') || text.includes('road') || text.includes('street') || text.includes('highway')) {
          return 'pothole';
        }
        if (text.includes('garbage') || text.includes('sanitation') || text.includes('waste') || text.includes('trash')) {
          return 'sanitation';
        }
        if (text.includes('water') || text.includes('leak') || text.includes('pipe')) {
          return 'water';
        }
        if (text.includes('electric') || text.includes('light') || text.includes('power')) {
          return 'electricity';
        }
        if (text.includes('park') || text.includes('playground') || text.includes('recreation')) {
          return 'parks';
        }
        if (text.includes('traffic') || text.includes('signal') || text.includes('intersection')) {
          return 'traffic';
        }
        return 'other';
      };

      const detectedCategory = detectCategory(complaint.Title, complaint.Description);

      return {
        complaintId: complaint._id.toString(),
        title: complaint.Title,
        description: complaint.Description,
        category: detectedCategory,
        status: complaint.status,
        department: complaint.department || 'General',
        priority: 'Medium', // Default priority since not in schema
        user: userDetails,
        location: {
          address: complaint.location,
          area: 'General Area', // Extract area from location string if possible
          latitude: 16.564015, // Default coordinates
          longitude: 81.520533
        },
        images: complaint.imageUrl, // Default empty array
        assignedTo: complaint.assignedTo || null,
        mlVerification: complaint.mlVerification || {
          verified: false,
          confidence: 0,
          analysis: null,
          severity: 'low',
          pending: false,
          verifiedAt: null
        },
        createdAt: complaint.CreatedAt,
        updatedAt: complaint.updatedAt || complaint.CreatedAt
      };
    }));
    
    res.json(transformedComplaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// Get individual complaint details by ID
app.get('/api/complaints/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    // Fetch user details from users collection
    let userDetails = {
      name: 'Anonymous User',
      email: 'user@example.com',
      phone: 'Not provided'
    };
    
    try {
      if (complaint.UserId) {
        // Use Mongoose model (we know this works from debug endpoint)
        const user = await User.findById(complaint.UserId);
        if (user) {
          userDetails = {
            name: user.Name || 'Anonymous User',
            email: user.Email || 'user@example.com',
            phone: user.Phone || 'Not provided'
          };
          console.log('Found user for complaint:', userDetails.name);
        }
      }
    } catch (userError) {
      console.log('Error fetching user details:', userError.message);
    }
    
    // Detect category based on title and description
    const detectCategory = (title, description) => {
      const text = (title + ' ' + description).toLowerCase();
      if (text.includes('pothole') || text.includes('road') || text.includes('street') || text.includes('highway')) {
        return 'pothole';
      }
      if (text.includes('garbage') || text.includes('sanitation') || text.includes('waste') || text.includes('trash')) {
        return 'sanitation';
      }
      if (text.includes('water') || text.includes('leak') || text.includes('pipe')) {
        return 'water';
      }
      if (text.includes('electric') || text.includes('light') || text.includes('power')) {
        return 'electricity';
      }
      if (text.includes('park') || text.includes('playground') || text.includes('recreation')) {
        return 'parks';
      }
      if (text.includes('traffic') || text.includes('signal') || text.includes('intersection')) {
        return 'traffic';
      }
      return 'other';
    };

    const detectedCategory = detectCategory(complaint.Title, complaint.Description);

    // Transform the data to match frontend expectations
    const transformedComplaint = {
      complaintId: complaint._id.toString(),
      title: complaint.Title,
      description: complaint.Description,
      category: detectedCategory,
      status: complaint.status,
      department: complaint.department || 'General',
      priority: 'Medium', // Default priority since not in schema
      user: userDetails,
      location: {
        address: complaint.location,
        area: 'General Area', // Extract area from location string if possible
        latitude: 16.564015, // Default coordinates
        longitude: 81.520533
      },
      images: complaint.imageUrl, // Default empty array
      assignedTo: complaint.assignedTo || null,
      mlVerification: complaint.mlVerification || {
        verified: false,
        confidence: 0,
        analysis: null,
        severity: 'low',
        pending: false,
        verifiedAt: null
      },
      createdAt: complaint.CreatedAt,
      updatedAt: complaint.updatedAt || complaint.CreatedAt
    };
    
    res.json(transformedComplaint);
  } catch (error) {
    console.error('Error fetching complaint details:', error);
    res.status(500).json({ error: 'Failed to fetch complaint details' });
  }
});

// Get home stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedIssues = await Complaint.countDocuments({ status: 'completed' });
    const activeDepartments = await Department.countDocuments({ isActive: true });
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedIssues / totalComplaints) * 100) : 0;

    res.json({
      totalComplaints,
      resolvedIssues,
      activeDepartments,
      resolutionRate
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get recent activity
app.get('/api/recent-activity', async (req, res) => {
  try {
    const recentComplaints = await Complaint.find()
      .sort({ CreatedAt: -1 })
      .limit(5)
      .select('Title status CreatedAt');

    const activities = recentComplaints.map(complaint => ({
      title: complaint.Title,
      category: 'General',
      department: 'General',
      status: complaint.status,
      updatedAt: complaint.CreatedAt
    }));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Get analytics data
app.get('/api/analytics', async (req, res) => {
  try {
    console.log('Analytics endpoint called');
    
    // Get basic metrics
    const totalComplaints = await Complaint.countDocuments();
    const resolvedIssues = await Complaint.countDocuments({ status: 'completed' });
    const activeUsers = await User.countDocuments();
    
    console.log('Basic metrics:', { totalComplaints, resolvedIssues, activeUsers });
    
    // Calculate average resolution time
    const completedComplaints = await Complaint.find({ status: 'completed' });
    const avgResolutionTime = completedComplaints.length > 0 
      ? completedComplaints.reduce((sum, complaint) => {
          const resolutionTime = (complaint.updatedAt - complaint.CreatedAt) / (1000 * 60 * 60 * 24);
          return sum + (isNaN(resolutionTime) ? 0 : resolutionTime);
        }, 0) / completedComplaints.length
      : 0;

    console.log('Average resolution time:', avgResolutionTime);

    // Status data - using correct field names
    const statusData = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    console.log('Status data:', statusData);

    // Calculate status percentages
    const statusWithPercentage = statusData.map(item => ({
      status: item.status,
      percentage: Math.round((item.count / totalComplaints) * 100)
    }));

    console.log('Status with percentage:', statusWithPercentage);

    // Area data - using location field as area since it contains address info
    const areaData = await Complaint.aggregate([
      { $group: { 
          _id: '$location', 
          totalIssues: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        } 
      },
      { $project: { 
          name: '$_id', 
          totalIssues: 1, 
          resolved: 1,
          resolutionRate: { $round: [{ $multiply: [{ $divide: ['$resolved', '$totalIssues'] }, 100] }, 0] },
          _id: 0 
        } 
      }
    ]);

    // Category data - since category field doesn't exist, we'll create mock data based on department
    const categoryData = await Complaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // Department data
    const departmentData = await Complaint.aggregate([
      { $group: { 
          _id: '$department', 
          totalIssues: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          avgTime: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, { $divide: [{ $subtract: ['$updatedAt', '$CreatedAt'] }, 1000 * 60 * 60 * 24] }, null] } }
        } 
      },
      { $project: { 
          name: '$_id', 
          totalIssues: 1, 
          resolved: 1,
          avgTime: { $round: [{ $ifNull: ['$avgTime', 0] }, 1] },
          rating: { 
            $switch: {
              branches: [
                { case: { $gte: [{ $divide: ['$resolved', '$totalIssues'] }, 0.8] }, then: 'Excellent' },
                { case: { $gte: [{ $divide: ['$resolved', '$totalIssues'] }, 0.6] }, then: 'Good' },
                { case: { $gte: [{ $divide: ['$resolved', '$totalIssues'] }, 0.4] }, then: 'Average' }
              ],
              default: 'Poor'
            }
          },
          _id: 0 
        } 
      },
      { $sort: { totalIssues: -1 } }
    ]);

    // Monthly trends (last 12 months)
    const trendsData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const count = await Complaint.countDocuments({
        CreatedAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      trendsData.push({
        month: months[date.getMonth()],
        value: count
      });
    }

    console.log('Category data:', categoryData);
    console.log('Department data:', departmentData);
    console.log('Area data:', areaData);
    console.log('Trends data:', trendsData);

    const response = {
      metrics: {
        totalComplaints,
        resolvedIssues,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        activeUsers,
        complaintsChange: 12, // Mock data - would need historical comparison
        resolvedChange: 8,
        timeChange: 0.5,
        usersChange: 15
      },
      statusData: statusWithPercentage,
      categoryData,
      departmentData,
      areaData: areaData.map(area => ({
        ...area,
        trend: 'positive',
        mostCommonIssue: 'Road Issues'
      })),
      trendsData
    };

    console.log('Sending analytics response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Create a new complaint (for testing)
app.post('/api/complaints', async (req, res) => {
  try {
    console.log('📝 Creating new complaint:', req.body);
    
    const complaint = new Complaint(req.body);
    await complaint.save();
    
    console.log(`✅ Complaint created with ID: ${complaint._id}`);
    
    // Automatically queue for ML processing
    const queued = await addToMLQueue(complaint._id.toString(), complaint);
    
    if (queued) {
      console.log(`✅ Complaint ${complaint._id} queued for ML processing`);
    } else {
      console.log(`⚠️ Failed to queue complaint ${complaint._id} for ML processing`);
    }
    
    res.status(201).json({
      ...complaint.toObject(),
      message: 'Complaint created and queued for ML processing',
      mlQueued: queued
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// Upload images endpoint
app.post('/api/upload', upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Create complaint with images
app.post('/api/complaints/with-images', upload.array('images', 5), async (req, res) => {
  try {
    console.log('📝 Creating complaint with images...');
    const complaintData = JSON.parse(req.body.complaint);
    
    // Handle uploaded images (convert to full URL)
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => {
        return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      });
    }

    // Add images to complaint data
    complaintData.imageUrl = imageUrls[0] || ''; // Use first image as primary
    complaintData.images = imageUrls;
    
    console.log('📸 Complaint data with images:', complaintData);
    
    const complaint = new Complaint(complaintData);
    await complaint.save();
    
    console.log(`✅ Complaint with images created with ID: ${complaint._id}`);
    
    // Automatically queue for ML processing
    const queued = await addToMLQueue(complaint._id.toString(), complaint);
    
    if (queued) {
      console.log(`✅ Complaint ${complaint._id} with images queued for ML processing`);
    } else {
      console.log(`⚠️ Failed to queue complaint ${complaint._id} with images for ML processing`);
    }
    
    res.status(201).json({
      ...complaint.toObject(),
      message: 'Complaint created with images and queued for ML processing',
      mlQueued: queued
    });
  } catch (error) {
    console.error('Error creating complaint with images:', error);
    res.status(500).json({ error: 'Failed to create complaint with images' });
  }
});

// Update complaint status
app.put('/api/complaints/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    res.json(complaint);
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// Update complaint status specifically
app.put('/api/complaints/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'received', 'in-progress', 'completed', 'assigned'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: pending, received, in-progress, completed, assigned' });
    }
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        status: status,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    console.log(`Complaint ${req.params.id} status updated to: ${status}`);
    res.json({ 
      success: true, 
      message: `Complaint status updated to ${status}`,
      complaint: complaint
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
});

// Assign complaint to department
app.put('/api/complaints/:id/assign', async (req, res) => {
  try {
    const { department, assignedTo } = req.body;
    
    if (!department) {
      return res.status(400).json({ error: 'Department is required' });
    }
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'assigned',
        department: department,
        assignedTo: assignedTo || 'Department Head',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    console.log(`Complaint ${req.params.id} assigned to department: ${department}`);
    res.json({ 
      success: true, 
      message: `Complaint assigned to ${department}`,
      complaint: complaint
    });
  } catch (error) {
    console.error('Error assigning complaint:', error);
    res.status(500).json({ error: 'Failed to assign complaint' });
  }
});

// Update ML verification for a complaint
app.put('/api/complaints/:id/ml-verification', async (req, res) => {
  try {
    const { verified, confidence, analysis, severity, pending } = req.body;
    
    const updateData = {
      'mlVerification.verified': verified || false,
      'mlVerification.confidence': confidence || 0,
      'mlVerification.analysis': analysis || null,
      'mlVerification.severity': severity || 'low',
      'mlVerification.pending': pending || false,
      'mlVerification.verifiedAt': verified ? new Date() : null,
      updatedAt: new Date()
    };
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    console.log(`ML verification updated for complaint ${req.params.id}`);
    res.json({ 
      success: true, 
      message: 'ML verification updated successfully',
      complaint: complaint
    });
  } catch (error) {
    console.error('Error updating ML verification:', error);
    res.status(500).json({ error: 'Failed to update ML verification' });
  }
});

// Get ML processing queue status (for admin dashboard)
app.get('/api/ml-queue', (req, res) => {
  try {
    const queueItems = Array.from(mlProcessingQueue.values());
    const queueStats = {
      total: queueItems.length,
      pending: queueItems.filter(item => item.status === ML_STATUS.PENDING).length,
      processing: queueItems.filter(item => item.status === ML_STATUS.PROCESSING).length,
      items: queueItems.map(item => ({
        complaintId: item.complaintId,
        status: item.status,
        queuedAt: item.queuedAt,
        attempts: item.attempts
      }))
    };
    
    res.json(queueStats);
  } catch (error) {
    console.error('Error fetching ML queue:', error);
    res.status(500).json({ error: 'Failed to fetch ML queue' });
  }
});

// Get ML processing statistics (for admin dashboard)
app.get('/api/ml-stats', async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const mlVerifiedComplaints = await Complaint.countDocuments({ 'mlVerification.verified': true });
    const mlPendingComplaints = await Complaint.countDocuments({ 'mlVerification.pending': true });
    const mlFailedComplaints = await Complaint.countDocuments({ 'mlVerification.status': ML_STATUS.FAILED });
    
    // Get severity distribution
    const severityStats = await Complaint.aggregate([
      { $match: { 'mlVerification.verified': true } },
      { $group: { _id: '$mlVerification.severity', count: { $sum: 1 } } }
    ]);
    
    // Get confidence distribution
    const confidenceStats = await Complaint.aggregate([
      { $match: { 'mlVerification.verified': true } },
      { $group: { 
          _id: { 
            $switch: {
              branches: [
                { case: { $gte: ['$mlVerification.confidence', 0.9] }, then: 'high' },
                { case: { $gte: ['$mlVerification.confidence', 0.7] }, then: 'medium' }
              ],
              default: 'low'
            }
          }, 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    res.json({
      totalComplaints,
      mlVerifiedComplaints,
      mlPendingComplaints,
      mlFailedComplaints,
      mlVerificationRate: totalComplaints > 0 ? Math.round((mlVerifiedComplaints / totalComplaints) * 100) : 0,
      severityDistribution: severityStats,
      confidenceDistribution: confidenceStats,
      queueStats: {
        total: mlProcessingQueue.size,
        pending: Array.from(mlProcessingQueue.values()).filter(item => item.status === ML_STATUS.PENDING).length,
        processing: Array.from(mlProcessingQueue.values()).filter(item => item.status === ML_STATUS.PROCESSING).length
      }
    });
  } catch (error) {
    console.error('Error fetching ML stats:', error);
    res.status(500).json({ error: 'Failed to fetch ML stats' });
  }
});

// Manual trigger for ML processing of all unprocessed complaints
app.post('/api/ml-process-all', async (req, res) => {
  try {
    console.log('🚀 Manual ML processing triggered');
    
    // Scan database for unprocessed complaints
    await scanDatabaseForUnprocessedComplaints();
    
    // Process the queue
    await processMLQueue();
    
    res.status(200).json({
      message: 'ML processing triggered successfully',
      queueSize: mlProcessingQueue.size,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error triggering ML processing:', error);
    res.status(500).json({ error: 'Failed to trigger ML processing' });
  }
});

// Get ML queue status
app.get('/api/ml-queue-status', async (req, res) => {
  try {
    const queueItems = Array.from(mlProcessingQueue.values()).map(item => ({
      complaintId: item.complaintId,
      title: item.complaintData.Title,
      status: item.status,
      queuedAt: item.queuedAt,
      attempts: item.attempts
    }));
    
    res.status(200).json({
      queueSize: mlProcessingQueue.size,
      items: queueItems,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting ML queue status:', error);
    res.status(500).json({ error: 'Failed to get ML queue status' });
  }
});

// Manually trigger ML processing for a specific complaint (admin function)
app.post('/api/ml-process/:complaintId', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    const result = await processComplaintWithML(req.params.complaintId, complaint);
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'ML processing completed successfully',
        result: result
      });
    } else {
      res.status(500).json({ error: 'ML processing failed' });
    }
  } catch (error) {
    console.error('Error processing complaint with ML:', error);
    res.status(500).json({ error: 'Failed to process complaint with ML' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CivicConnect API is running!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Test endpoint to test user lookup for specific complaint
app.get('/api/test-complaint-user/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    console.log('Complaint UserId:', complaint.UserId);
    
    let userDetails = {
      name: 'Anonymous User',
      email: 'user@example.com',
      phone: 'Not provided'
    };
    
    if (complaint.UserId) {
      const user = await User.findById(complaint.UserId);
      console.log('User found:', user);
      if (user) {
        userDetails = {
          name: user.Name || 'Anonymous User',
          email: user.Email || 'user@example.com',
          phone: user.Phone || 'Not provided'
        };
      }
    }
    
    res.json({
      complaintId: complaint._id.toString(),
      userId: complaint.UserId,
      userDetails: userDetails
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to see raw complaint data
app.get('/api/test-complaint/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    res.json({
      rawComplaint: complaint,
      userIdField: complaint.UserId,
      userIdType: typeof complaint.UserId,
      allFields: Object.keys(complaint.toObject())
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to debug user lookup
app.get('/api/test-user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('Testing user lookup for ID:', userId);
    
    // Try different approaches
    const results = {};
    
    // 1. Mongoose model
    try {
      const mongooseUser = await User.findById(userId);
      results.mongoose = mongooseUser;
      console.log('Mongoose result:', mongooseUser);
    } catch (err) {
      results.mongoose = { error: err.message };
    }
    
    // 2. Direct collection with string
    try {
      const directString = await mongoose.connection.db.collection('users').findOne({ _id: userId });
      results.directString = directString;
      console.log('Direct string result:', directString);
    } catch (err) {
      results.directString = { error: err.message };
    }
    
    // 3. Direct collection with ObjectId
    try {
      const directObjectId = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
      results.directObjectId = directObjectId;
      console.log('Direct ObjectId result:', directObjectId);
    } catch (err) {
      results.directObjectId = { error: err.message };
    }
    
    // 4. List all users
    try {
      const allUsers = await mongoose.connection.db.collection('users').find({}).toArray();
      results.allUsers = allUsers;
      console.log('All users:', allUsers);
    } catch (err) {
      results.allUsers = { error: err.message };
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to check MongoDB connection and collections
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Check connection status
    const connectionStatus = mongoose.connection.readyState;
    console.log('MongoDB connection state:', connectionStatus);
    
    // Get current database name
    const currentDbName = mongoose.connection.db.databaseName;
    console.log('Current database name:', currentDbName);
    
    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const databases = await adminDb.listDatabases();
    console.log('Available databases:', databases.databases.map(db => db.name));
    
    // Check Civic_Connect database specifically
    const civicConnectDb = mongoose.connection.client.db('Civic_Connect');
    const civicConnectCollections = await civicConnectDb.listCollections().toArray();
    console.log('Civic_Connect collections:', civicConnectCollections.map(c => c.name));
    
    // Check document counts in Civic_Connect database
    const civicConnectCounts = {};
    for (const collection of civicConnectCollections) {
      try {
        const count = await civicConnectDb.collection(collection.name).countDocuments();
        civicConnectCounts[collection.name] = count;
        console.log(`Civic_Connect Collection '${collection.name}' has ${count} documents`);
        
        // If collection has documents, show a sample
        if (count > 0) {
          const sample = await civicConnectDb.collection(collection.name).findOne();
          console.log(`Sample from Civic_Connect '${collection.name}':`, JSON.stringify(sample, null, 2));
        }
      } catch (err) {
        civicConnectCounts[collection.name] = 'Error: ' + err.message;
      }
    }
    
    // List all collections in current database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Current database collections:', collections.map(c => c.name));
    
    // Try to count documents in each collection
    const collectionCounts = {};
    for (const collection of collections) {
      try {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        collectionCounts[collection.name] = count;
        console.log(`Current DB Collection '${collection.name}' has ${count} documents`);
      } catch (err) {
        collectionCounts[collection.name] = 'Error: ' + err.message;
      }
    }
    
    res.json({
      connectionStatus,
      currentDatabase: currentDbName,
      availableDatabases: databases.databases.map(db => db.name),
      civicConnectDatabase: {
        collections: civicConnectCollections.map(c => c.name),
        documentCounts: civicConnectCounts
      },
      currentDatabase: {
        collections: collections.map(c => c.name),
        documentCounts: collectionCounts
      }
    });
  } catch (error) {
    console.error('Error testing database:', error);
    res.status(500).json({ error: 'Database test failed', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // console.log(`API Health Check: http://localhost:${PORT}/api/health`);
  // console.log(`Complaints API: http://localhost:${PORT}/api/complaints`);
  // console.log(`Analytics API: http://localhost:${PORT}/api/analytics`);
});

