# How to Use the VIGA Scanner

## Quick Start

The dashboard is **already fully functional**! Here's how to use it:

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Navigate to Dashboard

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### 3. Run a Scan

1. **Enter a URL** in the command input bar (e.g., `https://example.com`)
2. **Click "Run Scan"** button (with the ▶ icon)
3. **Watch the processing state**:
   - Button shows "Processing..." with spinner
   - Activity log updates in real-time
   - Status indicator shows "Processing"
4. **View Results**:
   - Scan result card appears with success checkmark
   - Shows URL, title, and timestamp
   - **Screenshot preview** displays directly on the page
   - Click "Open Full Size" to view in new tab

## What Happens Behind the Scenes

### Frontend (Dashboard)

**File:** `app/dashboard/page.jsx`

1. **State Management**:
```jsx
const [commandInput, setCommandInput] = useState('');  // URL input
const [isProcessing, setIsProcessing] = useState(false);  // Loading state
const [scanResult, setScanResult] = useState(null);  // Scan results
```

2. **Form Submission**:
```jsx
const handleCommandSubmit = async (e) => {
  e.preventDefault();
  if (commandInput.trim() && !isProcessing) {
    await runVigatScan(commandInput.trim());
  }
};
```

3. **API Call**:
```jsx
const runVigatScan = async (url) => {
  setIsProcessing(true);
  setScanResult(null);
  
  const response = await fetch('/api/run-viga', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    setScanResult(data.data);  // Contains screenshotPath
    setCommandInput('');
  }
  
  setIsProcessing(false);
};
```

4. **UI States**:
   - **Idle**: Shows "Run Scan" button with play icon (▶)
   - **Processing**: Shows "Processing..." with animated spinner
   - **Complete**: Shows scan result card with screenshot preview

### Backend (API Route)

**File:** `app/api/run-viga/route.ts`

1. **Receives URL** from frontend
2. **Validates URL** format
3. **Launches Playwright**:
   - Headless Chromium browser
   - 1920x1080 viewport
   - Custom user agent
4. **Navigates to URL**:
   - 30-second timeout
   - Waits for network idle
   - Waits 1 second for animations
5. **Takes Screenshot**:
   - Full-page screenshot
   - Saved to `public/screenshots/`
   - Unique filename with timestamp
6. **Returns Response**:
```json
{
  "success": true,
  "message": "Scan started successfully",
  "data": {
    "screenshotPath": "/screenshots/viga_scan_example_com_1234567890.png",
    "url": "https://example.com",
    "title": "Example Domain",
    "timestamp": "2026-01-09T..."
  }
}
```

## Features

### ✅ Already Implemented

- [x] URL input with validation
- [x] Run Scan button with loading state
- [x] API integration with Playwright
- [x] Screenshot capture (full page)
- [x] Real-time activity logs
- [x] Processing state with spinner animation
- [x] Scan result card with metadata
- [x] **Screenshot preview displayed on page**
- [x] Link to open full-size screenshot
- [x] Error handling with user feedback
- [x] Automatic directory creation
- [x] Unique filenames to prevent conflicts

### Screenshot Features

- **Preview on Page**: Shows the screenshot directly in the dashboard
- **Zoom Hover Effect**: Slight scale effect when hovering
- **Scrollable Container**: For very long screenshots
- **Max Height**: 600px with scroll
- **Full Size Link**: Opens in new tab
- **Responsive**: Adapts to container width

## Testing

### Test with Different URLs

```bash
# Simple website
https://example.com

# Complex website
https://github.com

# Your own website
https://your-app.com
```

### Expected Behavior

1. **Valid URL**:
   - Processing state activates
   - Logs show progress
   - Screenshot appears after ~5-10 seconds
   - Result card shows with image preview

2. **Invalid URL**:
   - Error message in activity log
   - Details shown to user
   - Button returns to ready state

3. **Network Error**:
   - "Failed to connect to scan service" message
   - Button returns to ready state

## File Structure

```
app/
├── dashboard/
│   ├── page.jsx          ← Frontend UI
│   └── dashboard.css     ← Styling
└── api/
    └── run-viga/
        └── route.ts      ← Backend API with Playwright

public/
└── screenshots/          ← Generated screenshots
    └── viga_scan_*.png
```

## Customization

### Change Screenshot Settings

Edit `app/api/run-viga/route.ts`:

```typescript
// Change viewport size
viewport: { width: 1920, height: 1080 }

// Change timeout
timeout: 30000  // 30 seconds

// Change wait time for animations
await page.waitForTimeout(1000)  // 1 second

// Take viewport screenshot instead of full page
await page.screenshot({
  path: screenshotPath,
  fullPage: false,  // Only visible area
});
```

### Change Screenshot Preview Height

Edit `app/dashboard/dashboard.css`:

```css
.screenshot-image-container {
  max-height: 600px;  /* Change this value */
  overflow-y: auto;
}
```

### Customize Activity Logs

Edit `app/dashboard/page.jsx`:

```jsx
const logMessages = [
  'Checking DOM elements...',
  'Your custom message...',
  // Add more messages
];
```

## Troubleshooting

### Playwright Not Found

```bash
npx playwright install chromium
```

### Screenshots Not Saving

Check that `public/screenshots/` directory exists and is writable.

### API Timeout

Increase timeout in `route.ts`:
```typescript
timeout: 60000  // 60 seconds
```

### Screenshot Not Displaying

1. Check browser console for errors
2. Verify screenshot path in scan result
3. Check that image file exists in `public/screenshots/`

## API Endpoints

### POST /api/run-viga

Run a scan on a URL.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Scan started successfully",
  "data": {
    "screenshotPath": "/screenshots/viga_scan_example_com_1234567890.png",
    "url": "https://example.com",
    "title": "Example Domain",
    "timestamp": "2026-01-09T12:00:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to complete scan",
  "details": "Error message"
}
```

### GET /api/run-viga

Health check endpoint.

**Response:**
```json
{
  "status": "operational",
  "service": "VIGA Scanner API",
  "version": "1.0.0"
}
```

## Next Steps

Consider adding:
- [ ] Scan history list
- [ ] Compare screenshots
- [ ] Schedule recurring scans
- [ ] Export scan reports
- [ ] Share scan results
- [ ] Delete old screenshots
- [ ] Add more scan options (mobile viewport, dark mode, etc.)

