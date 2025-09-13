// Sample data insertion script for testing MongoDB
// Run this script to insert sample data into your MongoDB Atlas database

const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://anuramvarmamudunuri_db_user:Anuram123456@civicconnect.vvgnurs.mongodb.net/civicconnect?retryWrites=true&w=majority';

// Schemas (same as in server.js)
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

// Sample data
const sampleComplaints = [
  {
    complaintId: 'CC-2025-001',
    title: 'Pothole near City Hospital',
    description: 'Large pothole causing traffic issues and vehicle damage near the main entrance of City Hospital on Main Street.',
    category: 'road',
    status: 'In Progress',
    department: 'Road Department',
    priority: 'High',
    user: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1-555-0123'
    },
    location: {
      address: 'Main Street, Near City Hospital',
      area: 'downtown',
      latitude: 40.7128,
      longitude: -74.0060
    },
    assignedTo: 'Road Maintenance Team A',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)  // 1 hour ago
  },
  {
    complaintId: 'CC-2025-002',
    title: 'Street Light Repair - Oak Avenue',
    description: 'Street light not working on Oak Avenue causing safety concerns for pedestrians at night.',
    category: 'electricity',
    status: 'Completed',
    department: 'Electrical Department',
    priority: 'Medium',
    user: {
      name: 'Sarah Wilson',
      email: 'sarah.wilson@email.com',
      phone: '+1-555-0124'
    },
    location: {
      address: 'Oak Avenue, Block 5',
      area: 'residential',
      latitude: 40.7589,
      longitude: -73.9851
    },
    assignedTo: 'Electrical Team B',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    updatedAt: new Date(Date.now() - 30 * 60 * 1000)      // 30 minutes ago
  },
  {
    complaintId: 'CC-2025-003',
    title: 'Garbage Collection Issue',
    description: 'Garbage not being collected regularly in the commercial district, causing hygiene issues.',
    category: 'sanitation',
    status: 'Pending',
    department: 'Sanitation Department',
    priority: 'Medium',
    user: {
      name: 'Mike Johnson',
      email: 'mike.johnson@email.com',
      phone: '+1-555-0125'
    },
    location: {
      address: 'Commercial Street, Shop No. 15-20',
      area: 'commercial',
      latitude: 40.7505,
      longitude: -73.9934
    },
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
  },
  {
    complaintId: 'CC-2025-004',
    title: 'Water Leak - Elm Street',
    description: 'Water leak from main pipeline causing water wastage and road damage on Elm Street.',
    category: 'water',
    status: 'In Progress',
    department: 'Water Department',
    priority: 'High',
    user: {
      name: 'Lisa Brown',
      email: 'lisa.brown@email.com',
      phone: '+1-555-0126'
    },
    location: {
      address: 'Elm Street, House No. 45',
      area: 'residential',
      latitude: 40.7614,
      longitude: -73.9776
    },
    assignedTo: 'Water Maintenance Team C',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)  // 2 hours ago
  },
  {
    complaintId: 'CC-2025-005',
    title: 'Broken Playground Equipment',
    description: 'Swing set in Central Park is broken and poses safety risk to children.',
    category: 'parks',
    status: 'Pending',
    department: 'Parks Department',
    priority: 'Medium',
    user: {
      name: 'Emma Davis',
      email: 'emma.davis@email.com',
      phone: '+1-555-0127'
    },
    location: {
      address: 'Central Park, Playground Area',
      area: 'downtown',
      latitude: 40.7829,
      longitude: -73.9654
    },
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
  },
  {
    complaintId: 'CC-2025-006',
    title: 'Traffic Signal Malfunction',
    description: 'Traffic light at Main St and 5th Ave intersection is not working properly.',
    category: 'traffic',
    status: 'In Progress',
    department: 'Traffic Department',
    priority: 'High',
    user: {
      name: 'Robert Garcia',
      email: 'robert.garcia@email.com',
      phone: '+1-555-0128'
    },
    location: {
      address: 'Main Street and 5th Avenue Intersection',
      area: 'downtown',
      latitude: 40.7505,
      longitude: -73.9934
    },
    assignedTo: 'Traffic Control Team D',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)      // 4 hours ago
  }
];

const sampleUsers = [
  {
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1-555-0123',
    role: 'citizen'
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@email.com',
    phone: '+1-555-0124',
    role: 'citizen'
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@email.com',
    phone: '+1-555-0125',
    role: 'citizen'
  },
  {
    name: 'Lisa Brown',
    email: 'lisa.brown@email.com',
    phone: '+1-555-0126',
    role: 'citizen'
  },
  {
    name: 'Emma Davis',
    email: 'emma.davis@email.com',
    phone: '+1-555-0127',
    role: 'citizen'
  },
  {
    name: 'Robert Garcia',
    email: 'robert.garcia@email.com',
    phone: '+1-555-0128',
    role: 'citizen'
  },
  {
    name: 'Admin User',
    email: 'admin@civicconnect.gov',
    phone: '+1-555-0000',
    role: 'admin'
  }
];

const sampleDepartments = [
  {
    name: 'Road Department',
    description: 'Handles road maintenance, pothole repairs, and infrastructure',
    contactInfo: {
      phone: '(555) 123-ROAD',
      email: 'roads@city.gov',
      address: '123 Infrastructure St'
    },
    isActive: true
  },
  {
    name: 'Water Department',
    description: 'Manages water supply, leaks, and water quality issues',
    contactInfo: {
      phone: '(555) 123-WATER',
      email: 'water@city.gov',
      address: '456 Water Works Ave'
    },
    isActive: true
  },
  {
    name: 'Electrical Department',
    description: 'Handles street lights, power outages, and electrical safety',
    contactInfo: {
      phone: '(555) 123-POWER',
      email: 'electrical@city.gov',
      address: '789 Power Plant Rd'
    },
    isActive: true
  },
  {
    name: 'Sanitation Department',
    description: 'Garbage collection, recycling, and cleanup services',
    contactInfo: {
      phone: '(555) 123-TRASH',
      email: 'sanitation@city.gov',
      address: '321 Clean City Blvd'
    },
    isActive: true
  },
  {
    name: 'Parks Department',
    description: 'Park maintenance, recreation, and public spaces',
    contactInfo: {
      phone: '(555) 123-PARKS',
      email: 'parks@city.gov',
      address: '654 Green Space Dr'
    },
    isActive: true
  },
  {
    name: 'Traffic Department',
    description: 'Traffic signals, road safety, and parking management',
    contactInfo: {
      phone: '(555) 123-TRAFFIC',
      email: 'traffic@city.gov',
      address: '987 Traffic Control St'
    },
    isActive: true
  }
];

// Function to insert sample data
async function insertSampleData() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas successfully!');

    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('🗑️ Clearing existing data...');
    await Complaint.deleteMany({});
    await User.deleteMany({});
    await Department.deleteMany({});

    // Insert departments first
    console.log('🏢 Inserting departments...');
    await Department.insertMany(sampleDepartments);
    console.log(`✅ Inserted ${sampleDepartments.length} departments`);

    // Insert users
    console.log('👥 Inserting users...');
    await User.insertMany(sampleUsers);
    console.log(`✅ Inserted ${sampleUsers.length} users`);

    // Insert complaints
    console.log('📋 Inserting complaints...');
    await Complaint.insertMany(sampleComplaints);
    console.log(`✅ Inserted ${sampleComplaints.length} complaints`);

    console.log('\n🎉 Sample data insertion completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${sampleDepartments.length} Departments`);
    console.log(`   - ${sampleUsers.length} Users`);
    console.log(`   - ${sampleComplaints.length} Complaints`);
    
    console.log('\n🚀 You can now start your server and test the API!');
    console.log('   Run: npm start');
    console.log('   Then open: http://localhost:5000/api/health');

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
  }
}

// Run the script
insertSampleData();
