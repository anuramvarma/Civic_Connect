# 🤖 ML-Powered Complaint Workflow Implementation Guide

## 📋 **Workflow Overview**

```
Citizen Posts Complaint → MongoDB → ML Model Processes → Updates Schema → Admin Dashboard
```

---

## 🚀 **Implementation Steps**

### **Phase 1: Backend Setup (✅ Completed)**

#### **1.1 Enhanced Server.js**
- ✅ ML processing queue management
- ✅ Automatic complaint queuing
- ✅ ML status tracking
- ✅ Admin API endpoints

#### **1.2 ML Service Integration**
- ✅ Separate ML service file (`ml-service.js`)
- ✅ Integration points for your ML models
- ✅ Error handling and retry logic
- ✅ Batch processing capabilities

---

### **Phase 2: ML Model Integration**

#### **2.1 Update ML Model Endpoints**
Replace the placeholder URLs in `ml-service.js`:

```javascript
const ML_CONFIG = {
  POTHOLE_MODEL_URL: 'http://your-pothole-model:8000/api/pothole-detection',
  SANITATION_MODEL_URL: 'http://your-sanitation-model:8000/api/sanitation-detection',
  TIMEOUT: 30000,
  MAX_RETRIES: 3
};
```

#### **2.2 ML Model API Format**
Your ML models should accept this format:

**Request:**
```json
{
  "image_url": "http://localhost:5000/uploads/image.jpg",
  "title": "Pothole near City Hospital",
  "description": "Large pothole causing traffic issues...",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

**Response (Pothole Model):**
```json
{
  "detected": true,
  "confidence": 0.95,
  "analysis": "Deep pothole detected in image analysis. Severe damage requiring immediate attention.",
  "depth": "deep",
  "size": "large",
  "severity_score": 0.9
}
```

**Response (Sanitation Model):**
```json
{
  "detected": true,
  "confidence": 0.87,
  "analysis": "Garbage accumulation confirmed in images. Moderate severity requiring attention within 24 hours.",
  "accumulation_level": "moderate",
  "area_coverage": 0.6
}
```

---

### **Phase 3: Frontend Integration**

#### **3.1 Admin Dashboard Enhancements**
Add ML statistics to your admin dashboard:

```javascript
// Load ML statistics
async function loadMLStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/ml-stats`);
    const stats = await response.json();
    
    // Display ML verification rate
    document.getElementById('ml-verification-rate').textContent = `${stats.mlVerificationRate}%`;
    
    // Display severity distribution
    displaySeverityChart(stats.severityDistribution);
    
    // Display confidence distribution
    displayConfidenceChart(stats.confidenceDistribution);
    
  } catch (error) {
    console.error('Error loading ML stats:', error);
  }
}
```

#### **3.2 Real-time Updates**
Add WebSocket or polling for real-time ML status updates:

```javascript
// Poll for ML queue updates every 10 seconds
setInterval(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/ml-queue`);
    const queueData = await response.json();
    updateMLQueueDisplay(queueData);
  } catch (error) {
    console.error('Error fetching ML queue:', error);
  }
}, 10000);
```

---

### **Phase 4: Deployment & Testing**

#### **4.1 Testing the Workflow**

**Step 1: Start your server**
```bash
node server.js
```

**Step 2: Create a test complaint**
```bash
curl -X POST http://localhost:5000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "UserId": "your-user-id",
    "Title": "Large pothole on Main Street",
    "Description": "Deep pothole causing vehicle damage",
    "location": "Main Street, Downtown",
    "imageUrl": "http://localhost:5000/uploads/pothole.jpg"
  }'
```

**Step 3: Check ML processing**
```bash
curl http://localhost:5000/api/ml-queue
```

**Step 4: Run ML service**
```bash
node ml-service.js
```

#### **4.2 Production Deployment**

**Option 1: Integrated Deployment**
- Deploy server.js with ML processing integrated
- ML models run as separate microservices
- Use Redis for queue management in production

**Option 2: Separate ML Service**
- Deploy ml-service.js as separate service
- Use cron jobs or Kubernetes jobs for batch processing
- Implement proper logging and monitoring

---

## 🔧 **Configuration Options**

### **Environment Variables**
Create `.env` file:

```env
MONGODB_URI=mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect
ML_POTHOLE_MODEL_URL=http://pothole-model:8000/api/detect
ML_SANITATION_MODEL_URL=http://sanitation-model:8000/api/detect
ML_PROCESSING_INTERVAL=30000
ML_MAX_RETRIES=3
ML_TIMEOUT=30000
```

### **Queue Management**
For production, replace in-memory queue with Redis:

```javascript
const Redis = require('redis');
const redisClient = Redis.createClient();

// Replace Map with Redis operations
async function addToMLQueue(complaintId, complaintData) {
  await redisClient.lpush('ml_queue', JSON.stringify({
    complaintId,
    complaintData,
    status: 'pending',
    queuedAt: new Date()
  }));
}
```

---

## 📊 **Monitoring & Analytics**

### **ML Performance Metrics**
- Processing time per complaint
- Success/failure rates
- Confidence score distribution
- Severity classification accuracy

### **Admin Dashboard Metrics**
- Total ML verified complaints
- ML verification rate
- Queue processing status
- Severity distribution charts

---

## 🚨 **Error Handling**

### **ML Model Failures**
- Automatic retry with exponential backoff
- Fallback to manual verification
- Error logging and alerting
- Graceful degradation

### **Database Failures**
- Connection retry logic
- Transaction rollback
- Data consistency checks

---

## 🔄 **Workflow States**

### **Complaint States**
1. **Created** → Queued for ML processing
2. **Pending** → Waiting in ML queue
3. **Processing** → ML model analyzing
4. **Completed** → ML results available
5. **Failed** → ML processing failed

### **ML Verification States**
- `verified: true/false` - Whether ML confirmed the issue
- `confidence: 0-1` - ML model confidence score
- `severity: low/medium/high` - Issue severity level
- `analysis: string` - ML analysis description
- `pending: true/false` - Whether waiting for ML processing

---

## 🎯 **Next Steps**

1. **Integrate your ML models** with the provided endpoints
2. **Test the workflow** with sample complaints
3. **Deploy to production** with proper monitoring
4. **Add real-time updates** to admin dashboard
5. **Implement advanced analytics** and reporting

---

## 📞 **Support**

For questions or issues:
- Check server logs for ML processing status
- Use `/api/ml-queue` endpoint to monitor queue
- Use `/api/ml-stats` endpoint for statistics
- Test individual complaints with `/api/ml-process/:id`

The system is now ready for your ML models integration! 🚀
