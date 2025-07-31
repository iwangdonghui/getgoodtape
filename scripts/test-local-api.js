#!/usr/bin/env node

/**
 * Local API Health Check Script
 * Tests the local development environment to ensure API endpoints are working
 */

const FRONTEND_URL = 'http://localhost:3002';
const WORKERS_URL = 'http://localhost:8789';

async function testEndpoint(url, description) {
  try {
    console.log(`🧪 Testing ${description}...`);
    const response = await fetch(url);
    const status = response.status;
    const statusText = response.statusText;

    if (response.ok) {
      console.log(`✅ ${description}: ${status} ${statusText}`);
      return true;
    } else {
      console.log(`❌ ${description}: ${status} ${statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

async function testApiEndpoint(
  endpoint,
  method = 'GET',
  body = null,
  description,
  expectedStatus = null
) {
  try {
    console.log(`🧪 Testing ${description}...`);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${FRONTEND_URL}/api${endpoint}`, options);
    const status = response.status;
    const data = await response.text();

    console.log(`📊 ${description}: ${status}`);

    // Check if we got the expected status (if specified) or if response is ok
    const isSuccess = expectedStatus ? status === expectedStatus : response.ok;

    if (isSuccess) {
      console.log(`✅ ${description}: Success`);
      try {
        const jsonData = JSON.parse(data);
        console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
      } catch {
        console.log(`📄 Response:`, data);
      }
      return true;
    } else {
      console.log(`❌ ${description}: Failed`);
      console.log(`📄 Error:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

async function runHealthChecks() {
  console.log('🚀 Starting GetGoodTape Local API Health Checks\n');

  const results = [];

  // Test basic connectivity
  results.push(await testEndpoint(FRONTEND_URL, 'Frontend Server'));
  results.push(
    await testEndpoint(`${WORKERS_URL}/health`, 'Workers API Server')
  );

  console.log('\n📡 Testing API Endpoints through Frontend Proxy:\n');

  // Test health endpoint
  results.push(await testApiEndpoint('/health', 'GET', null, 'Health Check'));

  // Test platforms endpoint
  results.push(
    await testApiEndpoint('/platforms', 'GET', null, 'Platforms List')
  );

  // Test URL validation with a sample YouTube URL
  results.push(
    await testApiEndpoint(
      '/validate',
      'POST',
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      'URL Validation (YouTube)'
    )
  );

  // Test URL validation with invalid URL (expecting 400 status)
  results.push(
    await testApiEndpoint(
      '/validate',
      'POST',
      { url: 'invalid-url' },
      'URL Validation (Invalid URL)',
      400
    )
  );

  console.log('\n📊 Health Check Summary:');
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log(
      '\n🎉 All health checks passed! Your local development environment is ready.'
    );
  } else {
    console.log(
      '\n⚠️  Some health checks failed. Please check the logs above.'
    );
  }

  return passed === total;
}

// Run the health checks
runHealthChecks()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Health check script failed:', error);
    process.exit(1);
  });
