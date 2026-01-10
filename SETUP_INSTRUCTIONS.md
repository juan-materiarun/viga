# Setup Instructions for VIGA Dashboard

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Logo Images

**IMPORTANT**: You need to add your VIGA logo images to the `public` folder.

Required:
- `public/VIGA-lightlogo.png` - Light colored logo for the sidebar (displays on dark background)

Optional:
- `public/VIGA-blacklogo.png` - Dark colored logo (for future light theme support)

**Logo Specifications:**
- Recommended width: 80-100px
- Format: PNG with transparent background
- The logo will be displayed at 80px width by default
- Should be horizontally oriented

### 3. Start the Development Server

```bash
npm run dev
```

The app will automatically open at `http://localhost:3000` and redirect to `/dashboard`.

## Features Implemented

✅ **Next.js App Router** - Full routing with `/dashboard`, `/tests`, `/infrastructure`, and `/settings`

✅ **Logo in Sidebar** - Small, elegant logo placement at the top of the sidebar

✅ **Next.js Link Components** - All navigation items use `next/link` for client-side routing

✅ **Active Route Highlighting** - Uses `usePathname()` hook to highlight the current page with a blue accent

✅ **Sticky Header** - Header remains visible when scrolling

✅ **User Profile Placeholder** - Profile avatar and name in the top right of the header

✅ **Framer Motion Animations** - Smooth fade-in effects throughout

## Navigation Structure

```
/ (root)
  ↓ redirects to
/dashboard       - Main dashboard with command bar and activity log
/tests          - Test suites monitoring
/infrastructure - Infrastructure health metrics
/settings       - Configuration and preferences
```

## Troubleshooting

### Logo not displaying?

1. Check that the file is named exactly `VIGA-lightlogo.png`
2. Ensure it's in the `public` folder at the root level
3. Restart the dev server after adding images

### Route not highlighting?

The active route detection uses exact path matching. Make sure you're visiting one of the defined routes:
- `/dashboard`
- `/tests`
- `/infrastructure`
- `/settings`

## Customization

### Change User Profile Name

Edit `app/layout.jsx`, line with `<span className="user-name">`:

```jsx
<span className="user-name">Admin</span>  // Change "Admin" to your name
```

### Add More Navigation Items

In `app/layout.jsx`, add to the `sidebarItems` array:

```jsx
const sidebarItems = [
  // ... existing items
  { icon: '📈', label: 'Analytics', href: '/analytics' }
];
```

Then create the page at `app/analytics/page.jsx`.

