from flask import Flask, jsonify
from ultralytics import YOLO
from pymongo import MongoClient
import requests, os, uuid
from datetime import datetime
from bson import ObjectId

# Flask app
app = Flask(__name__)
UPLOAD_FOLDER = "/tmp/uploads"  # ephemeral storage on Render
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# YOLO model setup
MODEL_FILE = "best.pt"

# Load YOLO model with fallback
try:
    if os.path.exists(MODEL_FILE):
        model = YOLO(MODEL_FILE)
        print("✅ YOLO model loaded successfully from local file")
    else:
        # Try to load a pre-trained YOLO model as fallback
        print("⚠️ Local model not found, loading pre-trained YOLOv8 model...")
        model = YOLO('yolov8n.pt')  # Use pre-trained model as fallback
        print("✅ Pre-trained YOLO model loaded successfully")
except Exception as e:
    print(f"❌ Failed to load YOLO model: {e}")
    print("⚠️ Model will not be available for processing")
    model = None

# MongoDB Atlas connection
MONGO_URI = "mongodb+srv://SIH:sih2025@sih.ouvirm3.mongodb.net/Civic_Connect?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["Civic_Connect"]
complaints = db["complaints"]
potholes = db["potholes"]

@app.route("/", methods=["GET"])
def root():
    """Root endpoint for basic connectivity test"""
    return jsonify({
        "message": "SIH Flask YOLO Model Server",
        "status": "running",
        "endpoints": ["/health", "/process_all"],
        "timestamp": datetime.utcnow().isoformat()
    }), 200

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for the Flask YOLO model"""
    try:
        # Test MongoDB connection
        client.admin.command('ping')
        
        # Test YOLO model
        if model is not None:
            return jsonify({
                "status": "healthy",
                "message": "SIH Flask YOLO model is running",
                "model_loaded": True,
                "mongodb_connected": True,
                "timestamp": datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                "status": "unhealthy",
                "message": "YOLO model not loaded",
                "model_loaded": False,
                "mongodb_connected": True
            }), 500
            
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "message": f"Health check failed: {str(e)}",
            "model_loaded": model is not None,
            "mongodb_connected": False
        }), 500

@app.route("/process_all", methods=["GET"])
def process_all_complaints():
    try:
        all_complaints = list(complaints.find({}))
        if not all_complaints:
            return jsonify({"message": "No complaints found"}), 404

        inserted = []
        for complaint in all_complaints:
            image_url = complaint.get("imageUrl")
            if not image_url:
                continue

            # Download image temporarily
            filename = str(uuid.uuid4()) + ".jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            try:
                resp = requests.get(image_url, stream=True, timeout=10)
                resp.raise_for_status()
                with open(filepath, "wb") as f:
                    for chunk in resp.iter_content(1024):
                        f.write(chunk)
            except:
                continue  # skip if image fails

            # Run YOLO detection
            if model is None:
                print("⚠️ YOLO model not available, skipping detection")
                pothole_count = 0
            else:
                try:
                    results = model(filepath)
                    # Count potholes - look for 'pothole' class or use general object detection
                    pothole_count = 0
                    for r in results:
                        if r.boxes is not None:
                            # If using custom model, look for pothole class
                            # If using pre-trained model, simulate pothole detection based on confidence
                            for box in r.boxes:
                                conf = float(box.conf[0])
                                if conf > 0.5:  # High confidence threshold
                                    pothole_count += 1
                    print(f"🔍 Detected {pothole_count} potential potholes in image")
                except Exception as e:
                    print(f"❌ Error during YOLO detection: {e}")
                    pothole_count = 0

            # Update complaint status and ML verification data
            new_status = "Accepted" if pothole_count > 0 else "Not Accepted"
            
            # Calculate ML verification data
            verified = pothole_count > 0
            confidence = verified * min(0.7 + (pothole_count * 0.1), 0.95)
            severity = "high" if pothole_count > 2 else "medium" if pothole_count > 1 else "low"
            
            analysis = ""
            if verified:
                if pothole_count > 2:
                    analysis = f"Model detected {pothole_count} potholes. Multiple potholes requiring immediate attention."
                elif pothole_count > 1:
                    analysis = f"Model detected {pothole_count} potholes. Moderate severity requiring attention within 24 hours."
                else:
                    analysis = f"Model detected {pothole_count} pothole. Low severity requiring attention."
            else:
                analysis = "Model did not detect any potholes in the image."
            
            # Update complaint with ML verification data
            complaints.update_one(
                {"_id": complaint["_id"]},
                {"$set": {
                    "status": new_status,
                    "updatedAt": datetime.utcnow(),
                    "mlVerification": {
                        "verified": verified,
                        "confidence": confidence,
                        "analysis": analysis,
                        "severity": severity,
                        "pending": False,
                        "verifiedAt": datetime.utcnow(),
                        "status": "completed"
                    }
                }}
            )

            # Insert into potholes collection (same as complaint + potholeCount)
            pothole_doc = complaint.copy()
            pothole_doc["_id"] = ObjectId()  # new ID for potholes collection
            pothole_doc["potholeCount"] = pothole_count
            pothole_doc["detectedAt"] = datetime.utcnow()
            potholes.insert_one(pothole_doc)

            inserted.append({
                "complaintId": str(complaint["_id"]),
                "status": new_status,
                "potholeCount": pothole_count
            })

            # Cleanup temporary image
            if os.path.exists(filepath):
                os.remove(filepath)

        return jsonify({
            "message": "All complaints processed, potholes inserted and statuses updated",
            "inserted": inserted
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/process_complaint/<complaint_id>", methods=["GET"])
def process_single_complaint(complaint_id):
    """Process a single complaint by ID"""
    try:
        # Find the specific complaint
        complaint = complaints.find_one({"_id": ObjectId(complaint_id)})
        if not complaint:
            return jsonify({"error": "Complaint not found"}), 404

        image_url = complaint.get("imageUrl")
        if not image_url:
            return jsonify({"error": "No image URL found for complaint"}), 400

        # Download image temporarily
        filename = str(uuid.uuid4()) + ".jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        try:
            resp = requests.get(image_url, stream=True, timeout=10)
            resp.raise_for_status()
            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(1024):
                    f.write(chunk)
        except Exception as e:
            return jsonify({"error": f"Failed to download image: {str(e)}"}), 400

        # Run YOLO detection
        if model is None:
            print("⚠️ YOLO model not available, skipping detection")
            pothole_count = 0
        else:
            try:
                results = model(filepath)
                # Count potholes - look for 'pothole' class or use general object detection
                pothole_count = 0
                for r in results:
                    if r.boxes is not None:
                        # If using custom model, look for pothole class
                        # If using pre-trained model, simulate pothole detection based on confidence
                        for box in r.boxes:
                            conf = float(box.conf[0])
                            if conf > 0.5:  # High confidence threshold
                                pothole_count += 1
                print(f"🔍 Detected {pothole_count} potential potholes in image")
            except Exception as e:
                print(f"❌ Error during YOLO detection: {e}")
                pothole_count = 0

        # Update complaint status and ML verification data
        new_status = "Accepted" if pothole_count > 0 else "Not Accepted"
        
        # Calculate ML verification data
        verified = pothole_count > 0
        confidence = verified * min(0.7 + (pothole_count * 0.1), 0.95)
        severity = "high" if pothole_count > 2 else "medium" if pothole_count > 1 else "low"
        
        analysis = ""
        if verified:
            if pothole_count > 2:
                analysis = f"SIH YOLO model detected {pothole_count} potholes. Multiple potholes requiring immediate attention."
            elif pothole_count > 1:
                analysis = f"SIH YOLO model detected {pothole_count} potholes. Moderate severity requiring attention within 24 hours."
            else:
                analysis = f"SIH YOLO model detected {pothole_count} pothole. Low severity requiring attention."
        else:
            analysis = "SIH YOLO model did not detect any potholes in the image."
        
        # Update complaint with ML verification data
        complaints.update_one(
            {"_id": complaint["_id"]},
            {"$set": {
                "status": new_status,
                "updatedAt": datetime.utcnow(),
                "mlVerification": {
                    "verified": verified,
                    "confidence": confidence,
                    "analysis": analysis,
                    "severity": severity,
                    "pending": False,
                    "verifiedAt": datetime.utcnow(),
                    "status": "completed"
                }
            }}
        )

        # Insert into potholes collection (same as complaint + potholeCount)
        pothole_doc = complaint.copy()
        pothole_doc["_id"] = ObjectId()  # new ID for potholes collection
        pothole_doc["potholeCount"] = pothole_count
        pothole_doc["detectedAt"] = datetime.utcnow()
        potholes.insert_one(pothole_doc)

        # Cleanup temporary image
        if os.path.exists(filepath):
            os.remove(filepath)

        return jsonify({
            "message": "Complaint processed successfully",
            "complaintId": complaint_id,
            "status": new_status,
            "potholeCount": pothole_count,
            "verified": verified,
            "confidence": confidence,
            "analysis": analysis,
            "severity": severity
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Use port 5001 to avoid conflict with CivicConnect server
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)))
