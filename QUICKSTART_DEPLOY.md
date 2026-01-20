# VIGA Production Deployment - Quick Start

## 🚀 Ready to Deploy!

Your project is now separated into:
- **App** (Next.js) → Deploy to Vercel
- **Worker** (Node.js) → Deploy to Railway

---

## ⚡ Quick Deploy Steps

### 1. Supabase Migration (2 min)
```sql
-- Copy/paste from: /supabase/migrations/create_jobs_table.sql
-- Run in: Supabase SQL Editor
```

### 2. Railway Worker (5 min)
1. New Project → Deploy from GitHub
2. Root Directory: `/worker`
3. Add environment variables (see below)
4. Deploy ✅

**Required Environment Variables:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
BROWSERLESS_WS=wss://chrome.browserless.io?token=YOUR_TOKEN
GROQ_API_KEY=gsk_...
GROQ_API_KEY_2=gsk_...  # Optional
GROQ_API_KEY_3=gsk_...  # Optional
OPENAI_API_KEY=sk-...
GOOGLE_AI_STUDIO_KEY=AIza...
```

### 3. Vercel App (3 min)
1. New Project → Import from GitHub
2. Framework: Next.js (auto-detected)
3. Add environment variables (see below)
4. Deploy ✅

**Required Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
GOOGLE_AI_STUDIO_KEY=AIza...
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
```

**⚠️ REMOVE these from Vercel:**
- ~~QSTASH_TOKEN~~
- ~~QSTASH_URL~~
- ~~QSTASH_CURRENT_SIGNING_KEY~~
- ~~QSTASH_NEXT_SIGNING_KEY~~
- ~~BROWSERLESS_TOKEN~~

---

## 🧪 Test It

1. Open your Vercel app
2. Run a Chaos test
3. Check Railway logs:
   ```
   [WORKER] 📥 Found 1 pending job(s)
   [WORKER] 🚀 Executing job...
   [CHAOS] 🌪️ Chaos Monkey Liberado
   ```
4. Check Supabase:
   - `jobs` table: status changes from `pending` → `running` → `completed`
   - `viga-evidence` bucket: screenshots appear

---

## 🛠️ Troubleshooting

### Worker not picking up jobs?
- Check Railway logs for errors
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Browserless connection failed?
- Verify `BROWSERLESS_WS` format: `wss://chrome.browserless.io?token=YOUR_TOKEN`
- Check Browserless.io dashboard for quota

### "Insufficient Funds" error?
- ✅ This is expected! User needs more VIGAS
- App shows red alert and doesn't navigate to running page

---

## 📚 Full Documentation

- [DEPLOYMENT.md](file:///c:/Users/dakla/OneDrive/Documentos/MATERIA.RUN/VIGA/DEPLOYMENT.md) - Complete deployment guide
- [worker/README.md](file:///c:/Users/dakla/OneDrive/Documentos/MATERIA.RUN/VIGA/worker/README.md) - Worker documentation
- [walkthrough.md](file:///C:/Users/dakla/.gemini/antigravity/brain/a54dc699-1bd9-426f-8d90-073d1aa16d1d/walkthrough.md) - Implementation details

---

## 🎯 What Changed?

**Before:**
- App used QStash to trigger serverless workers
- Playwright ran in Vercel functions (timeout issues)

**After:**
- App creates jobs in Supabase
- Worker polls jobs and executes them
- Playwright runs on Railway (persistent connection)

**Benefits:**
- ✅ No serverless timeouts
- ✅ Stable Browserless connection
- ✅ Better monitoring
- ✅ Independent scaling

---

## 🚨 Important Notes

1. **Billing happens BEFORE job creation** - If user doesn't have enough VIGAS, they see an error immediately
2. **Worker must be running** - Jobs won't execute until worker is deployed on Railway
3. **No Docker needed** - Both Railway and Vercel auto-detect and build
4. **Environment variables are critical** - Double-check all values

---

## ✅ Deployment Checklist

- [ ] Run Supabase migration
- [ ] Get Browserless.io WebSocket URL
- [ ] Deploy worker to Railway
- [ ] Deploy app to Vercel
- [ ] Test insufficient funds error
- [ ] Test successful job execution
- [ ] Monitor Railway logs
- [ ] Check Supabase evidence storage

---

**Need help?** Check [DEPLOYMENT.md](file:///c:/Users/dakla/OneDrive/Documentos/MATERIA.RUN/VIGA/DEPLOYMENT.md) for detailed troubleshooting.
