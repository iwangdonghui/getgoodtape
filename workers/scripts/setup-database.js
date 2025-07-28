#!/usr/bin/env node

/**
 * Database Setup Script for GetGoodTape
 *
 * This script helps initialize the Cloudflare D1 database with the required schema.
 *
 * Usage:
 * - Development: node scripts/setup-database.js dev
 * - Production: node scripts/setup-database.js prod
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const environment = process.argv[2] || 'dev';

if (!['dev', 'prod'].includes(environment)) {
  console.error('Usage: node scripts/setup-database.js [dev|prod]');
  process.exit(1);
}

const envFlag =
  environment === 'prod' ? '--env production' : '--env development';

console.log(`🚀 Setting up database for ${environment} environment...`);

try {
  // 1. Create D1 databases if they don't exist
  console.log('\n📊 Creating D1 databases...');

  if (environment === 'dev') {
    console.log('Creating development database...');
    try {
      execSync('wrangler d1 create getgoodtape-dev', { stdio: 'inherit' });
    } catch (error) {
      console.log('Development database might already exist, continuing...');
    }
  } else {
    console.log('Creating production database...');
    try {
      execSync('wrangler d1 create getgoodtape-prod', { stdio: 'inherit' });
    } catch (error) {
      console.log('Production database might already exist, continuing...');
    }
  }

  // 2. Run migrations
  console.log('\n🔄 Running database migrations...');

  const migrationsDir = path.join(__dirname, '../migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    console.log(`Running migration: ${migrationFile}`);
    const migrationPath = path.join(migrationsDir, migrationFile);

    try {
      execSync(
        `wrangler d1 execute getgoodtape-${environment === 'prod' ? 'prod' : 'dev'} --file=${migrationPath} ${envFlag}`,
        {
          stdio: 'inherit',
        }
      );
      console.log(`✅ Migration ${migrationFile} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationFile} failed:`, error.message);
      // Continue with other migrations
    }
  }

  // 3. Verify setup
  console.log('\n🔍 Verifying database setup...');

  try {
    execSync(
      `wrangler d1 execute getgoodtape-${environment === 'prod' ? 'prod' : 'dev'} --command="SELECT name FROM sqlite_master WHERE type='table';" ${envFlag}`,
      {
        stdio: 'inherit',
      }
    );
    console.log('✅ Database tables verified successfully');
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  }

  console.log('\n🎉 Database setup completed!');
  console.log('\nNext steps:');
  console.log('1. Update your wrangler.toml with the actual database IDs');
  console.log('2. Create R2 buckets: npm run setup:r2');
  console.log('3. Create KV namespaces: npm run setup:kv');
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}
