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
- No external dependencies or frameworks

### Project Structure
```
index.html
styles/main.css
scripts/app.js          — Entry point
scripts/data.js         — Mock data generation & scenarios
scripts/ui.js           — DOM rendering & interaction
scripts/charts.js       — Canvas/SVG charting
scripts/utils.js        — Shared state & helpers
README.md
```

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
