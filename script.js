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

// Filter complaints functionality
function filterComplaints() {
  const categoryFilter = document.getElementById('category-filter').value;
  const statusFilter = document.getElementById('status-filter').value;
  const departmentFilter = document.getElementById('department-filter').value;
  const locationFilter = document.getElementById('location-filter').value;
  
  const complaintCards = document.querySelectorAll('.complaint-card');
  
  complaintCards.forEach(card => {
    const cardCategory = card.getAttribute('data-category');
    const cardStatus = card.getAttribute('data-status');
    const cardDepartment = card.getAttribute('data-department');
    const cardLocation = card.getAttribute('data-location');
    
    const categoryMatch = categoryFilter === 'all' || cardCategory === categoryFilter;
    const statusMatch = statusFilter === 'all' || cardStatus === statusFilter;
    const departmentMatch = departmentFilter === 'all' || cardDepartment === departmentFilter;
    const locationMatch = locationFilter === 'all' || cardLocation === locationFilter;
    
    if (categoryMatch && statusMatch && departmentMatch && locationMatch) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
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
  alert(`Assigning complaint ${complaintId} to department...`);
  // In a real application, this would open a modal or redirect to assignment page
}

function updateStatus(complaintId) {
  alert(`Updating status for complaint ${complaintId}...`);
  // In a real application, this would open a status update modal
}

function viewDetails(complaintId) {
  alert(`Viewing details for complaint ${complaintId}...`);
  // In a real application, this would open a detailed view modal
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

// API Base URL - Update this to match your backend server
const API_BASE_URL = 'http://localhost:5000/api';

// Load Home Stats
async function loadHomeStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    const stats = await response.json();
    
    const container = document.getElementById('stats-container');
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${stats.totalComplaints}</div>
        <div class="stat-label">Total Complaints</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.resolvedIssues}</div>
        <div class="stat-label">Resolved Issues</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.activeDepartments}</div>
        <div class="stat-label">Active Departments</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.resolutionRate}%</div>
        <div class="stat-label">Resolution Rate</div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading home stats:', error);
    // Fallback to default values
    const container = document.getElementById('stats-container');
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

// Load Complaints
async function loadComplaints() {
  try {
    const response = await fetch(`${API_BASE_URL}/complaints`);
    const complaints = await response.json();
    
    const container = document.getElementById('complaints-list');
    container.innerHTML = complaints.map(complaint => `
      <div class="complaint-card" data-category="${complaint.category}" data-status="${complaint.status}" data-department="${complaint.department}" data-location="${complaint.location.area}">
        <div class="complaint-header">
          <div class="complaint-id">#${complaint.complaintId}</div>
          <div class="complaint-status ${complaint.status.toLowerCase().replace(' ', '-')}">${complaint.status}</div>
        </div>
        <div class="complaint-content">
          <h3>${getCategoryIcon(complaint.category)} ${complaint.title}</h3>
          <p class="complaint-description">${complaint.description}</p>
          <div class="complaint-meta">
            <span class="meta-item">📍 ${complaint.location.area} Area</span>
            <span class="meta-item">👤 ${complaint.user.name}</span>
            <span class="meta-item">📅 ${formatTimeAgo(complaint.createdAt)}</span>
            <span class="meta-item">🏢 ${complaint.department}</span>
          </div>
          <div class="complaint-location">
            <strong>Location:</strong> ${complaint.location.address}<br>
            <strong>Coordinates:</strong> ${complaint.location.latitude}° N, ${complaint.location.longitude}° E
          </div>
        </div>
        <div class="complaint-actions">
          ${complaint.status === 'Completed' ? 
            `<button class="action-btn completed" disabled>Completed</button>` :
            `<button class="action-btn assign" onclick="assignComplaint('${complaint.complaintId}')">Assign Department</button>
             <button class="action-btn update" onclick="updateStatus('${complaint.complaintId}')">Update Status</button>`
          }
          <button class="action-btn view" onclick="viewDetails('${complaint.complaintId}')">View Details</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading complaints:', error);
    const container = document.getElementById('complaints-list');
    container.innerHTML = '<p>No complaints available</p>';
  }
}

// Load Analytics Data
async function loadAnalyticsData() {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics`);
    const analytics = await response.json();
    
    // Load metrics
    loadAnalyticsMetrics(analytics.metrics);
    
    // Load charts
    loadCategoryChart(analytics.categoryData);
    loadStatusChart(analytics.statusData);
    
    // Load area analysis
    loadAreaAnalysis(analytics.areaData);
    
    // Load department performance
    loadDepartmentPerformance(analytics.departmentData);
    
    // Load monthly trends
    loadMonthlyTrends(analytics.trendsData);
    
  } catch (error) {
    console.error('Error loading analytics data:', error);
  }
}

// Load Analytics Metrics
function loadAnalyticsMetrics(metrics) {
  const container = document.getElementById('analytics-metrics');
  container.innerHTML = `
    <div class="metric-card">
      <div class="metric-icon">📊</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.totalComplaints}</div>
        <div class="metric-label">Total Complaints</div>
        <div class="metric-change ${metrics.complaintsChange >= 0 ? 'positive' : 'negative'}">${metrics.complaintsChange >= 0 ? '+' : ''}${metrics.complaintsChange}% from last month</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">✅</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.resolvedIssues}</div>
        <div class="metric-label">Resolved Issues</div>
        <div class="metric-change ${metrics.resolvedChange >= 0 ? 'positive' : 'negative'}">${metrics.resolvedChange >= 0 ? '+' : ''}${metrics.resolvedChange}% from last month</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">⏱️</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.avgResolutionTime}</div>
        <div class="metric-label">Avg. Resolution Time (Days)</div>
        <div class="metric-change ${metrics.timeChange <= 0 ? 'positive' : 'negative'}">${metrics.timeChange >= 0 ? '+' : ''}${metrics.timeChange} days from last month</div>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">👥</div>
      <div class="metric-content">
        <div class="metric-value">${metrics.activeUsers}</div>
        <div class="metric-label">Active Users</div>
        <div class="metric-change ${metrics.usersChange >= 0 ? 'positive' : 'negative'}">${metrics.usersChange >= 0 ? '+' : ''}${metrics.usersChange}% from last month</div>
      </div>
    </div>
  `;
}

// Load Category Chart
function loadCategoryChart(categoryData) {
  const container = document.getElementById('category-chart');
  const maxValue = Math.max(...categoryData.map(item => item.count));
  
  container.innerHTML = `
    <div class="chart-bars">
      ${categoryData.map(item => `
        <div class="bar-group">
          <div class="bar ${item.category.toLowerCase().replace(' ', '-')}" style="height: ${(item.count / maxValue) * 100}%"></div>
          <div class="bar-label">${item.category}</div>
          <div class="bar-value">${item.count}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// Load Status Chart
function loadStatusChart(statusData) {
  const container = document.getElementById('status-chart');
  
  container.innerHTML = statusData.map(item => `
    <div class="pie-slice ${item.status.toLowerCase().replace(' ', '-')}" data-percentage="${item.percentage}">
      <div class="slice-label">${item.status} (${item.percentage}%)</div>
    </div>
  `).join('');
}

// Load Area Analysis
function loadAreaAnalysis(areaData) {
  const container = document.getElementById('area-analysis-grid');
  
  container.innerHTML = areaData.map(area => `
    <div class="area-card">
      <h4>${getAreaIcon(area.name)} ${area.name}</h4>
      <div class="area-stats">
        <div class="stat">
          <span class="stat-label">Total Issues:</span>
          <span class="stat-value">${area.totalIssues}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Resolved:</span>
          <span class="stat-value">${area.resolved}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Resolution Rate:</span>
          <span class="stat-value">${area.resolutionRate}%</span>
        </div>
      </div>
      <div class="area-trend">
        <span class="trend-indicator ${area.trend}">${getTrendIcon(area.trend)}</span>
        <span class="trend-text">Most common: ${area.mostCommonIssue}</span>
      </div>
    </div>
  `).join('');
}

// Load Department Performance
function loadDepartmentPerformance(departmentData) {
  const container = document.getElementById('department-performance-table');
  
  container.innerHTML = `
    <div class="table-header">
      <div class="col">Department</div>
      <div class="col">Total Issues</div>
      <div class="col">Resolved</div>
      <div class="col">Avg. Time</div>
      <div class="col">Rating</div>
    </div>
    ${departmentData.map(dept => `
      <div class="table-row">
        <div class="col dept-name">${getDepartmentIcon(dept.name)} ${dept.name}</div>
        <div class="col">${dept.totalIssues}</div>
        <div class="col">${dept.resolved}</div>
        <div class="col">${dept.avgTime} days</div>
        <div class="col rating ${dept.rating.toLowerCase()}">${getRatingStars(dept.rating)}</div>
      </div>
    `).join('')}
  `;
}

// Load Monthly Trends
function loadMonthlyTrends(trendsData) {
  const container = document.getElementById('monthly-trends-chart');
  const maxValue = Math.max(...trendsData.map(item => item.value));
  
  container.innerHTML = `
    <div class="trend-line">
      ${trendsData.map(item => `
        <div class="trend-point" data-month="${item.month}" data-value="${item.value}" style="height: ${(item.value / maxValue) * 100}%"></div>
      `).join('')}
    </div>
    <div class="trend-labels">
      ${trendsData.map(item => `<span>${item.month}</span>`).join('')}
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
  loadAnalyticsData();
});

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
