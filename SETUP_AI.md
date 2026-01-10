# Setting Up Multi-Agent AI Analysis

## Overview

VIGA now includes a powerful Multi-Agent AI system that analyzes website screenshots using Google's Gemini 1.5 Flash model. The AI acts as 3 expert analysts working together.

## Quick Setup

### 1. Get Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add API Key to Environment

Create a `.env.local` file in the root of your project:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
```

**Important:** Never commit your `.env.local` file to version control!

### 3. Restart Development Server

```bash
npm run dev
```

## How It Works

### Multi-Agent Architecture

The AI system consists of 3 specialized agents:

#### 🎨 Agent 1: UX/UI Expert
- Analyzes visual design and layout
- Checks typography and color contrast
- Evaluates accessibility
- Looks for design consistency

#### 🔍 Agent 2: SEO Specialist
- Evaluates content structure
- Checks headings hierarchy
- Assesses readability
- Reviews SEO best practices
- Checks mobile responsiveness indicators

#### 🧪 Agent 3: Functional QA Engineer
- Identifies functional issues
- Checks form layouts and button states
- Reviews navigation clarity
- Looks for error messages and loading states

### Analysis Flow

```
Screenshot captured by Playwright
  ↓
Convert to Base64
  ↓
Send to Gemini 1.5 Flash (vision model)
  ↓
Multi-Agent AI analyzes from 3 perspectives
  ↓
Returns structured JSON with findings
  ↓
Included in API response
```

## API Response Structure

### With AI Analysis

```json
{
  "success": true,
  "message": "Scan started successfully",
  "data": {
    "screenshotPath": "/screenshots/viga_scan_example_com_1234567890.png",
    "url": "https://example.com",
    "title": "Example Domain",
    "timestamp": "2026-01-09T...",
    "aiReport": {
      "findings": [
        {
          "category": "UX/UI",
          "description": "Low contrast between text and background in hero section",
          "severity": "High",
          "fix": "Increase contrast ratio to at least 4.5:1 for WCAG AA compliance"
        },
        {
          "category": "SEO",
          "description": "Missing visible H1 heading on the page",
          "severity": "High",
          "fix": "Add a clear H1 heading that describes the page content"
        },
        {
          "category": "Functional QA",
          "description": "Call-to-action button appears too small for mobile users",
          "severity": "Medium",
          "fix": "Increase button size to minimum 44x44px touch target"
        }
      ],
      "summary": {
        "totalFindings": 3,
        "highSeverity": 2,
        "mediumSeverity": 1,
        "lowSeverity": 0
      }
    }
  }
}
```

### Finding Object Structure

Each finding contains:

- **category**: `"UX/UI"` | `"SEO"` | `"Functional QA"`
- **description**: Clear explanation of the issue
- **severity**: `"Low"` | `"Medium"` | `"High"`
- **fix**: Specific, actionable recommendation

### Without AI Key

If no API key is provided, the response will be:

```json
{
  "success": true,
  "data": {
    "screenshotPath": "...",
    "url": "...",
    "title": "...",
    "timestamp": "...",
    "aiReport": null
  }
}
```

## Model Choice: Gemini 1.5 Flash

We use `gemini-1.5-flash` because:

- **Fast**: Optimized for speed (2-3 seconds response time)
- **Vision Capable**: Can analyze images
- **Cost-Effective**: Lower API costs than Pro model
- **High Quality**: Excellent for structured analysis
- **Long Context**: Can handle detailed prompts

## Example Analysis

### Input: Screenshot of Landing Page

### Output:

```json
{
  "findings": [
    {
      "category": "UX/UI",
      "description": "Hero section lacks visual hierarchy with similar-sized text elements",
      "severity": "Medium",
      "fix": "Increase headline font size to 48-56px and reduce subheading to 18-20px"
    },
    {
      "category": "UX/UI",
      "description": "CTA button color blends with background (both blue tones)",
      "severity": "High",
      "fix": "Use contrasting color like orange or green for primary CTA"
    },
    {
      "category": "SEO",
      "description": "Content appears text-heavy with no visual breaks",
      "severity": "Low",
      "fix": "Add relevant images, icons, or white space to improve readability"
    },
    {
      "category": "SEO",
      "description": "No visible breadcrumbs or clear navigation structure",
      "severity": "Medium",
      "fix": "Add breadcrumb navigation to improve site structure and SEO"
    },
    {
      "category": "Functional QA",
      "description": "Form fields lack visible labels or placeholder text",
      "severity": "High",
      "fix": "Add clear labels above each form field and include helper text"
    },
    {
      "category": "Functional QA",
      "description": "No visible loading states or disabled button states in form",
      "severity": "Low",
      "fix": "Add loading spinner and disable submit button during processing"
    }
  ],
  "summary": {
    "totalFindings": 6,
    "highSeverity": 2,
    "mediumSeverity": 2,
    "lowSeverity": 2
  }
}
```

## Error Handling

The AI analysis includes graceful error handling:

### No API Key
```json
{
  "aiReport": null
}
```
Console: `Google AI API key not found. Skipping AI analysis.`

### AI Service Error
```json
{
  "aiReport": {
    "error": "AI analysis failed",
    "details": "Error message here"
  }
}
```

### Parse Error
```json
{
  "aiReport": {
    "error": "Failed to parse AI response",
    "rawResponse": "First 500 characters of response..."
  }
}
```

## Customization

### Change AI Model

Edit `app/api/run-viga/route.ts`:

```typescript
// Use Pro model for higher quality (slower, more expensive)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Or use Flash (current - faster, cheaper)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

### Customize Agents

Modify the prompt to add/remove agents or change their focus:

```typescript
const prompt = `You are a Multi-Agent AI system composed of 4 expert analysts:

**Agent 1: Accessibility Expert**
- WCAG compliance
- Screen reader compatibility
- Keyboard navigation

**Agent 2: Performance Analyst**
- Image optimization
- Loading indicators
- Resource usage

**Agent 3: Security Reviewer**
- SSL/HTTPS indicators
- Form security
- Privacy concerns

**Agent 4: Conversion Optimizer**
- CTA placement
- Trust signals
- User flow

...`;
```

### Adjust Severity Levels

The AI determines severity based on impact. You can guide it:

```typescript
const prompt = `
...
**Severity Guidelines:**
- **High**: Critical issues affecting accessibility, functionality, or conversion
- **Medium**: Important improvements that enhance user experience
- **Low**: Minor polish and optimization opportunities
...
`;
```

## Performance

- Screenshot capture: ~3-5 seconds
- AI analysis: ~2-4 seconds
- **Total scan time**: ~5-9 seconds

## Cost Estimation

Gemini 1.5 Flash pricing (as of 2024):
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens

Average cost per scan:
- Screenshot analysis: ~1,000-2,000 tokens
- **Cost per scan**: ~$0.0001-0.0003 (very cheap!)

## Limitations

1. **Visual Analysis Only**: AI can only see what's in the screenshot
2. **No Code Access**: Can't analyze underlying HTML/CSS/JS
3. **Static Snapshot**: No interaction or dynamic testing
4. **Context Limited**: Doesn't know business goals or branding guidelines
5. **Rate Limits**: Google AI has API rate limits (check your quota)

## Best Practices

1. **Use for Initial Audits**: Great for quick insights
2. **Combine with Manual Review**: AI findings should be validated
3. **Monitor API Costs**: Track usage in Google AI Studio
4. **Cache Results**: Consider saving AI reports to database
5. **Rate Limit Scans**: Don't hammer the API

## Troubleshooting

### "API key not found" warning

Create `.env.local` file with your API key.

### "Failed to parse AI response"

The AI returned non-JSON text. Check the `rawResponse` in the error.

### "AI analysis failed"

Check:
1. API key is valid
2. You have quota remaining
3. Network connection is stable
4. Screenshot file exists and is readable

### Slow response times

Try:
1. Using smaller viewport for screenshots
2. Switching to gemini-1.5-flash (if using Pro)
3. Reducing prompt complexity

## Next Steps

Consider adding:
- [ ] Display AI findings in the dashboard UI
- [ ] Severity-based color coding
- [ ] Export findings to PDF report
- [ ] Track findings over time
- [ ] Compare scans (before/after)
- [ ] Add AI confidence scores
- [ ] Allow users to mark findings as "fixed"

