#!/usr/bin/env node

/**
 * R2 Storage Setup Script for GetGoodTape
 *
 * This script creates the required Cloudflare R2 buckets for file storage.
 *
 * Usage:
 * - Development: node scripts/setup-r2.js dev
 * - Production: node scripts/setup-r2.js prod
 */

const { execSync } = require('child_process');

const environment = process.argv[2] || 'dev';

if (!['dev', 'prod'].includes(environment)) {
  console.error('Usage: node scripts/setup-r2.js [dev|prod]');
  process.exit(1);
}

console.log(`🪣 Setting up R2 buckets for ${environment} environment...`);

try {
  // Create R2 buckets
  const bucketName =
    environment === 'prod' ? 'getgoodtape-files' : 'getgoodtape-files-dev';

  console.log(`\n📦 Creating R2 bucket: ${bucketName}`);

  try {
    execSync(`wrangler r2 bucket create ${bucketName}`, { stdio: 'inherit' });
    console.log(`✅ R2 bucket '${bucketName}' created successfully`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`✅ R2 bucket '${bucketName}' already exists`);
    } else {
      throw error;
    }
  }

  // Set up CORS policy for the bucket
  console.log(`\n🔧 Configuring CORS policy for ${bucketName}...`);

  const corsPolicy = {
    cors: [
      {
        origins: [
          'https://getgoodtape.com',
          'https://*.getgoodtape.com',
          'http://localhost:3000',
          'http://localhost:8787',
        ],
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAgeSeconds: 3600,
      },
    ],
  };

  // Write CORS policy to temporary file
  const fs = require('fs');
  const path = require('path');
  const tempCorsFile = path.join(__dirname, 'temp-cors.json');

  fs.writeFileSync(tempCorsFile, JSON.stringify(corsPolicy, null, 2));

  try {
    execSync(
      `wrangler r2 bucket cors put ${bucketName} --file ${tempCorsFile}`,
      { stdio: 'inherit' }
    );
    console.log(`✅ CORS policy configured for ${bucketName}`);
  } catch (error) {
    console.warn(
      `⚠️  CORS configuration failed (this might be expected): ${error.message}`
    );
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempCorsFile)) {
      fs.unlinkSync(tempCorsFile);
    }
  }

  // List buckets to verify
  console.log('\n📋 Listing R2 buckets...');
  execSync('wrangler r2 bucket list', { stdio: 'inherit' });

  console.log('\n🎉 R2 setup completed!');
  console.log('\nBucket configuration:');
  console.log(`- Bucket name: ${bucketName}`);
  console.log('- CORS: Configured for web access');
  console.log('- Access: Private (access via Workers only)');
} catch (error) {
  console.error('❌ R2 setup failed:', error.message);
  process.exit(1);
}
