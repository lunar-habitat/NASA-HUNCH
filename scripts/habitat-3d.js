/**
 * @fileoverview 3D Lunar Habitat Simulation — Main entry point.
 * Sets up a Three.js scene with modular dome habitat, lunar terrain,
 * starfield, circadian lighting, crew members, and interactive HUD.
 */
import * as THREE from 'three';
import { OrbitControls }      from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer }     from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }         from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }    from 'three/addons/postprocessing/UnrealBloomPass.js';

import { SCENARIOS, getCurrentSample, generateSeries, computeWellbeingIndex, computeStatus } from './data.js';
import { buildHabitat, MODULE_TYPES, DEFAULT_LAYOUT, rebuildHabitat } from './habitat-geometry.js';
import { furnishModule } from './habitat-interiors.js';
import { icon } from './icons.js';

/* ============================================
   Constants
   ============================================ */

const STATUS_COLORS = {
    green:  new THREE.Color(0x22c55e),
    yellow: new THREE.Color(0xf59e0b),
    red:    new THREE.Color(0xef4444)
};

/* Metric metadata for sensor panel display */
const METRIC_META = {
    heartRateBpm:       { label: 'Heart Rate',          unit: 'bpm',  min: 40,  max: 180, icon: icon('heart'),       color: '#ef4444' },
    hrvMs:              { label: 'HRV',                 unit: 'ms',   min: 10,  max: 150, icon: icon('chartBar'),    color: '#f472b6' },
    edaMicrosiemens:    { label: 'Electrodermal',       unit: 'µS',   min: 0.1, max: 10,  icon: icon('zap'),         color: '#facc15' },
    skinTempC:          { label: 'Skin Temperature',    unit: '°C',   min: 30,  max: 38,  icon: icon('thermometer'), color: '#fb923c' },
    activityScore:      { label: 'Activity',            unit: '',     min: 0,   max: 100, icon: icon('activity'),    color: '#34d399' },
    sleepMinutes:       { label: 'Sleep Duration',      unit: 'min',  min: 0,   max: 600, icon: icon('moonSleep'),   color: '#818cf8' },
    restlessnessScore:  { label: 'Restlessness',        unit: '',     min: 0,   max: 100, icon: icon('restless'),    color: '#f97316' },
    voiceStressIndex:   { label: 'Voice Stress',        unit: '',     min: 0,   max: 100, icon: icon('mic'),         color: '#f472b6' },
    pupilDilationMm:    { label: 'Pupil Dilation',      unit: 'mm',   min: 2,   max: 8,   icon: icon('eye'),         color: '#c084fc' },
    socialScore:        { label: 'Social Interaction',   unit: '',     min: 0,   max: 100, icon: icon('users'),       color: '#22d3ee' },
    routineDeviation:   { label: 'Routine Deviation',   unit: '',     min: 0,   max: 100, icon: icon('clipboard'),   color: '#fbbf24' },
    cognitiveLoad:      { label: 'Cognitive Load',      unit: '',     min: 0,   max: 100, icon: icon('brain'),       color: '#a78bfa' },
    sleepQuality:       { label: 'Sleep Quality',       unit: '',     min: 0,   max: 100, icon: icon('sleepQuality'),color: '#818cf8' },
    circadianAlignment: { label: 'Circadian Alignment', unit: '',     min: 0,   max: 100, icon: icon('circadian'),   color: '#fbbf24' },
    lightSpectrumScore: { label: 'Light Spectrum',      unit: '',     min: 0,   max: 100, icon: icon('spectrum'),    color: '#fde68a' },
    greeneryExposureMin:{ label: 'Greenery Exposure',   unit: 'min',  min: 0,   max: 120, icon: icon('leaf'),        color: '#4ade80' },
    natureSoundscapeScore:{ label: 'Nature Soundscape', unit: '',     min: 0,   max: 100, icon: icon('speaker'),     color: '#67e8f9' },
    windowSimStatus:    { label: 'Window Simulation',   unit: '',     min: 0,   max: 100, icon: icon('windowSim'),   color: '#93c5fd' }
};

/* Sensor-to-module mapping: which sensors are in which module types */
const MODULE_SENSORS = {
    hub:         ['heartRateBpm', 'hrvMs', 'voiceStressIndex', 'cognitiveLoad'],
    communal:    ['socialScore', 'natureSoundscapeScore'],
    living:      ['sleepMinutes', 'restlessnessScore', 'circadianAlignment'],
    research:    ['cognitiveLoad', 'pupilDilationMm'],
    cultivating: ['greeneryExposureMin', 'lightSpectrumScore'],
    mechanical:  ['skinTempC', 'edaMicrosiemens'],
    containment: ['activityScore', 'windowSimStatus']
};

const CIRCADIAN_PRESETS = {
    0:  { sun: 0.05, ambient: 0.15, temp: 0x1a1a3a },   // midnight
    6:  { sun: 0.3,  ambient: 0.3,  temp: 0xffa54f },   // dawn
    12: { sun: 1.0,  ambient: 0.6,  temp: 0xffffff },   // noon
    18: { sun: 0.35, ambient: 0.3,  temp: 0xff7b54 },   // dusk
    24: { sun: 0.05, ambient: 0.15, temp: 0x1a1a3a }    // midnight wrap
};

/* ============================================
   State
   ============================================ */

const state = {
    scenario: 'baseline',
    sample: null,
    wellbeingIndex: 0,
    wellbeingStatus: 'green',
    missionTime: 12,        // 0–24 hours
    viewMode: 'overview',   // overview | firstperson | rearrange
    cutaway: false,
    crewVisible: true,
    privacyMode: false,
    soundEnabled: false,
    panelPreset: 'mixed',   // mixed | opaque | windows
    playing: false,
    playInterval: null,
    layout: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)),
    // Three.js refs
    habitatGroup: null,
    crewGroup: null,
    terrainMesh: null,
    starField: null,
    labels: [],
    // Rearrange mode
    dragModule: null,
    dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    // Raycaster
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    // Hover state
    hoveredObject: null,
    // Camera fly-to animation
    cameraFly: null,  // { from, to, target, progress, duration }
    // Minimap throttle
    minimapTimer: 0,
    // Data refresh throttle
    dataTimer: 0,
    // Time series history
    series: [],
    // Active system highlight
    highlightedSensor: null,
    // Remove module mode
    removeMode: false,
    // Cached references for per-frame animation (avoids scene traversal)
    _cached: { hotspots: [], holoRings: [], growLights: [], screens: [], particles: [], circadianFixtures: [], toggleAnims: [] }
};

/* ============================================
   Three.js Core Setup
   ============================================ */

// Guard: WebGL must be available before any Three.js setup runs.
// If hardware acceleration is disabled this fails at module top-level —
// the error handler in habitat-3d.html will surface a readable message.
{
    const _t = document.createElement('canvas');
    if (!(_t.getContext('webgl2') || _t.getContext('webgl'))) {
        const s = document.getElementById('loading-status');
        const b = document.getElementById('loading-bar-fill');
        if (s) s.textContent = 'WebGL unavailable — this page requires hardware acceleration. ' +
            'In Chrome go to Settings → System → enable "Use hardware acceleration when available" and restart Chrome.';
        if (b) { b.style.width = '100%'; b.style.background = '#ef4444'; }
        throw new Error('WebGL not available — hardware acceleration appears to be disabled');
    }
}

const canvas   = document.getElementById('habitat-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFShadowMap;
renderer.outputColorSpace   = THREE.SRGBColorSpace;

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);
scene.fog        = new THREE.FogExp2(0x0a0e17, 0.008);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(30, 25, 30);

/* CSS2D label renderer */
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

/* ============================================
   Controls — Overview (Orbit) & First-Person (PointerLock)
   ============================================ */

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping  = true;
orbitControls.dampingFactor  = 0.08;
orbitControls.minDistance     = 8;
orbitControls.maxDistance     = 120;
orbitControls.minPolarAngle  = Math.PI * 0.05;
orbitControls.maxPolarAngle  = Math.PI * 0.48;
orbitControls.target.set(0, 2, 0);

const fpControls = new PointerLockControls(camera, renderer.domElement);
fpControls.pointerSpeed = 0.5;
const fpVelocity = new THREE.Vector3();
const fpKeys = { forward: false, backward: false, left: false, right: false };

/* ============================================
   Lighting
   ============================================ */

// Ambient — soft fill
const ambientLight = new THREE.AmbientLight(0x3b4a6b, 0.5);
scene.add(ambientLight);

// Sun — directional
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(40, 60, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width  = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far  = 150;
sunLight.shadow.camera.left   = -50;
sunLight.shadow.camera.right  = 50;
sunLight.shadow.camera.top    = 50;
sunLight.shadow.camera.bottom = -50;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

// Hemisphere — sky/ground
const hemiLight = new THREE.HemisphereLight(0x606080, 0x1a1a2e, 0.3);
scene.add(hemiLight);

// Earth-glow (subtle blue-green from Earth reflection)
const earthGlow = new THREE.PointLight(0x4488cc, 0.3, 80);
earthGlow.position.set(-20, 40, -20);
scene.add(earthGlow);

/* ============================================
   Audio System
   ============================================ */

const audioListener = new THREE.AudioListener();
camera.add(audioListener);

/** Ambient habitat hum — synthesised low-frequency drone */
let ambientHum = null;
/** Positional nature sounds attached to window panels */
const windowAudioSources = [];
/** Short alert oscillator for status transitions */
let alertOsc = null;
let alertGain = null;
/** Previous status for detecting transitions */
let prevStatus = 'green';
/** Shared audio buffer for nature loop (loaded once) */
let natureBuffer = null;

/**
 * Initialise the audio system. Must be called after user gesture
 * (triggered by the first sound-toggle click or play click).
 */
function initAudioSystem() {
    if (ambientHum) return; // already initialised

    const ctx = audioListener.context;

    // --- Ambient hum (low drone) ---
    ambientHum = new THREE.Audio(audioListener);
    const humOsc = ctx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.value = 55; // A1 — deep hum
    const humGain = ctx.createGain();
    humGain.gain.value = 0;
    // Add a second detuned oscillator for richness
    const humOsc2 = ctx.createOscillator();
    humOsc2.type = 'sine';
    humOsc2.frequency.value = 82.5; // +fifth
    const humGain2 = ctx.createGain();
    humGain2.gain.value = 0;
    humOsc.connect(humGain);
    humOsc2.connect(humGain2);
    humGain.connect(ambientHum.gain);
    humGain2.connect(ambientHum.gain);
    ambientHum.gain.connect(ctx.destination);
    humOsc.start();
    humOsc2.start();
    ambientHum._humGain  = humGain;
    ambientHum._humGain2 = humGain2;
    ambientHum._targetVol = 0.07;

    // --- Alert tone nodes (reusable) ---
    alertGain = ctx.createGain();
    alertGain.gain.value = 0;
    alertGain.connect(ctx.destination);

    // --- Load nature loop for window panels ---
    const loader = new THREE.AudioLoader();
    loader.load('../assets/audio/the_mountain-space-438391.mp3', buffer => {
        natureBuffer = buffer;
        attachWindowAudio();
    }, undefined, () => {
        console.warn('[Audio] Nature loop not loaded — skipping positional audio');
    });
}

/** Attach PositionalAudio to every window panel currently in the scene. */
function attachWindowAudio() {
    if (!natureBuffer || !state.habitatGroup) return;

    // Clean up existing
    windowAudioSources.forEach(src => {
        if (src.isPlaying) src.stop();
        if (src.parent) src.parent.remove(src);
    });
    windowAudioSources.length = 0;

    state.habitatGroup.traverse(child => {
        if (child.userData.isOuterPanel && child.userData.panelType === 'window') {
            const positional = new THREE.PositionalAudio(audioListener);
            positional.setBuffer(natureBuffer);
            positional.setLoop(true);
            positional.setRefDistance(3);
            positional.setMaxDistance(18);
            positional.setVolume(0);
            child.add(positional);
            if (state.soundEnabled) {
                positional.play();
                positional.setVolume(0.35);
            }
            windowAudioSources.push(positional);
        }
    });
}

/** Play a short synthesised alert tone for status transitions. */
function playAlertTone(status) {
    if (!ambientHum) return; // audio not initialised
    const ctx = audioListener.context;

    // Create a short oscillator burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (status === 'red') {
        osc.type = 'sawtooth';
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    } else if (status === 'yellow') {
        osc.type = 'triangle';
        osc.frequency.value = 330;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
    } else {
        // green — gentle chime
        osc.type = 'sine';
        osc.frequency.value = 523.25; // C5
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
    }
}

/**
 * Per-frame audio update: modulate volumes by circadian time & sound toggle.
 */
function updateAudio() {
    if (!ambientHum) return;

    const masterOn = state.soundEnabled;
    const hour = state.missionTime;

    // Circadian volume curve: quieter at night (0-5h, 20-24h), louder during day
    let circadianMul;
    if (hour < 5)       circadianMul = 0.3;
    else if (hour < 7)  circadianMul = 0.3 + 0.7 * ((hour - 5) / 2);
    else if (hour < 18) circadianMul = 1.0;
    else if (hour < 20) circadianMul = 1.0 - 0.7 * ((hour - 18) / 2);
    else                circadianMul = 0.3;

    // Ambient hum
    const humTarget = masterOn ? ambientHum._targetVol * circadianMul : 0;
    const g1 = ambientHum._humGain.gain;
    const g2 = ambientHum._humGain2.gain;
    // Smooth ramp
    g1.value += (humTarget - g1.value) * 0.05;
    g2.value += (humTarget * 0.5 - g2.value) * 0.05;

    // Window panel positional audio
    const winVol = masterOn ? 0.35 * circadianMul : 0;
    for (const src of windowAudioSources) {
        if (masterOn && !src.isPlaying && natureBuffer) {
            src.play();
        } else if (!masterOn && src.isPlaying) {
            src.stop();
        }
        if (src.isPlaying) {
            src.setVolume(src.getVolume() + (winVol - src.getVolume()) * 0.05);
        }
    }

    // Status alert: detect transitions
    if (state.wellbeingStatus !== prevStatus) {
        if (masterOn) playAlertTone(state.wellbeingStatus);
        prevStatus = state.wellbeingStatus;
    }
}

/* ============================================
   Post-Processing (Bloom)
   ============================================ */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,   // strength — soft glow
    0.6,    // radius
    0.78    // threshold — only bright emissives bloom
);
composer.addPass(bloomPass);

/* ============================================
   Status-Reactive Environment
   ============================================ */

let statusWarningMeshes = [];
let prevEnvironmentStatus = 'green';

/**
 * React to wellbeing status changes — tint ambient light, pulse base rims.
 */
function updateStatusEnvironment() {
    const status = state.wellbeingStatus;
    if (status === prevEnvironmentStatus) return;
    prevEnvironmentStatus = status;

    // Ambient light tint
    switch (status) {
        case 'green':
            ambientLight.color.set(0x3b4a6b);
            ambientLight.intensity = 0.5;
            bloomPass.strength = 0.35;
            break;
        case 'yellow':
            ambientLight.color.set(0x4a4a5b);
            ambientLight.intensity = 0.55;
            bloomPass.strength = 0.4;
            break;
        case 'red':
            ambientLight.color.set(0x5b3b3b);
            ambientLight.intensity = 0.6;
            bloomPass.strength = 0.5;
            break;
    }

    // Clean up old warning meshes
    statusWarningMeshes.forEach(m => {
        if (m.parent) m.parent.remove(m);
        m.geometry.dispose();
        m.material.dispose();
    });
    statusWarningMeshes = [];

    if (!state.habitatGroup) return;

    // Add warning indicators on corridor walls (yellow = amber, red = red)
    if (status === 'yellow' || status === 'red') {
        const warnColor = status === 'red' ? 0xef4444 : 0xf59e0b;
        const warnIntensity = status === 'red' ? 0.8 : 0.5;
        const dotGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const dotMat = new THREE.MeshStandardMaterial({
            color: warnColor,
            emissive: warnColor,
            emissiveIntensity: warnIntensity
        });

        // Place dots along corridors
        state.habitatGroup.traverse(child => {
            if (child.userData.isCorridor) {
                const pos = child.position;
                for (let side = -1; side <= 1; side += 2) {
                    const dot = new THREE.Mesh(dotGeo, dotMat);
                    dot.position.set(pos.x, 1.2, pos.z + side * 1.5);
                    state.habitatGroup.add(dot);
                    statusWarningMeshes.push(dot);
                }
            }
        });

        dotGeo.dispose(); // shared geo cloned by mesh internals — actually reused, keep ref
    }
}

/**
 * Per-frame pulse for status warning dots when status is red.
 */
function pulseStatusWarnings(elapsed) {
    if (state.wellbeingStatus !== 'red' || statusWarningMeshes.length === 0) return;
    const intensity = 0.5 + Math.sin(elapsed * 4) * 0.3;
    for (const dot of statusWarningMeshes) {
        dot.material.emissiveIntensity = intensity;
    }
}

/* ============================================
   Lunar Terrain
   ============================================ */

function createTerrain() {
    const size = 200;
    const segments = 64;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    // Displace vertices with layered noise for craters + rolling hills
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        let h = 0;
        // Large gentle hills
        h += Math.sin(x * 0.03) * Math.cos(z * 0.03) * 2.5;
        // Medium ridges
        h += Math.sin(x * 0.08 + 1.3) * Math.cos(z * 0.06 + 0.7) * 1.2;
        // Small bumps
        h += Math.sin(x * 0.25 + 3.1) * Math.cos(z * 0.2 + 2.4) * 0.4;
        // Crater-like depressions
        const cx = x - 5, cz = z + 3;
        const craterDist = Math.sqrt(cx * cx + cz * cz);
        if (craterDist < 18) {
            h -= Math.max(0, (18 - craterDist) * 0.12) * Math.cos(craterDist * 0.25);
        }
        // Flatten center area for habitat
        const centerDist = Math.sqrt(x * x + z * z);
        const flatRadius = 20;
        if (centerDist < flatRadius) {
            const blendFactor = centerDist / flatRadius;
            h *= blendFactor * blendFactor;
        }
        pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x8a8a8a,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: true
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.position.y = -0.5;
    return mesh;
}

/* ============================================
   Starfield
   ============================================ */

function createStarfield() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        // Distribute on a large sphere
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 180 + Math.random() * 60;
        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        sizes[i] = 0.3 + Math.random() * 1.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
    });

    return new THREE.Points(geo, mat);
}

/* ============================================
   Earth (distant sphere in sky)
   ============================================ */

function createEarth() {
    const geo = new THREE.SphereGeometry(6, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x4488cc,
        emissive: 0x224466,
        emissiveIntensity: 0.4,
        roughness: 0.6,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-60, 70, -80);
    return mesh;
}

/* ============================================
   Circadian Lighting
   ============================================ */

function updateCircadianLighting(hour) {
    // Interpolate between preset keyframes
    const keys = Object.keys(CIRCADIAN_PRESETS).map(Number).sort((a, b) => a - b);
    let lo = keys[0], hi = keys[1];
    for (let i = 0; i < keys.length - 1; i++) {
        if (hour >= keys[i] && hour <= keys[i + 1]) {
            lo = keys[i];
            hi = keys[i + 1];
            break;
        }
    }

    const t = hi === lo ? 0 : (hour - lo) / (hi - lo);
    const a = CIRCADIAN_PRESETS[lo];
    const b = CIRCADIAN_PRESETS[hi];

    sunLight.intensity     = THREE.MathUtils.lerp(a.sun, b.sun, t);
    ambientLight.intensity = THREE.MathUtils.lerp(a.ambient, b.ambient, t);

    const colorA = new THREE.Color(a.temp);
    const colorB = new THREE.Color(b.temp);
    sunLight.color.copy(colorA).lerp(colorB, t);

    // Update scene fog to match ambient
    const fogDarkness = THREE.MathUtils.lerp(0.012, 0.005, sunLight.intensity);
    scene.fog.density = fogDarkness;
}

/* ============================================
   Crew Members
   ============================================ */

function createCrewMember(position, color) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Body (capsule)
    const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.8, 8, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.5, metalness: 0.1 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.3;
    head.castShadow = true;
    group.add(head);

    // Visor
    const visorGeo = new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI);
    const visorMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        roughness: 0.05,
        metalness: 0.8,
        transmission: 0.4,
        thickness: 0.1
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.32, 0.1);
    visor.rotation.x = -Math.PI / 6;
    group.add(visor);

    // Label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label-2d';
    labelDiv.textContent = 'Crew';
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 1.7, 0);
    group.add(label);

    group.userData.isCrewMember = true;
    return group;
}

function createCrewGroup() {
    const group = new THREE.Group();
    const crewDefs = [
        { name: 'Cmdr. Vasquez',  color: 0x38bdf8, module: 'hub' },
        { name: 'Dr. Chen',       color: 0x22c55e, module: 'research' },
        { name: 'Eng. Okafor',    color: 0xf59e0b, module: 'mechanical' },
        { name: 'Med. Larsen',    color: 0xa78bfa, module: 'living' }
    ];

    // Find module positions from layout
    crewDefs.forEach((def, i) => {
        const layoutEntry = state.layout.find(m => m.type === def.module);
        const pos = layoutEntry
            ? new THREE.Vector3(layoutEntry.x + (i % 2) * 1.5 - 0.75, 0, layoutEntry.z + Math.floor(i / 2) * 1.5 - 0.75)
            : new THREE.Vector3(i * 3 - 4, 0, 0);

        const member = createCrewMember(pos, def.color);
        member.userData.crewId = i;
        member.userData.crewName = def.name;
        labelDiv(member, def.name);
        group.add(member);
    });
    return group;
}

function labelDiv(member, text) {
    // Update the label text on the crew member
    member.traverse(child => {
        if (child instanceof CSS2DObject) {
            child.element.textContent = text;
        }
    });
}

/* ============================================
   Wellbeing Badge
   ============================================ */

function updateWellbeingBadge() {
    const badge = document.getElementById('wellbeing-badge');
    if (!badge) return;

    const idx = state.privacyMode ? 0 : state.wellbeingIndex;
    const statusLabel = state.privacyMode ? 'PRIVATE' : state.wellbeingStatus.toUpperCase();
    const colorMap = { green: '#4ade80', yellow: '#facc15', red: '#f87171' };
    const arcColor = state.privacyMode ? '#64748b' : (colorMap[state.wellbeingStatus] || '#64748b');

    // SVG arc — 0-100 mapped to 0-270 degrees
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const arcLength = (270 / 360) * circumference;  // total arc length for 270°
    const filled = (idx / 100) * arcLength;
    const gap = arcLength - filled;

    badge.innerHTML = `
        <svg class="wb-gauge" width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="${radius}" fill="none" stroke="rgba(148,163,184,0.15)" stroke-width="4"
                stroke-dasharray="${arcLength} ${circumference - arcLength}"
                stroke-dashoffset="0" stroke-linecap="round"
                transform="rotate(135 30 30)" />
            <circle cx="30" cy="30" r="${radius}" fill="none" stroke="${arcColor}" stroke-width="4"
                stroke-dasharray="${filled} ${circumference - filled}"
                stroke-dashoffset="0" stroke-linecap="round"
                transform="rotate(135 30 30)"
                style="transition: stroke-dasharray 0.5s ease, stroke 0.5s ease" />
            <text x="30" y="33" text-anchor="middle" fill="${arcColor}" font-size="14" font-weight="700"
                font-family="var(--font-mono, 'JetBrains Mono', monospace)">${state.privacyMode ? '—' : idx}</text>
        </svg>
        <div class="wb-info">
            <span class="wb-label">Wellbeing</span>
            <span class="wb-status ${state.wellbeingStatus}">${statusLabel}</span>
        </div>
    `;
}

/* ============================================
   HUD & Controls Binding
   ============================================ */

function initHUD() {
    // Scenario select (with sessionStorage persistence)
    const scenarioSelect = document.getElementById('scenario-select-habitat');
    if (scenarioSelect) {
        const saved = sessionStorage.getItem('lunarHabitatScenario');
        if (saved && scenarioSelect.querySelector(`option[value="${CSS.escape(saved)}"]`)) {
            state.scenario = saved;
        }
        scenarioSelect.value = state.scenario;
        scenarioSelect.addEventListener('change', () => {
            state.scenario = scenarioSelect.value;
            sessionStorage.setItem('lunarHabitatScenario', state.scenario);
            refreshData();
        });
    }

    // Play / Pause
    const playBtn = document.getElementById('btn-play-pause');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            state.playing = !state.playing;
            playBtn.innerHTML = state.playing
                ? icon('pause', 'sm') + ' Pause'
                : icon('play', 'sm') + ' Play';
            if (state.playing) {
                // Init audio on user gesture if sound is enabled
                if (state.soundEnabled) {
                    if (audioListener.context.state === 'suspended') audioListener.context.resume();
                    initAudioSystem();
                }
                state.playInterval = setInterval(() => {
                    state.missionTime = (state.missionTime + 0.5) % 24;
                    document.getElementById('mission-time').value = state.missionTime;
                    updateTimeDisplay();
                    updateCircadianLighting(state.missionTime);
                    updateCircadianFixtures(state.missionTime);
                    refreshData();
                }, 2000);
            } else {
                clearInterval(state.playInterval);
            }
        });
    }

    // Regenerate
    const regenBtn = document.getElementById('btn-regenerate');
    if (regenBtn) {
        regenBtn.addEventListener('click', refreshData);
    }

    // Privacy toggle
    const privacyBtn = document.getElementById('btn-privacy');
    if (privacyBtn) {
        privacyBtn.addEventListener('click', () => {
            state.privacyMode = !state.privacyMode;
            privacyBtn.setAttribute('aria-pressed', state.privacyMode);
            privacyBtn.innerHTML = state.privacyMode ? icon('lock', 'sm') + ' Privacy' : icon('unlock', 'sm') + ' Privacy';
            updateWellbeingBadge();
        });
    }

    // Cutaway toggle
    const cutawayBtn = document.getElementById('btn-cutaway');
    if (cutawayBtn) {
        cutawayBtn.addEventListener('click', () => {
            state.cutaway = !state.cutaway;
            cutawayBtn.setAttribute('aria-pressed', state.cutaway);
            applyCutaway();
        });
    }

    // Crew toggle
    const crewBtn = document.getElementById('btn-crew-toggle');
    if (crewBtn) {
        crewBtn.addEventListener('click', () => {
            state.crewVisible = !state.crewVisible;
            crewBtn.setAttribute('aria-pressed', state.crewVisible);
            if (state.crewGroup) state.crewGroup.visible = state.crewVisible;
        });
    }

    // Sound toggle — initialise audio system on first enable (needs user gesture)
    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            state.soundEnabled = !state.soundEnabled;
            soundBtn.setAttribute('aria-pressed', state.soundEnabled);
            soundBtn.innerHTML = state.soundEnabled ? icon('volumeOn', 'sm') + ' Sound' : icon('volumeOff', 'sm') + ' Sound';
            if (state.soundEnabled) {
                // Resume AudioContext if suspended (autoplay policy)
                if (audioListener.context.state === 'suspended') {
                    audioListener.context.resume();
                }
                initAudioSystem();
            }
        });
    }

    // Guided tour
    const tourBtn = document.getElementById('btn-tour');
    if (tourBtn) {
        tourBtn.addEventListener('click', () => {
            if (tourActive) { stopTour(); } else { startGuidedTour(); }
        });
    }
    const tourSkip = document.getElementById('tour-skip');
    if (tourSkip) {
        tourSkip.addEventListener('click', stopTour);
    }

    // View modes
    document.querySelectorAll('.hud-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.hud-mode-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-checked', 'true');
            switchViewMode(btn.dataset.mode);
        });
    });

    // Panel presets
    document.querySelectorAll('.hud-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.hud-preset-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-checked', 'true');
            state.panelPreset = btn.dataset.preset;
            applyPanelPreset(state.panelPreset);
        });
    });

    // Mission time slider
    const timeSlider = document.getElementById('mission-time');
    if (timeSlider) {
        timeSlider.addEventListener('input', () => {
            state.missionTime = parseFloat(timeSlider.value);
            updateTimeDisplay();
            updateCircadianLighting(state.missionTime);
            updateCircadianFixtures(state.missionTime);
        });
    }

    // Close side panels
    document.getElementById('sensor-panel-close')?.addEventListener('click', () => {
        document.getElementById('sensor-panel')?.classList.remove('open');
        clearHighlight();
    });
    document.getElementById('module-panel-close')?.addEventListener('click', () => {
        document.getElementById('module-panel')?.classList.remove('open');
    });

    // Rearrange done
    document.getElementById('btn-rearrange-done')?.addEventListener('click', () => {
        state.removeMode = false;
        document.getElementById('btn-remove-module')?.classList.remove('active');
        document.getElementById('module-picker')?.setAttribute('hidden', '');
        switchViewMode('overview');
        document.querySelectorAll('.hud-mode-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === 'overview');
        });
    });

    // Add Module — show/hide picker
    document.getElementById('btn-add-module')?.addEventListener('click', () => {
        const picker = document.getElementById('module-picker');
        if (picker) picker.hidden = !picker.hidden;
        state.removeMode = false;
        document.getElementById('btn-remove-module')?.classList.remove('active');
        canvas.style.cursor = '';
    });

    // Module picker buttons
    document.querySelectorAll('.module-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            if (type) addModule(type);
            document.getElementById('module-picker')?.setAttribute('hidden', '');
        });
    });

    // Remove Module — toggle removal mode
    document.getElementById('btn-remove-module')?.addEventListener('click', () => {
        state.removeMode = !state.removeMode;
        const btn = document.getElementById('btn-remove-module');
        if (btn) btn.classList.toggle('active', state.removeMode);
        document.getElementById('module-picker')?.setAttribute('hidden', '');
        canvas.style.cursor = state.removeMode ? 'crosshair' : '';
        announce(state.removeMode ? 'Click a module to remove it.' : 'Removal mode off.');
    });

    updateTimeDisplay();
}

function updateTimeDisplay() {
    const display = document.getElementById('mission-time-display');
    if (display) {
        const h = Math.floor(state.missionTime);
        const m = Math.round((state.missionTime - h) * 60);
        display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
}

/* ============================================
   Guided Tour
   ============================================ */

const TOUR_WAYPOINTS = [
    {
        position: [45, 35, 45],
        target:   [0, 2, 0],
        duration: 5,
        title:    'Welcome to the ASCEND Habitat',
        text:     'A modular lunar habitat designed for long-duration crew wellbeing monitoring. Each dome is a truncated icosahedron — the geometry of a soccer ball — cut at the equator.'
    },
    {
        position: [8, 6, 8],
        target:   [0, 2, 0],
        title:    'Central Hub',
        duration: 5,
        text:     'The hub is the command centre and social heart of the habitat. It monitors heart rate, HRV, voice stress, and cognitive load through embedded wristband sensors.'
    },
    {
        position: [18, 5, 3],
        target:   [14, 2, 0],
        duration: 5,
        title:    'Communal Module',
        text:     'Shared dining and recreation space. Environmental sensors track air quality, CO₂ levels, and social interaction patterns to optimise group wellbeing.'
    },
    {
        position: [-18, 5, -3],
        target:   [-14, 2, 0],
        duration: 5,
        title:    'Living Quarters',
        text:     'Private berths with mattress-embedded pressure sensors and ambient monitoring. Sleep quality, circadian rhythm, and core temperature are tracked nightly.'
    },
    {
        position: [3, 5, 18],
        target:   [0, 2, 14],
        duration: 5,
        title:    'Research Laboratory',
        text:     'Equipped with a pupillometer for cognitive fatigue detection. Screen-based eye-tracking and EDA sensors monitor researcher stress during experiments.'
    },
    {
        position: [-3, 5, -18],
        target:   [0, 2, -14],
        duration: 5,
        title:    'Cultivating Bay',
        text:     'Hydroponic gardens provide food and psychological respite. Greenery exposure time, light spectrum, and nature soundscape scores are continuously measured.'
    },
    {
        position: [15, 5, 14],
        target:   [10, 2, 10],
        duration: 5,
        title:    'Mechanical Systems',
        text:     'Exercise equipment with integrated HRV and EDA sensors. Activity levels and metabolic rates feed into the crew wellbeing index in real time.'
    },
    {
        position: [-14, 5, 14],
        target:   [-10, 2, 10],
        duration: 5,
        title:    'Airlock & Containment',
        text:     'Decontamination and EVA staging area. UV sterilisation dust monitoring and isolation protocol sensors ensure crew safety during ingress/egress.'
    },
    {
        position: [0, 12, 30],
        target:   [0, 2, 0],
        duration: 4,
        title:    'Circadian Lighting',
        text:     'Every module shares a unified circadian lighting system. Ceiling fixtures shift from warm dawn tones to cool daylight and dim evening hues, following mission time.'
    },
    {
        position: [35, 30, 35],
        target:   [0, 2, 0],
        duration: 4,
        title:    'Explore Freely',
        text:     'Tour complete! Click sensors to inspect metrics, swap panels between opaque and window, toggle cutaway mode, or walk through in first-person view.'
    }
];

let tourIndex = -1;
let tourTimer = 0;
let tourActive = false;

function startGuidedTour() {
    if (tourActive) return;
    tourActive = true;
    tourIndex = -1;
    tourTimer = 0;

    // Disable user controls
    orbitControls.enabled = false;
    if (fpControls.isLocked) fpControls.unlock();
    state.cameraFly = null;

    // Show tour card
    const card = document.getElementById('tour-card');
    if (card) card.hidden = false;

    announce('Guided tour started. Press Skip to exit at any time.');
    advanceTour();
}

function advanceTour() {
    tourIndex++;
    if (tourIndex >= TOUR_WAYPOINTS.length) {
        stopTour();
        return;
    }

    const wp = TOUR_WAYPOINTS[tourIndex];

    // Set up camera fly
    state.cameraFly = {
        from:       camera.position.clone(),
        to:         new THREE.Vector3(...wp.position),
        targetFrom: orbitControls.target.clone(),
        targetTo:   new THREE.Vector3(...wp.target),
        progress:   0,
        duration:   window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 1.2
    };

    // Update narration card
    const titleEl = document.getElementById('tour-card-title');
    const textEl  = document.getElementById('tour-card-text');
    if (titleEl) titleEl.textContent = wp.title;
    if (textEl)  textEl.textContent  = wp.text;

    // Set timer for auto-advance
    tourTimer = wp.duration;

    announce(`${wp.title}. ${wp.text}`);
}

function stopTour() {
    tourActive = false;
    tourIndex  = -1;
    tourTimer  = 0;

    // Hide tour card
    const card = document.getElementById('tour-card');
    if (card) card.hidden = true;

    // Restore overview mode
    orbitControls.enabled = true;
    camera.position.set(30, 25, 30);
    orbitControls.target.set(0, 2, 0);
    state.viewMode = 'overview';

    // Re-activate overview button
    document.querySelectorAll('.hud-mode-btn').forEach(b => b.classList.remove('active'));
    const overviewBtn = document.querySelector('.hud-mode-btn[data-mode="overview"]');
    if (overviewBtn) overviewBtn.classList.add('active');

    announce('Tour ended. You are in overview mode.');
}

/**
 * Called per-frame in animate() to count down tour waypoint timers.
 */
function updateTour(delta) {
    if (!tourActive) return;
    tourTimer -= delta;
    if (tourTimer <= 0) {
        advanceTour();
    }
}

/* ============================================
   View Mode Switching
   ============================================ */

function switchViewMode(mode) {
    // Stop tour if user switches modes manually
    if (tourActive) stopTour();

    state.viewMode = mode;

    const rearrangeToolbar = document.getElementById('rearrange-toolbar');

    // Cleanup previous mode
    if (fpControls.isLocked) fpControls.unlock();
    orbitControls.enabled = false;
    if (rearrangeToolbar) rearrangeToolbar.hidden = true;
    state.removeMode = false;
    document.getElementById('btn-remove-module')?.classList.remove('active');
    document.getElementById('module-picker')?.setAttribute('hidden', '');
    canvas.style.cursor = '';

    switch (mode) {
        case 'overview':
            orbitControls.enabled = true;
            camera.position.set(30, 25, 30);
            orbitControls.target.set(0, 2, 0);
            break;
        case 'firstperson':
            camera.position.set(0, 1.7, 0);
            camera.lookAt(1, 1.7, 0);
            fpControls.lock();
            announce('First-person mode. WASD to move, mouse to look. ESC to exit.');
            break;
        case 'rearrange':
            orbitControls.enabled = true;
            camera.position.set(0, 40, 0.1);
            orbitControls.target.set(0, 0, 0);
            orbitControls.minPolarAngle = 0;
            orbitControls.maxPolarAngle = Math.PI * 0.3;
            if (rearrangeToolbar) rearrangeToolbar.hidden = false;
            announce('Rearrangement mode. Drag modules to reposition.');
            break;
    }
}

/* ============================================
   Cutaway & Panel Presets
   ============================================ */

function applyCutaway() {
    if (!state.habitatGroup) return;
    state.habitatGroup.traverse(child => {
        if (child.userData.isOuterPanel) {
            child.material.opacity  = state.cutaway ? 0.15 : child.userData.defaultOpacity;
            child.material.transparent = true;
            child.material.needsUpdate = true;
        }
    });
}

function applyPanelPreset(preset) {
    if (!state.habitatGroup) return;
    state.habitatGroup.traverse(child => {
        if (child.userData.isOuterPanel && child.userData.swappable) {
            switch (preset) {
                case 'opaque':
                    child.material.color.set(0x8a8a8a);
                    child.material.transmission = 0;
                    child.material.opacity = 1.0;
                    child.userData.defaultOpacity = 1.0;
                    child.userData.panelType = 'opaque';
                    break;
                case 'windows':
                    child.material.color.set(0x88ccff);
                    child.material.transmission = 0.6;
                    child.material.opacity = 0.3;
                    child.userData.defaultOpacity = 0.3;
                    child.userData.panelType = 'window';
                    break;
                case 'mixed':
                    // Restore original
                    const isWindow = child.userData.originalPanelType === 'window';
                    child.material.color.set(isWindow ? 0x88ccff : 0x8a8a8a);
                    child.material.transmission = isWindow ? 0.6 : 0;
                    child.material.opacity = isWindow ? 0.3 : 1.0;
                    child.userData.defaultOpacity = isWindow ? 0.3 : 1.0;
                    child.userData.panelType = child.userData.originalPanelType;
                    break;
            }
            if (state.cutaway) {
                child.material.opacity = 0.15;
            }
            child.material.needsUpdate = true;
        }
    });
}

/* ============================================
   Data Refresh
   ============================================ */

function refreshData() {
    state.sample          = getCurrentSample(state.scenario);
    state.wellbeingIndex  = computeWellbeingIndex(state.sample);
    state.wellbeingStatus = computeStatus(state.wellbeingIndex);
    // Generate time-series (keep last 30 points for sparklines)
    if (state.series.length === 0) {
        state.series = generateSeries(state.scenario, 30);
    } else {
        const newPoint = getCurrentSample(state.scenario);
        newPoint.timestamp = Date.now();
        state.series.push(newPoint);
        if (state.series.length > 30) state.series.shift();
    }
    updateWellbeingBadge();
    updateStatusEnvironment();
}

/**
 * Build a tiny SVG sparkline from recent series data for a given metric.
 */
function buildSparkline(metricKey, width = 100, height = 24) {
    const series = state.series;
    if (!series || series.length < 2) return '';

    const meta = METRIC_META[metricKey];
    if (!meta) return '';

    const values = series.map(s => s[metricKey] ?? 0);
    const min = meta.min;
    const max = meta.max;
    const range = max - min || 1;

    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <polyline fill="none" stroke="${meta.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" opacity="0.8" />
    </svg>`;
}

/**
 * Get a status class for a metric value within its range.
 */
function metricStatus(metricKey, value) {
    const meta = METRIC_META[metricKey];
    if (!meta) return 'green';
    const pct = (value - meta.min) / (meta.max - meta.min);
    // For most metrics, mid-range is good; extremes are bad
    // Exceptions: HRV and sleep quality where higher is better
    const higherIsBetter = ['hrvMs', 'socialScore', 'sleepQuality', 'circadianAlignment',
        'lightSpectrumScore', 'greeneryExposureMin', 'natureSoundscapeScore', 'windowSimStatus'];
    const lowerIsBetter = ['edaMicrosiemens', 'restlessnessScore', 'voiceStressIndex',
        'routineDeviation', 'cognitiveLoad'];

    if (higherIsBetter.includes(metricKey)) {
        return pct > 0.6 ? 'green' : pct > 0.3 ? 'yellow' : 'red';
    } else if (lowerIsBetter.includes(metricKey)) {
        return pct < 0.4 ? 'green' : pct < 0.7 ? 'yellow' : 'red';
    }
    // Default: mid-range is best (e.g., heart rate)
    return (pct > 0.2 && pct < 0.7) ? 'green' : (pct > 0.1 && pct < 0.85) ? 'yellow' : 'red';
}

/* ============================================
   System Highlighting
   ============================================ */

/**
 * Highlight all hotspots matching the given sensorId across the habitat.
 * Non-matching hotspots dim. Call clearHighlight() to reset.
 */
function highlightSystem(sensorId) {
    state.highlightedSensor = sensorId;
    const hotspots = state._cached.hotspots;
    for (let i = 0, len = hotspots.length; i < len; i++) {
        const h = hotspots[i];
        if (h.userData.sensorId === sensorId) {
            h.scale.setScalar(1.8);
            h.material.emissiveIntensity = 1.0;
            h.material.opacity = 1.0;
            h.userData._highlighted = true;
        } else {
            h.material.emissiveIntensity = 0.1;
            h.material.opacity = 0.25;
            h.userData._highlighted = false;
        }
    }
}

function clearHighlight() {
    state.highlightedSensor = null;
    const hotspots = state._cached.hotspots;
    for (let i = 0, len = hotspots.length; i < len; i++) {
        const h = hotspots[i];
        h.scale.setScalar(1.0);
        h.material.emissiveIntensity = 0.6;
        h.material.opacity = 1.0;
        delete h.userData._highlighted;
    }
}

/* ============================================
   Raycasting / Click Interactions
   ============================================ */

function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.mouse, camera);

    if (!state.habitatGroup) return;
    const intersects = state.raycaster.intersectObjects(state.habitatGroup.children, true);

    for (const hit of intersects) {
        const obj = hit.object;

        // Panel swap on click
        if (obj.userData.isOuterPanel && obj.userData.swappable && state.panelPreset === 'mixed') {
            togglePanel(obj);
            return;
        }

        // Sensor / system hotspot
        if (obj.userData.sensorId) {
            showSensorPanel(obj.userData.sensorId);
            return;
        }

        // Module info + fly-to
        if (obj.userData.moduleType || obj.userData.isDomeModule) {
            let node = obj;
            while (node && !node.userData.isDomeModule) node = node.parent;
            if (node && state.viewMode === 'overview') flyToModule(node);
            showModulePanel(obj);
            return;
        }
    }
}

function togglePanel(panel) {
    const isWindow = panel.userData.panelType === 'window';
    if (isWindow) {
        panel.material.color.set(0x8a8a8a);
        panel.material.transmission = 0;
        panel.material.opacity = 1.0;
        panel.userData.defaultOpacity = 1.0;
        panel.userData.panelType = 'opaque';
        // Remove Earth texture
        if (panel.material.map) {
            panel.material.map = null;
            panel.material.needsUpdate = true;
        }
    } else {
        panel.material.color.set(0x88ccff);
        panel.material.transmission = 0.6;
        panel.material.opacity = 0.3;
        panel.userData.defaultOpacity = 0.3;
        panel.userData.panelType = 'window';
        // Apply Earth-view canvas texture
        applyEarthTexture(panel);
    }
    if (state.cutaway) panel.material.opacity = 0.15;
    panel.material.needsUpdate = true;

    // Scale-flip transition animation
    panel.userData._toggleAnim = { progress: 0, duration: 0.25 };
    panel.scale.setScalar(0.92);
    // Register in cached toggle anims
    if (!state._cached.toggleAnims.includes(panel)) {
        state._cached.toggleAnims.push(panel);
    }

    // Refresh positional audio on window panels
    if (natureBuffer) attachWindowAudio();

    announce(`Panel switched to ${panel.userData.panelType}`);
}

function showModulePanel(obj) {
    // Walk up to find module root
    let node = obj;
    while (node && !node.userData.moduleName) node = node.parent;
    if (!node) return;

    const panel = document.getElementById('module-panel');
    const title = document.getElementById('module-panel-title');
    const body  = document.getElementById('module-panel-body');
    if (!panel || !title || !body) return;

    const moduleType = node.userData.moduleType;
    const info = MODULE_TYPES[moduleType];
    title.textContent = node.userData.moduleName || moduleType;

    const systems = info?.systems || [];
    const sensors = MODULE_SENSORS[moduleType] || [];

    // Build live metric rows
    let metricsHtml = '';
    if (sensors.length > 0 && state.sample && !state.privacyMode) {
        metricsHtml = '<div class="module-metrics">';
        for (const key of sensors) {
            const meta = METRIC_META[key];
            if (!meta) continue;
            const val = state.sample[key];
            const display = typeof val === 'number' ? val.toFixed(1) : val;
            const status = metricStatus(key, val);
            const statusColor = { green: '#4ade80', yellow: '#facc15', red: '#f87171' }[status];
            const pct = Math.max(0, Math.min(100, ((val - meta.min) / (meta.max - meta.min)) * 100));
            metricsHtml += `
                <div class="module-metric-row">
                    <span class="module-metric-icon">${meta.icon}</span>
                    <span class="module-metric-label">${meta.label}</span>
                    <span class="module-metric-val" style="color:${meta.color}">${display}</span>
                    <span class="sensor-status-dot" style="background:${statusColor}"></span>
                    <div class="module-metric-bar"><div class="sensor-range-fill" style="width:${pct}%;background:${meta.color}"></div></div>
                </div>`;
        }
        metricsHtml += '</div>';
    } else if (state.privacyMode) {
        metricsHtml = '<p class="sensor-meta"><em>Privacy mode active</em></p>';
    }

    body.innerHTML = `
        <p><strong>Type:</strong> <span class="module-value">${moduleType}</span></p>
        <p><strong>Systems:</strong></p>
        ${systems.map(s => `<p style="padding-left:0.5rem">• ${s}</p>`).join('')}
        <div class="module-divider"></div>
        <p class="module-section-title">Live Sensors</p>
        ${metricsHtml}
        <div class="module-divider"></div>
        <p><strong>Greenery:</strong> <span class="module-value">Active</span></p>
        <p><strong>Circadian:</strong> <span class="module-value">${state.missionTime.toFixed(1)}h</span></p>
    `;

    // Close sensor panel if open
    document.getElementById('sensor-panel')?.classList.remove('open');
    panel.classList.add('open');
}

function showSensorPanel(sensorId) {
    const panel = document.getElementById('sensor-panel');
    const title = document.getElementById('sensor-panel-title');
    const body  = document.getElementById('sensor-panel-body');
    if (!panel || !title || !body) return;

    const meta = METRIC_META[sensorId];
    const label = meta ? meta.label : sensorId;
    const icon_display = meta ? meta.icon : icon('chartBar');
    title.innerHTML = `${icon_display} ${label}`;

    const val = state.sample ? state.sample[sensorId] : null;
    const displayVal = state.privacyMode ? '—' : (val !== null ? (typeof val === 'number' ? val.toFixed(1) : val) : '—');
    const unit = meta ? meta.unit : '';
    const status = val !== null ? metricStatus(sensorId, val) : 'green';
    const statusLabel = { green: 'Normal', yellow: 'Caution', red: 'Alert' }[status];
    const statusColor = { green: '#4ade80', yellow: '#facc15', red: '#f87171' }[status];

    // Range bar percentage
    const pct = (meta && val !== null) ? Math.max(0, Math.min(100, ((val - meta.min) / (meta.max - meta.min)) * 100)) : 0;

    // Sparkline
    const sparkline = state.privacyMode ? '' : buildSparkline(sensorId);

    body.innerHTML = `
        <div class="sensor-current">
            <span class="sensor-big-value" style="color:${meta ? meta.color : '#38bdf8'}">${displayVal}</span>
            <span class="sensor-unit">${state.privacyMode ? '' : unit}</span>
            <span class="sensor-status-dot" style="background:${statusColor}" title="${statusLabel}"></span>
        </div>
        <div class="sensor-range-bar-wrap">
            <div class="sensor-range-bar">
                <div class="sensor-range-fill" style="width:${state.privacyMode ? 0 : pct}%;background:${meta ? meta.color : '#38bdf8'}"></div>
            </div>
            <div class="sensor-range-labels">
                <span>${meta ? meta.min : 0}</span>
                <span>${meta ? meta.max : 100}</span>
            </div>
        </div>
        ${sparkline ? `<div class="sensor-sparkline-wrap"><span class="sensor-spark-label">Trend (30 pts)</span>${sparkline}</div>` : ''}
        <div class="sensor-meta">
            <p><strong>Status:</strong> <span style="color:${statusColor}">${state.privacyMode ? 'PRIVATE' : statusLabel}</span></p>
            <p><strong>Scenario:</strong> ${state.scenario}</p>
        </div>
    `;

    // Highlight matching hotspots across habitat
    highlightSystem(sensorId);

    document.getElementById('module-panel')?.classList.remove('open');
    panel.classList.add('open');
}

/* ============================================
   Hover Highlight
   ============================================ */

function onHover(event) {
    if (state.viewMode === 'rearrange' && isDragging) return;

    const rect = canvas.getBoundingClientRect();
    state.mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.mouse, camera);

    if (!state.habitatGroup) return;
    const intersects = state.raycaster.intersectObjects(state.habitatGroup.children, true);

    let newHover = null;
    for (const hit of intersects) {
        const obj = hit.object;
        if (obj.userData.isOuterPanel && obj.userData.swappable) { newHover = obj; break; }
        if (obj.userData.sensorId)    { newHover = obj; break; }
        if (obj.userData.moduleType)  { newHover = obj; break; }
    }

    // Reset previous
    if (state.hoveredObject && state.hoveredObject !== newHover) {
        const prev = state.hoveredObject;
        if (prev.material && prev.userData._savedEmissive !== undefined) {
            prev.material.emissiveIntensity = prev.userData._savedEmissive;
            delete prev.userData._savedEmissive;
        }
    }

    // Apply new
    if (newHover && newHover !== state.hoveredObject) {
        if (newHover.material && newHover.material.emissiveIntensity !== undefined) {
            newHover.userData._savedEmissive = newHover.material.emissiveIntensity;
            newHover.material.emissiveIntensity = Math.min(newHover.userData._savedEmissive + 0.3, 1.0);
        }
        canvas.style.cursor = 'pointer';
    } else if (!newHover) {
        canvas.style.cursor = '';
    }

    state.hoveredObject = newHover;
}

/* ============================================
   Camera Fly-To Module
   ============================================ */

function flyToModule(moduleGroup) {
    if (!moduleGroup) return;
    const targetPos = moduleGroup.position.clone();
    const r = moduleGroup.userData.domeRadius || 5;
    const offset = new THREE.Vector3(r * 1.8, r * 1.2, r * 1.8);
    const from = camera.position.clone();
    const to = targetPos.clone().add(offset);

    state.cameraFly = {
        from,
        to,
        targetFrom: orbitControls.target.clone(),
        targetTo: targetPos.clone().add(new THREE.Vector3(0, 1, 0)),
        progress: 0,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 1.0
    };
    announce(`Flying to ${moduleGroup.userData.moduleName || moduleGroup.userData.moduleType}`);
}

function updateCameraFly(delta) {
    const fly = state.cameraFly;
    if (!fly) return;

    fly.progress += delta / fly.duration;
    if (fly.progress >= 1) {
        camera.position.copy(fly.to);
        orbitControls.target.copy(fly.targetTo);
        state.cameraFly = null;
    } else {
        // Smooth ease-in-out
        const t = fly.progress * fly.progress * (3 - 2 * fly.progress);
        camera.position.lerpVectors(fly.from, fly.to, t);
        orbitControls.target.lerpVectors(fly.targetFrom, fly.targetTo, t);
    }
    orbitControls.update();
}

/* ============================================
   Animated Object Cache
   ============================================ */

/**
 * Walk the habitat group once and cache references to all objects
 * that need per-frame updates (hotspots, particles, holo rings, etc.).
 * Call after every build/rebuild.
 */
function cacheAnimatedObjects() {
    const c = state._cached;
    c.hotspots = [];
    c.holoRings = [];
    c.growLights = [];
    c.screens = [];
    c.particles = [];
    c.circadianFixtures = [];
    c.toggleAnims = [];

    if (!state.habitatGroup) return;
    state.habitatGroup.traverse(child => {
        if (child.userData.isHotspot && child.material) c.hotspots.push(child);
        if (child.userData.isHologramRing) c.holoRings.push(child);
        if (child.userData.isGrowLight && child.material) c.growLights.push(child);
        if (child.userData.isScreen && child.material) c.screens.push(child);
        if (child.userData.isParticleSystem) c.particles.push(child);
        if (child.userData.isCircadianFixture && child.material) c.circadianFixtures.push(child);
    });
}

/* ============================================
   Sensor Hotspot Pulsing
   ============================================ */

function pulseSensorHotspots(elapsed) {
    const hotspots = state._cached.hotspots;
    for (let i = 0, len = hotspots.length; i < len; i++) {
        const child = hotspots[i];
        // Skip if highlighted/dimmed by system highlight
        if (child.userData._highlighted !== undefined) continue;
        const phase = child.userData.sensorId ? child.userData.sensorId.length : 0;
        const pulse = 1.0 + Math.sin(elapsed * 2.5 + phase) * 0.15;
        child.scale.setScalar(pulse);
        child.material.emissiveIntensity = 0.3 + Math.sin(elapsed * 3 + phase) * 0.2;
    }
}

/* ============================================
   Animated Interiors
   ============================================ */

function animateInteriors(elapsed) {
    for (let i = 0, len = state._cached.holoRings.length; i < len; i++) {
        const child = state._cached.holoRings[i];
        child.rotation.y = elapsed * 0.6;
        child.rotation.x = Math.sin(elapsed * 0.3) * 0.1;
    }
    for (let i = 0, len = state._cached.growLights.length; i < len; i++) {
        state._cached.growLights[i].material.emissiveIntensity = 0.5 + Math.sin(elapsed * 1.5) * 0.3;
    }
    for (let i = 0, len = state._cached.screens.length; i < len; i++) {
        const child = state._cached.screens[i];
        child.material.emissiveIntensity = 0.6 + Math.sin(elapsed * 8 + child.id) * 0.15;
    }
}

/* ============================================
   Earth-View Canvas Texture (for window panels)
   ============================================ */

let _earthTexture = null;

function getEarthTexture() {
    if (_earthTexture) return _earthTexture;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark space background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, size, size);

    // Earth sphere (blue-green gradient with continents)
    const cx = size * 0.5;
    const cy = size * 0.55;
    const r = size * 0.3;
    const gradient = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
    gradient.addColorStop(0, '#88ccff');
    gradient.addColorStop(0.4, '#2277bb');
    gradient.addColorStop(0.7, '#115588');
    gradient.addColorStop(1, '#051530');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Continent patches (simplified green blobs)
    ctx.fillStyle = 'rgba(50, 140, 70, 0.6)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.2, cy - r * 0.1, r * 0.25, r * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy + r * 0.2, r * 0.2, r * 0.3, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - r * 0.4, cy + r * 0.4, r * 0.15, r * 0.1, 0.5, 0, Math.PI * 2); ctx.fill();

    // Atmosphere glow
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Scatter a few stars
    for (let i = 0; i < 30; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const dx = sx - cx;
        const dy = sy - cy;
        if (Math.sqrt(dx * dx + dy * dy) < r + 5) continue; // Skip if inside Earth
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.5})`;
        ctx.fillRect(sx, sy, 1, 1);
    }

    _earthTexture = new THREE.CanvasTexture(canvas);
    _earthTexture.wrapS = THREE.ClampToEdgeWrapping;
    _earthTexture.wrapT = THREE.ClampToEdgeWrapping;
    return _earthTexture;
}

function applyEarthTexture(panel) {
    panel.material.map = getEarthTexture();
    panel.material.needsUpdate = true;
}

/* ============================================
   Particle System Animation
   ============================================ */

function animateParticles(delta) {
    const particles = state._cached.particles;
    for (let p = 0, pLen = particles.length; p < pLen; p++) {
        const child = particles[p];
        const positions = child.geometry.attributes.position;
        const vel = child.userData.velocities;
        const bounds = child.userData.bounds;
        const arr = positions.array;

        for (let i = 0; i < positions.count; i++) {
            arr[i * 3]     += vel[i * 3];
            arr[i * 3 + 1] += vel[i * 3 + 1];
            arr[i * 3 + 2] += vel[i * 3 + 2];

            // Wrap Y — respawn at bottom when reaching top
            if (arr[i * 3 + 1] > bounds.yMax) {
                arr[i * 3 + 1] = bounds.yMin;
            }

            // Wrap radial — keep within dome radius
            const dx = arr[i * 3];
            const dz = arr[i * 3 + 2];
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > bounds.radius) {
                const scale = bounds.radius / dist * 0.5;
                arr[i * 3]     *= scale;
                arr[i * 3 + 2] *= scale;
            }
        }
        positions.needsUpdate = true;
    }
}

/* ============================================
   Panel Toggle Transition Animation
   ============================================ */

function animatePanelTransitions(delta) {
    const anims = state._cached.toggleAnims;
    for (let i = anims.length - 1; i >= 0; i--) {
        const child = anims[i];
        const anim = child.userData._toggleAnim;
        if (!anim) { anims.splice(i, 1); continue; }
        anim.progress += delta / anim.duration;
        if (anim.progress >= 1) {
            child.scale.setScalar(1.0);
            delete child.userData._toggleAnim;
            anims.splice(i, 1);
        } else {
            const t = anim.progress;
            const scale = 0.92 + 0.08 * (1 - Math.pow(1 - t, 3));
            child.scale.setScalar(scale);
        }
    }
}

/* ============================================
   Circadian Fixture Color Updates
   ============================================ */

function updateCircadianFixtures(hour) {
    // Map hour → warm to cool color shift
    const keys = [0, 6, 12, 18, 24];
    const colors = [0x331122, 0xff9944, 0xffeedd, 0xff8833, 0x331122];
    const intensities = [0.05, 0.2, 0.4, 0.25, 0.05];

    let idx = 0;
    for (let k = 0; k < keys.length - 1; k++) {
        if (hour >= keys[k] && hour <= keys[k + 1]) { idx = k; break; }
    }
    const t = (hour - keys[idx]) / (keys[idx + 1] - keys[idx]);
    const colA = new THREE.Color(colors[idx]);
    const colB = new THREE.Color(colors[idx + 1]);
    const blended = colA.lerp(colB, t);
    const intensity = THREE.MathUtils.lerp(intensities[idx], intensities[idx + 1], t);

    const fixtures = state._cached.circadianFixtures;
    for (let i = 0, len = fixtures.length; i < len; i++) {
        const child = fixtures[i];
        child.material.color.copy(blended);
        child.material.emissive.copy(blended);
        child.material.emissiveIntensity = intensity;
    }
}

/* ============================================
   Rearrange Mode — Drag, Snap, Add, Remove
   ============================================ */

const SLOT_RADIUS = 14;      // Distance from hub center
const SLOT_COUNT  = 8;       // Max peripheral slots
const MIN_MODULE_DIST = 9;   // Minimum distance between module centers

let isDragging = false;
const dragOffset = new THREE.Vector3();
const intersection = new THREE.Vector3();

// Snap animation state
let snapAnim = null; // { module, from, to, progress, duration }

/**
 * Get angular slot positions (evenly spaced around hub).
 */
function getSlotPositions() {
    const slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        const angle = (i / SLOT_COUNT) * Math.PI * 2;
        slots.push({
            x: Math.cos(angle) * SLOT_RADIUS,
            z: Math.sin(angle) * SLOT_RADIUS,
            angle
        });
    }
    return slots;
}

/**
 * Find the nearest unoccupied slot to a given position.
 * @param {number} x - target x
 * @param {number} z - target z
 * @param {string} [excludeName] - module name to exclude from occupancy check
 */
function findNearestOpenSlot(x, z, excludeName) {
    const slots = getSlotPositions();
    const occupied = new Set();

    // Mark slots that are already taken by other modules
    for (const mod of state.layout) {
        if (mod.type === 'hub') continue;
        if (mod.name === excludeName) continue;
        // Find closest slot to this module
        let bestIdx = 0, bestDist = Infinity;
        for (let i = 0; i < slots.length; i++) {
            const dx = mod.position[0] - slots[i].x;
            const dz = mod.position[2] - slots[i].z;
            const d = dx * dx + dz * dz;
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        occupied.add(bestIdx);
    }

    // Find nearest open slot
    let bestSlot = null, bestDist = Infinity;
    for (let i = 0; i < slots.length; i++) {
        if (occupied.has(i)) continue;
        const dx = x - slots[i].x;
        const dz = z - slots[i].z;
        const d = dx * dx + dz * dz;
        if (d < bestDist) { bestDist = d; bestSlot = slots[i]; }
    }
    return bestSlot;
}

/**
 * Check if a position collides with any existing module.
 */
function wouldCollide(x, z, excludeName) {
    for (const mod of state.layout) {
        if (mod.name === excludeName) continue;
        const dx = mod.position[0] - x;
        const dz = mod.position[2] - z;
        if (Math.sqrt(dx * dx + dz * dz) < MIN_MODULE_DIST) return true;
    }
    return false;
}

/**
 * Rebuild habitat fully: geometry + interiors + circadian fixtures.
 */
function fullRebuild() {
    rebuildHabitat(scene, state);
    // Re-furnish interiors
    state.habitatGroup.traverse(child => {
        if (child.userData.isDomeModule && child.userData.moduleType) {
            furnishModule(child, child.userData.moduleType);
        }
    });
    cacheAnimatedObjects();
    updateCircadianFixtures(state.missionTime);
    // Re-attach positional audio to new window panels
    if (natureBuffer) attachWindowAudio();
}

/**
 * Sync a module group's position back to state.layout.
 */
function syncLayoutPosition(moduleGroup) {
    const name = moduleGroup.userData.moduleName;
    const entry = state.layout.find(m => m.name === name);
    if (entry) {
        entry.position = [
            moduleGroup.position.x,
            0,
            moduleGroup.position.z
        ];
    }
}

function onPointerDown(event) {
    if (state.viewMode !== 'rearrange') return;

    updateMouse(event);
    state.raycaster.setFromCamera(state.mouse, camera);

    if (!state.habitatGroup) return;

    // Check for removal mode
    if (state.removeMode) {
        const modules = [];
        state.habitatGroup.traverse(child => {
            if (child.userData.isDomeModule) modules.push(child);
        });
        const intersects = state.raycaster.intersectObjects(modules, true);
        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target && !target.userData.isDomeModule) target = target.parent;
            if (target) {
                if (target.userData.moduleType === 'hub') {
                    announce('Cannot remove the central hub module.');
                } else {
                    removeModule(target.userData.moduleName);
                }
            }
        }
        return;
    }

    // Find module domes (skip hub)
    const modules = [];
    state.habitatGroup.traverse(child => {
        if (child.userData.isDomeModule && child.userData.moduleType !== 'hub') {
            modules.push(child);
        }
    });

    const intersects = state.raycaster.intersectObjects(modules, true);
    if (intersects.length > 0) {
        orbitControls.enabled = false;
        let target = intersects[0].object;
        while (target && !target.userData.isDomeModule) target = target.parent;
        if (!target || target.userData.moduleType === 'hub') return;

        state.dragModule = target;
        isDragging = true;
        state.raycaster.ray.intersectPlane(state.dragPlane, intersection);
        dragOffset.copy(intersection).sub(target.position);

        canvas.style.cursor = 'grabbing';
    }
}

function onPointerMove(event) {
    if (!isDragging || !state.dragModule) return;

    updateMouse(event);
    state.raycaster.setFromCamera(state.mouse, camera);
    state.raycaster.ray.intersectPlane(state.dragPlane, intersection);

    state.dragModule.position.copy(intersection.sub(dragOffset));
    state.dragModule.position.y = 0; // Keep on ground plane
}

function onPointerUp() {
    if (!isDragging || !state.dragModule) return;

    const mod = state.dragModule;
    isDragging = false;
    state.dragModule = null;
    canvas.style.cursor = '';

    if (state.viewMode === 'rearrange') {
        orbitControls.enabled = true;

        // Snap to nearest open slot
        const slot = findNearestOpenSlot(mod.position.x, mod.position.z, mod.userData.moduleName);
        if (slot) {
            // Animate snap
            snapAnim = {
                module: mod,
                from: mod.position.clone(),
                to: new THREE.Vector3(slot.x, 0, slot.z),
                progress: 0,
                duration: 0.3
            };
        } else {
            // No open slots — sync position as-is
            syncLayoutPosition(mod);
            fullRebuild();
        }
    }
}

/**
 * Update snap animation — called in animate loop.
 */
function updateSnapAnimation(delta) {
    if (!snapAnim) return;
    snapAnim.progress += delta / snapAnim.duration;
    if (snapAnim.progress >= 1) {
        snapAnim.module.position.copy(snapAnim.to);
        syncLayoutPosition(snapAnim.module);
        snapAnim = null;
        fullRebuild();
        announce('Module snapped to slot.');
    } else {
        const t = snapAnim.progress * snapAnim.progress * (3 - 2 * snapAnim.progress);
        snapAnim.module.position.lerpVectors(snapAnim.from, snapAnim.to, t);
    }
}

/* ============================================
   Add / Remove Modules
   ============================================ */

function addModule(type) {
    // Find next open slot
    const slot = findNearestOpenSlot(SLOT_RADIUS, 0);
    if (!slot) {
        announce('No open slots available.');
        return;
    }

    const info = MODULE_TYPES[type];
    if (!info) return;

    // Generate unique name
    const count = state.layout.filter(m => m.type === type).length;
    const name = `${info.name} ${count + 1}`;

    // Add to layout
    state.layout.push({
        type,
        position: [slot.x, 0, slot.z],
        name
    });

    fullRebuild();
    announce(`Added ${name}.`);
}

function removeModule(moduleName) {
    const idx = state.layout.findIndex(m => m.name === moduleName);
    if (idx < 0) return;
    if (state.layout[idx].type === 'hub') {
        announce('Cannot remove the central hub.');
        return;
    }

    const removed = state.layout.splice(idx, 1)[0];
    fullRebuild();
    state.removeMode = false;
    document.getElementById('btn-remove-module')?.classList.remove('active');
    canvas.style.cursor = '';
    announce(`Removed ${removed.name}.`);
}

function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
}

/* ============================================
   First-Person Movement
   ============================================ */

function initFirstPersonKeys() {
    document.addEventListener('keydown', (e) => {
        if (state.viewMode !== 'firstperson') return;
        switch (e.code) {
            case 'KeyW': case 'ArrowUp':    fpKeys.forward  = true; break;
            case 'KeyS': case 'ArrowDown':  fpKeys.backward = true; break;
            case 'KeyA': case 'ArrowLeft':  fpKeys.left     = true; break;
            case 'KeyD': case 'ArrowRight': fpKeys.right    = true; break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp':    fpKeys.forward  = false; break;
            case 'KeyS': case 'ArrowDown':  fpKeys.backward = false; break;
            case 'KeyA': case 'ArrowLeft':  fpKeys.left     = false; break;
            case 'KeyD': case 'ArrowRight': fpKeys.right    = false; break;
        }
    });

    fpControls.addEventListener('unlock', () => {
        if (state.viewMode === 'firstperson') {
            switchViewMode('overview');
            document.querySelectorAll('.hud-mode-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === 'overview');
            });
        }
    });

    /* Global Escape key — close open panels */
    document.addEventListener('keydown', (e) => {
        if (e.code !== 'Escape') return;
        const sp = document.getElementById('sensor-panel');
        const mp = document.getElementById('module-panel');
        if (sp?.classList.contains('open') || mp?.classList.contains('open')) {
            sp?.classList.remove('open');
            mp?.classList.remove('open');
            clearHighlight();
            announce('Panels closed');
        }
    });
}

function updateFirstPerson(delta) {
    if (state.viewMode !== 'firstperson' || !fpControls.isLocked) return;

    const speed = 5.0 * delta;
    const dir = new THREE.Vector3();

    if (fpKeys.forward)  dir.z -= 1;
    if (fpKeys.backward) dir.z += 1;
    if (fpKeys.left)     dir.x -= 1;
    if (fpKeys.right)    dir.x += 1;
    dir.normalize();

    fpControls.moveRight(dir.x * speed);
    fpControls.moveForward(-dir.z * speed);

    // Clamp to terrain
    camera.position.y = 1.7;
}

/* ============================================
   Minimap
   ============================================ */

function updateMinimap() {
    const minimapCanvas = document.getElementById('minimap-canvas');
    if (!minimapCanvas) return;
    const ctx = minimapCanvas.getContext('2d');
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;

    ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
    ctx.fillRect(0, 0, w, h);

    const scale = 2.2;
    const cx = w / 2;
    const cy = h / 2;

    // Draw modules
    if (state.habitatGroup) {
        state.habitatGroup.traverse(child => {
            if (child.userData.isDomeModule) {
                const x = cx + child.position.x * scale;
                const y = cy + child.position.z * scale;
                const r = (child.userData.domeRadius || 4) * scale;

                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }

    // Draw camera position
    const camX = cx + camera.position.x * scale;
    const camY = cy + camera.position.z * scale;
    ctx.beginPath();
    ctx.arc(camX, camY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Camera direction indicator
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    ctx.beginPath();
    ctx.moveTo(camX, camY);
    ctx.lineTo(camX + dir.x * 10, camY + dir.z * 10);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

/* ============================================
   Accessibility
   ============================================ */

function announce(text) {
    const el = document.getElementById('a11y-live');
    if (el) el.textContent = text;
}

/* ============================================
   Crew Animation
   ============================================ */

function animateCrew(time) {
    if (!state.crewGroup || !state.crewVisible) return;
    state.crewGroup.children.forEach((member, i) => {
        // Gentle idle sway
        const offset = i * 1.5;
        member.rotation.y = Math.sin(time * 0.5 + offset) * 0.15;
        member.position.y = Math.sin(time * 0.8 + offset) * 0.03;
    });
}

/* ============================================
   Animation Loop
   ============================================ */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update controls
    if (state.viewMode === 'overview' || state.viewMode === 'rearrange') {
        orbitControls.update();
    }

    // Camera fly-to animation
    updateCameraFly(delta);

    // First-person movement
    updateFirstPerson(delta);

    // Animate crew
    animateCrew(elapsed);

    // Sensor hotspot pulsing
    pulseSensorHotspots(elapsed);

    // Guided tour auto-advance
    updateTour(delta);

    // Animated interior elements
    animateInteriors(elapsed);

    // Particle drift
    animateParticles(delta);

    // Panel toggle transitions
    animatePanelTransitions(delta);

    // Snap-to-slot animation (rearrange mode)
    updateSnapAnimation(delta);

    // Minimap (~2 fps)
    state.minimapTimer += delta;
    if (state.minimapTimer > 0.5) {
        state.minimapTimer = 0;
        updateMinimap();
    }

    // Auto-refresh data (~every 5 seconds when playing)
    if (state.playing) {
        state.dataTimer += delta;
        if (state.dataTimer > 5) {
            state.dataTimer = 0;
            refreshData();
        }
    }

    // Audio volume modulation
    updateAudio();

    // Status warning pulse
    pulseStatusWarnings(elapsed);

    // Render with post-processing
    composer.render();
    labelRenderer.render(scene, camera);
}

/* ============================================
   Resize
   ============================================ */

function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    labelRenderer.setSize(w, h);
}

window.addEventListener('resize', onResize);

/* ============================================
   Init
   ============================================ */

/* ============================================
   Loading Screen
   ============================================ */

function setLoadProgress(pct, msg) {
    const fill = document.getElementById('loading-bar-fill');
    const status = document.getElementById('loading-status');
    if (fill) fill.style.width = `${pct}%`;
    if (status) status.textContent = msg;
}

function hideLoadingScreen() {
    const el = document.getElementById('loading-screen');
    if (!el) return;
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 700);
}

/* ============================================
   System Legend
   ============================================ */

function buildSystemLegend() {
    const container = document.getElementById('system-legend');
    if (!container) return;

    // Deduplicate: collect unique sensorIds across all modules
    const allSensors = new Set();
    for (const sensors of Object.values(MODULE_SENSORS)) {
        sensors.forEach(s => allSensors.add(s));
    }

    container.innerHTML = '';
    for (const sensorId of allSensors) {
        const meta = METRIC_META[sensorId];
        if (!meta) continue;

        const row = document.createElement('label');
        row.className = 'legend-row';

        const dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.background = meta.color;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.className = 'legend-cb';
        cb.setAttribute('aria-label', `Show ${meta.label} sensors`);
        cb.dataset.sensor = sensorId;

        const name = document.createElement('span');
        name.className = 'legend-name';
        name.innerHTML = `${meta.icon} ${meta.label}`;

        row.append(dot, cb, name);
        container.appendChild(row);

        cb.addEventListener('change', () => {
            toggleSensorVisibility(sensorId, cb.checked);
        });
    }
}

function toggleSensorVisibility(sensorId, visible) {
    if (!state._cached?.hotspots) return;
    for (const h of state._cached.hotspots) {
        if (h.userData.sensorId === sensorId) {
            h.visible = visible;
        }
    }
}

async function init() {
    setLoadProgress(5, 'Generating terrain…');

    // Data
    refreshData();

    // Terrain
    state.terrainMesh = createTerrain();
    scene.add(state.terrainMesh);
    setLoadProgress(15, 'Creating starfield…');

    // Starfield
    state.starField = createStarfield();
    scene.add(state.starField);

    // Earth
    scene.add(createEarth());
    setLoadProgress(25, 'Building habitat modules…');

    // Build habitat
    state.habitatGroup = buildHabitat(state.layout);
    scene.add(state.habitatGroup);
    setLoadProgress(50, 'Furnishing interiors…');

    // Furnish interiors
    state.habitatGroup.traverse(child => {
        if (child.userData.isDomeModule && child.userData.moduleType) {
            furnishModule(child, child.userData.moduleType);
        }
    });
    setLoadProgress(70, 'Populating crew…');

    // Crew
    state.crewGroup = createCrewGroup();
    scene.add(state.crewGroup);

    // Cache animated object refs (eliminates per-frame traversals)
    cacheAnimatedObjects();
    setLoadProgress(80, 'Setting up lighting…');

    // Circadian lighting
    updateCircadianLighting(state.missionTime);
    updateCircadianFixtures(state.missionTime);

    // HUD
    initHUD();
    updateWellbeingBadge();
    buildSystemLegend();
    setLoadProgress(90, 'Binding controls…');

    // Events
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', (e) => {
        onPointerMove(e);
        onHover(e);
    });
    canvas.addEventListener('pointerup', onPointerUp);
    initFirstPersonKeys();

    setLoadProgress(100, 'Ready');

    // Start
    animate();
    hideLoadingScreen();

    announce('Lunar Habitat 3D simulation loaded. Use controls to explore.');
}

init().catch(err => {
    console.error('[Habitat3D] Init failed:', err);
    setLoadProgress(100, `Error: ${err.message}`);
    setTimeout(hideLoadingScreen, 1500);
});
