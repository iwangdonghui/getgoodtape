#!/usr/bin/env node

/**
 * KV Namespace Setup Script for GetGoodTape
 *
 * This script creates the required Cloudflare KV namespaces for caching.
 *
 * Usage:
 * - Development: node scripts/setup-kv.js dev
 * - Production: node scripts/setup-kv.js prod
 */

const { execSync } = require('child_process');

const environment = process.argv[2] || 'dev';

if (!['dev', 'prod'].includes(environment)) {
  console.error('Usage: node scripts/setup-kv.js [dev|prod]');
  process.exit(1);
}

console.log(`🗄️  Setting up KV namespaces for ${environment} environment...`);

try {
  // Create KV namespaces
  const namespaceName =
    environment === 'prod' ? 'getgoodtape-cache' : 'getgoodtape-cache-dev';

  console.log(`\n📝 Creating KV namespace: ${namespaceName}`);

  try {
    const result = execSync(`wrangler kv:namespace create ${namespaceName}`, {
      stdio: 'pipe',
      encoding: 'utf8',
    });

    console.log(`✅ KV namespace '${namespaceName}' created successfully`);
    console.log('Result:', result);

    // Extract namespace ID from output for easy copying
    const idMatch = result.match(/id = "([^"]+)"/);
    if (idMatch) {
      console.log(`\n📋 Namespace ID: ${idMatch[1]}`);
      console.log('Add this to your wrangler.toml file:');
      console.log(
        `[[env.${environment === 'prod' ? 'production' : 'development'}.kv_namespaces]]`
      );
      console.log('binding = "CACHE"');
      console.log(`id = "${idMatch[1]}"`);
    }
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`✅ KV namespace '${namespaceName}' already exists`);
    } else {
      throw error;
    }
  }

  // List namespaces to verify
  console.log('\n📋 Listing KV namespaces...');
  try {
    execSync('wrangler kv:namespace list', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Could not list KV namespaces:', error.message);
  }

  console.log('\n🎉 KV setup completed!');
  console.log('\nKV namespace configuration:');
  console.log(`- Namespace: ${namespaceName}`);
  console.log('- Binding: CACHE');
  console.log('- Usage: Caching video metadata, conversion status, etc.');

  console.log('\n💡 KV Usage Examples:');
  console.log(
    '- Cache video metadata: await env.CACHE.put(`metadata:${videoId}`, JSON.stringify(metadata), { expirationTtl: 3600 })'
  );
  console.log(
    '- Cache conversion status: await env.CACHE.put(`status:${jobId}`, status, { expirationTtl: 1800 })'
  );
  console.log(
    '- Cache platform info: await env.CACHE.put("platforms", JSON.stringify(platforms), { expirationTtl: 86400 })'
  );
} catch (error) {
  console.error('❌ KV setup failed:', error.message);
  process.exit(1);
}
