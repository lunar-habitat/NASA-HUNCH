/**
 * @fileoverview 3D Interactive Wristband Explorer for Lunar Habitat.
 * Uses Three.js (ES module via importmap CDN) to render a sci-fi styled
 * wristband with orbit controls, clickable sensor hotspots, animated
 * watch-face vitals, and a wellbeing-driven status glow.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SCENARIOS, getCurrentSample, computeWellbeingIndex, computeStatus } from './data.js';

/* ============================================
   Constants & Sensor Metadata
   ============================================ */

const SENSOR_INFO = [
    { id: 'hr',       name: 'Heart Rate',              icon: '♥',  unit: 'bpm',       range: '55–140', key: 'heartRateBpm',    why: 'Tracks cardiovascular response to stress, exercise, and rest cycles' },
    { id: 'hrv',      name: 'Heart Rate Variability',   icon: '📊', unit: 'ms',        range: '20–120', key: 'hrvMs',           why: 'Indicates autonomic nervous system balance; low HRV correlates with stress' },
    { id: 'eda',      name: 'Electrodermal Activity',   icon: '⚡', unit: 'µS',        range: '0.5–8.0', key: 'edaMicrosiemens', why: 'Measures sympathetic nervous system arousal; spikes indicate stress response' },
    { id: 'temp',     name: 'Skin Temperature',         icon: '🌡', unit: '°C',        range: '32.0–36.5', key: 'skinTempC',    why: 'Peripheral temperature shifts reflect circadian rhythm and stress' },
    { id: 'activity', name: 'Activity Level',            icon: '🏃', unit: 'score 0–100', range: '0–100', key: 'activityScore',  why: 'Quantifies movement intensity; essential for exercise tracking and sedentary alerts' },
    { id: 'sleep',    name: 'Sleep Quality',             icon: '😴', unit: 'hours',     range: '0–480 min', key: 'sleepMinutes', why: 'Derived from HR, HRV, and movement; critical for cognitive performance' }
];

const STATUS_COLORS = {
    green:  new THREE.Color(0x22c55e),
    yellow: new THREE.Color(0xf59e0b),
    red:    new THREE.Color(0xef4444)
};

/* ============================================
   State
   ============================================ */

let currentScenario = 'baseline';
let currentSample = getCurrentSample(currentScenario);
let wellbeingIndex = computeWellbeingIndex(currentSample);
let wellbeingStatus = computeStatus(wellbeingIndex);

/* ============================================
   Three.js Scene Setup
   ============================================ */

const canvas = document.getElementById('wristband-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);

// Subtle fog for depth
scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 6);

/* ============================================
   Controls
   ============================================ */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 12;
controls.minPolarAngle = Math.PI * 0.05;
controls.maxPolarAngle = Math.PI * 0.95;
controls.target.set(0, 0, 0);

/* ============================================
   Lighting
   ============================================ */

// Soft ambient fill
const ambientLight = new THREE.AmbientLight(0x3b4a6b, 0.6);
scene.add(ambientLight);

// Key light
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(5, 8, 5);
scene.add(keyLight);

// Rim light (cool blue)
const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
rimLight.position.set(-5, 3, -5);
scene.add(rimLight);

// Status glow light (positioned near watch face, colour changes with wellbeing)
const glowLight = new THREE.PointLight(STATUS_COLORS[wellbeingStatus], 1.5, 8, 1.5);
glowLight.position.set(0, 0.15, 0.6);
scene.add(glowLight);

/* ============================================
   Materials
   ============================================ */

const bandMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.5,
    roughness: 0.35,
    envMapIntensity: 0.8
});

const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3344,
    metalness: 0.7,
    roughness: 0.2,
    envMapIntensity: 1.0
});

const bezelMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.15
});

/* ============================================
   Watch Face Canvas Texture
   ============================================ */

const SCREEN_RES = 512;
const screenCanvas = document.createElement('canvas');
screenCanvas.width = SCREEN_RES;
screenCanvas.height = SCREEN_RES;
const screenCtx = screenCanvas.getContext('2d');
const screenTexture = new THREE.CanvasTexture(screenCanvas);
screenTexture.minFilter = THREE.LinearFilter;
screenTexture.magFilter = THREE.LinearFilter;

const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    toneMapped: false
});

/** Redraw the watch-face vitals onto the offscreen canvas. */
function updateScreenTexture(time) {
    const ctx = screenCtx;
    const w = SCREEN_RES;
    const h = SCREEN_RES;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a1628');
    bg.addColorStop(1, '#0d1f30');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Scanline effect
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
    }

    // Border glow
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 + Math.sin(time * 2) * 0.1})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // Header
    ctx.font = '24px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('SIMULATED', 30, 50);

    ctx.font = 'bold 18px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('LUNAR HABITAT', 30, 78);

    // Divider
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 90);
    ctx.lineTo(w - 30, 90);
    ctx.stroke();

    // Vitals
    const s = currentSample;
    const readings = [
        { icon: '♥', label: 'HR',    value: `${Math.round(s.heartRateBpm)}`, unit: 'bpm' },
        { icon: '〰', label: 'HRV',   value: `${Math.round(s.hrvMs)}`,       unit: 'ms' },
        { icon: '⚡', label: 'EDA',   value: `${s.edaMicrosiemens.toFixed(1)}`, unit: 'µS' },
        { icon: '🌡', label: 'TEMP',  value: `${s.skinTempC.toFixed(1)}`,    unit: '°C' },
        { icon: '🏃', label: 'ACT',   value: `${Math.round(s.activityScore)}`, unit: '/100' },
        { icon: '😴', label: 'SLEEP', value: `${(s.sleepMinutes / 60).toFixed(1)}`, unit: 'hrs' }
    ];

    let y = 120;
    readings.forEach((r, i) => {
        const rowY = y + i * 58;

        // Icon + label
        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'left';
        ctx.fillText(r.icon, 30, rowY);

        ctx.font = '20px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(r.label, 65, rowY);

        // Value
        ctx.font = 'bold 28px "JetBrains Mono", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'right';
        ctx.fillText(r.value, w - 100, rowY);

        // Unit
        ctx.font = '18px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText(r.unit, w - 90, rowY);
    });

    // Heartbeat pulse indicator
    const pulseRadius = 6 + Math.sin(time * 4) * 3;
    const heartY = y;
    ctx.beginPath();
    ctx.arc(w - 40, heartY - 8, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + Math.sin(time * 4) * 0.3})`;
    ctx.fill();

    // Status bar at bottom
    const statusColor = STATUS_COLORS[wellbeingStatus];
    const hexColor = '#' + statusColor.getHexString();
    ctx.fillStyle = hexColor;
    ctx.fillRect(30, h - 50, w - 60, 3);

    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = hexColor;
    ctx.fillText(`WELLBEING: ${wellbeingIndex}%`, w / 2, h - 22);

    screenTexture.needsUpdate = true;
}

/* ============================================
   Build Wristband Geometry
   ============================================ */

const wristbandGroup = new THREE.Group();
scene.add(wristbandGroup);

// ---- Watch Body ----
const watchBody = new THREE.Mesh(
    new RoundedBoxGeometry(1.9, 0.25, 1.5, 4, 0.08),
    bodyMaterial
);
wristbandGroup.add(watchBody);

// Bezel ring
const bezelShape = new THREE.Shape();
bezelShape.moveTo(-0.92, -0.72);
bezelShape.lineTo(0.92, -0.72);
bezelShape.lineTo(0.92, 0.72);
bezelShape.lineTo(-0.92, 0.72);
bezelShape.lineTo(-0.92, -0.72);

const bezelHole = new THREE.Path();
bezelHole.moveTo(-0.85, -0.65);
bezelHole.lineTo(0.85, -0.65);
bezelHole.lineTo(0.85, 0.65);
bezelHole.lineTo(-0.85, 0.65);
bezelHole.lineTo(-0.85, -0.65);
bezelShape.holes.push(bezelHole);

const bezelGeom = new THREE.ExtrudeGeometry(bezelShape, {
    depth: 0.04,
    bevelEnabled: false
});
const bezel = new THREE.Mesh(bezelGeom, bezelMaterial);
bezel.position.y = 0.12;
bezel.rotation.x = -Math.PI / 2;
wristbandGroup.add(bezel);

// ---- Watch Screen ----
const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.68, 1.28),
    screenMaterial
);
screen.position.y = 0.135;
screen.rotation.x = -Math.PI / 2;
wristbandGroup.add(screen);

// ---- Band Straps ----
function createBandStrap(xOffset, xScale) {
    const bandGroup = new THREE.Group();

    // Main strap section
    const strapLength = 2.2;
    const strapWidth = 1.2;
    const strapThickness = 0.1;

    const strapGeom = new RoundedBoxGeometry(strapLength, strapThickness, strapWidth, 2, 0.03);
    const strap = new THREE.Mesh(strapGeom, bandMaterial);
    strap.position.x = xOffset * (strapLength / 2 + 0.85);
    bandGroup.add(strap);

    // Accent lines on strap
    const lineGeom = new THREE.BoxGeometry(strapLength - 0.2, 0.005, 0.01);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2 });
    [-0.35, 0.35].forEach(z => {
        const line = new THREE.Mesh(lineGeom, lineMat);
        line.position.set(strap.position.x, 0.055, z);
        bandGroup.add(line);
    });

    // Clasp at the end
    const claspGeom = new RoundedBoxGeometry(0.2, 0.14, strapWidth * 0.6, 2, 0.03);
    const clasp = new THREE.Mesh(claspGeom, new THREE.MeshStandardMaterial({
        color: 0x2a3040,
        metalness: 0.8,
        roughness: 0.15
    }));
    clasp.position.x = xOffset * (strapLength + 0.85);
    bandGroup.add(clasp);

    return bandGroup;
}

const leftStrap = createBandStrap(-1, 1);
wristbandGroup.add(leftStrap);

const rightStrap = createBandStrap(1, 1);
wristbandGroup.add(rightStrap);

// ---- Side button ----
const buttonGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 16);
const buttonMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.3
});
const sideButton = new THREE.Mesh(buttonGeom, buttonMat);
sideButton.rotation.z = Math.PI / 2;
sideButton.position.set(1.0, 0.0, 0.0);
wristbandGroup.add(sideButton);

/* ============================================
   Sensor Hotspots
   ============================================ */

const hotspots = [];
const hotspotMeshes = [];

/** Hotspot 3D positions on the wristband */
const HOTSPOT_POSITIONS = [
    { id: 'hr',       pos: new THREE.Vector3(0.0,   0.16,  0.35) },
    { id: 'hrv',      pos: new THREE.Vector3(-0.3,  0.16,  0.35) },
    { id: 'eda',      pos: new THREE.Vector3(-1.6,  0.06,  0.0) },
    { id: 'temp',     pos: new THREE.Vector3(1.6,   0.06,  0.0) },
    { id: 'activity', pos: new THREE.Vector3(0.0,   0.16, -0.35) },
    { id: 'sleep',    pos: new THREE.Vector3(0.35,  0.16, -0.35) }
];

HOTSPOT_POSITIONS.forEach(h => {
    // Outer glow ring
    const ringGeom = new THREE.RingGeometry(0.08, 0.12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.copy(h.pos);
    ring.rotation.x = -Math.PI / 2;
    wristbandGroup.add(ring);

    // Inner dot
    const dotGeom = new THREE.SphereGeometry(0.05, 16, 16);
    const dotMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9
    });
    const dot = new THREE.Mesh(dotGeom, dotMat);
    dot.position.copy(h.pos);
    dot.userData = { sensorId: h.id };
    wristbandGroup.add(dot);

    hotspots.push({ ring, dot, id: h.id });
    hotspotMeshes.push(dot);
});

// Status glow ring around the watch body
const glowRingGeom = new THREE.RingGeometry(1.05, 1.12, 64);
const glowRingMat = new THREE.MeshBasicMaterial({
    color: STATUS_COLORS[wellbeingStatus],
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
});
const glowRing = new THREE.Mesh(glowRingGeom, glowRingMat);
glowRing.rotation.x = -Math.PI / 2;
glowRing.position.y = 0.14;
wristbandGroup.add(glowRing);

// Tilt the wristband slightly for a better initial view
wristbandGroup.rotation.x = -0.3;

/* ============================================
   Starfield Background
   ============================================ */

function createStarfield() {
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 0x94a3b8,
        size: 0.06,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
    });
    return new THREE.Points(geom, mat);
}

scene.add(createStarfield());

/* ============================================
   Raycaster Interaction
   ============================================ */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredHotspot = null;

canvas.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hotspotMeshes);

    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (hoveredHotspot !== mesh) {
            hoveredHotspot = mesh;
            canvas.style.cursor = 'pointer';
        }
    } else {
        if (hoveredHotspot) {
            hoveredHotspot = null;
            canvas.style.cursor = 'grab';
        }
    }
});

canvas.addEventListener('pointerdown', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hotspotMeshes);

    if (intersects.length > 0) {
        const sensorId = intersects[0].object.userData.sensorId;
        showSensorPanel(sensorId);
    }
});

canvas.style.cursor = 'grab';

/* ============================================
   HUD: Sensor Info Panel
   ============================================ */

const sensorPanel = document.getElementById('sensor-panel');
const sensorPanelTitle = document.getElementById('sensor-panel-title');
const sensorPanelBody = document.getElementById('sensor-panel-body');
const sensorPanelClose = document.getElementById('sensor-panel-close');

function showSensorPanel(sensorId) {
    const sensor = SENSOR_INFO.find(s => s.id === sensorId);
    if (!sensor) return;

    const value = currentSample[sensor.key];
    let displayValue;
    switch (sensor.id) {
        case 'hr':       displayValue = `${Math.round(value)} bpm`; break;
        case 'hrv':      displayValue = `${Math.round(value)} ms`; break;
        case 'eda':      displayValue = `${value.toFixed(1)} µS`; break;
        case 'temp':     displayValue = `${value.toFixed(1)} °C`; break;
        case 'activity': displayValue = `${Math.round(value)} / 100`; break;
        case 'sleep':    displayValue = `${(value / 60).toFixed(1)} hours`; break;
        default:         displayValue = `${value}`;
    }

    sensorPanelTitle.textContent = `${sensor.icon} ${sensor.name}`;
    sensorPanelBody.innerHTML = `
        <div class="sensor-detail-row">
            <span class="sensor-detail-label">Current</span>
            <span class="sensor-detail-value">${displayValue}</span>
        </div>
        <div class="sensor-detail-row">
            <span class="sensor-detail-label">Unit</span>
            <span class="sensor-detail-value">${sensor.unit}</span>
        </div>
        <div class="sensor-detail-row">
            <span class="sensor-detail-label">Range</span>
            <span class="sensor-detail-value">${sensor.range}</span>
        </div>
        <p class="sensor-description">${sensor.why}</p>
    `;

    sensorPanel.classList.add('visible');

    // Highlight the clicked hotspot
    hotspots.forEach(h => {
        const isActive = h.id === sensorId;
        h.dot.material.emissiveIntensity = isActive ? 1.2 : 0.6;
        h.ring.material.opacity = isActive ? 0.9 : 0.5;
    });
}

function hideSensorPanel() {
    sensorPanel.classList.remove('visible');
    hotspots.forEach(h => {
        h.dot.material.emissiveIntensity = 0.6;
        h.ring.material.opacity = 0.5;
    });
}

sensorPanelClose.addEventListener('click', hideSensorPanel);

// Close panel when clicking empty space on canvas
canvas.addEventListener('pointerdown', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hotspotMeshes);

    if (intersects.length === 0 && sensorPanel.classList.contains('visible')) {
        hideSensorPanel();
    }
});

/* ============================================
   HUD: Wellbeing Badge
   ============================================ */

const wellbeingBadge = document.getElementById('wellbeing-badge');

function updateWellbeingBadge() {
    const colorMap = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
    const color = colorMap[wellbeingStatus] || '#38bdf8';
    const statusLabel = wellbeingStatus === 'green' ? 'Nominal' :
                        wellbeingStatus === 'yellow' ? 'Caution' : 'Alert';

    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const progress = (wellbeingIndex / 100) * circumference;
    const offset = circumference - progress;

    wellbeingBadge.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 64 64" class="wb-ring">
            <circle cx="32" cy="32" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
            <circle cx="32" cy="32" r="${radius}" fill="none" stroke="${color}" stroke-width="5"
                stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                transform="rotate(-90 32 32)"/>
            <text x="32" y="32" text-anchor="middle" dominant-baseline="central"
                font-size="16" font-weight="600" fill="${color}" font-family="var(--font-mono)">${wellbeingIndex}</text>
        </svg>
        <div class="wb-info">
            <span class="wb-info-label">Wellbeing</span>
            <span class="wb-info-status ${wellbeingStatus}">${statusLabel}</span>
        </div>
    `;
}

updateWellbeingBadge();

/* ============================================
   Scenario Selector
   ============================================ */

const scenarioSelect = document.getElementById('scenario-select-3d');

scenarioSelect.addEventListener('change', () => {
    currentScenario = scenarioSelect.value;
    currentSample = getCurrentSample(currentScenario);
    wellbeingIndex = computeWellbeingIndex(currentSample);
    wellbeingStatus = computeStatus(wellbeingIndex);

    // Update glow color
    const statusColor = STATUS_COLORS[wellbeingStatus];
    glowLight.color.copy(statusColor);
    glowRingMat.color.copy(statusColor);

    // Update HUD
    updateWellbeingBadge();

    // Update sensor panel if visible
    if (sensorPanel.classList.contains('visible')) {
        const activeId = hotspots.find(h => h.dot.material.emissiveIntensity > 0.8)?.id;
        if (activeId) showSensorPanel(activeId);
    }
});

/* ============================================
   Animation Loop
   ============================================ */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Update orbit controls
    controls.update();

    // Pulse hotspots
    hotspots.forEach((h, i) => {
        const phase = elapsed * 2 + i * 1.2;
        const pulse = 0.3 + Math.sin(phase) * 0.2;
        h.ring.material.opacity = Math.max(h.ring.material.opacity, pulse);

        // Scale pulse
        const scale = 1.0 + Math.sin(phase) * 0.15;
        h.ring.scale.setScalar(scale);
    });

    // Glow ring pulse
    glowRingMat.opacity = 0.25 + Math.sin(elapsed * 1.5) * 0.1;

    // Update screen texture
    updateScreenTexture(elapsed);

    // Renderer
    renderer.render(scene, camera);
}

animate();

/* ============================================
   Responsive Resize
   ============================================ */

window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});
