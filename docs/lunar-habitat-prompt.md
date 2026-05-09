# GitHub Copilot (VS Code) Prompt — NASA HUNCH Wristband Concept + Crew Wellbeing Dashboard (Vanilla Web)

You are GitHub Copilot. Build a small, polished, **vanilla HTML/CSS/JS** prototype for a NASA HUNCH conceptual model:

Project: **Lunar Smart Adaptive Habitat Design with AI Psychological Monitoring for Crew Adaptive Positive Mental Health**

We are NOT building medical-grade analytics. This is a **concept demo** that looks real, communicates the idea clearly, and can be extended later.

## Primary Deliverables (MVP)
1) A **digital conceptual model of a wristband** (2D UI/illustration, not 3D) showing sensors and what they measure:
- Heart Rate (HR)
- Heart Rate Variability (HRV)
- Electrodermal Activity (EDA)
- Skin Temperature
- Activity (movement)
- Sleep (derived)

2) A **simple dashboard** that displays a few key analytics derived from mock data:
- HR + HRV trend
- EDA trend
- Skin temperature trend
- Activity level trend
- Sleep summary (duration + restlessness)
- A simple **Wellbeing Index** (0–100) based on the above (explain it’s a conceptual composite)
- A “Status” label: Green / Yellow / Red based on thresholds (non-clinical)

We will add other habitat features later (voice, pupillometer, door usage, workstation interaction, circadian lights, etc.). For now, focus on the wristband and a minimal dashboard.

## Constraints & Requirements
- Use **only vanilla HTML, CSS, and JavaScript**. No frameworks.
- No external build tools. Must run by opening `index.html`.
- Use modern, accessible, responsive design.
- Make it **cool and attractive**: a NASA / futuristic lunar aesthetic, but readable and professional.
- Provide mock data generation and a “scenario mode” to demonstrate changes:
  - Calm / Baseline
  - Stress spike
  - Sleep-deprived
  - High activity (exercise)
- Keep everything as a **conceptual prototype** with clear labels like “Simulated” and “Not medical/diagnostic.”

## Phased Implementation (Build in Small Increments)

### Phase 0 — Project Setup / Architecture
Create a professional structure:
- `index.html`
- `styles/` -> `main.css`
- `scripts/` -> `app.js`, `data.js`, `ui.js`, `charts.js`, `utils.js`
- `assets/` -> icons (SVG) if needed (or inline SVG)
- `README.md` describing what’s simulated and how to run

Use a simple modular pattern (IIFE or ES modules). Prefer ES modules if possible:
- `index.html` uses `<script type="module" src="scripts/app.js"></script>`

### Phase 1 — Layout + Visual Design System
Implement:
- A top header: project title + “NASA HUNCH Concept Prototype”
- Two-column responsive layout:
  - Left: Wristband Concept Card (interactive)
  - Right: Dashboard Analytics (charts + KPI cards)
- Define a design system in CSS:
  - CSS variables for colors, spacing, font sizes
  - Dark theme default, with a toggle for Light theme (optional but nice)
  - Focus states, accessible contrast, reduced motion support
- Make it feel “space-grade” (subtle glow, glassy panels, grid background), but do not overdo animations.

### Phase 2 — Wristband Concept Model (UI)
Create a wristband visual (2D):
- A stylized wristband silhouette (CSS + SVG ok)
- Clickable sensor hotspots or a sensor list:
  - Each sensor shows: what it measures, unit, why it matters (1 sentence), and privacy note
- Include a small “device screen” area on the wristband that shows:
  - HR, HRV, EDA, Temp, Activity, Sleep (simplified)
- Add microcopy:
  - “Simulated sensor readings”
  - “Crew-controlled data sharing”

### Phase 3 — Data Simulation Engine
In `data.js`:
- Generate time-series mock data for the last 60 minutes (or 24h if you prefer)
- Fields:
  - heartRateBpm (e.g., 55–140)
  - hrvMs (e.g., 20–120)
  - edaMicrosiemens (e.g., 0.5–8.0)
  - skinTempC (e.g., 32.0–36.5)
  - activityScore (0–100)
  - sleepMinutes (0–480 for nightly; or a derived summary for demo)
  - restlessnessScore (0–100)
- Provide “scenario presets” that bias the generator:
  - Baseline: stable HR, moderate HRV, low EDA
  - Stress spike: higher HR, lower HRV, higher EDA, slight temp shift
  - Sleep-deprived: higher resting HR, lower HRV, higher restlessness, daytime fatigue
  - Exercise: higher HR + activity, HRV suppressed short-term
- Expose functions:
  - `generateSeries(scenario, minutes)`
  - `computeWellbeingIndex(latestSample, rollingWindow)`
  - `computeStatus(index)` -> Green/Yellow/Red

### Phase 4 — Simple Charts (No Libraries)
Implement charts in `charts.js`:
- Use **Canvas** or **SVG** (choose one) to draw simple line charts.
- Chart components:
  - HR & HRV (two-line or toggle)
  - EDA
  - Skin Temp
  - Activity
- Include tooltips on hover (optional), axis labels minimal.
- Keep performance and code cleanliness high.

### Phase 5 — Dashboard KPIs + Insights
Create KPI cards:
- Current HR, HRV, EDA, Temp, Activity, Sleep Summary
- Wellbeing Index gauge (simple circular SVG ring or horizontal meter)
- Status pill (Green/Yellow/Red) with explanation:
  - “Green: baseline range”
  - “Yellow: elevated stress indicators”
  - “Red: sustained stress / sleep deficit indicators”
Add a small “Insights” panel:
- 2–3 bullet insights derived from rules (not ML), for example:
  - “HRV below baseline for 20+ min → suggest decompression protocol”
  - “Restlessness high → suggest circadian lighting adjustment”
These should be clearly labeled as “Rule-based conceptual suggestions.”

### Phase 6 — Interaction + Demo Mode
Add controls:
- Scenario selector dropdown
- “Regenerate data” button
- “Play/Pause” simulation that advances time every 1–2 seconds (optional)
- “Privacy Mode” toggle:
  - When ON, hide exact numbers and show ranges (conceptual privacy feature)
- Smooth transitions but respect `prefers-reduced-motion`.

### Phase 7 — Polish + Accessibility + Documentation
- Keyboard navigation works for all interactive elements
- ARIA labels for charts (or accessible summary text below charts)
- Mobile responsive (iPad + desktop)
- README includes:
  - Purpose
  - How to run
  - What’s simulated
  - Future expansion list:
    - Mattress sleep sensors
    - Door/workstation routines
    - Circadian lighting controls
    - Voice analysis / pupillometer (concept only)

## Content Guidance / Copy (Use This Tone)
- Professional NASA-adjacent wording, not cheesy.
- Always include disclaimers:
  - “Concept prototype — simulated data”
  - “Not medical advice / not diagnostic”
- Emphasize ethics:
  - “Crew consent”
  - “Data minimization”
  - “No cameras required for baseline behavioral monitoring”

## UI Sections (Minimum)
- Wristband Concept Card
  - Sensor list + detail drawer/panel
  - Mini device readout
- Analytics Dashboard
  - KPI cards row
  - 3–5 small charts
  - Wellbeing Index + Status
  - Insights panel
- Controls
  - Scenario dropdown + regenerate + privacy toggle

## Quality Bar
- Code must be clean, commented, and modular.
- Avoid global variables; use a single `AppState` object.
- Make the UI feel like a real product prototype.
- Keep it simple enough to finish quickly, but polished enough to present.

## Start Now
Generate all necessary files with full code:
- `index.html`
- `styles/main.css`
- `scripts/app.js`
- `scripts/data.js`
- `scripts/ui.js`
- `scripts/charts.js`
- `scripts/utils.js`
- `README.md`

After generating, include a short “Next Steps” section listing exactly what we can add later (mattress sleep sensors, routine sensors, circadian lighting panel, earth-view window module), but DO NOT implement those yet.
