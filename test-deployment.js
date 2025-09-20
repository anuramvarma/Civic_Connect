#!/usr/bin/env node

/**
 * Deployment Test Script for CivicConnect on Render
 * Tests the deployed application endpoints to verify everything is working
 */

const https = require('https');

const DEPLOYED_URL = 'https://civic-connect-v1qm.onrender.com';

// Helper function to make HTTPS requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

// Test Health Endpoint
async function testHealthEndpoint() {
  try {
    console.log('🔍 Testing Health Endpoint...');
    const result = await makeRequest(`${DEPLOYED_URL}/api/health`);
    
    if (result.status === 200) {
      console.log('✅ Health endpoint working:', result.data);
      return true;
    } else {
      console.log('❌ Health endpoint failed:', result.status, result.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
    return false;
  }
}

// Test Stats Endpoint
async function testStatsEndpoint() {
  try {
    console.log('\n🔍 Testing Stats Endpoint...');
    const result = await makeRequest(`${DEPLOYED_URL}/api/stats`);
    
    if (result.status === 200) {
      console.log('✅ Stats endpoint working:', result.data);
      return result.data;
    } else {
      console.log('❌ Stats endpoint failed:', result.status, result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Stats endpoint error:', error.message);
    return null;
  }
}

// Test Complaints Endpoint
async function testComplaintsEndpoint() {
  try {
    console.log('\n🔍 Testing Complaints Endpoint...');
    const result = await makeRequest(`${DEPLOYED_URL}/api/complaints`);
    
    if (result.status === 200) {
      console.log('✅ Complaints endpoint working');
      console.log(`   Found ${result.data.length} complaints`);
      
      if (result.data.length > 0) {
        console.log('   Sample complaint:', {
          id: result.data[0].complaintId,
          title: result.data[0].title,
          status: result.data[0].status,
          mlVerified: result.data[0].mlVerification?.verified || false
        });
      }
      return result.data;
    } else {
      console.log('❌ Complaints endpoint failed:', result.status, result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Complaints endpoint error:', error.message);
    return null;
  }
}

// Test Analytics Endpoint
async function testAnalyticsEndpoint() {
  try {
    console.log('\n🔍 Testing Analytics Endpoint...');
    const result = await makeRequest(`${DEPLOYED_URL}/api/analytics`);
    
    if (result.status === 200) {
      console.log('✅ Analytics endpoint working');
      console.log('   Metrics:', result.data.metrics);
      return result.data;
    } else {
      console.log('❌ Analytics endpoint failed:', result.status, result.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Analytics endpoint error:', error.message);
    return null;
  }
}

// Test Frontend Loading
async function testFrontendLoading() {
  try {
    console.log('\n🔍 Testing Frontend Loading...');
    const result = await makeRequest(`${DEPLOYED_URL}/`);
    
    if (result.status === 200) {
      console.log('✅ Frontend loading successfully');
      console.log('   Page size:', result.data.length, 'characters');
      
      // Check if it contains expected elements
      const hasTitle = result.data.includes('CivicConnect');
      const hasStatsContainer = result.data.includes('stats-container');
      const hasComplaintsSection = result.data.includes('complaints-list');
      
      console.log('   Contains title:', hasTitle);
      console.log('   Contains stats container:', hasStatsContainer);
      console.log('   Contains complaints section:', hasComplaintsSection);
      
      return true;
    } else {
      console.log('❌ Frontend loading failed:', result.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend loading error:', error.message);
    return false;
  }
}

// Main Test Function
async function runDeploymentTest() {
  console.log('🚀 Starting Deployment Test for CivicConnect on Render...');
  console.log('=' .repeat(70));
  console.log(`🌐 Testing URL: ${DEPLOYED_URL}`);
  console.log('=' .repeat(70));
  
  // Test all endpoints
  const healthOk = await testHealthEndpoint();
  const stats = await testStatsEndpoint();
  const complaints = await testComplaintsEndpoint();
  const analytics = await testAnalyticsEndpoint();
  const frontendOk = await testFrontendLoading();
  
  // Summary
  console.log('\n' + '=' .repeat(70));
  console.log('🎉 Deployment Test Summary:');
  console.log('');
  console.log('📊 API Endpoints:');
  console.log(`   ✅ Health: ${healthOk ? 'Working' : 'Failed'}`);
  console.log(`   ✅ Stats: ${stats ? 'Working' : 'Failed'}`);
  console.log(`   ✅ Complaints: ${complaints ? 'Working' : 'Failed'}`);
  console.log(`   ✅ Analytics: ${analytics ? 'Working' : 'Failed'}`);
  console.log(`   ✅ Frontend: ${frontendOk ? 'Working' : 'Failed'}`);
  console.log('');
  
  if (stats) {
    console.log('📈 Dashboard Stats:');
    console.log(`   Total Complaints: ${stats.totalComplaints}`);
    console.log(`   Resolved Issues: ${stats.resolvedIssues}`);
    console.log(`   Active Departments: ${stats.activeDepartments}`);
    console.log(`   Resolution Rate: ${stats.resolutionRate}%`);
  }
  
  if (complaints) {
    console.log('📋 Complaints Data:');
    console.log(`   Total Complaints: ${complaints.length}`);
    
    const mlVerified = complaints.filter(c => c.mlVerification?.verified);
    const pending = complaints.filter(c => c.status === 'Pending');
    const completed = complaints.filter(c => c.status === 'Completed');
    
    console.log(`   ML Verified: ${mlVerified.length}`);
    console.log(`   Pending: ${pending.length}`);
    console.log(`   Completed: ${completed.length}`);
  }
  
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Open https://civic-connect-v1qm.onrender.com in your browser');
  console.log('2. Check browser console for any JavaScript errors');
  console.log('3. Verify that stats are loading correctly on the homepage');
  console.log('4. Check the Complaints section for data display');
  console.log('5. Test the Analytics dashboard');
  
  if (!healthOk || !stats || !complaints || !frontendOk) {
    console.log('');
    console.log('⚠️ Issues Found:');
    if (!healthOk) console.log('   - API health check failed');
    if (!stats) console.log('   - Stats endpoint not working');
    if (!complaints) console.log('   - Complaints endpoint not working');
    if (!frontendOk) console.log('   - Frontend not loading properly');
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   - Check Render deployment logs');
    console.log('   - Verify environment variables');
    console.log('   - Check database connection');
    console.log('   - Ensure all dependencies are installed');
  }
}

// Run the test
if (require.main === module) {
  runDeploymentTest().catch(console.error);
}

module.exports = { runDeploymentTest };
