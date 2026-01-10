# VIGA Dashboard - Quick Start

## 1. Install Dependencies

```bash
npm install
```

## 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

## 3. Set Up Google AI (Optional but Recommended)

### Get API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### Add to Environment

Create a `.env.local` file in the project root:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
```

**Without AI**: The scanner will work but won't provide AI analysis.
**With AI**: Get detailed UX/UI, SEO, and QA findings from 3 expert agents.

## 4. Add Logo Images

Place these files in the `public/` folder:
- `VIGA-blacklogo.png` (for dark theme)
- `VIGA-lightlogo.png` (for light theme)

**Already included!** ✓

## 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 6. Test the Scanner

1. Navigate to Dashboard
2. Enter a URL: `https://example.com`
3. Click "Run Scan"
4. Wait ~5-9 seconds
5. View screenshot and AI analysis

## Features

✅ **Screenshot Capture** - Full-page screenshots with Playwright
✅ **Multi-Agent AI** - 3 expert agents analyze your site
✅ **Dark/Light Themes** - Toggle with sun/moon icon
✅ **Real-time Logs** - See scan progress live
✅ **Responsive Design** - Works on all screen sizes

## Multi-Agent AI Experts

### 🎨 UX/UI Expert
Analyzes design, layout, accessibility, and user experience

### 🔍 SEO Specialist
Evaluates content structure, readability, and SEO best practices

### 🧪 Functional QA
Identifies functional issues, form problems, and navigation clarity

## Sample AI Report

```json
{
  "findings": [
    {
      "category": "UX/UI",
      "description": "Low contrast between text and background",
      "severity": "High",
      "fix": "Increase contrast ratio to 4.5:1 for WCAG AA"
    }
  ],
  "summary": {
    "totalFindings": 8,
    "highSeverity": 2,
    "mediumSeverity": 4,
    "lowSeverity": 2
  }
}
```

## Troubleshooting

### Playwright Error
```bash
npx playwright install chromium
```

### No AI Analysis
Check that `.env.local` exists with your API key.

### Logo Not Showing
Verify files exist in `public/` folder and restart server.

## Next Steps

- Read `SETUP_AI.md` for detailed AI configuration
- Read `HOW_TO_USE.md` for complete usage guide
- Read `THEME_GUIDE.md` for theme customization

## Support

For issues or questions, check the documentation files or create an issue.

Happy scanning! 🚀

