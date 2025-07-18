#!/usr/bin/env node

/**
 * Deployment Validation Script for Somers Novel Generator
 * Tests backend API endpoints and configuration
 */

import fetch from 'node-fetch';

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://somers-novel-generator-production.up.railway.app';
const NETLIFY_URL = process.env.NETLIFY_URL || 'https://somers-novel-writer.netlify.app';

console.log('🚀 Somers Novel Generator - Deployment Validation');
console.log('=' .repeat(60));

async function testEndpoint(url, description) {
  try {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS (${response.status})`);
      if (data.openai) {
        console.log(`   🤖 OpenAI: ${data.openai.status}`);
      }
      if (data.environment) {
        console.log(`   🌍 Environment: ${data.environment}`);
      }
      return true;
    } else {
      console.log(`   ❌ FAILED (${response.status}): ${data.error || data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testCORS(backendUrl, frontendUrl) {
  try {
    console.log(`\n🔐 Testing CORS from ${frontendUrl} to ${backendUrl}`);
    
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Origin': frontendUrl,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log(`   ✅ CORS: Working correctly`);
      return true;
    } else {
      console.log(`   ❌ CORS: Failed (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ CORS ERROR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`\nTesting Railway Backend: ${RAILWAY_URL}`);
  console.log(`Testing Netlify Frontend: ${NETLIFY_URL}`);
  
  const results = [];
  
  // Test backend endpoints
  results.push(await testEndpoint(`${RAILWAY_URL}/api/health`, 'Backend Health Check'));
  results.push(await testEndpoint(`${RAILWAY_URL}/`, 'Backend Root'));
  
  // Test CORS
  results.push(await testCORS(RAILWAY_URL, NETLIFY_URL));
  
  // Test frontend (if accessible)
  results.push(await testEndpoint(NETLIFY_URL, 'Frontend Accessibility'));
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '=' .repeat(60));
  console.log(`📊 SUMMARY: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Deployment looks good.');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
  }
  
  console.log('\n🔧 Next steps:');
  console.log('1. Verify your Railway environment variables');
  console.log('2. Check your Netlify site URL in Railway FRONTEND_URL');
  console.log('3. Test novel generation in the web interface');
}

runTests().catch(console.error);
