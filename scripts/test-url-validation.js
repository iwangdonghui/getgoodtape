#!/usr/bin/env node

/**
 * URL Validation End-to-End Test
 * Tests the URL validation functionality through the frontend API
 */

const FRONTEND_URL = 'http://localhost:3002';

async function testUrlValidation(url, expectedValid, description) {
  try {
    console.log(`🧪 Testing ${description}...`);

    const response = await fetch(`${FRONTEND_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();
    const status = response.status;

    console.log(`📊 ${description}: ${status}`);

    if (expectedValid) {
      // Expecting valid URL
      if (status === 200 && data.isValid && data.platform) {
        console.log(`✅ ${description}: Valid URL detected`);
        console.log(
          `📄 Platform: ${typeof data.platform === 'string' ? data.platform : data.platform.name}`
        );
        if (data.videoId) console.log(`📄 Video ID: ${data.videoId}`);
        return true;
      } else {
        console.log(`❌ ${description}: Expected valid URL but got invalid`);
        console.log(`📄 Response:`, JSON.stringify(data, null, 2));
        return false;
      }
    } else {
      // Expecting invalid URL
      if ((status === 400 || status === 200) && !data.isValid && data.error) {
        console.log(`✅ ${description}: Invalid URL correctly rejected`);
        console.log(`📄 Error: ${data.error.message}`);
        return true;
      } else {
        console.log(`❌ ${description}: Expected invalid URL but got valid`);
        console.log(`📄 Response:`, JSON.stringify(data, null, 2));
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

async function runUrlValidationTests() {
  console.log('🚀 Starting URL Validation End-to-End Tests\n');

  const results = [];

  // Test valid URLs
  results.push(
    await testUrlValidation(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      true,
      'YouTube URL (Rick Roll)'
    )
  );

  results.push(
    await testUrlValidation(
      'https://youtu.be/dQw4w9WgXcQ',
      true,
      'YouTube Short URL'
    )
  );

  results.push(
    await testUrlValidation(
      'https://www.tiktok.com/@user/video/1234567890',
      true,
      'TikTok URL'
    )
  );

  // Test invalid URLs
  results.push(
    await testUrlValidation('invalid-url', false, 'Invalid URL Format')
  );

  results.push(
    await testUrlValidation(
      'https://www.google.com',
      false,
      'Unsupported Platform'
    )
  );

  results.push(await testUrlValidation('', false, 'Empty URL'));

  console.log('\n📊 URL Validation Test Summary:');
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log(
      '\n🎉 All URL validation tests passed! The validation system is working correctly.'
    );
  } else {
    console.log(
      '\n⚠️  Some URL validation tests failed. Please check the implementation.'
    );
  }

  return passed === total;
}

// Run the tests
runUrlValidationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ URL validation test script failed:', error);
    process.exit(1);
  });
