// Smooth scrolling for navigation
function scrollToSection(sectionId) {
  document.getElementById(sectionId).scrollIntoView({
    behavior: 'smooth'
  });
  
  // Update active navigation item
  updateActiveNavItem(sectionId);
}

// Update active navigation item
function updateActiveNavItem(activeId) {
  const navLinks = document.querySelectorAll('nav ul li a');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${activeId}`) {
      link.classList.add('active');
    }
  });
}

// Highlight navigation on scroll
function highlightNavigationOnScroll() {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav ul li a');
  
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= sectionTop - 200) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
}

// Priority Tab Management
function showPriorityTab(tabType) {
  // Update active tab
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`${tabType}-tab`).classList.add('active');
  
  // Show/hide sections based on tab
  const mlVerifiedSection = document.getElementById('ml-verified-section');
  const regularComplaintsSection = document.getElementById('regular-complaints-section');
  
  switch(tabType) {
    case 'ml-verified':
      mlVerifiedSection.style.display = 'block';
      regularComplaintsSection.style.display = 'none';
      break;
    case 'all':
      mlVerifiedSection.style.display = 'block';
      regularComplaintsSection.style.display = 'block';
      break;
    case 'potholes':
      mlVerifiedSection.style.display = 'block';
      regularComplaintsSection.style.display = 'none';
      filterComplaintsByType('pothole');
      break;
    case 'sanitation':
      mlVerifiedSection.style.display = 'block';
      regularComplaintsSection.style.display = 'none';
      filterComplaintsByType('sanitation');
      break;
  }
}

// Filter complaints by type
function filterComplaintsByType(type) {
  const mlVerifiedList = document.getElementById('ml-verified-list');
  const regularList = document.getElementById('complaints-list');
  
  // Filter ML verified complaints
  const mlCards = mlVerifiedList.querySelectorAll('.complaint-card');
  mlCards.forEach(card => {
    const category = card.getAttribute('data-category').toLowerCase();
    const shouldShow = category.includes(type);
    card.style.display = shouldShow ? 'block' : 'none';
  });
  
  // Filter regular complaints
  const regularCards = regularList.querySelectorAll('.complaint-card');
  regularCards.forEach(card => {
    const category = card.getAttribute('data-category').toLowerCase();
    const shouldShow = category.includes(type);
    card.style.display = shouldShow ? 'block' : 'none';
  });
}

// Filter complaints functionality
function filterComplaints() {
  const categoryFilter = document.getElementById('category-filter').value;
  const statusFilter = document.getElementById('status-filter').value;
  const mlConfidenceFilter = document.getElementById('ml-confidence-filter').value;
  const locationFilter = document.getElementById('location-filter').value;
  
  const complaintCards = document.querySelectorAll('.complaint-card');
  
  complaintCards.forEach(card => {
    const cardCategory = card.getAttribute('data-category').toLowerCase();
    const cardStatus = card.getAttribute('data-status');
    const cardLocation = card.getAttribute('data-location');
    const cardMLConfidence = parseFloat(card.getAttribute('data-ml-confidence')) || 0;
    
    const categoryMatch = categoryFilter === 'all' || 
      (categoryFilter === 'potholes' && cardCategory.includes('pothole')) ||
      (categoryFilter === 'sanitation' && cardCategory.includes('sanitation')) ||
      cardCategory.includes(categoryFilter);
    
    const statusMatch = statusFilter === 'all' || cardStatus === statusFilter;
    
    const mlConfidenceMatch = mlConfidenceFilter === 'all' || 
      (mlConfidenceFilter === 'high' && cardMLConfidence >= 0.9) ||
      (mlConfidenceFilter === 'medium' && cardMLConfidence >= 0.7 && cardMLConfidence < 0.9) ||
      (mlConfidenceFilter === 'low' && cardMLConfidence > 0 && cardMLConfidence < 0.7);
    
    const locationMatch = locationFilter === 'all' || cardLocation === locationFilter;
    
    if (categoryMatch && statusMatch && mlConfidenceMatch && locationMatch) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// View ML Analysis Details
async function viewMLDetails(complaintId) {
  try {
    // Fetch complaint details with ML data
    const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}`);
    const complaint = await response.json();
    
    if (!complaint) {
      alert('Complaint not found');
      return;
    }
    
    const mlVerification = complaint.mlVerification || {};
    
    // Create ML analysis modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    const confidenceLevel = getConfidenceLevel(mlVerification.confidence || 0);
    const confidenceIcon = getConfidenceIcon(confidenceLevel);
    const confidencePercent = Math.round((mlVerification.confidence || 0) * 100);
    
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h2>🚧Pothole Analysis</h2>
              <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
              <div class="ml-analysis-section">
                <h3>Model Analysis</h3>
                <div class="ml-metrics">
                  <div class="metric-item">
                    <span class="metric-label">Confidence level:</span>
                    <span class="metric-value ${confidenceLevel}">${confidenceIcon} ${confidencePercent}%</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Pothole Severity:</span>
                    <span class="metric-value ${mlVerification.severity || 'low'}">${(mlVerification.severity || 'low').toUpperCase()}</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Detection Status:</span>
                    <span class="metric-value ${mlVerification.verified ? 'verified' : 'not-verified'}">
                      ${mlVerification.verified ? 'Detected' : 'Not Detected'}
                    </span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Processing:</span>
                    <span class="metric-value ${mlVerification.status || 'unknown'}">${(mlVerification.status || 'unknown').toUpperCase()}</span>
                  </div>
                </div>
                
                <div class="ml-analysis-details">
                  <h4>🔍Analysis Result</h4>
                  <p><strong>Complaint:</strong> ${complaint.title}</p>
                  <p><strong>Analysis:</strong> ${mlVerification.analysis || 'No analysis available'}</p>
                  <p><strong>Image URL:</strong> <a href="${complaint.imageUrl || complaint.images}" target="_blank">View Image</a></p>
                  <p><strong>Processed At:</strong> ${mlVerification.verifiedAt ? new Date(mlVerification.verifiedAt).toLocaleString() : 'Not processed'}</p>
                </div>
                
                <div class="ml-recommendations">
                  <h4>Recommendations</h4>
                  <ul>
                    ${mlVerification.verified ? `
                      <li> Pothole verified by model</li>
                      <li> Detection confidence: ${confidencePercent}%</li>
                      <li> Severity: ${(mlVerification.severity || 'low').toUpperCase()}</li>
                      <li> ${mlVerification.severity === 'high' ? 'Prioritize immediately - Multiple potholes detected' : mlVerification.severity === 'medium' ? 'Address within 24 hours - Moderate pothole damage' : 'Schedule for repair - Single pothole detected'}</li>
                    ` : `
                      <li>No potholes detected by model</li>
                      <li>Manual verification recommended</li>
                      <li>Image may need better quality or angle</li>
                      <li>Consider resubmission if pothole persists</li>
                    `}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Error fetching ML details:', error);
    alert('Error loading ML analysis details');
  }
}

// Search complaints functionality
function searchComplaints() {
  const searchTerm = document.getElementById('search-complaints').value.toLowerCase();
  const complaintCards = document.querySelectorAll('.complaint-card');
  
  complaintCards.forEach(card => {
    const complaintText = card.textContent.toLowerCase();
    if (complaintText.includes(searchTerm)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Complaint management functions
function assignComplaint(complaintId) {
  // Show department selection modal
  showDepartmentModal(complaintId);
}

function updateStatus(complaintId) {
  // Show status update modal
  showStatusModal(complaintId);
}

// Show department assignment modal
function showDepartmentModal(complaintId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Assign Department</h2>
        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
      </div>
      <div class="modal-body">
        <p>Select a department to assign this complaint to:</p>
        <select id="department-select" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
          <option value="">Select Department</option>
          <option value="Road Department">Road Department</option>
          <option value="Water Department">Water Department</option>
          <option value="Electrical Department">Electrical Department</option>
          <option value="Sanitation Department">Sanitation Department</option>
          <option value="Parks Department">Parks Department</option>
          <option value="Traffic Department">Traffic Department</option>
        </select>
        <div style="margin-top: 20px;">
          <button onclick="assignToDepartment('${complaintId}')" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Assign</button>
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" style="background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Show status update modal
function showStatusModal(complaintId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Update Status</h2>
        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
      </div>
      <div class="modal-body">
        <p>Select the new status for this complaint:</p>
        <select id="status-select" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
          <option value="">Select Status</option>
          <option value="rejected">Rejected</option>
          <option value="received">Complaint Received</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed/Fixed</option>
        </select>
        <div style="margin-top: 20px;">
          <button onclick="updateComplaintStatus('${complaintId}')" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Update</button>
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" style="background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Assign complaint to department
async function assignToDepartment(complaintId) {
  const departmentSelect = document.getElementById('department-select');
  const department = departmentSelect.value;
  
  if (!department) {
    alert('Please select a department');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        department: department,
        assignedTo: 'Department Head'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Assignment result:', result);
    
    // Close modal
    document.querySelector('.modal').remove();
    
    // Show success message
    alert(`Complaint successfully assigned to ${department}`);
    
    // Reload complaints to show updated status
    loadComplaints();
    
  } catch (error) {
    console.error('Error assigning complaint:', error);
    alert('Failed to assign complaint: ' + error.message);
  }
}

// Update complaint status
async function updateComplaintStatus(complaintId) {
  const statusSelect = document.getElementById('status-select');
  const status = statusSelect.value;
  
  if (!status) {
    alert('Please select a status');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: status
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Status update result:', result);
    
    // Close modal
    document.querySelector('.modal').remove();
    
    // Show success message
    alert(`Complaint status updated to ${status}`);
    
    // Reload complaints to show updated status
    loadComplaints();
    
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status: ' + error.message);
  }
}

function viewDetails(complaintId) {
  console.log('Loading details for complaint:', complaintId);
  
  // Show loading state
  const modal = document.getElementById('complaint-modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  
  console.log('Modal elements found:', { modal, modalBody, modalTitle });
  
  if (!modal) {
    console.error('Modal element not found!');
    alert('Modal element not found. Please check the HTML structure.');
    return;
  }
  
  if (!modalBody) {
    console.error('Modal body element not found!');
    alert('Modal body element not found. Please check the HTML structure.');
    return;
  }
  
  if (!modalTitle) {
    console.error('Modal title element not found!');
    alert('Modal title element not found. Please check the HTML structure.');
    return;
  }
  
  modalTitle.textContent = 'Loading Complaint Details...';
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 24px; margin-bottom: 20px;">⏳</div>
      <p>Loading complaint details...</p>
    </div>
  `;
  
  console.log('Setting modal display to block');
  modal.style.display = 'block';
  
  // Ensure modal can scroll
  modal.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  
  // Fetch complaint details from API
  const apiUrl = `${API_BASE_URL}/complaints/${complaintId}`;
  console.log('Fetching from URL:', apiUrl);
  
  fetch(apiUrl)
    .then(response => {
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(complaint => {
      console.log('Received complaint data:', complaint);
      displayComplaintDetails(complaint);
    })
    .catch(error => {
      console.error('Error fetching complaint details:', error);
      modalTitle.textContent = 'Error Loading Complaint';
      
      let errorMessage = 'Failed to load complaint details. ';
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage += 'Server is not running. Please start the server with "node server.js"';
      } else {
        errorMessage += error.message;
      }
      
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 24px; margin-bottom: 20px; color: #dc2626;">❌</div>
          <p style="color: #dc2626;">${errorMessage}</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 10px;">Please check the console for more details.</p>
          <button onclick="closeComplaintModal()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
        </div>
      `;
    });
}

function displayComplaintDetails(complaint) {
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  modalTitle.textContent = `Complaint #${complaint.complaintId}`;
  
  // Format dates
  const createdDate = new Date(complaint.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const updatedDate = new Date(complaint.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Generate images HTML
  console.log('Processing images:', complaint.images);
  console.log('Processing imageUrl:', complaint.imageUrl);
  
  // Handle both imageUrl (string) and images (string/array) formats
  let imageUrls = [];
  
  if (complaint.images && Array.isArray(complaint.images) && complaint.images.length > 0) {
    // New format: images array
    imageUrls = complaint.images;
  } else if (complaint.images && typeof complaint.images === 'string' && complaint.images.trim() !== '') {
    // Current format: images as single string
    imageUrls = [complaint.images];
  } else if (complaint.imageUrl && typeof complaint.imageUrl === 'string' && complaint.imageUrl.trim() !== '') {
    // Legacy format: single imageUrl string
    imageUrls = [complaint.imageUrl];
  }
  
  const imagesHTML = imageUrls.length > 0 
    ? imageUrls.map((imageUrl, index) => {
        // Handle different image URL formats
        let fullImageUrl;
        if (imageUrl.startsWith('http')) {
          // Absolute URL
          fullImageUrl = imageUrl;
        } else if (imageUrl.startsWith('/uploads/')) {
          // Server-relative path
          fullImageUrl = `${window.location.origin}${imageUrl}`;
        } else if (imageUrl.startsWith('uploads/')) {
          // Relative path without leading slash
          fullImageUrl = `${window.location.origin}/${imageUrl}`;
        } else {
          // Default case - assume it's a relative path
          fullImageUrl = `${window.location.origin}/${imageUrl}`;
        }
        
        console.log(`Image ${index + 1}: Original URL: ${imageUrl}, Full URL: ${fullImageUrl}`);
        return `
          <div class="image-item" onclick="openImageModal('${fullImageUrl}')">
            <img src="${fullImageUrl}" alt="Complaint Image ${index + 1}" 
                 onload="console.log('Image ${index + 1} loaded successfully:', '${fullImageUrl}')"
                 onerror="console.error('Failed to load image:', '${fullImageUrl}'); this.parentElement.innerHTML='<div class=\\"image-placeholder\\">Image not available</div>'">
            <div class="image-overlay">
              <span>Click to view</span>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="image-placeholder">No images available</div>';
  
  modalBody.innerHTML = `
    <!-- Basic Information -->
    <div class="complaint-detail-section">
      <h3>📋 Basic Information</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Complaint ID</div>
          <div class="detail-value">#${complaint.complaintId}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Title</div>
          <div class="detail-value">${complaint.title}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Category</div>
          <div class="detail-value">${getCategoryIcon(complaint.category)} ${complaint.category}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value">
            <span class="status-badge ${complaint.status.toLowerCase().replace(' ', '-')}">${complaint.status}</span>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Priority</div>
          <div class="detail-value">${complaint.priority}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Department</div>
          <div class="detail-value">${getDepartmentIcon(complaint.department)} ${complaint.department}</div>
        </div>
      </div>
    </div>

    <!-- Description -->
    <div class="complaint-detail-section">
      <h3>📝 Description</h3>
      <p style="line-height: 1.6; color: #374151;">${complaint.description}</p>
    </div>

    <!-- User Information -->
    <div class="complaint-detail-section">
      <h3>👤 Reporter Information</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Name</div>
          <div class="detail-value">${complaint.user.name}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Email</div>
          <div class="detail-value">${complaint.user.email}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Phone</div>
          <div class="detail-value">${complaint.user.phone || 'Not provided'}</div>
        </div>
      </div>
    </div>

    <!-- Location Information -->
    <div class="complaint-detail-section">
      <h3>📍 Location Details</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Address</div>
          <div class="detail-value">${complaint.location.address}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Area</div>
          <div class="detail-value">${getAreaIcon(complaint.location.area)} ${complaint.location.area}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Coordinates</div>
        </div>
      </div>
      <div class="location-map">
        <strong>📍 View on Map:</strong>
        <a href="https://www.google.com/maps?q=${complaint.location.latitude},${complaint.location.longitude}" target="_blank" class="map-link">
          🗺️ Open in Google Maps
        </a>
      </div>
    </div>

    <!-- Images -->
    <div class="complaint-detail-section">
      <h3>📸 Attached Images</h3>
      <div class="image-gallery">
        ${(() => {
          // Handle both imageUrl (string) and images (string/array) formats
          let imageUrls = [];
          
          if (complaint.images && Array.isArray(complaint.images) && complaint.images.length > 0) {
            // New format: images array
            imageUrls = complaint.images;
          } else if (complaint.images && typeof complaint.images === 'string' && complaint.images.trim() !== '') {
            // Current format: images as single string
            imageUrls = [complaint.images];
          } else if (complaint.imageUrl && typeof complaint.imageUrl === 'string' && complaint.imageUrl.trim() !== '') {
            // Legacy format: single imageUrl string
            imageUrls = [complaint.imageUrl];
          }
          
          if (imageUrls.length > 0) {
            return imageUrls.map((imageUrl, index) => {
              // Handle different image URL formats
              let fullImageUrl;
              if (imageUrl.startsWith('http')) {
                // Absolute URL
                fullImageUrl = imageUrl;
              } else if (imageUrl.startsWith('/uploads/')) {
                // Server-relative path
                fullImageUrl = `${window.location.origin}${imageUrl}`;
              } else if (imageUrl.startsWith('uploads/')) {
                // Relative path without leading slash
                fullImageUrl = `${window.location.origin}/${imageUrl}`;
              } else {
                // Default case - assume it's a relative path
                fullImageUrl = `${window.location.origin}/${imageUrl}`;
              }
              
              return `
                <div class="image-item" onclick="openImageModal('${fullImageUrl}')">
                  <img src="${fullImageUrl}" alt="Complaint Image ${index + 1}" 
                       style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer; margin: 5px;">
                </div>
              `;
            }).join('');
          } else {
            return '<p style="color: #666; font-style: italic;">No images attached</p>';
          }
        })()}
      </div>
    </div>

    <!-- Assignment Information -->
    ${complaint.assignedTo ? `
    <div class="complaint-detail-section">
      <h3>👨‍💼 Assignment</h3>
      <div class="detail-item">
        <div class="detail-label">Assigned To</div>
        <div class="detail-value">${complaint.assignedTo}</div>
      </div>
    </div>
    ` : ''}

    <!-- Timeline -->
    <div class="complaint-detail-section">
      <h3>⏰ Timeline</h3>
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-icon">📝</div>
          <div class="timeline-content">
            <div class="timeline-title">Complaint Created</div>
            <div class="timeline-date">${createdDate}</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon">🔄</div>
          <div class="timeline-content">
            <div class="timeline-title">Last Updated</div>
            <div class="timeline-date">${updatedDate}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeComplaintModal() {
  const modal = document.getElementById('complaint-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    console.log('Modal closed');
  }
}

// Close modal when clicking outside of it
document.addEventListener('click', function(event) {
  const modal = document.getElementById('complaint-modal');
  if (modal && modal.style.display === 'block') {
    if (event.target === modal) {
      closeComplaintModal();
    }
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modal = document.getElementById('complaint-modal');
    if (modal && modal.style.display === 'block') {
      closeComplaintModal();
    }
  }
});

function openImageModal(imageUrl) {
  // Create image modal for full-size viewing
  const imageModal = document.createElement('div');
  imageModal.className = 'modal';
  imageModal.style.display = 'block';
  
  // Handle different image URL formats
  let fullImageUrl;
  if (imageUrl.startsWith('http')) {
    // Absolute URL
    fullImageUrl = imageUrl;
  } else if (imageUrl.startsWith('/uploads/')) {
    // Server-relative path
    fullImageUrl = `${window.location.origin}${imageUrl}`;
  } else if (imageUrl.startsWith('uploads/')) {
    // Relative path without leading slash
    fullImageUrl = `${window.location.origin}/${imageUrl}`;
  } else {
    // Default case - assume it's a relative path
    fullImageUrl = `${window.location.origin}/${imageUrl}`;
  }
  
  imageModal.innerHTML = `
    <div class="modal-content" style="max-width: 90%; max-height: 90%; padding: 0;">
      <div class="modal-header">
        <h2>Image Preview</h2>
        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
      </div>
      <div style="text-align: center; padding: 20px;">
        <img src="${fullImageUrl}" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px;" alt="Complaint Image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+'; this.style.border='1px solid #e2e8f0';">
      </div>
    </div>
  `;
  document.body.appendChild(imageModal);
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('complaint-modal');
  if (event.target === modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

// Pagination functionality
function changePage(direction) {
  alert(`Changing page ${direction > 0 ? 'forward' : 'backward'}...`);
  // In a real application, this would load different page data
}

// FAQ toggle functionality
function toggleFAQ(element) {
  const faqItem = element.parentElement;
  const answer = faqItem.querySelector('.faq-answer');
  const toggle = element.querySelector('.faq-toggle');
  
  if (answer.style.display === 'block') {
    answer.style.display = 'none';
    toggle.textContent = '+';
  } else {
    answer.style.display = 'block';
    toggle.textContent = '-';
  }
}

// Chat functionality
function openChat() {
  alert('Opening live chat...');
  // In a real application, this would open a chat widget
}

// API Base URL - Automatically detect environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000/api' 
  : `${window.location.protocol}//${window.location.host}/api`;

// Debug function to test API connectivity
async function debugAPI() {
  console.log('🔍 Debug API Connectivity:');
  console.log('   Current URL:', window.location.href);
  console.log('   API Base URL:', API_BASE_URL);
  
  try {
    // Test health endpoint
    console.log('   Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('   ✅ Health:', healthData);
    
    // Test stats endpoint
    console.log('   Testing stats endpoint...');
    const statsResponse = await fetch(`${API_BASE_URL}/stats`);
    const statsData = await statsResponse.json();
    console.log('   ✅ Stats:', statsData);
    
    // Test complaints endpoint
    console.log('   Testing complaints endpoint...');
    const complaintsResponse = await fetch(`${API_BASE_URL}/complaints`);
    const complaintsData = await complaintsResponse.json();
    console.log('   ✅ Complaints:', complaintsData.length, 'items');
    
    return true;
  } catch (error) {
    console.error('   ❌ API Error:', error);
    return false;
  }
}

// Make debug function available globally
window.debugAPI = debugAPI;

// Load Home Stats
async function loadHomeStats() {
  try {
    console.log('Loading home stats from:', `${API_BASE_URL}/stats`);
    const response = await fetch(`${API_BASE_URL}/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const stats = await response.json();
    console.log('Home stats received:', stats);
    
    const container = document.getElementById('stats-container');
    if (container) {
      container.innerHTML = `
        <div class="stat-card">
          <div class="stat-number">${stats.totalComplaints || 0}</div>
          <div class="stat-label">Total Complaints</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.resolvedIssues || 0}</div>
          <div class="stat-label">Resolved Issues</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.activeDepartments || 0}</div>
          <div class="stat-label">Active Departments</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${stats.resolutionRate || 0}%</div>
          <div class="stat-label">Resolution Rate</div>
        </div>
      `;
    } else {
      console.error('Stats container not found');
    }
  } catch (error) {
    console.error('Error loading home stats:', error);
    // Fallback to default values
    const container = document.getElementById('stats-container');
    if (container) {
      container.innerHTML = `
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">Total Complaints</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">Resolved Issues</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">Active Departments</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0%</div>
          <div class="stat-label">Resolution Rate</div>
        </div>
      `;
    }
  }
}

// Load Recent Activity
async function loadRecentActivity() {
  try {
    const response = await fetch(`${API_BASE_URL}/recent-activity`);
    const activities = await response.json();
    
    const container = document.getElementById('recent-activity-list');
    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${getActivityIcon(activity.category)}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-meta">${activity.department} • ${formatTimeAgo(activity.updatedAt)}</div>
        </div>
        <div class="activity-status ${activity.status.toLowerCase().replace(' ', '-')}">${activity.status}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading recent activity:', error);
    const container = document.getElementById('recent-activity-list');
    container.innerHTML = '<p>No recent activity available</p>';
  }
}

// Load Complaints with ML Verification
async function loadComplaints() {
  try {
    console.log('Loading complaints from:', `${API_BASE_URL}/complaints`);
    const response = await fetch(`${API_BASE_URL}/complaints`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const complaints = await response.json();
    console.log('Complaints received:', complaints.length);
    
    // Separate ML verified complaints from regular complaints
    const mlVerifiedComplaints = complaints.filter(complaint => 
      complaint.mlVerification && complaint.mlVerification.verified && 
      (complaint.category.toLowerCase().includes('pothole') || complaint.category.toLowerCase().includes('sanitation'))
    );
    
    const regularComplaints = complaints.filter(complaint => 
      !complaint.mlVerification || !complaint.mlVerification.verified
    );
    
    console.log('Verified complaints:', mlVerifiedComplaints.length);
    console.log('Regular complaints:', regularComplaints.length);
    
    // Load ML verified complaints
    loadMLVerifiedComplaints(mlVerifiedComplaints);
    
    // Load regular complaints
    loadRegularComplaints(regularComplaints);
    
  } catch (error) {
    console.error('Error loading complaints:', error);
    const container = document.getElementById('complaints-list');
    if (container) {
      container.innerHTML = `
        <div class="no-data">
          <div style="font-size: 24px; margin-bottom: 20px; color: #dc2626;">⚠️</div>
          <p style="color: #dc2626; font-weight: 600;">Failed to load complaints: ${error.message}</p>
          <p style="color: #6b7280; margin-top: 10px;">Please check your internet connection and try again.</p>
        </div>
      `;
    }
  }
}

// Load ML Verified Complaints
function loadMLVerifiedComplaints(complaints) {
  const container = document.getElementById('ml-verified-list');
  
  if (complaints.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <div style="font-size: 24px; margin-bottom: 20px;">🤖</div>
        <p>No verified complaints at the moment</p>
        <p style="font-size: 14px; color: #64748b; margin-top: 10px;">ML models are continuously analyzing new complaints</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = complaints.map(complaint => createComplaintCard(complaint, true)).join('');
}

// Load Regular Complaints
function loadRegularComplaints(complaints) {
  const container = document.getElementById('complaints-list');
  
  if (complaints.length === 0) {
    container.innerHTML = '<p>No regular complaints available</p>';
    return;
  }
  
  container.innerHTML = complaints.map(complaint => createComplaintCard(complaint, false)).join('');
}

// Create Complaint Card with ML Verification
function createComplaintCard(complaint, isMLVerified = false) {
  const mlVerification = complaint.mlVerification || {};
  const isPothole = complaint.category.toLowerCase().includes('pothole') || complaint.category.toLowerCase().includes('road');
  const isSanitation = complaint.category.toLowerCase().includes('sanitation') || complaint.category.toLowerCase().includes('garbage');
  
  // Determine card classes
  let cardClasses = 'complaint-card';
  if (isMLVerified) cardClasses += ' ml-verified';
  if (isPothole) cardClasses += ' pothole-card';
  if (isSanitation) cardClasses += ' sanitation-card';
  
  // Create ML verification badge with pothole focus
  let mlBadge = '';
  if (mlVerification.verified) {
    const confidenceLevel = getConfidenceLevel(mlVerification.confidence);
    mlBadge = `
      <span class="ml-badge verified">
        Verified
        <span class="ml-confidence ${confidenceLevel}">
          <span class="ml-confidence-icon">${getConfidenceIcon(confidenceLevel)}</span>
          ${Math.round(mlVerification.confidence * 100)}%
        </span>
      </span>
    `;
  } else if (mlVerification.analysis && mlVerification.analysis.includes('ML model only processes pothole complaints')) {
    mlBadge = '<span class="ml-badge not-applicable"> Non-Pothole</span>';
  } else if (mlVerification.pending) {
    mlBadge = '<span class="ml-badge pending-verification">⏳Processing...</span>';
  } else if (isPothole) {
    mlBadge = '<span class="ml-badge not-verified">❌ Pothole Not Detected</span>';
  }
  
  return `
    <div class="${cardClasses}" data-category="${complaint.category}" data-status="${complaint.status}" data-department="${complaint.department}" data-location="${complaint.location.area}" data-ml-confidence="${mlVerification.confidence || 0}">
      <div class="complaint-header">
        <div class="complaint-id">#${complaint.complaintId}</div>
        <div class="complaint-status ${complaint.status.toLowerCase().replace(' ', '-')}">${complaint.status}</div>
        ${mlBadge}
      </div>
      <div class="complaint-content">
        <h3>${getCategoryIcon(complaint.category)} ${complaint.title}</h3>
        <p class="complaint-description">${complaint.description}</p>
        <div class="complaint-meta">
          <span class="meta-item">📍 ${complaint.location.area} Area</span>
          <span class="meta-item">👤 ${complaint.user.name}</span>
          <span class="meta-item">📅 ${formatTimeAgo(complaint.createdAt)}</span>
          <span class="meta-item">🏢 ${complaint.department}</span>
          ${mlVerification.verified ? `<span class="meta-item">🤖 ML Confidence: ${Math.round(mlVerification.confidence * 100)}%</span>` : ''}
        </div>
        <div class="complaint-location">
          <strong>Location:</strong> ${complaint.location.address}<br>
          ${mlVerification.verified ? `
            <div class="ml-analysis-summary">
              <div class="analysis-text">
                <strong>Analysis:</strong> ${mlVerification.analysis || 'Issue verified by AI model'}
              </div>
              <div class="ml-metrics-row">
                <div class="ml-metric">
                  <span class="ml-metric-label">Severity:</span>
                  <span class="severity-badge ${mlVerification.severity || 'low'}">${(mlVerification.severity || 'low').toUpperCase()}</span>
                </div>
                <div class="ml-metric">
                  <span class="ml-metric-label">Confidence:</span>
                  <span class="confidence-badge ${getConfidenceLevel(mlVerification.confidence)}">${Math.round((mlVerification.confidence || 0) * 100)}%</span>
                </div>
              </div>
            </div>
          ` : mlVerification.pending ? `
            <div class="ml-pending">
              <strong>Processing:</strong> Analyzing this complaint...
            </div>
          ` : ''}
        </div>
      </div>
      <div class="complaint-actions">
        ${complaint.status === 'Completed' ? 
          `<button class="action-btn completed" disabled>Completed</button>` :
          `<button class="action-btn assign" onclick="assignComplaint('${complaint.complaintId}')">Assign Department</button>
           <button class="action-btn update" onclick="updateStatus('${complaint.complaintId}')">Update Status</button>`
        }
        <button class="action-btn view" onclick="viewDetails('${complaint.complaintId}')">View Details</button>
        ${mlVerification.verified ? `<button class="action-btn ml-details" onclick="viewMLDetails('${complaint.complaintId}')">ML Analysis</button>` : ''}
      </div>
    </div>
  `;
}

// Get confidence level based on score
function getConfidenceLevel(confidence) {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}

// Get confidence icon
function getConfidenceIcon(level) {
  switch(level) {
    case 'high': return '🟢';
    case 'medium': return '🟡';
    case 'low': return '🔴';
    default: return '⚪';
  }
}

// Load Analytics Data
async function loadAnalyticsData() {
  try {
    console.log('Loading analytics data...');
    const response = await fetch(`${API_BASE_URL}/analytics`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const analytics = await response.json();
    console.log('Analytics data received:', analytics);
    
    // Load metrics
    if (analytics.metrics) {
      loadAnalyticsMetrics(analytics.metrics);
    } else {
      console.error('No metrics data in analytics response');
      showAnalyticsError('No metrics data available');
    }
    
    // Load charts
    if (analytics.categoryData) {
      loadCategoryChart(analytics.categoryData);
    } else {
      console.error('No category data in analytics response');
      showChartError('category-chart', 'No category data available');
    }
    
    if (analytics.statusData) {
      loadStatusChart(analytics.statusData);
    } else {
      console.error('No status data in analytics response');
      showChartError('status-chart', 'No status data available');
    }
    
    // Load area analysis
    if (analytics.areaData) {
      loadAreaAnalysis(analytics.areaData);
    } else {
      console.error('No area data in analytics response');
      showChartError('area-analysis-grid', 'No area data available');
    }
    
    // Load department performance
    if (analytics.departmentData) {
      loadDepartmentPerformance(analytics.departmentData);
    } else {
      console.error('No department data in analytics response');
      showChartError('department-performance-table', 'No department data available');
    }
    
    // Load monthly trends
    if (analytics.trendsData) {
      loadMonthlyTrends(analytics.trendsData);
    } else {
      console.error('No trends data in analytics response');
      showChartError('monthly-trends-chart', 'No trends data available');
    }
    
  } catch (error) {
    console.error('Error loading analytics data:', error);
    showAnalyticsError(`Failed to load analytics: ${error.message}`);
  }
}

// Show analytics error
function showAnalyticsError(message) {
  const container = document.getElementById('analytics-metrics');
  if (container) {
    container.innerHTML = `
      <div class="no-data" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <div style="font-size: 24px; margin-bottom: 20px; color: #dc2626;">⚠️</div>
        <p style="color: #dc2626; font-weight: 600;">${message}</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 10px;">Please check the console for more details.</p>
        <button onclick="loadAnalyticsData()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button>
      </div>
    `;
  }
}

// Show chart error
function showChartError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<p class="no-data">${message}</p>`;
  }
}

// Load Analytics Metrics
function loadAnalyticsMetrics(metrics) {
  const container = document.getElementById('analytics-metrics');
  
  if (!container) {
    console.error('Analytics metrics container not found');
    return;
  }
  
  if (!metrics) {
    console.error('No metrics data provided');
    showAnalyticsError('No metrics data available');
    return;
  }
  
  console.log('Loading analytics metrics:', metrics);
  
  container.innerHTML = `
    <div class="metric-card">
      <div class="metric-icon">📊</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.totalComplaints || 0}</div>
        <div class="metric-label">Total Complaints</div>
        <div class="metric-change ${(metrics.complaintsChange || 0) >= 0 ? 'positive' : 'negative'}">${(metrics.complaintsChange || 0) >= 0 ? '+' : ''}${metrics.complaintsChange || 0}% from last month</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">✅</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.resolvedIssues || 0}</div>
        <div class="metric-label">Resolved Issues</div>
        <div class="metric-change ${(metrics.resolvedChange || 0) >= 0 ? 'positive' : 'negative'}">${(metrics.resolvedChange || 0) >= 0 ? '+' : ''}${metrics.resolvedChange || 0}% from last month</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">⏱️</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.avgResolutionTime || 0}</div>
        <div class="metric-label">Avg. Resolution Time (Days)</div>
        <div class="metric-change ${(metrics.timeChange || 0) <= 0 ? 'positive' : 'negative'}">${(metrics.timeChange || 0) >= 0 ? '+' : ''}${metrics.timeChange || 0} days from last month</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">👥</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.activeUsers || 0}</div>
        <div class="metric-label">Active Users</div>
        <div class="metric-change ${(metrics.usersChange || 0) >= 0 ? 'positive' : 'negative'}">${(metrics.usersChange || 0) >= 0 ? '+' : ''}${metrics.usersChange || 0}% from last month</div>
      </div>
    </div>
  `;
}

// Load Category Chart
function loadCategoryChart(categoryData) {
  const container = document.getElementById('category-chart');
  
  if (!container) {
    console.error('Category chart container not found');
    return;
  }
  
  if (!categoryData || categoryData.length === 0) {
    container.innerHTML = '<p class="no-data">No category data available</p>';
    return;
  }
  
  console.log('Loading category chart:', categoryData);
  
  // Filter out null categories and provide fallback names
  const validCategoryData = categoryData.map(item => ({
    ...item,
    category: item.category || 'General',
    fixed: item.fixed || 0,
    pending: item.pending || 0
  }));
  
  const maxValue = Math.max(...validCategoryData.map(item => item.count));
  
  container.innerHTML = `
    <div class="chart-bars">
      ${validCategoryData.map(item => {
        const fixedHeight = Math.max((item.fixed / maxValue) * 100, 5); // Minimum 5% height
        const pendingHeight = Math.max((item.pending / maxValue) * 100, 5); // Minimum 5% height
        
        return `
        <div class="bar-group">
          <div class="bar-container">
            <div class="bar-fixed ${(item.category || 'general').toLowerCase().replace(/\s+/g, '-')}" 
                 style="height: ${fixedHeight}%" 
                 title="Fixed: ${item.fixed}"></div>
            <div class="bar-pending ${(item.category || 'general').toLowerCase().replace(/\s+/g, '-')}" 
                 style="height: ${pendingHeight}%" 
                 title="Pending: ${item.pending}"></div>
          </div>
          <div class="bar-label">${item.category || 'General'}</div>
          <div class="bar-value">${item.count}</div>
          <div class="bar-breakdown">
            <span class="fixed-count">Fixed: ${item.fixed}</span>
            <span class="pending-count">Pending: ${item.pending}</span>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  `;
}

// Load Status Chart
function loadStatusChart(statusData) {
  const container = document.getElementById('status-chart');
  
  if (!container) {
    console.error('Status chart container not found');
    return;
  }
  
  if (!statusData || statusData.length === 0) {
    container.innerHTML = '<p class="no-data">No status data available</p>';
    return;
  }
  
  console.log('Loading status chart:', statusData);
  
  // Filter out null statuses and provide fallback names
  const validStatusData = statusData.map(item => ({
    ...item,
    status: item.status || 'Unknown'
  }));
  
  container.innerHTML = validStatusData.map(item => `
    <div class="pie-slice ${(item.status || 'unknown').toLowerCase().replace(/\s+/g, '-')}" data-percentage="${item.percentage}">
      <div class="slice-label">${item.status || 'Unknown'} (${item.percentage}%)</div>
    </div>
  `).join('');
}

// Load Area Analysis
function loadAreaAnalysis(areaData) {
  const container = document.getElementById('area-analysis-grid');
  
  if (!container) {
    console.error('Area analysis container not found');
    return;
  }
  
  if (!areaData || areaData.length === 0) {
    container.innerHTML = '<p class="no-data">No area data available</p>';
    return;
  }
  
  console.log('Loading area analysis:', areaData);
  
  // Filter out null areas and provide fallback names
  const validAreaData = areaData.map(item => ({
    ...item,
    name: item.name || 'Unknown Area',
    trend: item.trend || 'positive',
    mostCommonIssue: item.mostCommonIssue || 'General Issues'
  }));
  
  container.innerHTML = validAreaData.map(area => `
    <div class="area-card">
      <h4>📍 ${area.name || 'Unknown Area'}</h4>
      <div class="area-stats">
        <div class="stat">
          <span class="stat-label">Total Issues:</span>
          <span class="stat-value">${area.totalIssues || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Resolved:</span>
          <span class="stat-value">${area.resolved || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Resolution Rate:</span>
          <span class="stat-value">${area.resolutionRate || 0}%</span>
        </div>
      </div>
      <div class="area-trend">
        <span class="trend-indicator ${area.trend || 'positive'}">↗</span>
        <span class="trend-text">Most common: ${area.mostCommonIssue || 'General Issues'}</span>
      </div>
    </div>
  `).join('');
}

// Load Department Performance
function loadDepartmentPerformance(departmentData) {
  const container = document.getElementById('department-performance-table');
  
  if (!container) {
    console.error('Department performance container not found');
    return;
  }
  
  if (!departmentData || departmentData.length === 0) {
    container.innerHTML = '<p class="no-data">No department data available</p>';
    return;
  }
  
  console.log('Loading department performance:', departmentData);
  
  // Filter out null departments and provide fallback names
  const validDepartmentData = departmentData.map(item => ({
    ...item,
    name: item.name || 'General Department',
    rating: item.rating || 'Average'
  }));
  
  container.innerHTML = `
    <div class="table-header">
      <div class="col">Department</div>
      <div class="col">Total Issues</div>
      <div class="col">Resolved</div>
      <div class="col">Avg. Time</div>
      <div class="col">Rating</div>
    </div>
    ${validDepartmentData.map(dept => `
      <div class="table-row">
        <div class="col dept-name">🏢 ${dept.name || 'General Department'}</div>
        <div class="col">${dept.totalIssues || 0}</div>
        <div class="col">${dept.resolved || 0}</div>
        <div class="col">${dept.avgTime || 0} days</div>
        <div class="col rating ${(dept.rating || 'average').toLowerCase()}">${getRatingStars(dept.rating || 'Average')}</div>
      </div>
    `).join('')}
  `;
}

// Helper function to get rating stars
function getRatingStars(rating) {
  const ratingMap = {
    'Excellent': '★★★★★',
    'Good': '★★★★☆',
    'Average': '★★★☆☆',
    'Poor': '★★☆☆☆'
  };
  return ratingMap[rating] || '★★★☆☆';
}

// Load Monthly Trends
function loadMonthlyTrends(trendsData) {
  const container = document.getElementById('monthly-trends-chart');
  
  if (!container) {
    console.error('Monthly trends container not found');
    return;
  }
  
  if (!trendsData || trendsData.length === 0) {
    container.innerHTML = '<p class="no-data">No trends data available</p>';
    return;
  }
  
  console.log('Loading monthly trends:', trendsData);
  
  // Filter out null values and provide fallbacks
  const validTrendsData = trendsData.map(item => ({
    month: item.month || 'Unknown',
    value: item.value || 0
  }));
  
  const maxValue = Math.max(...validTrendsData.map(item => item.value));
  
  container.innerHTML = `
    <div class="trend-line">
      ${validTrendsData.map(item => `
        <div class="trend-point" data-month="${item.month || 'Unknown'}" data-value="${item.value || 0}" style="height: ${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%"></div>
      `).join('')}
    </div>
    <div class="trend-labels">
      ${validTrendsData.map(item => `<span>${item.month || 'Unknown'}</span>`).join('')}
    </div>
  `;
}

// Helper Functions
function getActivityIcon(category) {
  const icons = {
    'road': '🚧',
    'water': '💧',
    'electricity': '💡',
    'sanitation': '🗑️',
    'parks': '🌳',
    'traffic': '🚦'
  };
  return icons[category.toLowerCase()] || '📋';
}

function getCategoryIcon(category) {
  return getActivityIcon(category);
}

function getAreaIcon(area) {
  const icons = {
    'downtown': '🏙️',
    'residential': '🏠',
    'commercial': '🏢',
    'industrial': '🏭',
    'suburbs': '🌆'
  };
  return icons[area.toLowerCase()] || '📍';
}

function getDepartmentIcon(department) {
  const icons = {
    'road department': '🏗️',
    'water department': '💧',
    'electrical department': '⚡',
    'sanitation department': '🗑️',
    'parks department': '🌳',
    'traffic department': '🚦'
  };
  return icons[department.toLowerCase()] || '🏢';
}

function getTrendIcon(trend) {
  const icons = {
    'positive': '↗',
    'negative': '↘',
    'neutral': '→'
  };
  return icons[trend] || '→';
}

function getRatingStars(rating) {
  const stars = {
    'excellent': '★★★★★',
    'good': '★★★★☆',
    'average': '★★★☆☆',
    'poor': '★★☆☆☆',
    'bad': '★☆☆☆☆'
  };
  return stars[rating.toLowerCase()] || '★★★☆☆';
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} weeks ago`;
}

// Load all dynamic data on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 CivicConnect Application Starting...');
  console.log('   Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
  console.log('   API Base URL:', API_BASE_URL);
  
  const faqAnswers = document.querySelectorAll('.faq-answer');
  faqAnswers.forEach(answer => {
    answer.style.display = 'none';
  });

  // Set up scroll listener for navigation highlighting
  window.addEventListener('scroll', highlightNavigationOnScroll);
  
  // Set initial active navigation item
  updateActiveNavItem('home');

  // Load all dynamic data
  loadHomeStats();
  loadRecentActivity();
  loadComplaints();
  
  // Load analytics with delay to ensure server is ready
  setTimeout(() => {
    loadAnalyticsData();
  }, 1000);
  
  // Add fallback analytics display after 3 seconds if no data loaded
  setTimeout(() => {
    const analyticsContainer = document.getElementById('analytics-metrics');
    if (analyticsContainer && analyticsContainer.children.length === 0) {
      console.log('Analytics not loaded, showing fallback data');
      showFallbackAnalytics();
    }
  }, 3000);
  
  // Add fallback stats display after 5 seconds if no data loaded
  setTimeout(() => {
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer && statsContainer.children.length === 0) {
      console.log('Stats not loaded, showing fallback data');
      showFallbackStats();
    }
  }, 5000);
  
  // Add fallback complaints display after 7 seconds if no data loaded
  setTimeout(() => {
    const complaintsContainer = document.getElementById('complaints-list');
    if (complaintsContainer && complaintsContainer.children.length === 0) {
      console.log('Complaints not loaded, showing fallback data');
      showFallbackComplaints();
    }
  }, 7000);
  
  // Auto-retry failed loads
  setTimeout(() => {
    console.log('🔄 Auto-retrying failed data loads...');
    loadHomeStats();
    loadComplaints();
    loadAnalyticsData();
  }, 10000);
});

// Show fallback analytics data
function showFallbackAnalytics() {
  const container = document.getElementById('analytics-metrics');
  if (container) {
    container.innerHTML = `
      <div class="metric-card">
        <div class="metric-icon">📊</div>
        <div class="metric-content">
          <div class="metric-value">6</div>
          <div class="metric-label">Total Complaints</div>
          <div class="metric-change positive">+12% from last month</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">✅</div>
        <div class="metric-content">
          <div class="metric-value">1</div>
          <div class="metric-label">Resolved Issues</div>
          <div class="metric-change positive">+8% from last month</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">⏱️</div>
        <div class="metric-content">
          <div class="metric-value">2.5</div>
          <div class="metric-label">Avg. Resolution Time (Days)</div>
          <div class="metric-change positive">-0.5 days from last month</div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">👥</div>
        <div class="metric-content">
          <div class="metric-value">5</div>
          <div class="metric-label">Active Users</div>
          <div class="metric-change positive">+15% from last month</div>
        </div>
      </div>
    `;
  }
  
  // Show fallback charts
  showFallbackCharts();
}

// Show fallback charts
function showFallbackCharts() {
  // Category chart fallback
  const categoryContainer = document.getElementById('category-chart');
  if (categoryContainer) {
    categoryContainer.innerHTML = `
      <div class="chart-bars">
        <div class="bar-group">
          <div class="bar-container">
            <div class="bar-fixed potholes" style="height: 50%" title="Fixed: 4"></div>
            <div class="bar-pending potholes" style="height: 50%" title="Pending: 4"></div>
          </div>
          <div class="bar-label">Potholes</div>
          <div class="bar-value">8</div>
          <div class="bar-breakdown">
            <span class="fixed-count">Fixed: 4</span>
            <span class="pending-count">Pending: 4</span>
          </div>
        </div>
        <div class="bar-group">
          <div class="bar-container">
            <div class="bar-fixed sanitation" style="height: 25%" title="Fixed: 2"></div>
            <div class="bar-pending sanitation" style="height: 37.5%" title="Pending: 3"></div>
          </div>
          <div class="bar-label">Sanitation</div>
          <div class="bar-value">5</div>
          <div class="bar-breakdown">
            <span class="fixed-count">Fixed: 2</span>
            <span class="pending-count">Pending: 3</span>
          </div>
        </div>
      </div>
    `;
  }
  
  // Status chart fallback
  const statusContainer = document.getElementById('status-chart');
  if (statusContainer) {
    statusContainer.innerHTML = `
      <div class="pie-slice pending" data-percentage="11">
        <div class="slice-label">Pending (11%)</div>
      </div>
      <div class="pie-slice rejected" data-percentage="37">
        <div class="slice-label">Not Accepted (37%)</div>
      </div>
      <div class="pie-slice received" data-percentage="5">
        <div class="slice-label">Accepted (5%)</div>
      </div>
      <div class="pie-slice in-progress" data-percentage="5">
        <div class="slice-label">In Progress (5%)</div>
      </div>
      <div class="pie-slice completed" data-percentage="42">
        <div class="slice-label">Completed (42%)</div>
      </div>
    `;
  }
  
  // Area analysis fallback
  const areaContainer = document.getElementById('area-analysis-grid');
  if (areaContainer) {
    areaContainer.innerHTML = `
      <div class="area-card">
        <h4>📍 General Area</h4>
        <div class="area-stats">
          <div class="stat">
            <span class="stat-label">Total Issues:</span>
            <span class="stat-value">6</span>
          </div>
          <div class="stat">
            <span class="stat-label">Resolved:</span>
            <span class="stat-value">1</span>
          </div>
          <div class="stat">
            <span class="stat-label">Resolution Rate:</span>
            <span class="stat-value">17%</span>
          </div>
        </div>
        <div class="area-trend">
          <span class="trend-indicator positive">↗</span>
          <span class="trend-text">Most common: General Issues</span>
        </div>
      </div>
    `;
  }
  
  // Department performance fallback
  const deptContainer = document.getElementById('department-performance-table');
  if (deptContainer) {
    deptContainer.innerHTML = `
      <div class="table-header">
        <div class="col">Department</div>
        <div class="col">Total Issues</div>
        <div class="col">Resolved</div>
        <div class="col">Avg. Time</div>
        <div class="col">Rating</div>
      </div>
      <div class="table-row">
        <div class="col dept-name">🏢 General</div>
        <div class="col">6</div>
        <div class="col">1</div>
        <div class="col">2.5 days</div>
        <div class="col rating average">★★★☆☆</div>
      </div>
    `;
  }
  
  // Monthly trends fallback
  const trendsContainer = document.getElementById('monthly-trends-chart');
  if (trendsContainer) {
    trendsContainer.innerHTML = `
      <div class="trend-line">
        <div class="trend-point" data-month="Jan" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Feb" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Mar" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Apr" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="May" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Jun" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Jul" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Aug" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Sep" data-value="6" style="height: 100%"></div>
        <div class="trend-point" data-month="Oct" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Nov" data-value="0" style="height: 0%"></div>
        <div class="trend-point" data-month="Dec" data-value="0" style="height: 0%"></div>
      </div>
      <div class="trend-labels">
        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
        <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
      </div>
    `;
  }
}

// Test function to verify modal works
function testModal() {
  console.log('Testing modal functionality...');
  const modal = document.getElementById('complaint-modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  
  if (!modal || !modalBody || !modalTitle) {
    console.error('Modal elements not found!');
    alert('Modal elements not found!');
    return;
  }
  
  modalTitle.textContent = 'Test Modal';
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 24px; margin-bottom: 20px;">✅</div>
      <p>Modal is working correctly!</p>
      <button onclick="closeComplaintModal()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
    </div>
  `;
  
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  console.log('Modal should now be visible');
}

// Make testModal available globally for testing
window.testModal = testModal;

// Show fallback stats data
function showFallbackStats() {
  const container = document.getElementById('stats-container');
  if (container) {
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">0</div>
        <div class="stat-label">Total Complaints</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">0</div>
        <div class="stat-label">Resolved Issues</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">0</div>
        <div class="stat-label">Active Departments</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">0%</div>
        <div class="stat-label">Resolution Rate</div>
      </div>
    `;
  }
}

// Show fallback complaints data
function showFallbackComplaints() {
  const container = document.getElementById('complaints-list');
  if (container) {
    container.innerHTML = `
      <div class="no-data">
        <div style="font-size: 24px; margin-bottom: 20px; color: #6b7280;">📋</div>
        <p style="color: #6b7280; font-weight: 600;">Loading complaints...</p>
        <p style="color: #9ca3af; margin-top: 10px;">Please wait while we fetch the latest data.</p>
      </div>
    `;
  }
}

// Test analytics endpoint
async function testAnalyticsEndpoint() {
  try {
    console.log('Testing analytics endpoint...');
    const response = await fetch(`${API_BASE_URL}/analytics`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Analytics endpoint test successful:', data);
    return data;
  } catch (error) {
    console.error('Analytics endpoint test failed:', error);
    return null;
  }
}

// Make test function available globally
window.testAnalyticsEndpoint = testAnalyticsEndpoint;

// Debug function to test modal - can be called from browser console
window.debugModal = function() {
  console.log('=== MODAL DEBUG INFO ===');
  
  const modal = document.getElementById('complaint-modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  
  console.log('Modal element:', modal);
  console.log('Modal body element:', modalBody);
  console.log('Modal title element:', modalTitle);
  
  if (modal) {
    console.log('Modal display style:', modal.style.display);
    console.log('Modal computed style:', window.getComputedStyle(modal).display);
  }
  
  // Test if modal can be shown
  if (modal && modalBody && modalTitle) {
    console.log('All modal elements found - testing display...');
    modal.style.display = 'block';
    console.log('Modal should now be visible');
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      modal.style.display = 'none';
      console.log('Modal auto-closed after 3 seconds');
    }, 3000);
  } else {
    console.error('Some modal elements are missing!');
  }
  
  console.log('=== END DEBUG INFO ===');
};

// Add some interactive animations
document.addEventListener('DOMContentLoaded', function() {
  // Animate stats on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe all cards for animation
  const cards = document.querySelectorAll('.stat-card, .complaint-card, .metric-card, .department-card');
  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
});
