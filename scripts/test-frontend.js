#!/usr/bin/env node

/**
 * Frontend Integration Test
 * Tests the frontend page to ensure it loads without React errors
 */

const FRONTEND_URL = 'http://localhost:3002';

async function testPageLoad(url, description) {
  try {
    console.log(`🧪 Testing ${description}...`);
    const response = await fetch(url);
    const html = await response.text();

    if (response.ok) {
      // Check for common React error patterns in the HTML
      const hasReactError =
        html.includes('Unhandled Runtime Error') ||
        html.includes('Objects are not valid as a React child') ||
        html.includes('Error: ');

      if (hasReactError) {
        console.log(`❌ ${description}: Page loaded but contains React errors`);
        return false;
      } else {
        console.log(`✅ ${description}: Page loaded successfully`);
        return true;
      }
    } else {
      console.log(
        `❌ ${description}: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

async function testFrontendIntegration() {
  console.log('🚀 Starting Frontend Integration Tests\n');

  const results = [];

  // Test main pages
  results.push(await testPageLoad(`${FRONTEND_URL}`, 'Home Page'));
  results.push(await testPageLoad(`${FRONTEND_URL}/app`, 'App Page'));

  console.log('\n📊 Frontend Test Summary:');
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All frontend tests passed! No React errors detected.');
  } else {
    console.log(
      '\n⚠️  Some frontend tests failed. Please check the browser console for errors.'
    );
  }

  return passed === total;
}

// Run the tests
testFrontendIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Frontend test script failed:', error);
    process.exit(1);
  });
