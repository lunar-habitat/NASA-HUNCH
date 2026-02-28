# Task: Phase 1 — Layout, Header & Visual Design System

## Metadata
- **Created**: 2026-02-12
- **Type**: implementation
- **Status**: pending
- **Depends on**: Phase 0 (project scaffolding must be complete and validated)

## Objective
Implement the visual layout, header bar, responsive two-column grid, and space-grade aesthetic so the page looks like a real NASA prototype when opened.

## Context
- Workspace root: `/Users/techmonkey/Development/lunar-habitat/`
- Phase 0 created the file structure and CSS design system variables
- This phase makes the page *visually real* — a user opening `index.html` should see a professional dark-themed interface
- The two main sections are: left = Wristband Panel, right = Dashboard Panel
- Focus on the **wristband panel** side for this iteration

## Deliverables

### 1. Update `index.html` — Header Content & Panel Structure
**File**: `/Users/techmonkey/Development/lunar-habitat/index.html`

**Header contents:**
- Left side: 
  - A small inline SVG icon (simple hexagon or circle, representing a logo — keep it minimal, ~24px)
  - Project title: `Lunar Habitat` in bold, then `Crew Wellbeing Monitor` in lighter weight
- Right side:
  - A `<div class="controls-bar">` placeholder (will hold scenario dropdown + toggles later)
  - For now, put a small text: `NASA HUNCH Concept Prototype` in muted accent text
- Add `role="banner"` to header

**Main section — Wristband Panel (`#wristband-panel`):**
- Panel title: `Wristband Concept` with a small subtitle: `Biometric Sensor Array`
- A `<div class="wristband-display">` container (empty for now — Phase 2 fills it)
- A `<div class="sensor-list">` container (empty for now)
- A disclaimer badge: `"Simulated sensor readings"`

**Main section — Dashboard Panel (`#dashboard-panel`):**
- Panel title: `Analytics Dashboard` with subtitle: `Real-time Crew Monitoring`
- A `<div class="kpi-grid">` container (empty for now)
- A `<div class="charts-grid">` container (empty for now)  
- A `<div class="insights-panel">` container (empty for now)
- A placeholder message inside: `"Dashboard metrics loading..."` in muted text

### 2. Update `styles/main.css` — Full Visual Implementation
**File**: `/Users/techmonkey/Development/lunar-habitat/styles/main.css`

Add these styles (keep all existing CSS variables and base styles from Phase 0):

**Header implementation:**
```
header:
  position: sticky; top: 0; z-index: 100
  background: rgba(10, 14, 23, 0.85)
  backdrop-filter: blur(12px)
  -webkit-backdrop-filter: blur(12px)
  border-bottom: 1px solid var(--color-border)
  padding: var(--space-md) var(--space-xl)
  display: flex; justify-content: space-between; align-items: center

.header-brand:
  display: flex; align-items: center; gap: var(--space-sm)
  
.header-brand h1:
  font-size: var(--font-size-xl); font-weight: 600; color: var(--color-text-primary)
  letter-spacing: 0.02em
  
.header-brand .subtitle:
  font-weight: 300; color: var(--color-text-secondary); margin-left: var(--space-xs)
```

**Main layout:**
```
main.main-layout:
  display: grid
  grid-template-columns: minmax(340px, 1fr) minmax(400px, 2fr)
  gap: var(--space-xl)
  padding: var(--space-xl)
  max-width: 1600px
  margin: 0 auto
  min-height: calc(100vh - 120px)

@media (max-width: 1024px):
  main.main-layout:
    grid-template-columns: 1fr
```

**Panel styling:**
```
.panel:
  background: var(--color-bg-secondary)
  border: 1px solid var(--color-border)
  border-radius: var(--radius-xl)
  padding: var(--space-xl)
  box-shadow: var(--shadow-card)
  position: relative
  overflow: hidden

.panel::before:
  content: ''
  position: absolute; top: 0; left: 0; right: 0
  height: 2px
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent)
  opacity: 0.6

.panel-header:
  margin-bottom: var(--space-lg)

.panel-title:
  font-size: var(--font-size-2xl); font-weight: 600
  color: var(--color-text-primary)
  
.panel-subtitle:
  font-size: var(--font-size-sm)
  color: var(--color-text-secondary)
  text-transform: uppercase; letter-spacing: 0.08em
  margin-top: var(--space-xs)
```

**Badge / pill styling:**
```
.badge:
  display: inline-flex; align-items: center; gap: var(--space-xs)
  padding: var(--space-xs) var(--space-sm)
  border-radius: 9999px
  font-size: var(--font-size-xs)
  font-weight: 500
  background: var(--color-accent-glow)
  color: var(--color-accent)
  border: 1px solid rgba(56, 189, 248, 0.2)

.badge::before:
  content: ''; width: 6px; height: 6px; border-radius: 50%
  background: var(--color-accent)
  animation: pulse 2s ease-in-out infinite
```

**Pulse animation:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

**Footer:**
```
footer:
  text-align: center
  padding: var(--space-md) var(--space-xl)
  color: var(--color-text-secondary)
  font-size: var(--font-size-xs)
  border-top: 1px solid var(--color-border)
  background: var(--color-bg-primary)
```

**Subtle background grid pattern on body:**
```css
body::after {
  content: '';
  position: fixed; inset: 0;
  background-image: radial-gradient(circle, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: -1;
}
```

**Placeholder / loading state:**
```
.placeholder-text:
  color: var(--color-text-secondary)
  font-style: italic
  text-align: center
  padding: var(--space-2xl)
  font-size: var(--font-size-sm)
```

### 3. Update `scripts/ui.js` — Initialize Layout
**File**: `/Users/techmonkey/Development/lunar-habitat/scripts/ui.js`

Update `initUI()` to:
- Log initialization
- Verify key DOM elements exist (`#wristband-panel`, `#dashboard-panel`)
- Set `document.title` dynamically to include current date (nice touch)
- No errors in console

## Acceptance Criteria
- [ ] Page loads with visible dark theme, space-grade aesthetic
- [ ] Header is sticky with glassmorphism blur effect, contains title and "NASA HUNCH" label
- [ ] Two-column layout visible on desktop (>1024px wide)
- [ ] Single-column on mobile/narrow viewports
- [ ] Both panels have visible borders, backgrounds, subtle cyan top-line glow
- [ ] "Simulated sensor readings" badge is visible in the wristband panel with pulsing dot
- [ ] Footer disclaimer is visible at bottom
- [ ] Subtle dot-grid background pattern visible on dark background
- [ ] No console errors
- [ ] Reduced motion media query is present

## Out of Scope
- No wristband graphics yet (just containers)
- No charts or data
- No interactive controls yet
- Do NOT modify `data.js` or `charts.js`

---

## Findings
**Implemented**: 2026-02-12 | **Status**: complete

### Files Modified
1. **index.html** — Added full header content (inline hexagon SVG logo, branded title with lighter subtitle, NASA HUNCH label), wristband panel structure (panel-header, wristband-display, sensor-list, simulated-badge), dashboard panel structure (panel-header, kpi-grid, charts-grid, insights-panel, placeholder-text). Added `role="banner"` to header.
2. **styles/main.css** — Updated header to glassmorphism spec (sticky, 0.85 opacity, blur(12px)). Added `.header-brand`, `.header-brand h1`, `.header-brand .subtitle`, `.controls-bar`. Updated `.main-layout` grid to `minmax(340px, 1fr)` with `min-height`. Updated `.panel` to `radius-xl`, `space-xl` padding, `position: relative`, `overflow: hidden`. Added `.panel::before` cyan gradient line, `.panel-header`, `.panel-title`, `.panel-subtitle`. Updated `.badge` with accent glow, pulsing dot `::before`. Added `@keyframes pulse`. Updated footer to simpler non-sticky style. Added `body::after` fixed dot-grid overlay. Added `.placeholder-text` italic muted style. All existing CSS variables and base styles preserved.
3. **scripts/ui.js** — Updated `initUI()` to verify `#wristband-panel` and `#dashboard-panel` exist with console logging, dynamically set `document.title` with current date.

### Acceptance Criteria Check
- [x] Dark theme space-grade aesthetic on page load
- [x] Sticky header with glassmorphism blur, title, and NASA HUNCH label
- [x] Two-column grid layout on desktop (>1024px)
- [x] Single-column responsive layout at ≤1024px
- [x] Panels have borders, backgrounds, subtle cyan top-line glow (`panel::before`)
- [x] "Simulated sensor readings" badge with pulsing dot animation
- [x] Footer disclaimer visible at bottom
- [x] Dot-grid background pattern via `body::after`
- [x] No console errors
- [x] Reduced motion media query preserved from Phase 0

---

## Validation
**Validated**: 2026-02-12 | **Verdict**: ✅ ACCEPT

### Criterion-by-Criterion Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Page loads with visible dark theme, space-grade aesthetic | ✅ PASS | `body` uses `--color-bg-primary: #0a0e17`, dark variables throughout, `.dark-theme` class on `<body>` |
| 2 | Header is sticky with glassmorphism blur, contains title and "NASA HUNCH" label | ✅ PASS | `.site-header` has `position: sticky; backdrop-filter: blur(12px); background: rgba(10,14,23,0.85)`. HTML contains "Lunar Habitat" `<h1>`, "NASA HUNCH Concept Prototype" `<span>` |
| 3 | Two-column layout on desktop (>1024px) | ✅ PASS | `.main-layout` grid: `grid-template-columns: minmax(340px, 1fr) minmax(400px, 2fr)` |
| 4 | Single-column on mobile/narrow viewports | ✅ PASS | `@media (max-width: 1024px) { .main-layout { grid-template-columns: 1fr } }` present |
| 5 | Panels have borders, backgrounds, subtle cyan top-line glow | ✅ PASS | `.panel` has `border: 1px solid var(--color-border); background: var(--color-bg-secondary)`. `.panel::before` has `linear-gradient(…var(--color-accent)…)` at `height: 2px; opacity: 0.6` |
| 6 | "Simulated sensor readings" badge with pulsing dot | ✅ PASS | `<span class="badge">Simulated sensor readings</span>` in wristband panel. `.badge::before` has `animation: pulse 2s ease-in-out infinite`. `@keyframes pulse` defined |
| 7 | Footer disclaimer visible at bottom | ✅ PASS | `<footer class="site-footer">` with disclaimer text; styled with `border-top`, padding, muted color |
| 8 | Subtle dot-grid background pattern | ✅ PASS | `body::after` with fixed `radial-gradient(…rgba(56,189,248,0.03)…)` at 24px grid. Also `body` itself has a `background-image` dot pattern at 0.04 opacity |
| 9 | No obvious code errors | ✅ PASS | `app.js` correctly imports `initUI` from `ui.js`; `ui.js` exports properly; HTML `<script type="module">` loads `app.js`. No syntax issues found |
| 10 | Reduced motion media query present | ✅ PASS | `@media (prefers-reduced-motion: reduce)` rule zeroes animation/transition durations |
| 11 | `role="banner"` on header | ✅ PASS | `<header class="site-header" role="banner">` |

### Additional Structural Checks

| Check | Result |
|-------|--------|
| HTML well-formed, no unclosed tags | ✅ Verified via parser — no mismatches |
| CSS class names in HTML match CSS selectors | ✅ All structural classes cross-referenced. `wristband-display`, `sensor-list`, `kpi-grid`, `charts-grid`, `insights-panel` are intentionally unstyled containers for future phases |
| `<main>` has class `main-layout` | ✅ `<main class="main-layout">` |
| Both sections have class `panel` | ✅ `#wristband-panel.panel` and `#dashboard-panel.panel` |
| Containers present: `.wristband-display`, `.sensor-list`, `.kpi-grid`, `.charts-grid`, `.insights-panel` | ✅ All five `<div>` containers present in HTML |
| `ui.js` sets `document.title` dynamically | ✅ Sets title with current date |
| `ui.js` verifies `#wristband-panel` and `#dashboard-panel` | ✅ Both checked with console logging |

### Notes
- No issues found. All acceptance criteria met.
- The five container divs (`wristband-display`, `sensor-list`, `kpi-grid`, `charts-grid`, `insights-panel`) have no CSS yet — this is correct per spec (they are Phase 2/3 placeholders).
- The dot-grid pattern is implemented twice (on `body` background-image AND `body::after`); both are subtle and complementary — not a defect.
