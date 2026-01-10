# VIGA Dashboard - Theme Guide

## Overview

VIGA Dashboard features a complete dual-theme system that allows users to switch between a professional dark theme and a clean light theme.

## Theme Architecture

### Context-Based Theme Management

The theme system is built using React Context API:

```
app/contexts/ThemeContext.jsx
```

This provides:
- Global theme state
- Theme toggle function
- localStorage persistence
- Automatic theme application

### CSS Custom Properties

All colors are defined as CSS variables in `app/globals.css`:

```css
:root[data-theme="dark"] { /* Dark theme variables */ }
:root[data-theme="light"] { /* Light theme variables */ }
```

This allows instant theme switching without JavaScript color manipulation.

## Logo System

### Logo Files

- **VIGA-blacklogo.png** → Used in **DARK theme** (for black/dark background)
- **VIGA-lightlogo.png** → Used in **LIGHT theme** (for white/light background)

### Automatic Logo Switching

The layout component automatically switches logos based on the active theme:

```jsx
<Image 
  src={theme === 'dark' ? '/VIGA-blacklogo.png' : '/VIGA-lightlogo.png'}
  alt="VIGA" 
  width={80}
  height={32}
/>
```

## Theme Variables Reference

### Background Colors

| Variable | Dark Theme | Light Theme |
|----------|------------|-------------|
| `--bg-primary` | #000000 | #ffffff |
| `--bg-secondary` | #0a0a0a | #f8fafc |
| `--bg-tertiary` | #0f0f0f | #f1f5f9 |

### Border Colors

| Variable | Dark Theme | Light Theme |
|----------|------------|-------------|
| `--border-primary` | #1e293b | #e2e8f0 |
| `--border-secondary` | #334155 | #cbd5e1 |

### Text Colors

| Variable | Dark Theme | Light Theme |
|----------|------------|-------------|
| `--text-primary` | #ffffff | #0f172a |
| `--text-secondary` | #e2e8f0 | #1e293b |
| `--text-tertiary` | #cbd5e1 | #334155 |
| `--text-muted` | #94a3b8 | #64748b |
| `--text-disabled` | #64748b | #94a3b8 |

### Accent Colors (Same in Both Themes)

| Variable | Color |
|----------|-------|
| `--accent-blue` | #3b82f6 |
| `--accent-green` | #10b981 |
| `--accent-purple` | #8b5cf6 |
| `--accent-red` | #ef4444 |
| `--accent-orange` | #f59e0b |

## Using Themes in Components

### Reading Current Theme

```jsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div>
      Current theme: {theme}
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

### Using Theme Variables in CSS

```css
.my-component {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  transition: all 0.3s ease; /* Smooth theme transitions */
}
```

### Conditional Styling

For cases where you need different behavior per theme:

```jsx
<motion.a
  className="nav-item"
  whileHover={{ 
    backgroundColor: theme === 'dark' ? '#1e293b' : '#f1f5f9' 
  }}
>
  Navigation Item
</motion.a>
```

## Theme Toggle Button

Located in the header (`app/layout.jsx`):

```jsx
<button className="theme-toggle" onClick={toggleTheme}>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

- **Dark theme**: Shows sun icon (☀️) - click to go light
- **Light theme**: Shows moon icon (🌙) - click to go dark

## Persistence

Theme preference is saved to browser localStorage:

```javascript
localStorage.setItem('viga-theme', theme); // Save
const savedTheme = localStorage.getItem('viga-theme'); // Load
```

This ensures users' theme preference persists across sessions.

## Adding New Components

When creating new components, always use theme variables:

### ✅ DO:

```css
.new-component {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}
```

### ❌ DON'T:

```css
.new-component {
  background-color: #0a0a0a; /* Hard-coded color */
  color: white; /* Won't adapt to light theme */
}
```

## Testing Themes

### Manual Testing Checklist

- [ ] Toggle between themes multiple times
- [ ] Check all pages (Dashboard, Tests, Infrastructure, Settings)
- [ ] Verify logo switches correctly
- [ ] Check hover states on interactive elements
- [ ] Verify text readability in both themes
- [ ] Test persistence (refresh page, theme should remain)
- [ ] Check all borders are visible in both themes
- [ ] Verify stat cards are readable
- [ ] Check activity log visibility
- [ ] Test command bar in both themes

### Browser Testing

Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on macOS)

## Accessibility

Both themes maintain WCAG 2.1 AA contrast ratios:

- **Dark theme**: Light text on dark backgrounds
- **Light theme**: Dark text on light backgrounds

All interactive elements have clear focus states in both themes.

## Customization

### Adding a New Theme

1. Add theme variables in `app/globals.css`:

```css
:root[data-theme="blue"] {
  --bg-primary: #1e3a8a;
  /* ...other variables */
}
```

2. Update theme toggle logic in `ThemeContext.jsx`

3. Add appropriate logo variant

### Creating Theme Presets

You can create theme presets in the Settings page for users to choose from.

## Performance

- Theme switching is instant (CSS variables)
- No JavaScript color calculations
- Smooth transitions (0.3s ease)
- Logo switching uses Next.js Image optimization
- localStorage access is minimal

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Custom Properties (variables) support required
- localStorage support required

## Troubleshooting

### Theme not applying

Check that `data-theme` attribute is set on `<html>`:

```html
<html data-theme="dark">
```

### Colors not updating

Ensure you're using CSS variables, not hard-coded colors.

### Logo not switching

Verify both logo files exist in `public/`:
- `/public/VIGA-blacklogo.png`
- `/public/VIGA-lightlogo.png`

### Theme not persisting

Check browser localStorage is enabled and not being cleared.

