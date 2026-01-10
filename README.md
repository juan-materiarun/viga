# VIGA Dashboard

A high-end Next.js dashboard for VIGA by Materia.run, featuring real-time infrastructure health monitoring with full page routing, **Playwright-powered automated scanning**, and **dual theme support (Dark & Light)**.

## Features

- **🤖 Parallel Multi-Agent AI Analysis** - 3 specialized AI agents (UX/UI, SEO, Functional QA) run in parallel to analyze your website using Gemini 1.5 Flash
- **📸 Screenshot Capture** - Full-page screenshots with Playwright
- **🎨 Dual Theme System** - Switch between midnight black and clean white themes
- **🖼️ Smart Logo Switching** - VIGA-blacklogo.png for dark theme, VIGA-lightlogo.png for light theme
- **🧭 Elegant sidebar navigation** with Next.js Link components
- **📌 Sticky header** with theme toggle and user profile
- **✨ Active route highlighting** using Next.js `usePathname`
- **⚡ Command bar** for executing VIGA commands (Dashboard page)
- **🔄 Processing state** with real-time activity logs
- **📊 Live status grid** showing Stability, Logic Coverage, Active Monitors, and Critical Alerts
- **📝 Activity log** with live Playwright execution logs
- **🎬 Smooth animations** powered by Framer Motion
- **📄 Multiple pages**: Dashboard, Tests, Infrastructure, and Settings

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14
- React 18
- Framer Motion
- Playwright Test
- Prisma Client
- Google Generative AI

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

This installs the Chromium browser needed for headless scanning.

### 3. Set Up Google AI API Key (Optional but Recommended)

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

Create a `.env.local` file in the root:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

**Without AI key**: Scanner works but skips AI analysis.
**With AI key**: Get detailed findings from 3 expert agents! 🤖

See `SETUP_AI.md` for detailed instructions.

### 4. Logo Images (Already Included)

The project includes both VIGA logos:
- `public/VIGA-blacklogo.png` - Used in **dark theme** (black background)
- `public/VIGA-lightlogo.png` - Used in **light theme** (white background)

The logos automatically switch when you toggle the theme!

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you'll be automatically redirected to `/dashboard`.

### 6. Build for Production

```bash
npm run build
npm start
```

## Theme System

### Switching Themes

Click the **sun ☀️** or **moon 🌙** icon in the header to toggle between themes:

- **Dark Theme (Default)**: Midnight black (#000000) with slate borders
- **Light Theme**: Clean white (#ffffff) with light gray borders

### Theme Features

- **Persistent**: Your theme preference is saved to localStorage
- **Instant switching**: Smooth CSS transitions between themes
- **Logo adaptation**: Logos automatically switch based on theme
- **Complete coverage**: All components and pages support both themes

### Theme Variables

The app uses CSS custom properties for theming:

```css
/* Dark Theme */
--bg-primary: #000000
--text-primary: #ffffff
--border-primary: #1e293b

/* Light Theme */
--bg-primary: #ffffff
--text-primary: #0f172a
--border-primary: #e2e8f0
```

## VIGA Scanner API with Parallel Multi-Agent AI

### Run a Scan

The dashboard includes a powerful VIGA scanner with advanced AI analysis:

1.  **Accepts any URL** via the command input
2.  **Launches a headless Chromium browser** using Playwright
3.  **Navigates to the target page**
4.  **Captures a full-page screenshot**
5.  **🤖 Parallel AI Multi-Agent Analysis** - 3 specialized expert agents (UX/UI, SEO, Functional QA) run concurrently to analyze the screenshot from their unique perspectives.
6.  **Returns a comprehensive VIGA Master Report** with aggregated findings, individual agent reports, screenshot, and metadata.

### API Endpoint

**POST** `/api/run-viga`

Request body:
```json
{
  "url": "https://example.com"
}
```

Response (with VIGA Master Report):
```json
{
  "success": true,
  "message": "Scan completed successfully with AI analysis.",
  "data": {
    "screenshotPath": "/screenshots/viga_scan_example_com_1234567890.png",
    "url": "https://example.com",
    "title": "Example Domain",
    "timestamp": "2026-01-09T...",
    "vigaMasterReport": {
      "findings": [ // Aggregated findings
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
          "description": "Call-to-action button appears too small",
          "severity": "Medium",
          "fix": "Increase button size to minimum 44x44px touch target"
        }
      ],
      "summary": { // Aggregated summary
        "totalFindings": 3,
        "highSeverity": 2,
        "mediumSeverity": 1,
        "lowSeverity": 0
      },
      "agentReports": { // Individual agent reports
        "uxUi": { "findings": [...], "summary": {...} },
        "seo": { "findings": [...], "summary": {...} },
        "functional": { "findings": [...], "summary": {...} }
      }
    }
  }
}
```

### Using the Scanner

1. Navigate to the Dashboard (`/dashboard`)
2. Enter a URL in the command bar (e.g., `https://example.com`)
3. Click "Run Scan" button
4. Watch the **Processing state** with real-time logs
5. View the **scan results** with screenshot link

Screenshots are saved in `public/screenshots/` and accessible via the web interface.

## Project Structure

```
app/
├── layout.jsx              # Root layout with sidebar + header
├── globals.css             # Global styles with theme variables
├── page.jsx               # Root (redirects to /dashboard)
├── contexts/
│   └── ThemeContext.jsx   # Theme provider and toggle logic
├── api/
│   └── run-viga/
│       └── route.ts       # VIGA scanner API endpoint
├── dashboard/
│   ├── page.jsx          # Main dashboard with scan functionality
│   └── dashboard.css
├── tests/                # Test suites monitoring page
├── infrastructure/       # Infrastructure health page
└── settings/            # Settings and configuration page

public/
├── screenshots/         # Generated screenshots from scans
├── VIGA-blacklogo.png  # Logo for dark theme ✓
└── VIGA-lightlogo.png  # Logo for light theme ✓
```

## Navigation

- **Dashboard** (`/dashboard`) - Main dashboard with command bar, stats, and activity log
- **Test Suites** (`/tests`) - Monitor Playwright test suites
- **Infrastructure** (`/infrastructure`) - Real-time infrastructure health metrics
- **Settings** (`/settings`) - Configuration and preferences

Active routes are automatically highlighted in the sidebar with a blue accent border.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Playwright Test** (headless browser automation)
- **Framer Motion** (animations)
- **Prisma** (database ORM)
- **Google Generative AI** (future AI features)
- **Inter & JetBrains Mono** (fonts)

## Design

### Dark Theme (Default)
- Background: Midnight black (#000000)
- Borders: Slate (#1e293b)
- Text: White with various opacities
- Logo: VIGA-blacklogo.png (for dark theme)

### Light Theme
- Background: Clean white (#ffffff)
- Borders: Light gray (#e2e8f0)
- Text: Dark slate with various opacities
- Logo: VIGA-lightlogo.png (for light theme)

### Typography
- UI: Inter font family
- Code/Logs: JetBrains Mono
- Animations: Framer Motion fade-in effects

## API Health Check

**GET** `/api/run-viga`

Returns:
```json
{
  "status": "operational",
  "service": "VIGA Scanner API",
  "version": "1.0.0"
}
```

## Troubleshooting

### Playwright not working?

Make sure you've installed the browsers:
```bash
npx playwright install chromium
```

### Screenshots not saving?

The `public/screenshots/` directory is created automatically. Check file permissions if you encounter issues.

### Theme not persisting?

The theme is saved to localStorage. Check your browser's localStorage settings and ensure it's not being cleared.

### Logos not displaying?

Both logo files should be in the `public/` folder:
- `public/VIGA-blacklogo.png`
- `public/VIGA-lightlogo.png`

Restart the dev server after adding logo files.

## Customization

### Change the header title
Edit the `header-title` in `app/layout.jsx`:

```jsx
<h1 className="header-title">VIGA / Infrastructure Health</h1>
```

### Add new routes
1. Create a new folder in `app/` (e.g., `app/analytics/`)
2. Add a `page.jsx` file in that folder
3. Add the route to the `sidebarItems` array in `app/layout.jsx`

### Customize scan behavior
Edit `app/api/run-viga/route.ts` to:
- Change viewport size
- Add custom headers
- Modify screenshot settings
- Add additional page analysis

### Customize theme colors
Edit CSS custom properties in `app/globals.css`:

```css
:root[data-theme="dark"] {
  --bg-primary: #000000;
  --accent-blue: #3b82f6;
  /* ...more variables */
}

:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --accent-blue: #3b82f6;
  /* ...more variables */
}
```

## Keyboard Shortcuts

- Theme toggle: Click the sun/moon icon in the header
- Navigate pages: Use the sidebar menu items

## Future Enhancements

- [ ] Add keyboard shortcut for theme toggle (Ctrl/Cmd + Shift + T)
- [ ] Add more theme variants (e.g., blue, purple)
- [ ] Add theme preview in settings page
- [ ] Auto-detect system theme preference
