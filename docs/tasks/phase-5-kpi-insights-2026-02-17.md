# Task: Phase 5 — Dashboard KPIs, Wellbeing Index Gauge & Insights Panel

## Metadata
- **Created**: 2026-02-17
- **Type**: implementation
- **Status**: validated
- **Depends on**: Phase 0–4 (all validated)

## Objective
Populate the dashboard panel with KPI metric cards, a Wellbeing Index SVG gauge, a color-coded Status pill, and a rule-based Insights panel — all powered by generated time-series data.

## Context
- Workspace root: `/Users/techmonkey/Development/lunar-habitat/`
- `scripts/ui.js` currently has `renderDashboard()` which generates 60-min series and creates 4 charts in `.charts-grid`
- `index.html` has empty containers: `.kpi-grid`, `.insights-panel` inside `#dashboard-panel`
- `scripts/data.js` exports: `generateSeries`, `generateAndStore`, `getCurrentSample`, `computeWellbeingIndex(sample, rollingWindow?)`, `computeStatus(index)`, `getLatestSample`, `getRollingWindow`, `SCENARIOS`
- `scripts/utils.js` exports: `AppState`, `formatNumber`, `clamp`, `lerp`, `createElement`
- The data series contains objects with: `heartRateBpm`, `hrvMs`, `edaMicrosiemens`, `skinTempC`, `activityScore`, `sleepMinutes`, `restlessnessScore`, `timestamp`
- Design system CSS vars are in `styles/main.css` (colors: `--color-accent: #38bdf8`, `--color-success: #22c55e`, `--color-warning: #f59e0b`, `--color-danger: #ef4444`, etc.)

## Deliverables

### 1. KPI Cards Row — Render into `.kpi-grid`
**Modified file**: `/Users/techmonkey/Development/lunar-habitat/scripts/ui.js`

Add a function `renderKPIs(sample, series)` that populates `.kpi-grid` with 6 small metric cards + 1 Wellbeing card + 1 Status card (8 cards total). Call it from `renderDashboard()` after generating the series.

**Each KPI card structure:**
```html
<div class="kpi-card card">
    <div class="kpi-icon">[icon]</div>
    <div class="kpi-value">[value]</div>
    <div class="kpi-label">[label]</div>
    <div class="kpi-unit">[unit]</div>
</div>
```

**The 6 metric KPI cards** (use latest sample from series via `getLatestSample(series)`):

| Icon | Label | Value source | Unit | Format |
|------|-------|-------------|------|--------|
| ♥ | Heart Rate | `heartRateBpm` | bpm | Round to integer |
| 📊 | HRV | `hrvMs` | ms | Round to integer |
| ⚡ | EDA | `edaMicrosiemens` | µS | 1 decimal |
| 🌡 | Skin Temp | `skinTempC` | °C | 1 decimal |
| 🏃 | Activity | `activityScore` | /100 | Integer |
| 😴 | Sleep | `sleepMinutes` | hrs | Convert min→hours with 1 decimal |

**Card 7 — Wellbeing Index (special card, wider):**
```html
<div class="kpi-card kpi-card--wellbeing card">
    <div class="kpi-label">Wellbeing Index</div>
    <div class="wellbeing-gauge">[SVG ring gauge here]</div>
    <div class="kpi-sublabel">Conceptual composite score</div>
</div>
```

The Wellbeing Index gauge is an **SVG circular ring**:
- A background circle (track) in muted color
- A foreground arc (progress) colored by status:
  - green → `#22c55e`
  - yellow → `#f59e0b`
  - red → `#ef4444`
- The index number (0–100) displayed in the center of the ring, large text
- Ring size: roughly 80×80px
- Use `stroke-dasharray` and `stroke-dashoffset` to control arc length
- Compute via: `computeWellbeingIndex(latestSample, getRollingWindow(series, 10))`

SVG gauge implementation:
```javascript
function buildWellbeingGauge(index, status) {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const progress = (index / 100) * circumference;
    const offset = circumference - progress;
    const colorMap = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
    const color = colorMap[status] || '#38bdf8';
    
    return `<svg width="80" height="80" viewBox="0 0 80 80" class="wellbeing-ring">
        <circle cx="40" cy="40" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
        <circle cx="40" cy="40" r="${radius}" fill="none" stroke="${color}" stroke-width="6"
            stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            transform="rotate(-90 40 40)"/>
        <text x="40" y="40" text-anchor="middle" dominant-baseline="central"
            font-size="18" font-weight="600" fill="${color}" font-family="var(--font-mono)">${index}</text>
    </svg>`;
}
```

**Card 8 — Status Pill:**
```html
<div class="kpi-card kpi-card--status card">
    <div class="kpi-label">Crew Status</div>
    <div class="status-pill status-pill--[green|yellow|red]">[STATUS TEXT]</div>
    <div class="status-explanation">[explanation text]</div>
</div>
```

Status explanations:
- `green`: "All metrics within baseline range"
- `yellow`: "Elevated stress indicators detected"
- `red`: "Sustained stress / sleep deficit indicators"

### 2. Insights Panel — Render into `.insights-panel`
**Modified file**: `/Users/techmonkey/Development/lunar-habitat/scripts/ui.js`

Add a function `renderInsights(sample, series)` that generates rule-based conceptual insights and populates `.insights-panel`. Call it from `renderDashboard()`.

**Panel structure:**
```html
<div class="insights-header">
    <h3>Insights</h3>
    <span class="badge">Rule-based conceptual suggestions</span>
</div>
<ul class="insights-list">
    <li class="insight-item insight-item--[level]">
        <span class="insight-icon">[icon]</span>
        <span class="insight-text">[text]</span>
    </li>
    ...
</ul>
```

**Rule-based insight engine** (check the latest sample + rolling window):

| Condition | Icon | Text | Level |
|-----------|------|------|-------|
| `hrvMs < 30` for latest | ⚠️ | "HRV below baseline — consider decompression protocol" | warning |
| `edaMicrosiemens > 4.0` for latest | ⚡ | "Elevated EDA — sympathetic arousal detected" | warning |
| `heartRateBpm > 100` and `activityScore < 30` | 🫀 | "Elevated resting heart rate — monitor for stress response" | warning |
| `sleepMinutes < 300` | 😴 | "Sleep deficit detected — suggest circadian lighting adjustment" | danger |
| `restlessnessScore > 60` | 🛏️ | "High restlessness — review sleep environment factors" | warning |
| `skinTempC < 32.5` | 🌡 | "Peripheral temperature low — check habitat thermal regulation" | info |
| `activityScore > 80` | 🏃 | "High activity level — ensure adequate hydration protocol" | info |
| All metrics within baseline (no warnings) | ✅ | "All biometrics within expected range — crew status nominal" | success |

Show 2–4 insights max (prioritize warnings/dangers, then info). Always show at least 1 insight.

Level maps to color class:
- `warning` → `--color-warning`
- `danger` → `--color-danger`
- `info` → `--color-accent`
- `success` → `--color-success`

### 3. Update `renderDashboard()` Integration
**Modified file**: `/Users/techmonkey/Development/lunar-habitat/scripts/ui.js`

Update the existing `renderDashboard()` to:
1. After generating series and before creating charts, call `renderKPIs(latestSample, series)`
2. After charts, call `renderInsights(latestSample, series)`
3. Import `getLatestSample` and `getRollingWindow` from data.js (add to existing import)

### 4. CSS for KPIs, Gauge, Status, and Insights
**Modified file**: `/Users/techmonkey/Development/lunar-habitat/styles/main.css`

Append these styles (do NOT modify existing styles):

```css
/* KPI Grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
}

@media (max-width: 1200px) {
    .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

.kpi-card {
    text-align: center;
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
}

.kpi-card--wellbeing,
.kpi-card--status {
    grid-column: span 1;
}

.kpi-icon {
    font-size: var(--font-size-xl);
}

.kpi-value {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--color-text-primary);
}

.kpi-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.kpi-unit {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
}

.kpi-sublabel {
    font-size: 0.65rem;
    color: var(--color-text-secondary);
    font-style: italic;
}

/* Wellbeing Gauge */
.wellbeing-gauge {
    margin: var(--space-xs) 0;
}

.wellbeing-ring {
    display: block;
}

/* Status Pill */
.status-pill {
    display: inline-flex;
    align-items: center;
    padding: var(--space-xs) var(--space-md);
    border-radius: 9999px;
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.status-pill--green {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-pill--yellow {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-pill--red {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-explanation {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
}

/* Insights Panel */
.insights-panel {
    margin-top: var(--space-lg);
    padding: var(--space-md);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
}

.insights-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
}

.insights-header h3 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text-primary);
}

.insights-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.insight-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    line-height: 1.5;
}

.insight-item--warning {
    background: rgba(245, 158, 11, 0.08);
    color: #f59e0b;
}

.insight-item--danger {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
}

.insight-item--info {
    background: rgba(56, 189, 248, 0.08);
    color: #38bdf8;
}

.insight-item--success {
    background: rgba(34, 197, 94, 0.08);
    color: #22c55e;
}

.insight-icon {
    flex-shrink: 0;
    font-size: var(--font-size-base);
}

.insight-text {
    flex: 1;
}
```

## Acceptance Criteria
- [x] 8 KPI cards render in `.kpi-grid` (6 metrics + Wellbeing Index + Status)
- [x] KPI cards show correct values from the generated time-series latest sample
- [x] KPI cards are in a responsive grid (4-col → 3-col → 2-col at breakpoints)
- [x] Wellbeing Index card shows an SVG circular ring gauge with the index number in center
- [x] Gauge ring color matches status (green/yellow/red)
- [x] Gauge arc length is proportional to the index value (0–100)
- [x] Status pill shows correct color-coded label (GREEN/YELLOW/RED)
- [x] Status card includes explanation text below the pill
- [x] Insights panel shows 2–4 rule-based insight items
- [x] Each insight has an icon, text, and correct color based on level
- [x] Insights are labeled "Rule-based conceptual suggestions" with a badge
- [x] At least 1 insight is always shown (success message if all nominal)
- [x] KPI cards appear ABOVE the charts in the dashboard panel
- [x] Insights panel appears BELOW the charts
- [x] No console errors
- [x] All new code integrates cleanly with existing `renderDashboard()` flow
- [x] Dark theme styling looks polished (cards, gauge, pills all readable)
- [x] Sleep KPI shows hours (converted from minutes), not raw minutes

## Out of Scope
- Scenario switching UI (Phase 6)
- Privacy mode (Phase 6)
- Play/pause simulation (Phase 6)
- Do NOT modify `data.js` or `charts.js`
- Do NOT modify `index.html` (all rendering is JS-driven into existing containers)

---

## Findings
- **Deliverable 1 (KPI Cards):** Added `buildWellbeingGauge(index, status)` helper and `renderKPIs(sample, series)` to `ui.js`. Renders 6 metric cards (HR, HRV, EDA, Skin Temp, Activity, Sleep in hours), 1 Wellbeing Index card with SVG ring gauge, and 1 Status card with color-coded pill + explanation. All 8 cards populate `.kpi-grid`.
- **Deliverable 2 (Insights Panel):** Added `renderInsights(sample, series)` to `ui.js`. Evaluates 7 rule conditions + 1 success fallback against the latest sample. Prioritizes dangers > warnings > info > success, shows 2–4 items max. Renders into `.insights-panel` with header, badge, and color-coded insight items.
- **Deliverable 3 (renderDashboard integration):** Updated import to include `getLatestSample` and `getRollingWindow` from `data.js`. Modified `renderDashboard()` to: (1) get `latestSample` from series, (2) call `renderKPIs` before chart creation, (3) call `renderInsights` after chart creation.
- **Deliverable 4 (CSS):** Appended all KPI grid, card, gauge, status pill, insights panel, and insight item styles to the end of `main.css`. Responsive grid breakpoints: 4→3→2 columns at 1200px/768px.

---

## Validation
**Validated**: 2026-02-17
**Verdict**: ✅ ACCEPT — All 18 acceptance criteria pass. No issues found.

### Per-Criterion Results

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | 8 KPI cards render in `.kpi-grid` | ✅ PASS | 6 metric cards via `forEach`, 1 Wellbeing card, 1 Status card — all appended to `.kpi-grid` |
| 2 | KPI values from latest sample | ✅ PASS | `getLatestSample(series)` returns `series[series.length-1]`; values sourced from sample fields |
| 3 | Responsive grid (4→3→2) | ✅ PASS | CSS breakpoints at 1200px (3-col) and 768px (2-col) match spec exactly |
| 4 | SVG ring gauge with index in center | ✅ PASS | `buildWellbeingGauge()` creates 80×80 SVG with track circle, progress arc, centered `<text>` |
| 5 | Gauge color matches status | ✅ PASS | `colorMap = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }` applied to stroke and text fill |
| 6 | Gauge arc proportional to index | ✅ PASS | Math verified: `circumference = 2πr`, `offset = circumference - (index/100)*circumference`, `rotate(-90)` starts arc from 12 o'clock |
| 7 | Status pill color-coded label | ✅ PASS | Labels: GREEN/YELLOW/RED; CSS classes `.status-pill--green/yellow/red` with correct rgba bg + border |
| 8 | Status explanation below pill | ✅ PASS | Three explanations match spec text; rendered in `.status-explanation` div below pill |
| 9 | Insights panel shows 2–4 items | ✅ PASS | `allInsights.slice(0, Math.max(2, Math.min(4, allInsights.length)))` caps at 4, prefers ≥2 |
| 10 | Each insight: icon, text, color class | ✅ PASS | `insight-item--{level}` class applied; CSS maps each level to correct rgba bg + text color |
| 11 | "Rule-based conceptual suggestions" badge | ✅ PASS | Header contains `<span class="badge">Rule-based conceptual suggestions</span>` |
| 12 | At least 1 insight (success fallback) | ✅ PASS | If no warnings/dangers, success message pushed — guarantees ≥1 item |
| 13 | KPIs ABOVE charts | ✅ PASS | `renderKPIs()` called before chart creation in JS; `.kpi-grid` precedes `.charts-grid` in HTML |
| 14 | Insights BELOW charts | ✅ PASS | `renderInsights()` called after charts + placeholder removal; `.insights-panel` follows `.charts-grid` in HTML |
| 15 | No console errors | ✅ PASS | All imports resolve: `getLatestSample`, `getRollingWindow` exported from data.js; `createElement` from utils.js; no syntax issues |
| 16 | Clean integration with renderDashboard | ✅ PASS | Sequential flow: generate → getLatest → KPIs → charts → remove placeholder → insights |
| 17 | Dark theme styling polished | ✅ PASS | All styles use design system CSS vars; subtle rgba backgrounds; gauge track uses `rgba(255,255,255,0.06)` |
| 18 | Sleep KPI in hours | ✅ PASS | `(sample.sleepMinutes / 60).toFixed(1)` with unit `'hrs'` — e.g. baseline 432min → "7.2 hrs" |

### Additional Quality Checks

| Check | Result | Notes |
|-------|--------|-------|
| Gauge math correctness | ✅ | `circumference ≈ 213.63`; offset=0 at 100%, offset=circumference at 0% |
| ES module imports resolve | ✅ | All 8 data.js imports, 3 utils.js imports, 1 charts.js import verified against exports |
| Insight rule engine conditions | ✅ | All 7 rules + 1 fallback match spec table exactly |
| Priority ordering | ✅ | `{ danger:0, warning:1, info:2, success:3 }` → correct ascending sort |
| Null reference safety | ✅ | `if (latestSample)` guard before KPI/insight calls; `getRollingWindow` always returns array |
| data.js unmodified | ✅ | Verified — no changes to data.js |
| charts.js unmodified | ✅ | Verified — no changes to charts.js |
| index.html unmodified | ✅ | Verified — no changes to index.html; containers `.kpi-grid`, `.charts-grid`, `.insights-panel` present in correct order |
