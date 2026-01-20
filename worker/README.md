# VIGA Worker

Standalone Node.js worker for executing VIGA automation agents (Chaos, Strike, Replay) in production.

## Overview

The VIGA Worker is a persistent Node.js process that polls Supabase for pending jobs and executes them using Playwright connected to Browserless.io. It runs independently from the Next.js app and is designed to be deployed on Railway.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Next.js App   │────────▶│    Supabase      │◀────────│  VIGA Worker    │
│   (Vercel)      │  Create │   Jobs Table     │  Poll   │   (Railway)     │
│                 │   Jobs  │                  │  Jobs   │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                   │
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │ Browserless.io  │
                                                          │   (WebSocket)   │
                                                          └─────────────────┘
```

## Features

- **Infinite Loop Polling**: Continuously polls Supabase for pending jobs
- **Job Execution**: Routes jobs to appropriate agents (Chaos, Strike, Replay)
- **Progress Tracking**: Updates job progress in real-time
- **Error Handling**: Automatic retry logic with exponential backoff
- **Graceful Shutdown**: Handles SIGTERM/SIGINT for clean shutdowns
- **Browserless Integration**: Connects to Browserless.io via WebSocket (no local Chromium)

## Environment Variables

Create a `.env` file in the worker directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Browserless.io Configuration
BROWSERLESS_WS=wss://chrome.browserless.io?token=YOUR_TOKEN

# LLM API Keys
GROQ_API_KEY=your-groq-key
GROQ_API_KEY_2=your-groq-key-2  # Optional: for key rotation
GROQ_API_KEY_3=your-groq-key-3  # Optional: for key rotation
OPENAI_API_KEY=your-openai-key
GOOGLE_AI_STUDIO_KEY=your-google-ai-key

# Worker Configuration (Optional)
POLL_INTERVAL_MS=3000  # Default: 3000ms
MAX_RETRIES=3          # Default: 3
```

## Local Development

1. **Install Dependencies**
   ```bash
   cd worker
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run in Development Mode**
   ```bash
   npm run dev
   ```

   This uses `tsx watch` for hot-reloading during development.

## Production Deployment (Railway)

1. **Build the Worker**
   ```bash
   npm run build
   ```

2. **Start the Worker**
   ```bash
   npm start
   ```

3. **Railway Configuration**
   - Root directory: `/worker`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Add all environment variables in Railway dashboard

## Job Types

### Chaos
Exploratory testing that autonomously navigates and tests web applications.

**Job Payload:**
```json
{
  "job_type": "chaos",
  "url": "https://example.com",
  "suite_id": "uuid",
  "credentials": {
    "username": "test@example.com",
    "password": "password"
  }
}
```

### Strike
Goal-oriented testing that accomplishes specific objectives.

**Job Payload:**
```json
{
  "job_type": "strike",
  "url": "https://example.com",
  "suite_id": "uuid",
  "goal": "Activate dark mode"
}
```

### Replay
Self-healing regression testing that replays recorded steps.

**Job Payload:**
```json
{
  "job_type": "replay",
  "url": "https://example.com",
  "suite_id": "uuid",
  "steps": [
    {
      "id": "step-uuid",
      "title": "Click login button",
      "selector": "#login-btn",
      "action_type": "click"
    }
  ]
}
```

## Monitoring

The worker logs all activity to console. In production (Railway), these logs are available in the Railway dashboard.

**Log Levels:**
- `[WORKER]` - Worker lifecycle events
- `[CHAOS]` - Chaos agent execution
- `[STRIKE]` - Strike agent execution
- `[REPLAY]` - Replay agent execution
- `[SUPABASE]` - Database operations
- `[EVIDENCE]` - Evidence capture

## Troubleshooting

### Worker not picking up jobs
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Verify jobs table exists in Supabase
- Check Railway logs for connection errors

### Browserless connection failures
- Verify `BROWSERLESS_WS` is correct and includes your token
- Check Browserless.io dashboard for quota/limits
- Ensure WebSocket URL format is correct: `wss://chrome.browserless.io?token=YOUR_TOKEN`

### LLM API errors
- Verify API keys are valid
- Check for rate limits
- Worker automatically rotates between multiple Groq keys if provided

## Scaling

The worker processes jobs sequentially. To scale:

1. **Vertical Scaling**: Increase Railway instance resources
2. **Horizontal Scaling**: Deploy multiple worker instances (ensure proper job locking in Supabase)

## Health Checks

The worker doesn't expose HTTP endpoints. Monitor health via:
- Railway logs showing regular polling activity
- Supabase jobs table showing jobs being processed
- No consecutive errors in logs
