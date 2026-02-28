/**
 * @fileoverview DOM rendering and interaction handling for Lunar Habitat UI.
 * Orchestrates wristband visualization, dashboard charts, KPIs, insights, and
 * control panel interactions. Manages accessibility features including live regions,
 * keyboard navigation, and screen reader announcements.
 */
import { AppState, formatNumber, createElement } from './utils.js';
import { getCurrentSample, computeWellbeingIndex, computeStatus, generateAndStore, getLatestSample, getRollingWindow } from './data.js';
import { createChart } from './charts.js';
import { importFile } from './import.js';

/* ============================================
   Sensor Metadata
   ============================================ */

/** Sensor definitions — icon, units, ranges, descriptions */
const SENSOR_INFO = [
    {
        id: 'hr', name: 'Heart Rate', icon: '♥',
        unit: 'bpm', range: '55–140', key: 'heartRateBpm',
        why: 'Tracks cardiovascular response to stress, exercise, and rest cycles'
    },
    {
        id: 'hrv', name: 'Heart Rate Variability', icon: '📊',
        unit: 'ms', range: '20–120', key: 'hrvMs',
        why: 'Indicates autonomic nervous system balance; low HRV correlates with stress'
    },
    {
        id: 'eda', name: 'Electrodermal Activity', icon: '⚡',
        unit: 'µS', range: '0.5–8.0', key: 'edaMicrosiemens',
        why: 'Measures sympathetic nervous system arousal; spikes indicate stress response'
    },
    {
        id: 'temp', name: 'Skin Temperature', icon: '🌡',
        unit: '°C', range: '32.0–36.5', key: 'skinTempC',
        why: 'Peripheral temperature shifts reflect circadian rhythm and stress'
    },
    {
        id: 'activity', name: 'Activity Level', icon: '🏃',
        unit: 'score 0–100', range: '0–100', key: 'activityScore',
        why: 'Quantifies movement intensity; essential for exercise tracking and sedentary alerts'
    },
    {
        id: 'sleep', name: 'Sleep Quality', icon: '😴',
        unit: 'hours + score', range: '0–480 min', key: 'sleepMinutes',
        why: 'Derived from HR, HRV, and movement; critical for cognitive performance'
    }
];

/** Habitat-integrated sensor definitions — not on wristband, monitored via habitat systems */
const HABITAT_SENSOR_INFO = [
    {
        id: 'voice', name: 'Voice Stress', icon: '🎙',
        unit: 'score 0–100', range: '0–100', key: 'voiceStressIndex',
        why: 'Voice recognition analysis detects stress markers, tremor, and tonal shifts',
        systemId: 'voiceRecognition'
    },
    {
        id: 'pupil', name: 'Pupil Dilation', icon: '👁',
        unit: 'mm', range: '2.0–8.0', key: 'pupilDilationMm',
        why: 'Pupillometer scans measure dilation correlated with cognitive load and stress',
        systemId: 'facialScans'
    },
    {
        id: 'social', name: 'Social Interaction', icon: '👥',
        unit: 'score 0–100', range: '0–100', key: 'socialScore',
        why: 'Behavioral analysis of door usage, common-area presence, and crew interaction patterns',
        systemId: 'behavioralPattern'
    },
    {
        id: 'routine', name: 'Routine Deviation', icon: '📋',
        unit: 'score 0–100', range: '0–100', key: 'routineDeviation',
        why: 'Tracks changes in daily routines, workstation interaction, and task completion timing',
        systemId: 'behavioralPattern'
    },
    {
        id: 'cognitive', name: 'Cognitive Load', icon: '🧠',
        unit: 'score 0–100', range: '0–100', key: 'cognitiveLoad',
        why: 'Derived from task completion timing, workstation interaction, and pupillometry data',
        systemId: 'behavioralPattern'
    },
    {
        id: 'sleepQuality', name: 'Sleep Stage Quality', icon: '💤',
        unit: 'score 0–100', range: '0–100', key: 'sleepQuality',
        why: 'Mattress pressure sensors monitor deep/REM/light sleep stage composition',
        systemId: 'mattressSensors'
    },
    {
        id: 'circadian', name: 'Circadian Alignment', icon: '🌗',
        unit: 'score 0–100', range: '0–100', key: 'circadianAlignment',
        why: 'Measures alignment with Earth-like day-night rhythm managed by LED circadian panels',
        systemId: 'circadianLight'
    },
    {
        id: 'lightSpectrum', name: 'Light Spectrum', icon: '🌈',
        unit: 'score 0–100', range: '0–100', key: 'lightSpectrumScore',
        why: 'How closely the LED panel replicates the natural light spectrum of Earth',
        systemId: 'circadianLight'
    },
    {
        id: 'greenery', name: 'Greenery Exposure', icon: '🌿',
        unit: 'min/day', range: '0–120', key: 'greeneryExposureMin',
        why: 'Daily minutes spent near greenery backgrounds simulating Earth-like environments',
        systemId: 'greeneryNature'
    },
    {
        id: 'soundscape', name: 'Nature Soundscape', icon: '🔊',
        unit: 'score 0–100', range: '0–100', key: 'natureSoundscapeScore',
        why: 'Engagement level with ambient Earth soundscapes (rain, birds, wind, ocean)',
        systemId: 'greeneryNature'
    },
    {
        id: 'windowSim', name: 'Window Simulation', icon: '🪟',
        unit: 'score 0–100', range: '0–100', key: 'windowSimStatus',
        why: 'Quality of Earth-view window simulation with dynamic scenery and lighting',
        systemId: 'greeneryNature'
    }
];

/* ============================================
   System Definitions
   ============================================ */

/** Monitoring systems — each maps to a set of metrics */
const SYSTEMS = [
    {
        id: 'voiceRecognition',
        name: 'Voice Recognition / Analysis',
        icon: '🎙',
        color: '#fb923c',
        description: 'Vocal biomarker analysis detecting stress, fatigue, and emotional state through speech patterns',
        metrics: ['voiceStressIndex'],
        kpiKeys: ['voice']
    },
    {
        id: 'facialScans',
        name: 'Facial Scans (Pupillometer)',
        icon: '👁',
        color: '#f472b6',
        description: 'Non-invasive pupillometer measuring pupil dilation to assess cognitive load and acute stress',
        metrics: ['pupilDilationMm'],
        kpiKeys: ['pupil']
    },
    {
        id: 'behavioralPattern',
        name: 'Behavioral Pattern Analysis',
        icon: '📊',
        color: '#2dd4bf',
        description: 'Camera-free monitoring of movement patterns, social withdrawal, daily routine changes, door usage, workstation interaction, and task completion timing',
        metrics: ['socialScore', 'routineDeviation', 'cognitiveLoad', 'activityScore'],
        kpiKeys: ['social', 'routine', 'cognitive', 'activity']
    },
    {
        id: 'hrvMonitoring',
        name: 'HRV Monitoring (Wristband)',
        icon: '💓',
        color: '#ef4444',
        description: 'Wristband-integrated heart rate variability monitoring for stress levels, emotional regulation, fatigue, and anxiety detection',
        metrics: ['heartRateBpm', 'hrvMs', 'edaMicrosiemens', 'skinTempC'],
        kpiKeys: ['hr', 'hrv', 'eda', 'temp']
    },
    {
        id: 'mattressSensors',
        name: 'Mattress Pressure Sensors',
        icon: '🛏️',
        color: '#60a5fa',
        description: 'Sleep monitoring via pressure sensors: sleep duration, sleep stages, restlessness, and circadian misalignment detection',
        metrics: ['sleepMinutes', 'sleepQuality', 'restlessnessScore'],
        kpiKeys: ['sleep', 'sleepQuality']
    },
    {
        id: 'circadianLight',
        name: 'Circadian Light Panel',
        icon: '☀️',
        color: '#facc15',
        description: 'LED technology replicating Earth light spectrum and day-night rhythm to maintain healthy circadian cycles',
        metrics: ['circadianAlignment', 'lightSpectrumScore'],
        kpiKeys: ['circadian', 'lightSpectrum']
    },
    {
        id: 'greeneryNature',
        name: 'Greenery & Nature Simulation',
        icon: '🌿',
        color: '#22c55e',
        description: 'Earth-like visual and auditory environments: greenery window backgrounds, dynamic scenery, and ambient nature soundscapes',
        metrics: ['greeneryExposureMin', 'natureSoundscapeScore', 'windowSimStatus'],
        kpiKeys: ['greenery', 'soundscape', 'windowSim']
    }
];

/** SVG hotspot positions (x, y in viewBox coordinates) */
const HOTSPOT_POS = {
    hr:       { x: 192, y: 165 },
    hrv:      { x: 158, y: 165 },
    eda:      { x: 75,  y: 100 },
    temp:     { x: 325, y: 100 },
    activity: { x: 192, y: 35 },
    sleep:    { x: 235, y: 35 }
};

/* ============================================
   Accessibility Helpers
   ============================================ */

/**
 * Announce a message to screen readers via the live region.
 * @param {string} message - The message to announce.
 */
function announce(message) {
    const liveRegion = document.getElementById('a11y-live');
    if (liveRegion) {
        liveRegion.textContent = message;
    }
}

/**
 * Show a loading spinner in the dashboard panel.
 */
function showLoading() {
    const dashboardPanel = document.getElementById('dashboard-panel');
    if (dashboardPanel) {
        const spinner = createElement('div', 'loading-spinner');
        spinner.id = 'loading-indicator';
        dashboardPanel.appendChild(spinner);
    }
}

/**
 * Hide the loading spinner.
 */
function hideLoading() {
    const spinner = document.getElementById('loading-indicator');
    if (spinner) {
        spinner.remove();
    }
}

/* ============================================
   Helpers
   ============================================ */

/**
 * Format a single sensor reading for display.
 * @param {Object} sensor - Sensor metadata entry.
 * @param {Object} sample - Current biometric sample.
 * @returns {string} Human-readable reading.
 */
function formatReading(sensor, sample) {
    if (AppState.privacyMode) {
        return sensor.range + ' ' + sensor.unit.split(' ')[0];
    }
    const v = sample[sensor.key];
    switch (sensor.id) {
        case 'hr':       return `${v} bpm`;
        case 'hrv':      return `${v} ms`;
        case 'eda':      return `${formatNumber(v, 1)} µS`;
        case 'temp':     return `${formatNumber(v, 1)} °C`;
        case 'activity': return `${v} / 100`;
        case 'sleep':    return `${formatNumber(v / 60, 1)} hours`;
        case 'voice':    return `${v} / 100`;
        case 'pupil':    return `${formatNumber(v, 1)} mm`;
        case 'social':   return `${v} / 100`;
        case 'routine':  return `${v} / 100`;
        case 'cognitive': return `${v} / 100`;
        case 'sleepQuality': return `${v} / 100`;
        case 'circadian': return `${v} / 100`;
        case 'lightSpectrum': return `${v} / 100`;
        case 'greenery': return `${v} min`;
        case 'soundscape': return `${v} / 100`;
        case 'windowSim': return `${v} / 100`;
        default:         return `${v}`;
    }
}

/**
 * Privacy mask — return a range/bucket string instead of an exact value.
 * @param {number|string} value - The raw metric value.
 * @param {string} sensorId - Sensor identifier.
 * @returns {string} Masked range or category label.
 */
function privacyMask(value, sensorId) {
    const numVal = parseFloat(value);
    switch (sensorId) {
        case 'hr': {
            const bucket = Math.floor(numVal / 15) * 15;
            return `${bucket}–${bucket + 15}`;
        }
        case 'hrv': {
            const bucket = Math.floor(numVal / 20) * 20;
            return `${bucket}–${bucket + 20}`;
        }
        case 'eda': {
            const bucket = Math.floor(numVal / 2) * 2;
            return `${bucket.toFixed(1)}–${(bucket + 2).toFixed(1)}`;
        }
        case 'temp': {
            const bucket = Math.floor(numVal);
            return `${bucket}–${bucket + 1}`;
        }
        case 'activity': {
            if (numVal < 30) return 'Low';
            if (numVal <= 60) return 'Moderate';
            return 'High';
        }
        case 'sleep': {
            return numVal >= 7 ? 'Adequate' : 'Below target';
        }
        case 'voice':
        case 'social':
        case 'routine':
        case 'cognitive':
        case 'sleepQuality':
        case 'circadian':
        case 'lightSpectrum':
        case 'soundscape':
        case 'windowSim': {
            if (numVal < 30) return 'Low';
            if (numVal <= 60) return 'Moderate';
            return 'High';
        }
        case 'greenery': {
            if (numVal < 30) return 'Low';
            if (numVal <= 60) return 'Moderate';
            if (numVal <= 90) return 'Good';
            return 'High';
        }
        case 'pupil': {
            if (numVal < 4) return 'Normal';
            if (numVal <= 6) return 'Elevated';
            return 'High';
        }
        default:
            return '---';
    }
}

/* ============================================
   SVG Wristband Builder
   ============================================ */

/**
 * Build the inline SVG wristband illustration.
 * @param {Object} sample - Current biometric data sample.
 * @returns {string} Complete SVG markup.
 */
function buildWristbandSVG(sample) {
    const sleepH = formatNumber(sample.sleepMinutes / 60, 1);
    const actLabel = sample.activityScore > 50 ? 'Active' : 'Rest';

    // Build hotspot circles
    const hotspots = SENSOR_INFO.map(s => {
        const p = HOTSPOT_POS[s.id];
        return `<circle class="sensor-hotspot hotspot-pulse" cx="${p.x}" cy="${p.y}" r="8"
                  fill="#38bdf8" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.5"
                  data-sensor="${s.id}" filter="url(#hotspotGlow)"
                  tabindex="0" role="button" aria-label="${s.name} sensor, click for details">
                  <title>${s.icon} ${s.name}</title>
                </circle>`;
    }).join('\n      ');

    return `<svg class="wristband-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"
         role="img" aria-label="Wristband concept illustration with 6 sensor hotspots">

      <!-- ===== Definitions ===== -->
      <defs>
        <linearGradient id="wbBandGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#2a3040"/>
          <stop offset="50%"  stop-color="#1a1f2e"/>
          <stop offset="100%" stop-color="#12161f"/>
        </linearGradient>
        <linearGradient id="wbFaceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#252d3d"/>
          <stop offset="100%" stop-color="#1a1f2e"/>
        </linearGradient>
        <linearGradient id="wbScreenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0a1628"/>
          <stop offset="100%" stop-color="#0d1f30"/>
        </linearGradient>
        <!-- Device glow -->
        <filter id="deviceGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feFlood flood-color="#38bdf8" flood-opacity="0.25" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="glow"/>
          <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Hotspot glow -->
        <filter id="hotspotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feFlood flood-color="#38bdf8" flood-opacity="0.6" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="glow"/>
          <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ===== Band straps ===== -->
      <path d="M28,86 Q52,76 122,76 L122,124 Q52,124 28,114 Z"
            fill="url(#wbBandGrad)" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.3"/>
      <path d="M278,76 Q348,76 372,86 L372,114 Q348,124 278,124 Z"
            fill="url(#wbBandGrad)" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.3"/>

      <!-- Clasp accents -->
      <rect x="24" y="89" width="14" height="22" rx="4"
            fill="#2a3040" stroke="#38bdf8" stroke-width="0.4" stroke-opacity="0.4"/>
      <rect x="362" y="89" width="14" height="22" rx="4"
            fill="#2a3040" stroke="#38bdf8" stroke-width="0.4" stroke-opacity="0.4"/>

      <!-- Band accent lines -->
      <line x1="52" y1="94" x2="118" y2="94" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.15"/>
      <line x1="52" y1="106" x2="118" y2="106" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.15"/>
      <line x1="282" y1="94" x2="348" y2="94" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.15"/>
      <line x1="282" y1="106" x2="348" y2="106" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.15"/>

      <!-- ===== Device face ===== -->
      <rect x="118" y="40" width="164" height="120" rx="14"
            fill="url(#wbFaceGrad)" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.5"
            filter="url(#deviceGlow)"/>
      <!-- Inner bezel -->
      <rect x="126" y="48" width="148" height="104" rx="10"
            fill="none" stroke="#38bdf8" stroke-width="0.4" stroke-opacity="0.2"/>

      <!-- ===== Screen ===== -->
      <rect x="131" y="54" width="138" height="92" rx="6"
            fill="url(#wbScreenGrad)" stroke="#38bdf8" stroke-width="0.5" stroke-opacity="0.3"/>

      <!-- ===== Screen readout ===== -->
      <g class="device-screen-text" font-family="'JetBrains Mono','Fira Code',monospace" fill="#38bdf8">
        <text x="143" y="68" font-size="7.5" fill="#94a3b8" opacity="0.5">${AppState.privacyMode ? 'PRIVATE' : 'SIMULATED'}</text>
        <text x="143" y="84" font-size="10">♥ ${AppState.privacyMode ? '---' : Math.round(sample.heartRateBpm)} <tspan fill="#94a3b8" font-size="7">bpm</tspan></text>
        <text x="216" y="84" font-size="9">HRV ${AppState.privacyMode ? '---' : Math.round(sample.hrvMs)}<tspan fill="#94a3b8" font-size="7">ms</tspan></text>
        <text x="143" y="100" font-size="10">⚡${AppState.privacyMode ? '---' : formatNumber(sample.edaMicrosiemens, 1)} <tspan fill="#94a3b8" font-size="7">µS</tspan></text>
        <text x="216" y="100" font-size="9">🌡${AppState.privacyMode ? '---' : formatNumber(sample.skinTempC, 1)}<tspan fill="#94a3b8" font-size="7">°C</tspan></text>
        <text x="143" y="116" font-size="10">🏃 ${AppState.privacyMode ? '---' : actLabel}</text>
        <text x="216" y="116" font-size="9">😴 ${AppState.privacyMode ? '---' : sleepH}<tspan fill="#94a3b8" font-size="7">h</tspan></text>
        <text x="143" y="140" font-size="6" fill="#94a3b8" opacity="0.45">LUNAR HABITAT MONITOR</text>
      </g>

      <!-- ===== Sensor hotspots ===== -->
      ${hotspots}
    </svg>`;
}

/* ============================================
   Sensor Detail Cards
   ============================================ */

/**
 * Build the 6 sensor detail cards and append them to a container.
 * @param {HTMLElement} container - The `.sensor-list` element.
 * @param {Object} sample - Current biometric sample.
 */
function buildSensorCards(container, sample) {
    container.innerHTML = '';

    SENSOR_INFO.forEach(sensor => {
        const card = createElement('div', 'sensor-card card');
        card.dataset.sensor = sensor.id;

        card.innerHTML = `
            <div class="sensor-card-header">
                <span class="sensor-icon">${sensor.icon}</span>
                <span class="sensor-name">${sensor.name}</span>
            </div>
            <div class="sensor-card-body">
                <div><strong>Measurement:</strong> ${sensor.unit}</div>
                <div><strong>Range:</strong> ${sensor.range}</div>
                <div class="sensor-reading">Current: ${formatReading(sensor, sample)}</div>
                <div class="sensor-why">${sensor.why}</div>
            </div>
            <div class="sensor-privacy">🔒 Crew-controlled data sharing</div>`;

        container.appendChild(card);
    });
}

/* ============================================
   Interactivity
   ============================================ */

/**
 * Attach click and keyboard handlers on SVG hotspots to highlight corresponding sensor cards.
 */
function attachHotspotHandlers() {
    document.querySelectorAll('.sensor-hotspot').forEach(hotspot => {
        hotspot.style.cursor = 'pointer';

        const handleActivate = () => {
            const sensorId = hotspot.getAttribute('data-sensor');

            // Remove active state from every card
            document.querySelectorAll('.sensor-card').forEach(c => c.classList.remove('active'));

            // Highlight the matching card and scroll to it
            const card = document.querySelector(`.sensor-card[data-sensor="${sensorId}"]`);
            if (card) {
                card.classList.add('active');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        };

        hotspot.addEventListener('click', handleActivate);

        // Keyboard support: Enter and Space
        hotspot.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
                e.preventDefault();
                handleActivate();
            }
        });
    });
}

/* ============================================
   KPI Cards & Insights
   ============================================ */

/**
 * Build SVG markup for a circular ring gauge.
 * @param {number} index - Wellbeing index (0–100).
 * @param {string} status - 'green', 'yellow', or 'red'.
 * @returns {string} SVG markup.
 */
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

/**
 * Render KPI cards into a container, filtered by system.
 * @param {Object} sample - Latest biometric sample.
 * @param {Array} series - Full time-series array.
 * @param {HTMLElement} container - Where to render (defaults to .kpi-grid).
 * @param {string|null} systemId - If set, only render KPIs for that system.
 */
function renderKPIs(sample, series, container = null, systemId = null) {
    const grid = container || document.querySelector('.kpi-grid');
    if (!grid) {
        console.warn('[UI] KPI container not found');
        return;
    }
    grid.innerHTML = '';

    // All metrics definitions (wristband + habitat)
    const allMetrics = [
        { icon: '♥',  label: 'Heart Rate', value: Math.round(sample.heartRateBpm), unit: 'bpm', sensorId: 'hr', metricKey: 'heartRateBpm' },
        { icon: '📊', label: 'HRV',        value: Math.round(sample.hrvMs),        unit: 'ms', sensorId: 'hrv', metricKey: 'hrvMs' },
        { icon: '⚡', label: 'EDA',        value: sample.edaMicrosiemens.toFixed(1), unit: 'µS', sensorId: 'eda', metricKey: 'edaMicrosiemens' },
        { icon: '🌡', label: 'Skin Temp',  value: sample.skinTempC.toFixed(1),      unit: '°C', sensorId: 'temp', metricKey: 'skinTempC' },
        { icon: '🏃', label: 'Activity',   value: Math.round(sample.activityScore), unit: '/100', sensorId: 'activity', metricKey: 'activityScore' },
        { icon: '😴', label: 'Sleep',      value: (sample.sleepMinutes / 60).toFixed(1), unit: 'hrs', sensorId: 'sleep', metricKey: 'sleepMinutes' },
        { icon: '🎙', label: 'Voice Stress',  value: Math.round(sample.voiceStressIndex ?? 15),  unit: '/100', sensorId: 'voice', metricKey: 'voiceStressIndex' },
        { icon: '👁', label: 'Pupil Dilation', value: (sample.pupilDilationMm ?? 3.2).toFixed(1), unit: 'mm',   sensorId: 'pupil', metricKey: 'pupilDilationMm' },
        { icon: '👥', label: 'Social',         value: Math.round(sample.socialScore ?? 70),        unit: '/100', sensorId: 'social', metricKey: 'socialScore' },
        { icon: '📋', label: 'Routine Dev.',   value: Math.round(sample.routineDeviation ?? 12),   unit: '/100', sensorId: 'routine', metricKey: 'routineDeviation' },
        { icon: '🧠', label: 'Cognitive Load', value: Math.round(sample.cognitiveLoad ?? 30),      unit: '/100', sensorId: 'cognitive', metricKey: 'cognitiveLoad' },
        { icon: '💤', label: 'Sleep Quality',  value: Math.round(sample.sleepQuality ?? 78),       unit: '/100', sensorId: 'sleepQuality', metricKey: 'sleepQuality' },
        { icon: '🌗', label: 'Circadian',      value: Math.round(sample.circadianAlignment ?? 85), unit: '/100', sensorId: 'circadian', metricKey: 'circadianAlignment' },
        { icon: '🌈', label: 'Light Spectrum', value: Math.round(sample.lightSpectrumScore ?? 88), unit: '/100', sensorId: 'lightSpectrum', metricKey: 'lightSpectrumScore' },
        { icon: '🌿', label: 'Greenery',       value: Math.round(sample.greeneryExposureMin ?? 65), unit: 'min', sensorId: 'greenery', metricKey: 'greeneryExposureMin' },
        { icon: '🔊', label: 'Soundscape',     value: Math.round(sample.natureSoundscapeScore ?? 75), unit: '/100', sensorId: 'soundscape', metricKey: 'natureSoundscapeScore' },
        { icon: '🪟', label: 'Window Sim',     value: Math.round(sample.windowSimStatus ?? 82),    unit: '/100', sensorId: 'windowSim', metricKey: 'windowSimStatus' }
    ];

    // Filter by system if specified
    let metricsToShow = allMetrics;
    if (systemId) {
        const system = SYSTEMS.find(s => s.id === systemId);
        if (system) {
            metricsToShow = allMetrics.filter(m => system.metrics.includes(m.metricKey));
        }
    }

    metricsToShow.forEach(m => {
        const masked = AppState.privacyMode;
        const displayValue = masked ? privacyMask(m.value, m.sensorId) : m.value;
        const maskedClass = masked ? ' privacy-masked' : '';
        const card = createElement('div', 'kpi-card card');
        card.innerHTML = `
            <div class="kpi-icon">${m.icon}</div>
            <div class="kpi-value${maskedClass}">${displayValue}</div>
            <div class="kpi-label">${m.label}</div>
            <div class="kpi-unit">${m.unit}</div>`;
        grid.appendChild(card);
    });

    console.log(`[UI] KPI cards rendered${systemId ? ` for ${systemId}` : ''}`);
}

/**
 * Render rule-based insights into .insights-panel.
 * @param {Object} sample - Latest biometric sample.
 * @param {Array} series - Full time-series array.
 */
function renderInsights(sample, series) {
    const panel = document.querySelector('.insights-panel');
    if (!panel) {
        console.warn('[UI] .insights-panel not found');
        return;
    }
    panel.innerHTML = '';

    // Header
    const header = createElement('div', 'insights-header');
    header.innerHTML = `
        <h3>Insights</h3>
        <span class="badge">Rule-based conceptual suggestions</span>`;
    panel.appendChild(header);

    // Evaluate rules
    const allInsights = [];

    if (sample.hrvMs < 30) {
        allInsights.push({ icon: '⚠️', text: 'HRV below baseline — consider decompression protocol', level: 'warning' });
    }
    if (sample.edaMicrosiemens > 4.0) {
        allInsights.push({ icon: '⚡', text: 'Elevated EDA — sympathetic arousal detected', level: 'warning' });
    }
    if (sample.heartRateBpm > 100 && sample.activityScore < 30) {
        allInsights.push({ icon: '🫀', text: 'Elevated resting heart rate — monitor for stress response', level: 'warning' });
    }
    if (sample.sleepMinutes < 300) {
        allInsights.push({ icon: '😴', text: 'Sleep deficit detected — suggest circadian lighting adjustment', level: 'danger' });
    }
    if (sample.restlessnessScore > 60) {
        allInsights.push({ icon: '🛏️', text: 'High restlessness — review sleep environment factors', level: 'warning' });
    }
    if (sample.skinTempC < 32.5) {
        allInsights.push({ icon: '🌡', text: 'Peripheral temperature low — check habitat thermal regulation', level: 'info' });
    }
    if (sample.activityScore > 80) {
        allInsights.push({ icon: '🏃', text: 'High activity level — ensure adequate hydration protocol', level: 'info' });
    }

    // --- Habitat-integrated mental health insight rules ---

    // Combined danger: social withdrawal + stress
    if ((sample.socialScore ?? 70) < 25 && (sample.voiceStressIndex ?? 15) > 50) {
        allInsights.push({ icon: '🚨', text: 'Social withdrawal with elevated stress — priority mental health assessment', level: 'danger' });
    }

    if ((sample.voiceStressIndex ?? 15) > 60) {
        allInsights.push({ icon: '🎙', text: 'Elevated vocal stress markers — consider private counseling session', level: 'warning' });
    }
    if ((sample.pupilDilationMm ?? 3.2) > 6.0) {
        allInsights.push({ icon: '👁', text: 'Sustained pupil dilation — high cognitive demand or acute stress', level: 'warning' });
    }
    if ((sample.socialScore ?? 70) < 25) {
        allInsights.push({ icon: '👥', text: 'Social withdrawal detected — suggest crew interaction activity', level: 'warning' });
    }
    if ((sample.routineDeviation ?? 12) > 60) {
        allInsights.push({ icon: '📋', text: 'Significant routine deviation — monitor for behavioral pattern changes', level: 'warning' });
    }
    if ((sample.cognitiveLoad ?? 30) > 75) {
        allInsights.push({ icon: '🧠', text: 'High cognitive load — recommend task redistribution or break', level: 'warning' });
    }
    if ((sample.sleepQuality ?? 78) < 30) {
        allInsights.push({ icon: '💤', text: 'Poor sleep stage composition — review mattress and environment factors', level: 'danger' });
    }
    if ((sample.circadianAlignment ?? 85) < 40) {
        allInsights.push({ icon: '🌗', text: 'Circadian misalignment — adjust LED light panel schedule', level: 'warning' });
    }

    // Environmental cue: nature simulation recommendation
    const stressIndicators = [
        (sample.voiceStressIndex ?? 15) > 50,
        sample.edaMicrosiemens > 4,
        (sample.cognitiveLoad ?? 30) > 60,
        (sample.socialScore ?? 70) < 30,
        (sample.pupilDilationMm ?? 3.2) > 5.5
    ].filter(Boolean).length;
    if (stressIndicators >= 3) {
        allInsights.push({ icon: '🌿', text: 'Multiple stress indicators elevated — consider activating nature simulation panels and ambient Earth soundscapes', level: 'info' });
    }

    // Greenery & Nature insights
    if ((sample.greeneryExposureMin ?? 65) < 20) {
        allInsights.push({ icon: '🌿', text: 'Low greenery exposure — schedule time near botanical window panels', level: 'warning' });
    }
    if ((sample.natureSoundscapeScore ?? 75) < 30) {
        allInsights.push({ icon: '🔊', text: 'Nature soundscape engagement low — enable ambient Earth sounds', level: 'info' });
    }
    if ((sample.windowSimStatus ?? 82) < 35) {
        allInsights.push({ icon: '🪟', text: 'Window simulation quality degraded — check display calibration', level: 'warning' });
    }

    // Light Spectrum insight
    if ((sample.lightSpectrumScore ?? 88) < 40) {
        allInsights.push({ icon: '🌈', text: 'Light spectrum deviation from Earth baseline — recalibrate LED panels', level: 'warning' });
    }

    // If no warnings/dangers, add success message
    if (allInsights.filter(i => i.level === 'warning' || i.level === 'danger').length === 0) {
        allInsights.push({ icon: '✅', text: 'All biometrics within expected range — crew status nominal', level: 'success' });
    }

    // Prioritize: dangers first, then warnings, then info, then success
    const priority = { danger: 0, warning: 1, info: 2, success: 3 };
    allInsights.sort((a, b) => priority[a.level] - priority[b.level]);

    // Show 2–6 insights max, at least 1
    const shown = allInsights.slice(0, Math.max(2, Math.min(6, allInsights.length)));

    const list = createElement('ul', 'insights-list');
    shown.forEach(insight => {
        const li = createElement('li', `insight-item insight-item--${insight.level}`);
        li.innerHTML = `
            <span class="insight-icon">${insight.icon}</span>
            <span class="insight-text">${insight.text}</span>`;
        list.appendChild(li);
    });
    panel.appendChild(list);

    console.log(`[UI] Insights rendered (${shown.length} items)`);
}

/* ============================================
   Fade Transition Helper
   ============================================ */

let simulationInterval = null;

/**
 * Briefly dims panels, re-renders wristband & dashboard, then restores opacity.
 * Respects prefers-reduced-motion.
 */
function fadeRerender() {
    // Stop any running simulation to avoid competing renders
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        AppState.isPlaying = false;
        const playPauseBtn = document.getElementById('btn-play-pause');
        if (playPauseBtn) {
            playPauseBtn.textContent = '▶ Play';
            playPauseBtn.classList.remove('control-btn--active');
        }
    }

    // Only regenerate if we're in simulated mode
    if (AppState.dataSource === 'simulated') {
        generateAndStore(AppState.currentScenario, 60);
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panels = document.querySelectorAll('.panel');

    if (prefersReducedMotion) {
        renderWristband();
        renderDashboard();
        return;
    }

    panels.forEach(p => p.style.opacity = '0.6');
    requestAnimationFrame(() => {
        renderWristband();
        renderDashboard();
        requestAnimationFrame(() => {
            panels.forEach(p => p.style.opacity = '1');
        });
    });
}

/* ============================================
   Controls Initialisation
   ============================================ */

/**
 * Wire interactive header controls: scenario select, regenerate,
 * play/pause simulation, and privacy-mode toggle.
 */
function initControls() {
    // Scenario select
    const scenarioSelect = document.getElementById('scenario-select');
    if (scenarioSelect) {
        scenarioSelect.value = AppState.currentScenario;
        scenarioSelect.addEventListener('change', (e) => {
            AppState.currentScenario = e.target.value;
            const scenarioNames = {
                baseline: 'Baseline',
                stress: 'Stress Spike',
                sleepDeprived: 'Sleep Deprived',
                exercise: 'High Activity',
                eva: 'EVA Spacewalk',
                microgravity: 'Microgravity Rest',
                emergency: 'Emergency Alert',
                isolation: 'Social Isolation'
            };
            const scenarioName = scenarioNames[e.target.value] || e.target.value;
            fadeRerender();
            announce(`Data regenerated for ${scenarioName} scenario`);
            console.log(`[UI] Scenario changed: ${e.target.value}`);
        });
    }

    // Regenerate button
    const regenBtn = document.getElementById('btn-regenerate');
    if (regenBtn) {
        regenBtn.addEventListener('click', () => {
            fadeRerender();
            announce('Data regenerated');
            console.log('[UI] Data regenerated');
        });
    }

    // Play / Pause button
    const playPauseBtn = document.getElementById('btn-play-pause');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            AppState.isPlaying = !AppState.isPlaying;

            if (AppState.isPlaying) {
                playPauseBtn.textContent = '⏸ Pause';
                playPauseBtn.classList.add('control-btn--active');
                announce('Real-time simulation started');
                simulationInterval = setInterval(() => {
                    generateAndStore(AppState.currentScenario, 60);
                    renderWristband();
                    renderDashboard();
                }, 2000);
            } else {
                playPauseBtn.textContent = '▶ Play';
                playPauseBtn.classList.remove('control-btn--active');
                announce('Real-time simulation paused');
                clearInterval(simulationInterval);
                simulationInterval = null;
            }
        });
    }

    // Privacy toggle
    const privacyToggle = document.getElementById('privacy-toggle');
    if (privacyToggle) {
        privacyToggle.addEventListener('click', () => {
            AppState.privacyMode = !AppState.privacyMode;
            privacyToggle.setAttribute('aria-checked', String(AppState.privacyMode));
            privacyToggle.querySelector('.toggle-label').textContent = AppState.privacyMode ? 'On' : 'Off';
            privacyToggle.classList.toggle('control-toggle--active', AppState.privacyMode);

            // Re-render to apply privacy masking
            renderWristband();
            renderDashboard();
            announce(`Privacy mode ${AppState.privacyMode ? 'enabled' : 'disabled'}`);
            console.log(`[UI] Privacy mode: ${AppState.privacyMode ? 'ON' : 'OFF'}`);
        });
    }

    console.log('[UI] Controls initialized');
}

/* ============================================
   Import Controls
   ============================================ */

/**
 * Show a toast notification for import results.
 * @param {string} message - Toast message.
 * @param {'success'|'warning'|'error'} type - Toast type.
 */
function showImportToast(message, type = 'success') {
    const toast = document.getElementById('import-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `import-toast import-toast--${type}`;
    toast.hidden = false;

    // Auto-dismiss after 5 seconds
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.hidden = true;
    }, 5000);
}

/**
 * Toggle simulation controls enabled/disabled based on data source.
 * @param {boolean} disabled - Whether to disable simulation controls.
 */
function toggleSimControls(disabled) {
    const ids = ['scenario-select', 'btn-regenerate', 'btn-play-pause'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = disabled;
            el.classList.toggle('control--disabled', disabled);
        }
    });
    // Also disable the scenario label group
    const scenarioGroup = document.getElementById('scenario-select')?.closest('.controls-group');
    if (scenarioGroup) scenarioGroup.classList.toggle('control--disabled', disabled);
}

/**
 * Wire the data import controls: import button, file input, help, clear.
 */
function initImportControls() {
    const importBtn = document.getElementById('btn-import');
    const fileInput = document.getElementById('file-import');
    const badge = document.getElementById('import-badge');
    const badgeName = document.getElementById('import-filename');
    const clearBtn = document.getElementById('btn-import-clear');
    const helpBtn = document.getElementById('btn-import-help');
    const helpPopover = document.getElementById('import-help-popover');
    const closeHelpBtn = document.getElementById('btn-close-help');

    if (importBtn && fileInput) {
        // Import button triggers hidden file input
        importBtn.addEventListener('click', () => fileInput.click());

        // File selected
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;

            try {
                const result = await importFile(file);

                if (result.errors.length > 0 && result.cleaned.length === 0) {
                    showImportToast(`Import failed: ${result.errors[0]}`, 'error');
                    announce(`Import failed: ${result.errors[0]}`);
                    fileInput.value = '';
                    return;
                }

                // Load imported data
                AppState.data = result.cleaned;
                AppState.dataSource = 'imported';
                AppState.importedFileName = result.fileName;

                // Show badge, disable sim controls
                if (badge && badgeName) {
                    badgeName.textContent = result.fileName;
                    badge.hidden = false;
                }
                toggleSimControls(true);

                // Update wristband badge text
                const wbBadge = document.querySelector('#wristband-panel > .badge');
                if (wbBadge) wbBadge.textContent = `Imported: ${result.fileName}`;

                // Re-render
                renderWristband();
                renderDashboard();

                // Surface warnings
                if (result.warnings.length > 0) {
                    showImportToast(`Loaded ${result.cleaned.length} rows. ${result.warnings.join('; ')}`, 'warning');
                } else {
                    showImportToast(`Loaded ${result.cleaned.length} data points from ${result.fileName}`, 'success');
                }
                announce(`Imported ${result.cleaned.length} data points from ${result.fileName}`);
                console.log(`[UI] Imported ${result.cleaned.length} rows from ${result.fileName}`);

            } catch (err) {
                showImportToast(err.message, 'error');
                announce(`Import error: ${err.message}`);
                console.error('[UI] Import error:', err);
            }

            // Reset file input so the same file can be re-imported
            fileInput.value = '';
        });
    }

    // Clear imported data
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            AppState.dataSource = 'simulated';
            AppState.importedFileName = null;

            if (badge) badge.hidden = true;
            toggleSimControls(false);

            // Restore wristband badge
            const wbBadge = document.querySelector('#wristband-panel > .badge');
            if (wbBadge) wbBadge.textContent = 'Simulated sensor readings';

            // Regenerate and re-render
            generateAndStore(AppState.currentScenario, 60);
            renderWristband();
            renderDashboard();

            showImportToast('Imported data cleared — using simulated data', 'success');
            announce('Imported data cleared, returned to simulated mode');
            console.log('[UI] Import cleared, back to simulated');
        });
    }

    // Help popover
    if (helpBtn && helpPopover) {
        helpBtn.addEventListener('click', () => {
            helpPopover.hidden = !helpPopover.hidden;
        });
    }
    if (closeHelpBtn && helpPopover) {
        closeHelpBtn.addEventListener('click', () => {
            helpPopover.hidden = true;
        });
    }
    // Close help when clicking outside
    document.addEventListener('click', (e) => {
        if (helpPopover && !helpPopover.hidden &&
            !helpPopover.contains(e.target) &&
            e.target !== helpBtn) {
            helpPopover.hidden = true;
        }
    });

    console.log('[UI] Import controls initialized');
}

/* ============================================
   Public API
   ============================================ */

/**
 * Render the wristband visualization panel.
 * Orchestrates: current sample → SVG → sensor cards → click handlers.
 */
export function renderWristband() {
    // Use latest point from the generated series if available, otherwise fall back to static preset
    let sample;
    if (AppState.data && AppState.data.length > 0) {
        sample = getLatestSample(AppState.data);
    } else {
        sample = getCurrentSample(AppState.currentScenario);
    }

    // Compute & log wellbeing index
    const wbIndex = computeWellbeingIndex(sample);
    const status  = computeStatus(wbIndex);
    console.log(`[UI] Wellbeing index: ${wbIndex} (${status})`);

    // Insert SVG
    const display = document.querySelector('.wristband-display');
    if (display) {
        display.innerHTML = buildWristbandSVG(sample);

        // Add 3D view links if not already present
        if (!display.querySelector('.view-3d-links')) {
            const linksWrap = createElement('div', 'view-3d-links');

            const link = createElement('a', 'view-3d-link control-btn');
            link.href = 'wristband-3d.html';
            link.textContent = '🧊 Sci-Fi View';
            link.title = 'Open interactive 3D wristband explorer';
            linksWrap.appendChild(link);

            const prodLink = createElement('a', 'view-3d-link control-btn');
            prodLink.href = 'wristband-product.html';
            prodLink.textContent = '🎨 Product View';
            prodLink.title = 'Open photorealistic product render';
            linksWrap.appendChild(prodLink);

            display.appendChild(linksWrap);
        }
    }

    // Build sensor detail cards
    const sensorList = document.querySelector('.sensor-list');
    if (sensorList) {
        buildSensorCards(sensorList, sample);
    }

    // Wire up hotspot → card highlighting
    attachHotspotHandlers();

    console.log('[UI] Wristband render complete');
}

/**
 * Initialize the user interface.
 * Verifies DOM elements, shows loading state, renders wristband and dashboard.
 */
export function initUI() {
    console.log('[UI] Initializing layout…');

    // Show loading indicator
    showLoading();

    // Dynamic page title
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    document.title = `Lunar Habitat — Crew Wellbeing Monitor | ${today}`;

    // Verify key DOM elements
    const wristbandPanel = document.getElementById('wristband-panel');
    const dashboardPanel = document.getElementById('dashboard-panel');

    if (wristbandPanel) console.log('[UI] ✓ Wristband panel found');
    else console.warn('[UI] ✗ Wristband panel (#wristband-panel) not found');

    if (dashboardPanel) console.log('[UI] ✓ Dashboard panel found');
    else console.warn('[UI] ✗ Dashboard panel (#dashboard-panel) not found');

    // Hide loading and render
    hideLoading();

    // Generate initial data series
    generateAndStore(AppState.currentScenario, 60);

    // Render the wristband model
    renderWristband();

    // Render the dashboard charts
    renderDashboard();

    // Wire interactive controls
    initControls();

    // Wire import controls
    initImportControls();

    console.log('[UI] Layout initialization complete');
}

/**
 * Compute a health score (0–100) for a specific system based on its metrics.
 * @param {string} systemId - System identifier.
 * @param {Object} sample - Latest biometric data sample.
 * @returns {{ score: number, status: string }} Health score and status color.
 */
function computeSystemHealth(systemId, sample) {
    const system = SYSTEMS.find(s => s.id === systemId);
    if (!system) return { score: 50, status: 'yellow' };

    let components = [];
    for (const key of system.metrics) {
        let score;
        switch (key) {
            case 'heartRateBpm':
                score = 100 - Math.abs((sample.heartRateBpm ?? 72) - 70) * 0.8;
                break;
            case 'hrvMs':
                score = ((sample.hrvMs ?? 45) / 60) * 100;
                break;
            case 'edaMicrosiemens':
                score = 100 - ((sample.edaMicrosiemens ?? 1.2) / 8) * 100;
                break;
            case 'skinTempC':
                score = 100 - Math.abs((sample.skinTempC ?? 33.8) - 33.8) * 10;
                break;
            case 'activityScore':
                score = 100 - Math.abs((sample.activityScore ?? 25) - 35) * 1.2;
                break;
            case 'sleepMinutes':
                score = ((sample.sleepMinutes ?? 432) / 480) * 100;
                break;
            case 'voiceStressIndex':
                score = 100 - (sample.voiceStressIndex ?? 15);
                break;
            case 'pupilDilationMm':
                score = 100 - (((sample.pupilDilationMm ?? 3.2) - 2.0) / 6.0) * 100;
                break;
            case 'socialScore':
                score = sample.socialScore ?? 70;
                break;
            case 'routineDeviation':
                score = 100 - (sample.routineDeviation ?? 12);
                break;
            case 'cognitiveLoad':
                score = 100 - (sample.cognitiveLoad ?? 30) * 0.8;
                break;
            case 'sleepQuality':
                score = sample.sleepQuality ?? 78;
                break;
            case 'restlessnessScore':
                score = 100 - (sample.restlessnessScore ?? 15);
                break;
            case 'circadianAlignment':
                score = sample.circadianAlignment ?? 85;
                break;
            case 'lightSpectrumScore':
                score = sample.lightSpectrumScore ?? 88;
                break;
            case 'greeneryExposureMin':
                score = ((sample.greeneryExposureMin ?? 65) / 90) * 100;
                break;
            case 'natureSoundscapeScore':
                score = sample.natureSoundscapeScore ?? 75;
                break;
            case 'windowSimStatus':
                score = sample.windowSimStatus ?? 82;
                break;
            default:
                score = 50;
        }
        components.push(Math.max(0, Math.min(100, score)));
    }

    const avg = components.length > 0
        ? Math.round(components.reduce((a, b) => a + b, 0) / components.length)
        : 50;
    return { score: avg, status: computeStatus(avg) };
}

/**
 * Render charts for a specific system into a container.
 * @param {string} systemId - System identifier.
 * @param {Array} series - Time-series data.
 * @param {HTMLElement} container - Target container element.
 * @param {Object} latestSample - Latest data point.
 */
function renderSystemCharts(systemId, series, container, latestSample) {
    switch (systemId) {
        case 'voiceRecognition': {
            // Voice Stress single line
            const voiceData = series.map(p => ({ value: p.voiceStressIndex ?? 15, label: `${Math.round(p.voiceStressIndex ?? 15)} stress` }));
            const card = createElement('div', 'chart-card card');
            card.innerHTML = '<h3>Voice Stress Index</h3>';
            container.appendChild(card);
            const chart = createChart(card, { yMin: 0, yMax: 100, lineColor: '#fb923c', yLabel: 'score' });
            chart.update(voiceData);
            chart.canvas.setAttribute('role', 'img');
            chart.canvas.setAttribute('aria-label', 'Voice stress index trend from speech analysis');
            break;
        }
        case 'facialScans': {
            // Pupil Dilation single line
            const pupilData = series.map(p => ({ value: p.pupilDilationMm ?? 3.2, label: `${(p.pupilDilationMm ?? 3.2).toFixed(1)} mm` }));
            const card = createElement('div', 'chart-card card');
            card.innerHTML = '<h3>Pupil Dilation</h3>';
            container.appendChild(card);
            const chart = createChart(card, { yMin: 2, yMax: 8, lineColor: '#f472b6', yLabel: 'mm' });
            chart.update(pupilData);
            chart.canvas.setAttribute('role', 'img');
            chart.canvas.setAttribute('aria-label', 'Pupil dilation trend from pupillometer scans');
            break;
        }
        case 'behavioralPattern': {
            // Activity Level single line
            const actData = series.map(p => ({ value: p.activityScore, label: `${p.activityScore} score` }));
            const card1 = createElement('div', 'chart-card card');
            card1.innerHTML = '<h3>Activity Level</h3>';
            container.appendChild(card1);
            const chart1 = createChart(card1, { yMin: 0, yMax: 100, lineColor: '#a78bfa', yLabel: 'score' });
            chart1.update(actData);
            chart1.canvas.setAttribute('role', 'img');
            chart1.canvas.setAttribute('aria-label', 'Activity score trend from movement data');

            // Social & Routine Deviation dual line
            const socialData = series.map(p => ({ value: p.socialScore ?? 70, label: `${Math.round(p.socialScore ?? 70)} social` }));
            const routineData = series.map(p => ({ value: p.routineDeviation ?? 12, label: `${Math.round(p.routineDeviation ?? 12)} deviation` }));
            const card2 = createElement('div', 'chart-card card');
            card2.innerHTML = '<h3>Social &amp; Routine Deviation</h3>';
            container.appendChild(card2);
            const chart2 = createChart(card2, { yMin: 0, yMax: 100, lineColor: '#2dd4bf', lineColor2: '#fbbf24', yLabel: 'score' });
            chart2.update(socialData, routineData);
            chart2.canvas.setAttribute('role', 'img');
            chart2.canvas.setAttribute('aria-label', 'Social interaction and routine deviation trends');
            const legend2 = createElement('div', 'chart-legend');
            legend2.innerHTML =
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#2dd4bf"></span>Social Score</span>' +
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#fbbf24"></span>Routine Deviation</span>';
            card2.appendChild(legend2);

            // Cognitive Load single line
            const cogData = series.map(p => ({ value: p.cognitiveLoad ?? 30, label: `${Math.round(p.cognitiveLoad ?? 30)} load` }));
            const card3 = createElement('div', 'chart-card card');
            card3.innerHTML = '<h3>Cognitive Load</h3>';
            container.appendChild(card3);
            const chart3 = createChart(card3, { yMin: 0, yMax: 100, lineColor: '#818cf8', yLabel: 'score' });
            chart3.update(cogData);
            chart3.canvas.setAttribute('role', 'img');
            chart3.canvas.setAttribute('aria-label', 'Cognitive load trend from task and workstation analysis');
            break;
        }
        case 'hrvMonitoring': {
            // Heart Rate & HRV dual line
            const hrData = series.map(p => ({ value: p.heartRateBpm, label: `${Math.round(p.heartRateBpm)} bpm` }));
            const hrvData = series.map(p => ({ value: p.hrvMs, label: `${Math.round(p.hrvMs)} ms` }));
            const card1 = createElement('div', 'chart-card card');
            card1.innerHTML = '<h3>Heart Rate &amp; HRV</h3>';
            container.appendChild(card1);
            const chart1 = createChart(card1, { yMin: 20, yMax: 150, lineColor: '#ef4444', lineColor2: '#38bdf8', yLabel: '' });
            chart1.update(hrData, hrvData);
            chart1.canvas.setAttribute('role', 'img');
            chart1.canvas.setAttribute('aria-label', 'Heart rate and HRV trend over time');
            const legend1 = createElement('div', 'chart-legend');
            legend1.innerHTML =
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#ef4444"></span>HR (bpm)</span>' +
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#38bdf8"></span>HRV (ms)</span>';
            card1.appendChild(legend1);

            // EDA single line
            const edaData = series.map(p => ({ value: p.edaMicrosiemens, label: `${p.edaMicrosiemens.toFixed(1)} µS` }));
            const card2 = createElement('div', 'chart-card card');
            card2.innerHTML = '<h3>Electrodermal Activity</h3>';
            container.appendChild(card2);
            const chart2 = createChart(card2, { yMin: 0, yMax: 10, lineColor: '#f59e0b', yLabel: 'µS' });
            chart2.update(edaData);
            chart2.canvas.setAttribute('role', 'img');
            chart2.canvas.setAttribute('aria-label', 'Electrodermal activity trend');

            // Skin Temperature single line
            const tempData = series.map(p => ({ value: p.skinTempC, label: `${p.skinTempC.toFixed(1)} °C` }));
            const card3 = createElement('div', 'chart-card card');
            card3.innerHTML = '<h3>Skin Temperature</h3>';
            container.appendChild(card3);
            const chart3 = createChart(card3, { yMin: 30, yMax: 38, lineColor: '#22c55e', yLabel: '°C' });
            chart3.update(tempData);
            chart3.canvas.setAttribute('role', 'img');
            chart3.canvas.setAttribute('aria-label', 'Skin temperature trend in Celsius');
            break;
        }
        case 'mattressSensors': {
            // Sleep Duration & Restlessness dual line
            const sleepDurData = series.map(p => ({ value: (p.sleepMinutes ?? 432) / 60, label: `${((p.sleepMinutes ?? 432) / 60).toFixed(1)} hrs` }));
            const restlessData = series.map(p => ({ value: (p.restlessnessScore ?? 15), label: `${Math.round(p.restlessnessScore ?? 15)} restless` }));
            const card1 = createElement('div', 'chart-card card');
            card1.innerHTML = '<h3>Sleep Duration &amp; Restlessness</h3>';
            container.appendChild(card1);
            const chart1 = createChart(card1, { yMin: 0, yMax: 100, lineColor: '#60a5fa', lineColor2: '#f87171', yLabel: '' });
            chart1.update(
                series.map(p => ({ value: Math.round((p.sleepMinutes ?? 432) / 480 * 100), label: `${((p.sleepMinutes ?? 432) / 60).toFixed(1)} hrs` })),
                series.map(p => ({ value: p.restlessnessScore ?? 15, label: `${Math.round(p.restlessnessScore ?? 15)}` }))
            );
            chart1.canvas.setAttribute('role', 'img');
            chart1.canvas.setAttribute('aria-label', 'Sleep duration and restlessness score trends');
            const legend1 = createElement('div', 'chart-legend');
            legend1.innerHTML =
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#60a5fa"></span>Sleep (% of 8h)</span>' +
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#f87171"></span>Restlessness</span>';
            card1.appendChild(legend1);

            // Sleep Quality single line
            const sqData = series.map(p => ({ value: p.sleepQuality ?? 78, label: `${Math.round(p.sleepQuality ?? 78)} quality` }));
            const card2 = createElement('div', 'chart-card card');
            card2.innerHTML = '<h3>Sleep Stage Quality</h3>';
            container.appendChild(card2);
            const chart2 = createChart(card2, { yMin: 0, yMax: 100, lineColor: '#60a5fa', yLabel: 'score' });
            chart2.update(sqData);
            chart2.canvas.setAttribute('role', 'img');
            chart2.canvas.setAttribute('aria-label', 'Sleep stage quality from mattress pressure sensors');
            break;
        }
        case 'circadianLight': {
            // Circadian & Light Spectrum dual line
            const circData = series.map(p => ({ value: p.circadianAlignment ?? 85, label: `${Math.round(p.circadianAlignment ?? 85)} alignment` }));
            const spectrumData = series.map(p => ({ value: p.lightSpectrumScore ?? 88, label: `${Math.round(p.lightSpectrumScore ?? 88)} spectrum` }));
            const card = createElement('div', 'chart-card card');
            card.innerHTML = '<h3>Circadian Alignment &amp; Light Spectrum</h3>';
            container.appendChild(card);
            const chart = createChart(card, { yMin: 0, yMax: 100, lineColor: '#facc15', lineColor2: '#fb923c', yLabel: 'score' });
            chart.update(circData, spectrumData);
            chart.canvas.setAttribute('role', 'img');
            chart.canvas.setAttribute('aria-label', 'Circadian alignment and LED light spectrum quality');
            const legend = createElement('div', 'chart-legend');
            legend.innerHTML =
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#facc15"></span>Circadian Alignment</span>' +
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#fb923c"></span>Light Spectrum</span>';
            card.appendChild(legend);
            break;
        }
        case 'greeneryNature': {
            // Greenery & Soundscape dual line
            const greenData = series.map(p => ({ value: p.greeneryExposureMin ?? 65, label: `${Math.round(p.greeneryExposureMin ?? 65)} min` }));
            const soundData = series.map(p => ({ value: p.natureSoundscapeScore ?? 75, label: `${Math.round(p.natureSoundscapeScore ?? 75)} score` }));
            const card1 = createElement('div', 'chart-card card');
            card1.innerHTML = '<h3>Greenery Exposure &amp; Soundscape</h3>';
            container.appendChild(card1);
            const chart1 = createChart(card1, { yMin: 0, yMax: 120, lineColor: '#22c55e', lineColor2: '#34d399', yLabel: '' });
            chart1.update(greenData, soundData);
            chart1.canvas.setAttribute('role', 'img');
            chart1.canvas.setAttribute('aria-label', 'Greenery exposure minutes and nature soundscape engagement');
            const legend1 = createElement('div', 'chart-legend');
            legend1.innerHTML =
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#22c55e"></span>Greenery (min)</span>' +
                '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:#34d399"></span>Soundscape</span>';
            card1.appendChild(legend1);

            // Window Simulation single line
            const windowData = series.map(p => ({ value: p.windowSimStatus ?? 82, label: `${Math.round(p.windowSimStatus ?? 82)} quality` }));
            const card2 = createElement('div', 'chart-card card');
            card2.innerHTML = '<h3>Window Simulation Quality</h3>';
            container.appendChild(card2);
            const chart2 = createChart(card2, { yMin: 0, yMax: 100, lineColor: '#4ade80', yLabel: 'score' });
            chart2.update(windowData);
            chart2.canvas.setAttribute('role', 'img');
            chart2.canvas.setAttribute('aria-label', 'Earth-view window simulation quality');
            break;
        }
    }
}

/**
 * Toggle an accordion section open or closed.
 * @param {string} systemId - System identifier.
 */
function toggleAccordion(systemId) {
    const isOpen = AppState.openSystems.has(systemId);
    if (isOpen) {
        AppState.openSystems.delete(systemId);
    } else {
        AppState.openSystems.add(systemId);
    }

    const section = document.querySelector(`.system-accordion[data-system="${systemId}"]`);
    if (!section) return;

    const body = section.querySelector('.system-accordion__body');
    const chevron = section.querySelector('.system-accordion__chevron');
    const header = section.querySelector('.system-accordion__header');

    if (!isOpen) {
        section.classList.add('is-open');
        header.setAttribute('aria-expanded', 'true');
        if (body) {
            body.classList.remove('transition-done');
            body.style.maxHeight = body.scrollHeight + 'px';
        }
        if (chevron) chevron.textContent = '▾';

        // Render charts lazily on first open
        const chartsContainer = body?.querySelector('.system-accordion__charts');
        if (chartsContainer && !chartsContainer.dataset.rendered) {
            const series = (AppState.data && AppState.data.length > 0)
                ? AppState.data
                : generateAndStore(AppState.currentScenario, 60);
            const latestSample = getLatestSample(series);
            renderSystemCharts(systemId, series, chartsContainer, latestSample);
            chartsContainer.dataset.rendered = 'true';

            // Recalculate max-height now that charts have been added
            if (body) body.style.maxHeight = body.scrollHeight + 'px';
        }

        // After transition ends, switch to max-height:none so content is never clipped
        if (body) {
            const onEnd = () => {
                body.removeEventListener('transitionend', onEnd);
                if (section.classList.contains('is-open')) {
                    body.classList.add('transition-done');
                }
            };
            body.addEventListener('transitionend', onEnd);
        }

        announce(`${SYSTEMS.find(s => s.id === systemId)?.name || systemId} section expanded`);
    } else {
        if (body) {
            body.classList.remove('transition-done');
            // Reset to current scrollHeight so the transition animates from the correct value
            body.style.maxHeight = body.scrollHeight + 'px';
            // Force reflow before setting to 0
            void body.offsetHeight;
            body.style.maxHeight = '0';
        }
        section.classList.remove('is-open');
        header.setAttribute('aria-expanded', 'false');
        if (chevron) chevron.textContent = '▸';
        announce(`${SYSTEMS.find(s => s.id === systemId)?.name || systemId} section collapsed`);
    }
}

/**
 * Render the dashboard analytics panel.
 * Creates an overview section + 7 accordion sections (one per monitoring system).
 */
export function renderDashboard() {
    // Use existing series from AppState if available, otherwise generate
    const series = (AppState.data && AppState.data.length > 0)
        ? AppState.data
        : generateAndStore(AppState.currentScenario, 60);
    const latestSample = getLatestSample(series);

    // === Overview Section (in .kpi-grid) ===
    const kpiGrid = document.querySelector('.kpi-grid');
    if (kpiGrid && latestSample) {
        kpiGrid.innerHTML = '';

        // Wellbeing Index card
        const rollingWindow = getRollingWindow(series, 10);
        const wbIndex = computeWellbeingIndex(latestSample, rollingWindow);
        const status = computeStatus(wbIndex);

        const wbCard = createElement('div', 'kpi-card kpi-card--wellbeing card');
        wbCard.innerHTML = `
            <div class="kpi-label">Wellbeing Index</div>
            <div class="wellbeing-gauge">${buildWellbeingGauge(wbIndex, status)}</div>
            <div class="kpi-sublabel">Conceptual composite score</div>`;
        kpiGrid.appendChild(wbCard);

        // Crew Status pill
        const statusLabels = { green: 'GREEN', yellow: 'YELLOW', red: 'RED' };
        const statusExplanations = {
            green: 'All metrics within baseline range',
            yellow: 'Elevated stress indicators detected',
            red: 'Sustained stress / sleep deficit indicators'
        };
        const statusCard = createElement('div', 'kpi-card kpi-card--status card');
        statusCard.innerHTML = `
            <div class="kpi-label">Crew Status</div>
            <div class="status-pill status-pill--${status}">${statusLabels[status]}</div>
            <div class="status-explanation">${statusExplanations[status]}</div>`;
        kpiGrid.appendChild(statusCard);

        // Light Panel Status
        const latestTs = latestSample.timestamp ? new Date(latestSample.timestamp) : new Date();
        const hour = latestTs.getHours();
        let lightPhase, lightIcon, lightColor;
        if (hour >= 6 && hour < 10) {
            lightPhase = 'Dawn'; lightIcon = '🌅'; lightColor = '#fb923c';
        } else if (hour >= 10 && hour < 18) {
            lightPhase = 'Day'; lightIcon = '☀️'; lightColor = '#facc15';
        } else if (hour >= 18 && hour < 21) {
            lightPhase = 'Dusk'; lightIcon = '🌇'; lightColor = '#f472b6';
        } else {
            lightPhase = 'Night'; lightIcon = '🌙'; lightColor = '#818cf8';
        }
        const circadianVal = Math.round(latestSample.circadianAlignment ?? 85);
        const circadianDisplay = AppState.privacyMode ? privacyMask(circadianVal, 'circadian') : circadianVal;

        const lightCard = createElement('div', 'kpi-card kpi-card--lightpanel card');
        lightCard.innerHTML = `
            <div class="kpi-label">Light Panel</div>
            <div class="lightpanel-phase" style="color:${lightColor}">${lightIcon} ${lightPhase}</div>
            <div class="kpi-value${AppState.privacyMode ? ' privacy-masked' : ''}">${circadianDisplay}</div>
            <div class="kpi-sublabel">Circadian Alignment</div>`;
        kpiGrid.appendChild(lightCard);

        // 7 system health summary cards
        SYSTEMS.forEach(system => {
            const health = computeSystemHealth(system.id, latestSample);
            const colorMap = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
            const dotColor = colorMap[health.status] || '#38bdf8';
            const card = createElement('div', 'kpi-card kpi-card--system-summary card');
            card.dataset.system = system.id;
            card.style.borderLeftColor = system.color;
            card.style.cursor = 'pointer';
            card.title = `Click to expand ${system.name}`;
            card.innerHTML = `
                <div class="kpi-icon">${system.icon}</div>
                <div class="system-summary-row">
                    <span class="system-status-dot" style="background:${dotColor}"></span>
                    <span class="kpi-value">${health.score}</span>
                </div>
                <div class="kpi-label">${system.name}</div>`;
            card.addEventListener('click', () => {
                // Open the accordion for this system and scroll to it
                if (!AppState.openSystems.has(system.id)) {
                    toggleAccordion(system.id);
                }
                const section = document.querySelector(`.system-accordion[data-system="${system.id}"]`);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            kpiGrid.appendChild(card);
        });
    }

    // === Accordion Sections (in .charts-grid) ===
    const grid = document.querySelector('.charts-grid');
    if (!grid) {
        console.warn('[UI] .charts-grid not found');
        return;
    }
    grid.innerHTML = '';

    // Expand/Collapse All toggle
    const toggleAllBar = createElement('div', 'accordion-controls');
    const toggleAllBtn = createElement('button', 'control-btn accordion-toggle-all');
    toggleAllBtn.textContent = '▸ Expand All';
    toggleAllBtn.title = 'Expand or collapse all system sections';
    toggleAllBtn.addEventListener('click', () => {
        const allOpen = SYSTEMS.every(s => AppState.openSystems.has(s.id));
        if (allOpen) {
            // Collapse all
            SYSTEMS.forEach(s => {
                if (AppState.openSystems.has(s.id)) toggleAccordion(s.id);
            });
            toggleAllBtn.textContent = '▸ Expand All';
        } else {
            // Expand all
            SYSTEMS.forEach(s => {
                if (!AppState.openSystems.has(s.id)) toggleAccordion(s.id);
            });
            toggleAllBtn.textContent = '▾ Collapse All';
        }
    });
    toggleAllBar.appendChild(toggleAllBtn);
    grid.appendChild(toggleAllBar);

    // Build each system accordion
    SYSTEMS.forEach(system => {
        const isOpen = AppState.openSystems.has(system.id);
        const health = computeSystemHealth(system.id, latestSample);
        const colorMap = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
        const dotColor = colorMap[health.status] || '#38bdf8';

        const section = createElement('div', `system-accordion${isOpen ? ' is-open' : ''}`);
        section.dataset.system = system.id;

        // Header
        const header = createElement('button', 'system-accordion__header');
        header.setAttribute('aria-expanded', String(isOpen));
        header.setAttribute('aria-controls', `accordion-body-${system.id}`);
        header.style.borderLeftColor = system.color;
        header.innerHTML = `
            <span class="system-accordion__icon">${system.icon}</span>
            <span class="system-accordion__title">${system.name}</span>
            <span class="system-status-dot" style="background:${dotColor}" title="System health: ${health.score}"></span>
            <span class="system-accordion__score">${health.score}</span>
            <span class="system-accordion__chevron">${isOpen ? '▾' : '▸'}</span>`;
        header.addEventListener('click', () => toggleAccordion(system.id));
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleAccordion(system.id);
            }
        });
        section.appendChild(header);

        // Body
        const body = createElement('div', 'system-accordion__body');
        body.id = `accordion-body-${system.id}`;
        body.setAttribute('role', 'region');
        body.setAttribute('aria-labelledby', `accordion-header-${system.id}`);
        header.id = `accordion-header-${system.id}`;

        // Description
        const desc = createElement('p', 'system-accordion__desc');
        desc.textContent = system.description;
        body.appendChild(desc);

        // KPI sub-grid
        const kpiSubGrid = createElement('div', 'system-accordion__kpis kpi-grid');
        if (latestSample) {
            renderKPIs(latestSample, series, kpiSubGrid, system.id);
        }
        body.appendChild(kpiSubGrid);

        // Charts sub-grid
        const chartsSubGrid = createElement('div', 'system-accordion__charts');
        body.appendChild(chartsSubGrid);

        if (isOpen) {
            body.style.maxHeight = 'none';
            renderSystemCharts(system.id, series, chartsSubGrid, latestSample);
            chartsSubGrid.dataset.rendered = 'true';
        } else {
            body.style.maxHeight = '0';
        }

        section.appendChild(body);
        grid.appendChild(section);
    });

    // Remove placeholder text
    const placeholder = document.querySelector('#dashboard-panel .placeholder-text');
    if (placeholder) placeholder.remove();

    // Render insights panel (below charts, global)
    if (latestSample) {
        renderInsights(latestSample, series);
    }

    console.log('[UI] Dashboard rendered with accordion layout');
}
