const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://anuramvarmamudunuri_db_user:Anuram123456@civicconnect.vvgnurs.mongodb.net/civicconnect?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas successfully!');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
});

// MongoDB Schemas
const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  department: { type: String, required: true },
  priority: { type: String, default: 'Medium' },
  user: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },
  location: {
    address: { type: String, required: true },
    area: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  images: [String],
  assignedTo: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
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

// Models
const Complaint = mongoose.model('Complaint', complaintSchema);
const User = mongoose.model('User', userSchema);
const Department = mongoose.model('Department', departmentSchema);

// Routes

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// API Routes

// Get all complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// Get home stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedIssues = await Complaint.countDocuments({ status: 'Completed' });
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
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title category department status updatedAt');

    const activities = recentComplaints.map(complaint => ({
      title: complaint.title,
      category: complaint.category,
      department: complaint.department,
      status: complaint.status,
      updatedAt: complaint.updatedAt
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
    // Get basic metrics
    const totalComplaints = await Complaint.countDocuments();
    const resolvedIssues = await Complaint.countDocuments({ status: 'Completed' });
    const activeUsers = await User.countDocuments();
    
    // Calculate average resolution time
    const completedComplaints = await Complaint.find({ status: 'Completed' });
    const avgResolutionTime = completedComplaints.length > 0 
      ? completedComplaints.reduce((sum, complaint) => {
          const resolutionTime = (complaint.updatedAt - complaint.createdAt) / (1000 * 60 * 60 * 24);
          return sum + resolutionTime;
        }, 0) / completedComplaints.length
      : 0;

    // Category data
    const categoryData = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } }
    ]);

    // Status data
    const statusData = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    // Calculate status percentages
    const statusWithPercentage = statusData.map(item => ({
      status: item.status,
      percentage: Math.round((item.count / totalComplaints) * 100)
    }));

    // Area data
    const areaData = await Complaint.aggregate([
      { $group: { 
          _id: '$location.area', 
          totalIssues: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
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

    // Department performance
    const departmentData = await Complaint.aggregate([
      { $group: { 
          _id: '$department', 
          totalIssues: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
        } 
      },
      { $project: { 
          name: '$_id', 
          totalIssues: 1, 
          resolved: 1,
          avgTime: 3.2, // This would need more complex calculation
          rating: 'good', // This would need rating system
          _id: 0 
        } 
      }
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
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      trendsData.push({
        month: months[date.getMonth()],
        value: count
      });
    }

    res.json({
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
      categoryData,
      statusData: statusWithPercentage,
      areaData: areaData.map(area => ({
        ...area,
        trend: 'positive',
        mostCommonIssue: 'Road Issues'
      })),
      departmentData: departmentData.map(dept => ({
        ...dept,
        rating: 'good'
      })),
      trendsData
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Create a new complaint (for testing)
app.post('/api/complaints', async (req, res) => {
  try {
    const complaint = new Complaint(req.body);
    await complaint.save();
    res.status(201).json(complaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// Update complaint status
app.put('/api/complaints/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndUpdate(
      { complaintId: req.params.id },
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CivicConnect API is running!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Complaints API: http://localhost:${PORT}/api/complaints`);
  console.log(`📈 Analytics API: http://localhost:${PORT}/api/analytics`);
});
