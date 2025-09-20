# 🚀 How to Start Flask YOLO Model for Real ML Processing

## 📋 **Current Issue**
The system is storing "Flask YOLO model not available" messages because the Flask model isn't running. Here's how to fix it:

---

## 🔧 **Step 1: Start the Flask YOLO Model**

### **Option A: Using Command Prompt/PowerShell**
```bash
# Navigate to SIH directory
cd SIH

# Start the Flask model
python app.py
```

### **Option B: Using VS Code Terminal**
1. Open VS Code
2. Open terminal (Ctrl + `)
3. Navigate to SIH folder: `cd SIH`
4. Run: `python app.py`

### **Expected Output:**
```
X YOLO model loaded successfully
 * Serving Flask app 'app'
 * Debug mode: off
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5001
 * Running on http://10.0.47.145:5001
Press CTRL+C to quit
```

---

## 🔧 **Step 2: Start the Main Server**

### **In a NEW terminal window:**
```bash
# Navigate to main directory
cd Civic_Connect

# Start the main server
nodemon server.js
```

### **Expected Output:**
```
Server running on http://localhost:5000
Connected to MongoDB successfully! ✅
🚀 Starting initial database scan for unprocessed complaints...
```

---

## ✅ **Step 3: Verify Both Are Running**

### **Check Flask Model (Port 5001):**
```bash
curl http://localhost:5001/health
```

### **Check Main Server (Port 5000):**
```bash
curl http://localhost:5000/api/health
```

---

## 🎯 **Step 4: Test ML Processing**

1. **Post a new complaint** via the web interface
2. **Check the logs** - you should see:
   ```
   ✅ SIH Flask YOLO model is healthy, processing...
   ✅ SIH Flask YOLO model response: {...}
   ```
3. **Check the database** - ML verification should show real results instead of fallback messages

---

## 🔄 **Complete Workflow**

```
Terminal 1: cd SIH && python app.py          (Flask YOLO Model - Port 5001)
Terminal 2: cd Civic_Connect && nodemon server.js  (Main Server - Port 5000)
```

---

## 🚨 **Troubleshooting**

### **If Flask Model Won't Start:**
1. Check Python dependencies: `pip list | findstr -i flask`
2. Check Ultralytics: `pip list | findstr -i ultralytics`
3. Install missing packages: `pip install flask ultralytics pymongo requests`

### **If Connection Refused:**
1. Make sure Flask model is running on port 5001
2. Check Windows Firewall settings
3. Try running as Administrator

### **If ML Still Shows Fallback:**
1. Verify Flask model health: `curl http://localhost:5001/health`
2. Check server logs for connection errors
3. Restart both services

---

## 📊 **Expected Results After Fix**

### **Before (Fallback Messages):**
```json
{
  "verified": false,
  "confidence": 0.1,
  "analysis": "Flask YOLO model not available. Please ensure the model is running.",
  "severity": "low"
}
```

### **After (Real ML Results):**
```json
{
  "verified": true,
  "confidence": 0.85,
  "analysis": "SIH YOLO model detected 2 potholes. Moderate severity requiring attention within 24 hours.",
  "severity": "medium"
}
```

---

## 🎉 **Success Indicators**

✅ Flask model running on port 5001  
✅ Main server running on port 5000  
✅ Health checks passing  
✅ ML processing shows real YOLO results  
✅ Database stores actual pothole detection data  

---

## 💡 **Pro Tips**

1. **Keep both terminals open** - Flask model and main server need to run simultaneously
2. **Check logs regularly** - Look for connection errors or processing failures
3. **Test with real images** - Upload actual pothole photos for better results
4. **Monitor performance** - ML processing takes time, be patient

---

## 🔧 **Quick Start Script**

Create a `start-ml-system.bat` file:
```batch
@echo off
echo Starting Flask YOLO Model...
start "Flask Model" cmd /k "cd SIH && python app.py"
timeout /t 5
echo Starting Main Server...
start "Main Server" cmd /k "cd Civic_Connect && nodemon server.js"
echo Both services started!
pause
```

Run this script to start both services automatically!
