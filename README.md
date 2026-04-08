# Lunar Smart Adaptive Habitat — Crew Wellbeing Monitor

## NASA HUNCH Concept Prototype

> ⚠️ **Concept prototype** — All data is simulated. This is not medical advice or a diagnostic tool.

### What This Is
A conceptual model demonstrating AI-assisted psychological monitoring for lunar habitat crews. 
The prototype simulates wristband biometric data and displays crew wellbeing analytics.

### How to Run
1. Open a terminal and navigate to the project folder:
   ```
   cd /path/to/lunar-habitat
   ```
2. Start a local web server with Python:
   ```
   python3 -m http.server 8000
   ```
3. Open your browser and go to:
   ```
   http://localhost:8000
   ```
4. No build tools, frameworks, or additional dependencies required

### What's Simulated
- Wristband biometric sensors (HR, HRV, EDA, Skin Temp, Activity, Sleep)
- Wellbeing Index (composite score, 0–100)
- Status indicators (Green / Yellow / Red)
- Rule-based insight suggestions

### Tech Stack
- Vanilla HTML5, CSS3, JavaScript (ES Modules)
- Three.js v0.172.0 (via CDN ESM) — 3D habitat simulation
- No build tools or frameworks required

### Project Structure
```
index.html                    — Dashboard (charts & KPIs)
pages/habitat-3d.html         — 3D Habitat Simulation
pages/wristband-3d.html       — Wristband Sci-Fi Viewer
pages/wristband-product.html  — Wristband Product Viewer
styles/main.css               — Dashboard styles
styles/habitat-3d.css         — Habitat 3D HUD styles
styles/wristband-3d.css       — Wristband viewer styles
scripts/app.js                — Dashboard entry point
scripts/data.js               — Mock data generation & scenarios
scripts/ui.js                 — Dashboard DOM rendering
scripts/charts.js             — Canvas/SVG charting
scripts/utils.js              — Shared state & helpers
scripts/habitat-3d.js         — 3D habitat simulation (Three.js)
scripts/habitat-geometry.js   — Dome & corridor geometry
scripts/habitat-interiors.js  — Interior furnishing & sensors
scripts/wristband-3d.js       — Wristband sci-fi viewer
scripts/wristband-product.js  — Wristband product viewer
```

### 3D Habitat Simulation
An interactive Three.js simulation of the ASCEND lunar habitat featuring:
- **Truncated icosahedron domes** — 7 modular habitat modules with swappable hex/pent panels
- **Dual camera modes** — Orbit overview + first-person walkthrough (WASD/arrow keys)
- **Module rearrangement** — Drag-and-drop modules with snap-to-slot collision detection
- **17 biometric sensors** — Interactive hotspots with live data, sparklines, and status indicators
- **8 simulation scenarios** — Baseline, stress, sleep-deprived, exercise, EVA, microgravity, emergency, isolation
- **Circadian lighting** — Time-of-day lighting that shifts across 6 presets (dawn → night)
- **Positional audio** — Ambient habitat hum, window sounds, status alert tones
- **Guided tour** — 10-waypoint camera flythrough with narration cards
- **Post-processing** — Unreal Bloom with status-reactive intensity
- **System legend** — Per-sensor visibility toggles
- **Accessible** — ARIA labels, keyboard navigation, screen reader announcements, reduced-motion support

#### Controls
| Input | Action |
|-------|--------|
| Click + drag | Rotate camera |
| Scroll wheel | Zoom |
| Click hex panel | Swap opaque ↔ window |
| Click sensor hotspot | Open sensor detail panel |
| Click dome | Open module info panel |
| WASD / Arrow keys | Walk (first-person mode) |
| Escape | Close open panels |

### Future Expansion
- [ ] Mattress-based sleep sensors
- [ ] Door/workstation routine tracking
- [ ] Circadian lighting control panel
- [ ] Voice analysis module (concept)
- [ ] Pupillometer integration (concept)
- [ ] Earth-view window wellness module

### Ethics & Privacy
- Crew consent required for all monitoring
- Data minimization by design
- Privacy mode hides exact values
- No cameras required for baseline behavioral monitoring

### Accessibility Features
- **Keyboard Navigation**: All interactive elements (buttons, dropdowns, sensor hotspots) are fully keyboard accessible
- **Screen Reader Support**: Charts include ARIA labels and text summaries; live regions announce data changes
- **Focus Indicators**: High-visibility focus rings on all interactive elements
- **Reduced Motion**: Respects `prefers-reduced-motion` preference
- **Skip Link**: "Skip to main content" link for keyboard users

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Requires ES Modules support

### Limitations & Disclaimers
⚠️ **This is a concept prototype with simulated data.**
- All biometric readings are randomly generated
- The Wellbeing Index is a conceptual composite, not clinically validated
- Status indicators (Green/Yellow/Red) are based on arbitrary thresholds
- This tool provides no medical advice and should not be used for diagnosis
- Rule-based insights are illustrative examples only
