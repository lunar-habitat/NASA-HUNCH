/**
 * @fileoverview Photorealistic 3D smartwatch product render for Lunar Habitat.
 * Uses Three.js MeshPhysicalMaterial with HDR environment mapping,
 * procedural geometry, studio lighting, and color variant switching.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { getCurrentSample, computeWellbeingIndex, computeStatus } from './data.js';

/* ============================================
   Constants
   ============================================ */

const COLOR_VARIANTS = {
    spaceGray: {
        case: 0x3a3a3c,
        band: 0x2c2c2e,
        bandInner: 0x3a3a3c,
        crown: 0x48484a,
        label: 'Space Gray'
    },
    silver: {
        case: 0xc7c7cc,
        band: 0xd1d1d6,
        bandInner: 0xe5e5ea,
        crown: 0xd1d1d6,
        label: 'Silver'
    },
    midnight: {
        case: 0x1c1c1e,
        band: 0x1c1c1e,
        bandInner: 0x2c2c2e,
        crown: 0x2c2c2e,
        label: 'Midnight'
    },
    starlight: {
        case: 0xfaf6f2,
        band: 0xf2ece4,
        bandInner: 0xfaf6f2,
        crown: 0xe8dfd6,
        label: 'Starlight'
    }
};

const STATUS_HEX = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };

/* ============================================
   State
   ============================================ */

let currentScenario = 'baseline';
let currentSample = getCurrentSample(currentScenario);
let currentVariant = 'spaceGray';
let wellbeingIndex = computeWellbeingIndex(currentSample);
let wellbeingStatus = computeStatus(wellbeingIndex);
let autoRotateTimeout = null;

/* ============================================
   Renderer
   ============================================ */

const canvas = document.getElementById('product-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* ============================================
   Scene & Camera
   ============================================ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2.5, 5);

/* ============================================
   Controls
   ============================================ */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.5;
controls.maxDistance = 10;
controls.minPolarAngle = Math.PI * 0.05;
controls.maxPolarAngle = Math.PI * 0.95;
controls.target.set(0, 0, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;

// Pause auto-rotate on interaction, resume after idle
controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(autoRotateTimeout);
});

controls.addEventListener('end', () => {
    clearTimeout(autoRotateTimeout);
    if (document.getElementById('btn-auto-rotate').classList.contains('active')) {
        autoRotateTimeout = setTimeout(() => { controls.autoRotate = true; }, 3000);
    }
});

/* ============================================
   Lighting — Three-Point Studio Setup
   ============================================ */

// Ambient fill
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Key light (warm, front-right, 45°)
const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
keyLight.position.set(4, 6, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -3;
keyLight.shadow.camera.right = 3;
keyLight.shadow.camera.top = 3;
keyLight.shadow.camera.bottom = -3;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// Fill light (cool, front-left)
const fillLight = new THREE.DirectionalLight(0xc8d8f0, 0.5);
fillLight.position.set(-4, 4, 3);
scene.add(fillLight);

// Rim / back light (edge highlight)
const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
rimLight.position.set(0, 3, -5);
scene.add(rimLight);

// Subtle bottom fill to soften shadows
const bottomFill = new THREE.DirectionalLight(0x8899bb, 0.2);
bottomFill.position.set(0, -3, 2);
scene.add(bottomFill);

/* ============================================
   HDR Environment Map
   ============================================ */

const loadingOverlay = document.getElementById('loading-overlay');

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load studio HDR for reflections
new RGBELoader()
    .load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr', (hdrTexture) => {
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
        scene.environment = envMap;
        hdrTexture.dispose();
        pmremGenerator.dispose();

        // Fade out loading overlay
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => { loadingOverlay.style.display = 'none'; }, 700);

        console.log('[Product] HDR environment loaded');
    }, undefined, () => {
        // Fallback: if HDR fails to load, just remove the overlay and continue
        console.warn('[Product] HDR failed to load, using lights only');
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => { loadingOverlay.style.display = 'none'; }, 700);
    });

/* ============================================
   Materials
   ============================================ */

const v = COLOR_VARIANTS[currentVariant];

const caseMaterial = new THREE.MeshPhysicalMaterial({
    color: v.case,
    metalness: 1.0,
    roughness: 0.14,
    envMapIntensity: 1.6,
    clearcoat: 0.1,
    clearcoatRoughness: 0.05
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.1,
    transparent: true,
    opacity: 0.06,
    envMapIntensity: 2.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    side: THREE.FrontSide,
    depthWrite: false
});

const bandMaterial = new THREE.MeshPhysicalMaterial({
    color: v.band,
    metalness: 0.0,
    roughness: 0.55,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    sheen: 0.6,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(v.band).offsetHSL(0, 0, 0.1),
    envMapIntensity: 0.5
});

const bandInnerMaterial = new THREE.MeshPhysicalMaterial({
    color: v.bandInner,
    metalness: 0.0,
    roughness: 0.7,
    envMapIntensity: 0.3
});

const crownMaterial = new THREE.MeshPhysicalMaterial({
    color: v.crown,
    metalness: 1.0,
    roughness: 0.25,
    envMapIntensity: 1.4
});

const sensorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a3a2a,
    metalness: 0.7,
    roughness: 0.2,
    envMapIntensity: 1.0,
    emissive: 0x0a2a1a,
    emissiveIntensity: 0.15
});

/* ============================================
   Watch Face Canvas Texture (1024 × 1024)
   ============================================ */

const SCREEN_RES = 1024;
const screenCanvas = document.createElement('canvas');
screenCanvas.width = SCREEN_RES;
screenCanvas.height = SCREEN_RES;
const screenCtx = screenCanvas.getContext('2d');
const screenTexture = new THREE.CanvasTexture(screenCanvas);
screenTexture.minFilter = THREE.LinearFilter;
screenTexture.magFilter = THREE.LinearFilter;
screenTexture.colorSpace = THREE.SRGBColorSpace;

const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    toneMapped: false
});

function updateScreenTexture(time) {
    const ctx = screenCtx;
    const w = SCREEN_RES;
    const h = SCREEN_RES;

    // Background gradient
    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    bg.addColorStop(0, '#111827');
    bg.addColorStop(1, '#0a0e17');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Outer frame
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 2;
    roundRect(ctx, 20, 20, w - 40, h - 40, 40);
    ctx.stroke();

    const s = currentSample;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Time display — large centered
    ctx.font = 'bold 120px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, w / 2, 160);

    // Date
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    ctx.font = '32px "Inter", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(dateStr, w / 2, 220);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 260);
    ctx.lineTo(w - 100, 260);
    ctx.stroke();

    // Wellbeing arc at top area
    const arcCx = w / 2;
    const arcCy = 380;
    const arcR = 80;
    const statusColor = STATUS_HEX[wellbeingStatus];

    // Track
    ctx.beginPath();
    ctx.arc(arcCx, arcCy, arcR, Math.PI * 0.8, Math.PI * 2.2, false);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Progress
    const arcRange = Math.PI * 1.4;
    const progress = arcRange * (wellbeingIndex / 100);
    ctx.beginPath();
    ctx.arc(arcCx, arcCy, arcR, Math.PI * 0.8, Math.PI * 0.8 + progress, false);
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Wellbeing number
    ctx.font = 'bold 56px "JetBrains Mono", monospace';
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'center';
    ctx.fillText(`${wellbeingIndex}`, arcCx, arcCy + 8);

    ctx.font = '22px "Inter", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('WELLBEING', arcCx, arcCy + 42);

    // Complications row — 3 circles
    const complications = [
        { icon: '\u2764', value: `${Math.round(s.heartRateBpm)}`, unit: 'bpm', color: '#ef4444' },
        { icon: '\u26a1', value: `${s.edaMicrosiemens.toFixed(1)}`, unit: '\u00b5S', color: '#f59e0b' },
        { icon: '\u25b2', value: `${Math.round(s.activityScore)}`, unit: '', color: '#a78bfa' }
    ];

    const compY = 560;
    const compSpacing = 200;
    const compStartX = w / 2 - compSpacing;

    complications.forEach((c, i) => {
        const cx = compStartX + i * compSpacing;

        // Circle background
        ctx.beginPath();
        ctx.arc(cx, compY, 60, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fill();
        ctx.strokeStyle = c.color + '40';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon
        ctx.font = '28px sans-serif';
        ctx.fillStyle = c.color;
        ctx.textAlign = 'center';
        ctx.fillText(c.icon, cx, compY - 18);

        // Value
        ctx.font = 'bold 32px "JetBrains Mono", monospace';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(c.value, cx, compY + 18);

        // Unit
        if (c.unit) {
            ctx.font = '18px "Inter", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(c.unit, cx, compY + 42);
        }
    });

    // Bottom row: extra vitals
    const bottomY = 710;
    const bottomData = [
        { label: 'HRV', value: `${Math.round(s.hrvMs)} ms` },
        { label: 'TEMP', value: `${s.skinTempC.toFixed(1)}°C` },
        { label: 'SLEEP', value: `${(s.sleepMinutes / 60).toFixed(1)}h` }
    ];

    bottomData.forEach((d, i) => {
        const bx = compStartX + i * compSpacing;

        ctx.font = '20px "Inter", sans-serif';
        ctx.fillStyle = '#4a5568';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, bx, bottomY);

        ctx.font = '28px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(d.value, bx, bottomY + 34);
    });

    // Subtle heartbeat pulse dot
    const pulseAlpha = 0.4 + Math.sin(time * 4) * 0.3;
    ctx.beginPath();
    ctx.arc(w / 2, h - 60, 6 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
    ctx.fill();

    // "LUNAR HABITAT" branding
    ctx.font = '18px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('LUNAR HABITAT', w / 2, h - 30);

    screenTexture.needsUpdate = true;
}

/** Draw a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Draw screen texture immediately so first frame has content
updateScreenTexture(0);

/* ============================================
   Watch Group
   ============================================ */

const watchGroup = new THREE.Group();
scene.add(watchGroup);

/* ---- Case Body ---- */
const caseGeom = new RoundedBoxGeometry(1.8, 0.28, 1.5, 6, 0.2);
const caseBody = new THREE.Mesh(caseGeom, caseMaterial);
watchGroup.add(caseBody);

/* ---- Bezel frame (hollow — 4 thin bars around the screen) ---- */
const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2a2e,
    metalness: 1.0,
    roughness: 0.1,
    envMapIntensity: 2.0
});

const bezelH = 0.06;
const bezelY = 0.15;
// Top bar
const bTop = new THREE.Mesh(new THREE.BoxGeometry(1.72, bezelH, 0.06), bezelMat);
bTop.position.set(0, bezelY, -0.68);
watchGroup.add(bTop);
// Bottom bar
const bBot = new THREE.Mesh(new THREE.BoxGeometry(1.72, bezelH, 0.06), bezelMat);
bBot.position.set(0, bezelY, 0.68);
watchGroup.add(bBot);
// Left bar
const bLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, bezelH, 1.3), bezelMat);
bLeft.position.set(-0.83, bezelY, 0);
watchGroup.add(bLeft);
// Right bar
const bRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, bezelH, 1.3), bezelMat);
bRight.position.set(0.83, bezelY, 0);
watchGroup.add(bRight);

/* ---- Screen ---- */
const screenGeom = new THREE.PlaneGeometry(1.58, 1.28);
const screenMesh = new THREE.Mesh(screenGeom, screenMaterial);
screenMesh.position.y = 0.155;
screenMesh.rotation.x = -Math.PI / 2;
watchGroup.add(screenMesh);

/* ---- Glass highlight (thin plane above screen) ---- */
const glassGeom = new THREE.PlaneGeometry(1.62, 1.32);
const glassMesh = new THREE.Mesh(glassGeom, glassMaterial);
glassMesh.position.y = 0.157;
glassMesh.rotation.x = -Math.PI / 2;
glassMesh.renderOrder = 10;
watchGroup.add(glassMesh);

/* ---- Digital Crown ---- */
const crownGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 32);
const crown = new THREE.Mesh(crownGeom, crownMaterial);
crown.rotation.z = Math.PI / 2;
crown.position.set(0.98, 0.04, -0.2);
watchGroup.add(crown);

// Crown knurling lines (visual texture)
for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const lineGeom = new THREE.BoxGeometry(0.005, 0.005, 0.2);
    const lineMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1c,
        metalness: 1.0,
        roughness: 0.5
    });
    const line = new THREE.Mesh(lineGeom, lineMat);
    line.position.set(
        0.98 + Math.cos(angle) * 0.065,
        0.04 + Math.sin(angle) * 0.065,
        -0.2
    );
    line.rotation.z = angle;
    watchGroup.add(line);
}

/* ---- Side Button ---- */
const sideBtnGeom = new RoundedBoxGeometry(0.12, 0.06, 0.16, 2, 0.02);
const sideBtn = new THREE.Mesh(sideBtnGeom, crownMaterial);
sideBtn.position.set(0.96, 0.02, 0.15);
watchGroup.add(sideBtn);

/* ---- Back Plate ---- */
const backPlateGeom = new RoundedBoxGeometry(1.6, 0.03, 1.3, 4, 0.15);
const backPlateMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2a2e,
    metalness: 0.9,
    roughness: 0.15,
    envMapIntensity: 1.2
});
const backPlate = new THREE.Mesh(backPlateGeom, backPlateMat);
backPlate.position.y = -0.15;
watchGroup.add(backPlate);

/* ---- Heart Rate Sensor Bumps (back) ---- */
const sensorPositions = [
    [-0.15, -0.17, -0.15],
    [0.15, -0.17, -0.15],
    [-0.15, -0.17, 0.15],
    [0.15, -0.17, 0.15]
];

sensorPositions.forEach(pos => {
    const sensorGeom = new THREE.SphereGeometry(0.07, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const sensor = new THREE.Mesh(sensorGeom, sensorMaterial);
    sensor.position.set(pos[0], pos[1], pos[2]);
    sensor.rotation.x = Math.PI; // face downward
    watchGroup.add(sensor);
});

// Center sensor (larger)
const centerSensorGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32);
const centerSensor = new THREE.Mesh(centerSensorGeom, sensorMaterial);
centerSensor.position.set(0, -0.17, 0);
watchGroup.add(centerSensor);

/* ============================================
   Band Straps
   ============================================ */

function createSportBand(direction) {
    const group = new THREE.Group();
    const bandLength = 2.4;
    const bandWidth = 1.1;
    const bandThick = 0.09;

    // Use a simple rounded box for the strap — reliable orientation
    const strapGeom = new RoundedBoxGeometry(bandWidth, bandThick, bandLength, 3, 0.03);
    const strap = new THREE.Mesh(strapGeom, bandMaterial);
    strap.position.set(0, -0.01, direction * (0.75 + bandLength / 2));
    group.add(strap);

    // Tapered end cap
    const capGeom = new RoundedBoxGeometry(bandWidth * 0.7, bandThick * 0.8, 0.15, 2, 0.03);
    const cap = new THREE.Mesh(capGeom, bandMaterial);
    cap.position.set(0, -0.01, direction * (0.75 + bandLength + 0.05));
    group.add(cap);

    // Perforation holes along the strap
    const holeCount = 8;
    const holeSpacing = 0.2;
    const holeStart = 0.75 + 0.5;

    for (let i = 0; i < holeCount; i++) {
        const holeGeom = new THREE.CylinderGeometry(0.035, 0.035, bandThick + 0.04, 16);
        const holeMat = new THREE.MeshStandardMaterial({
            color: 0x0a0e17,
            metalness: 0.0,
            roughness: 1.0
        });
        const hole = new THREE.Mesh(holeGeom, holeMat);
        hole.position.set(0, -0.01, direction * (holeStart + i * holeSpacing));
        group.add(hole);
    }

    // Inner face (different colour/material)
    const innerGeom = new THREE.PlaneGeometry(bandWidth - 0.06, bandLength - 0.1);
    const inner = new THREE.Mesh(innerGeom, bandInnerMaterial);
    inner.rotation.x = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
    inner.position.set(0, -0.01 - bandThick / 2 - 0.001, direction * (0.75 + bandLength / 2));
    group.add(inner);

    // Band connection to case — lug
    const lugGeom = new RoundedBoxGeometry(bandWidth + 0.04, 0.1, 0.18, 2, 0.02);
    const lug = new THREE.Mesh(lugGeom, caseMaterial);
    lug.position.set(0, -0.01, direction * 0.73);
    group.add(lug);

    return group;
}

const topBand = createSportBand(1);
watchGroup.add(topBand);

const bottomBand = createSportBand(-1);
watchGroup.add(bottomBand);

// Buckle/clasp on the bottom band
const buckleGeom = new RoundedBoxGeometry(0.5, 0.06, 0.25, 2, 0.02);
const buckleMat = new THREE.MeshPhysicalMaterial({
    color: COLOR_VARIANTS[currentVariant].crown,
    metalness: 1.0,
    roughness: 0.12,
    envMapIntensity: 1.8
});
const buckle = new THREE.Mesh(buckleGeom, buckleMat);
buckle.position.set(0, 0.06, -1.9);
watchGroup.add(buckle);

// Pin inside buckle
const pinGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.45, 8);
const pinMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1.0, roughness: 0.1 });
const pin = new THREE.Mesh(pinGeom, pinMat);
pin.rotation.z = Math.PI / 2;
pin.position.set(0, 0.06, -1.82);
watchGroup.add(pin);

/* ============================================
   Ground Shadow Plane
   ============================================ */

const shadowPlaneGeom = new THREE.PlaneGeometry(12, 12);
const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.3 });
const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -0.5;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// Enable shadow casting on watch parts
watchGroup.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
    }
});

// Tilt the watch slightly for a product-angle view
watchGroup.rotation.x = -0.2;
watchGroup.rotation.z = 0.1;

/* ============================================
   Subtle Background Elements
   ============================================ */

// Gradient backdrop using a large plane behind the scene
const backdropGeom = new THREE.PlaneGeometry(30, 30);
const backdropMat = new THREE.ShaderMaterial({
    uniforms: {
        colorCenter: { value: new THREE.Color(0x0f1520) },
        colorEdge: { value: new THREE.Color(0x060810) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 colorCenter;
        uniform vec3 colorEdge;
        varying vec2 vUv;
        void main() {
            float dist = distance(vUv, vec2(0.5)) * 2.0;
            vec3 color = mix(colorCenter, colorEdge, dist);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    depthWrite: false
});
const backdrop = new THREE.Mesh(backdropGeom, backdropMat);
backdrop.position.z = -8;
scene.add(backdrop);

/* ============================================
   Variant Switching
   ============================================ */

function applyVariant(variantKey) {
    const v = COLOR_VARIANTS[variantKey];
    if (!v) return;
    currentVariant = variantKey;

    caseMaterial.color.setHex(v.case);
    bandMaterial.color.setHex(v.band);
    bandMaterial.sheenColor = new THREE.Color(v.band).offsetHSL(0, 0, 0.1);
    bandInnerMaterial.color.setHex(v.bandInner);
    crownMaterial.color.setHex(v.crown);
    buckleMat.color.setHex(v.crown);

    // For light variants, adjust bezel lip
    const isLight = variantKey === 'silver' || variantKey === 'starlight';
    bezelMat.color.setHex(isLight ? 0x999999 : 0x2a2a2e);

    caseMaterial.needsUpdate = true;
    bandMaterial.needsUpdate = true;
    bandInnerMaterial.needsUpdate = true;
    crownMaterial.needsUpdate = true;
    buckleMat.needsUpdate = true;
}

// Variant swatch buttons
document.querySelectorAll('.variant-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.variant-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyVariant(btn.dataset.variant);
    });
});

/* ============================================
   Scenario Selector
   ============================================ */

const scenarioSelect = document.getElementById('scenario-select-product');
scenarioSelect.addEventListener('change', () => {
    currentScenario = scenarioSelect.value;
    currentSample = getCurrentSample(currentScenario);
    wellbeingIndex = computeWellbeingIndex(currentSample);
    wellbeingStatus = computeStatus(wellbeingIndex);
});

/* ============================================
   Auto-Rotate Toggle
   ============================================ */

const autoRotateBtn = document.getElementById('btn-auto-rotate');
autoRotateBtn.addEventListener('click', () => {
    autoRotateBtn.classList.toggle('active');
    const isActive = autoRotateBtn.classList.contains('active');
    controls.autoRotate = isActive;
});

/* ============================================
   Hint fade
   ============================================ */

const hint = document.getElementById('hud-hint');
setTimeout(() => { if (hint) hint.classList.add('hidden'); }, 5000);

/* ============================================
   Animation Loop
   ============================================ */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    controls.update();
    updateScreenTexture(elapsed);
    renderer.render(scene, camera);
}

animate();

/* ============================================
   Resize
   ============================================ */

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
