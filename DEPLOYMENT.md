# VIGA Production Deployment Guide

This guide walks you through deploying the VIGA application to production with the app on Vercel and the worker on Railway.

## Architecture Overview

```
GitHub Repository
├── /app (Next.js) ────────▶ Vercel
└── /worker (Node.js) ─────▶ Railway
         │
         ▼
    Browserless.io (WebSocket)
         │
         ▼
    Supabase (Database + Storage)
```

## Prerequisites

- [x] GitHub account
- [x] Vercel account
- [x] Railway account
- [x] Supabase project
- [x] Browserless.io account

## Step 1: Supabase Setup

### 1.1 Create Jobs Table

Run the migration in your Supabase SQL Editor:

```bash
# Location: /supabase/migrations/create_jobs_table.sql
```

Or manually execute:

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('chaos', 'strike', 'replay')),
  status TEXT NOT NULL DEFAULT 'pending',
  url TEXT NOT NULL,
  goal TEXT,
  credentials JSONB,
  steps JSONB,
  progress JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_suite_id ON jobs(suite_id);
```

### 1.2 Get Supabase Credentials

From your Supabase project settings:
- `SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (Settings > API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon public key

## Step 2: Browserless.io Setup

1. Sign up at [browserless.io](https://browserless.io)
2. Get your API token from the dashboard
3. Your WebSocket URL will be: `wss://chrome.browserless.io?token=YOUR_TOKEN`

## Step 3: Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

## Step 4: Deploy Worker to Railway

### 4.1 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your VIGA repository
5. Railway will auto-detect the project

### 4.2 Configure Root Directory

In Railway project settings:
- **Root Directory**: `/worker`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4.3 Add Environment Variables

In Railway > Variables tab, add:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BROWSERLESS_WS=wss://chrome.browserless.io?token=YOUR_TOKEN
GROQ_API_KEY=your-groq-key
GROQ_API_KEY_2=your-groq-key-2
GROQ_API_KEY_3=your-groq-key-3
OPENAI_API_KEY=your-openai-key
GOOGLE_AI_STUDIO_KEY=your-google-ai-key
POLL_INTERVAL_MS=3000
MAX_RETRIES=3
```

### 4.4 Deploy

Railway will automatically deploy. Check logs to verify:
```
[WORKER] 🤖 VIGA Worker started
[WORKER] 📊 Poll interval: 3000ms
[WORKER] 🌐 Browserless WS: ✅ Configured
[WORKER] 💤 No pending jobs, waiting...
```

## Step 5: Deploy App to Vercel

### 5.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### 5.2 Configure Root Directory

- **Root Directory**: `/` (leave as default, or explicitly set to root)
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### 5.3 Add Environment Variables

In Vercel > Settings > Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LLM Keys (for any frontend AI features if needed)
GOOGLE_AI_STUDIO_KEY=your-google-ai-key
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key
```

**Note**: Remove these variables from Vercel (no longer needed):
- ~~`QSTASH_TOKEN`~~
- ~~`QSTASH_URL`~~
- ~~`QSTASH_CURRENT_SIGNING_KEY`~~
- ~~`QSTASH_NEXT_SIGNING_KEY`~~
- ~~`BROWSERLESS_TOKEN`~~
- ~~`NEXT_PUBLIC_APP_URL`~~ (Vercel handles this automatically)

### 5.4 Deploy

Click "Deploy". Vercel will build and deploy your app.

## Step 6: Verification

### 6.1 Test the App

1. Open your Vercel deployment URL
2. Log in to your account
3. Submit a Chaos test
4. Verify you see the "running" page

### 6.2 Check Job Creation

In Supabase > Table Editor > jobs:
- You should see a new row with `status: 'pending'`

### 6.3 Check Worker Logs

In Railway > Deployments > Logs:
```
[WORKER] 📥 Found 1 pending job(s)
[WORKER] 🚀 Executing job xxx (chaos) for suite yyy
[CHAOS] 🌪️ Chaos Monkey Liberado
...
[WORKER] ✅ Job xxx completed successfully
```

### 6.4 Check Evidence

In Supabase > Storage > viga-evidence:
- Screenshots and HTML snapshots should appear

## Step 7: Monitor Production

### App Monitoring (Vercel)
- **Logs**: Vercel > Project > Logs
- **Analytics**: Vercel > Project > Analytics
- **Errors**: Check for 402 errors (insufficient funds)

### Worker Monitoring (Railway)
- **Logs**: Railway > Deployments > Logs
- **Metrics**: Railway > Metrics (CPU, Memory)
- **Restarts**: Check for unexpected restarts

### Database Monitoring (Supabase)
- **Jobs Table**: Monitor job statuses
- **Logs**: Supabase > Logs
- **Storage**: Check evidence bucket size

## Troubleshooting

### Issue: Jobs stuck in "pending"

**Cause**: Worker not running or can't connect to Supabase

**Solution**:
1. Check Railway logs for errors
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. Restart Railway deployment

### Issue: "Insufficient Funds" error

**Cause**: User doesn't have enough VIGAS

**Solution**:
- This is expected behavior
- Frontend should show alert: "You need X VIGAS to run this test"
- User needs to purchase more VIGAS

### Issue: Browserless connection failures

**Cause**: Invalid WebSocket URL or quota exceeded

**Solution**:
1. Verify `BROWSERLESS_WS` format: `wss://chrome.browserless.io?token=YOUR_TOKEN`
2. Check Browserless.io dashboard for quota
3. Upgrade Browserless plan if needed

### Issue: Worker crashes repeatedly

**Cause**: Unhandled errors or memory issues

**Solution**:
1. Check Railway logs for stack traces
2. Increase Railway instance resources
3. Check for infinite loops or memory leaks

## Scaling

### Horizontal Scaling (Multiple Workers)

To run multiple worker instances:

1. Deploy additional Railway services from the same repo
2. All workers will poll the same jobs table
3. Implement job locking to prevent duplicate execution:

```sql
-- Add locked_by column
ALTER TABLE jobs ADD COLUMN locked_by TEXT;
ALTER TABLE jobs ADD COLUMN locked_at TIMESTAMPTZ;

-- Update worker to claim jobs atomically
UPDATE jobs 
SET status = 'running', locked_by = 'worker-1', locked_at = NOW()
WHERE id = (
  SELECT id FROM jobs 
  WHERE status = 'pending' 
  AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
  ORDER BY created_at ASC 
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

### Vertical Scaling

Increase Railway instance resources:
- Go to Railway > Settings > Resources
- Increase CPU/Memory allocation

## Cost Optimization

- **Browserless**: Choose plan based on concurrent sessions needed
- **Railway**: Start with smallest instance, scale as needed
- **Vercel**: Hobby plan sufficient for most use cases
- **Supabase**: Free tier works for testing, upgrade for production

## Security Checklist

- [x] Service role keys stored as environment variables (not in code)
- [x] RLS policies enabled on jobs table
- [x] Browserless token not exposed to frontend
- [x] CORS configured properly on Supabase
- [x] API routes validate user authentication

## Next Steps

- Set up monitoring alerts (Railway, Vercel, Supabase)
- Configure custom domain on Vercel
- Set up CI/CD for automated deployments
- Implement job retention policy (delete old jobs after X days)
- Add worker health check endpoint (optional)
