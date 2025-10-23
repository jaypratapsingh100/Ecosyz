#!/usr/bin/env node

/**
 * Comprehensive API Testing Script for OpenIdea
 * Tests all endpoints systematically and provides detailed results
 */

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TESTS = {
  // Authentication APIs
  auth: {
    'GET /api/auth/me': { method: 'GET', path: '/api/auth/me', expectedStatus: 401 },
  },
  
  // Search & Discovery APIs
  search: {
    'GET /api/search': { 
      method: 'GET', 
      path: '/api/search?q=machine%20learning&type=all&limit=5',
      expectedStatus: 200 
    },
  },
  
  // Workspace APIs
  workspace: {
    'GET /api/workspaces': { method: 'GET', path: '/api/workspaces', expectedStatus: 200 },
  },
  
  // AI Features
  ai: {
    'POST /api/summarize': {
      method: 'POST',
      path: '/api/summarize',
      body: { 
        id: 'test-resource-1',
        title: 'Test Resource',
        text: 'This is a test text for summarization. It contains multiple sentences to test the summarization functionality.'
      },
      expectedStatus: 200
    },
  },
  
  // Generation APIs
  generation: {
    'POST /api/generate': {
      method: 'POST',
      path: '/api/generate',
      body: {
        resources: [{
          id: 'test-1',
          title: 'Test Resource',
          type: 'paper',
          description: 'A test resource for generation'
        }],
        generationType: 'web_app',
        framework: 'nextjs'
      },
      expectedStatus: 200
    },
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

/**
 * Make HTTP request
 */
async function makeRequest(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, options);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      responseTime,
      success: true
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      status: 0,
      statusText: 'Network Error',
      data: error.message,
      responseTime,
      success: false
    };
  }
}

/**
 * Run a single test
 */
async function runTest(testName, config) {
  console.log(`${colors.blue}Testing: ${testName}${colors.reset}`);
  
  const result = await makeRequest(config.method, config.path, config.body);
  const passed = result.status === config.expectedStatus;
  
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`${colors.green}✓ PASSED${colors.reset} (${result.responseTime}ms)`);
  } else {
    results.failed++;
    console.log(`${colors.red}✗ FAILED${colors.reset} (${result.responseTime}ms)`);
    console.log(`  Expected: ${config.expectedStatus}, Got: ${result.status}`);
    if (result.data && typeof result.data === 'object') {
      console.log(`  Error: ${JSON.stringify(result.data, null, 2)}`);
    }
  }
  
  results.details.push({
    test: testName,
    passed,
    status: result.status,
    expectedStatus: config.expectedStatus,
    responseTime: result.responseTime,
    data: result.data
  });
  
  console.log('');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`${colors.bold}${colors.blue}🧪 OpenIdea API Testing Suite${colors.reset}\n`);
  console.log(`Base URL: ${BASE_URL}\n`);
  
  // Test each category
  for (const [category, tests] of Object.entries(TESTS)) {
    console.log(`${colors.bold}📁 ${category.toUpperCase()} APIs${colors.reset}`);
    console.log('─'.repeat(50));
    
    for (const [testName, config] of Object.entries(tests)) {
      await runTest(testName, config);
    }
    
    console.log('');
  }
  
  // Print summary
  console.log(`${colors.bold}📊 TEST SUMMARY${colors.reset}`);
  console.log('─'.repeat(50));
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log(`\n${colors.bold}📋 DETAILED RESULTS${colors.reset}`);
  console.log('─'.repeat(50));
  
  results.details.forEach(detail => {
    const status = detail.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${status} ${detail.test}: ${detail.status} (${detail.responseTime}ms)`);
  });
  
  // Performance analysis
  const avgResponseTime = results.details.reduce((sum, d) => sum + d.responseTime, 0) / results.details.length;
  console.log(`\n${colors.bold}⚡ PERFORMANCE${colors.reset}`);
  console.log('─'.repeat(50));
  console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  
  const slowTests = results.details.filter(d => d.responseTime > 2000);
  if (slowTests.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Slow Tests (>2s):${colors.reset}`);
    slowTests.forEach(test => {
      console.log(`  - ${test.test}: ${test.responseTime}ms`);
    });
  }
  
  console.log(`\n${colors.bold}🎯 RECOMMENDATIONS${colors.reset}`);
  console.log('─'.repeat(50));
  
  if (results.failed > 0) {
    console.log(`${colors.red}• Fix failed API endpoints${colors.reset}`);
  }
  
  if (avgResponseTime > 1000) {
    console.log(`${colors.yellow}• Optimize API response times${colors.reset}`);
  }
  
  if (results.passed === results.total) {
    console.log(`${colors.green}• All APIs are working correctly!${colors.reset}`);
  }
  
  console.log(`\n${colors.bold}✨ Testing complete!${colors.reset}\n`);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, makeRequest, TESTS };
