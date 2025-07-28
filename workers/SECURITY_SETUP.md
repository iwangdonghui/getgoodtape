# 🔒 Security Setup Guide

## ⚠️ IMPORTANT: Configure Production Secrets

This file contains instructions for setting up production secrets securely.
**DO NOT commit actual secrets to Git.**

## 1. Cloudflare Workers Configuration

### Update wrangler.toml with your actual IDs:

```toml
[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "getgoodtape-prod"
database_id = "YOUR_ACTUAL_DATABASE_ID"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "YOUR_ACTUAL_KV_NAMESPACE_ID"
```

### Get your actual IDs:

```bash
# Get D1 database ID
wrangler d1 list

# Get KV namespace ID
wrangler kv namespace list
```

## 2. Environment Variables

### Create .dev.vars (for local development):

```bash
ENVIRONMENT=development
PROCESSING_SERVICE_URL=https://getgoodtape-video-processor.onrender.com
```

### Set production variables:

```bash
# Set production environment variables
wrangler secret put PROCESSING_SERVICE_URL --env production
# Enter: https://getgoodtape-video-processor.onrender.com
```

## 3. Security Checklist

- [ ] Updated wrangler.toml with actual resource IDs
- [ ] Created .dev.vars for local development
- [ ] Set production secrets via wrangler secret put
- [ ] Verified .gitignore excludes sensitive files
- [ ] Removed any committed secrets from Git history

## 4. Files to Keep Secret

These files should NEVER be committed to Git:

- `workers/.dev.vars`
- `workers/.prod.vars`
- Any file containing API keys, tokens, or resource IDs

## 5. Production Deployment

After configuring secrets:

```bash
cd workers
wrangler deploy --env production
```

## 6. Verify Security

Check that no secrets are exposed:

```bash
# Check Git status
git status

# Verify .gitignore
cat .gitignore | grep -E "(\.vars|\.env)"

# Check for committed secrets
git log --grep="secret\|key\|token" --oneline
```
