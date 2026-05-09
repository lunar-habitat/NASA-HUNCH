# Interior Design Upgrade Plan — Lunar Habitat 3D Simulation

## Overview

Full redesign of the habitat interior for a zero-gravity environment: white/light aesthetic,
motion sensor doorways, richer LED circadian lighting, zero-g social hub with handrails,
per-window environment selection, sleeping bag with biometric sensors, and seamless astronaut
movement aids throughout. Two scenarios (EVA Spacewalk, Microgravity Rest) are removed —
the habitat operates in zero-gravity at all times, making these redundant.
Voice recognition/analysis is removed entirely — it is not a real sensor system in this habitat.
Only the four real sensor systems are represented throughout the UI.

### The Four Real Sensor Systems

| Sensor | Physical Location | Metrics Tracked |
|--------|------------------|-----------------|
| **HRV Wristband** | Worn by crew at all times | heartRateBpm, hrvMs, edaMicrosiemens, skinTempC |
| **Pupilometer** | Common area / hub | pupilDilationMm, cognitiveLoad |
| **Sleeping Bag Pressure Sensors** | Living quarters | sleepMinutes, restlessnessScore, circadianAlignment |
| **Doorway Motion Sensors** | All corridor entrances | activityScore, socialScore, routineDeviation |

---

## Files to Modify

| File | Changes |
|------|---------|
| `scripts/habitat-interiors.js` | MATERIALS palette, hub/living overhaul, handrails, perimeter pillars, sensor hotspot cleanup |
| `scripts/habitat-geometry.js` | Floor colors, corridor colors, doorway sensor frames, corridor handrails |
| `scripts/habitat-3d.js` | Camera FOV, window click handler, texture generators, MODULE_SENSORS remap, remove voiceStressIndex from METRIC_META and tour text |
| `scripts/ui.js` | Remove voiceRecognition system + voice metrics, rename mattressSensors → sleepingBagSensors, remove microgravity scenario label, remove voiceStress from insights/scoring/HUD |
| `scripts/data.js` | Remove `eva` and `microgravity` scenario keys, remove `voiceStressIndex` from all scenarios, NOISE_PROFILES, series generation, and wellbeing calculation |
| `scripts/import.js` | Remove voiceStressIndex from validation, column mapping, defaults, and help text |
| `assets/data/sample-data.csv` | Remove voiceStressIndex column header |
| `index.html` | Remove EVA + microgravity dropdown options; remove voiceStressIndex from data dictionary table |
| `pages/habitat-3d.html` | Remove EVA + microgravity options; add `#view-selector` panel HTML |
| `pages/wristband-3d.html` | Remove EVA + microgravity dropdown options |
| `pages/wristband-product.html` | Remove EVA + microgravity dropdown options |
| `styles/habitat-3d.css` | Add view selector styles |

---

## Step 1 — White Interior Palette

### `scripts/habitat-interiors.js` — `MATERIALS` object (lines 14–24)

Replace dark colors with light, clean values:
```js
const MATERIALS = {
    metal:   new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.7, roughness: 0.3 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.55, metalness: 0.05 }),
    fabric:  new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.9,  metalness: 0.0 }),
    wood:    new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.65, metalness: 0.0 }),
    glass:   /* unchanged */,
    screen:  /* unchanged */,
    greenery:/* unchanged */,
    soil:    /* unchanged */,
    sensor:  /* unchanged */
};
```

### `scripts/habitat-geometry.js` — Floor disc (line ~404)

```js
// Before: color: 0x2a2a3e
// After:  color: 0xd8d8d8, roughness: 0.75, metalness: 0.05
```

### `scripts/habitat-geometry.js` — Corridor floor strip (line ~509) and tube (line ~491)

```js
// Floor: color: 0xc8c8c8
// Tube:  color: 0x8899aa  (lighter, less industrial)
```

---

## Step 2 — Motion Sensor Frames on Doorways

### `scripts/habitat-geometry.js` — New function `addDoorwaySensorFrame(group, position, angle)`

```
Frame structure:
  ┌──────────────────────┐  ← Top bar (white metal BoxGeometry)
  │  ●               ●   │  ← Corner sensor nodes (green emissive SphereGeometry)
  │  ─────scan line─────  │  ← Animated green PlaneGeometry (moves up/down)
  │  ●               ●   │
  └──────────────────────┘
```

- Top bar: `BoxGeometry(corridorRadius * 2.2, 0.08, 0.06)` — `color: 0xeeeeee, metalness: 0.6`
- Two side verticals: `BoxGeometry(0.08, 2.0, 0.06)` — same material
- 4 corner nodes: `SphereGeometry(0.06, 8, 8)` — `emissive: 0x22c55e`, `userData.isDoorCornerNode = true`
- Scan line: `PlaneGeometry(corridorRadius * 1.9, 0.04)` — green emissive, `userData.isDoorScanLine = true`

Called from `buildCorridor()` at both endpoints (~1.5m inward from each end).

### `scripts/habitat-3d.js` — Door sensor animation

```js
c.doorScanLines   = [];
c.doorCornerNodes = [];

function animateDoorSensors(elapsed) {
    state._cached.doorScanLines.forEach(line => {
        line.position.y = Math.sin(elapsed * 1.2) * 0.9;
        line.material.opacity = 0.4 + Math.sin(elapsed * 1.2) * 0.3;
    });
    state._cached.doorCornerNodes.forEach((node, i) => {
        node.material.emissiveIntensity = 0.5 + Math.sin(elapsed * 2.5 + i * 0.7) * 0.4;
    });
}
```

---

## Step 3 — Enhanced LED Circadian Lighting

### `scripts/habitat-interiors.js` — `addCircadianCeilingFixtures()` (lines 628–650)

- `fixtureCount` from `3` → `5`
- Geometry: `BoxGeometry(1.0, 0.04, 0.5)` (thin LED troffer panel, replaces flat PlaneGeometry)
- Height: `radius * 0.55` → `radius * 0.72`
- Remove `Math.random()` height jitter

### `scripts/habitat-3d.js` — Intensity keyframes expansion

```js
const intensities = [0.04, 0.35, 0.70, 0.40, 0.04]; // midnight → dawn → noon → dusk → midnight
```

### `scripts/habitat-interiors.js` — `addInteriorLights()` additions

**Cove floor strip:**
```js
const cove = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.92, 0.025, 4, 32),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.25, transparent: true, opacity: 0.6 })
);
cove.rotation.x = Math.PI / 2;
cove.position.y = 0.04;
cove.userData.isCoveStrip = true;
group.add(cove);
```

**Vertical accent light columns** (4 thin emissive cylinders at `radius * 0.82`):
```js
// CylinderGeometry(0.025, 0.025, radius * 0.65, 6)
// color: 0x38bdf8, emissive, transparent, opacity: 0.5
// userData.isAccentColumn = true
```

---

## Step 4 — Zero-Gravity Hub Social Common Area

> No chairs or tables — astronauts float freely. Interaction surfaces are wall-mounted
> and accessible from any orientation. The pupilometer is the physical sensor device here.

### `scripts/habitat-interiors.js` — `furnishHub()` (lines 199–246)

Remove: command table, pedestal, holographic ring, area rug, chairs.

**Central anchor post with grab rings:**
```js
const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, radius * 0.5, 8), MATERIALS.metal
);
post.position.y = radius * 0.25;
group.add(post);

// 3 grab rings at increasing heights
for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.025, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.8, roughness: 0.2 })
    );
    ring.position.y = 0.5 + i * 0.7;
    ring.rotation.x = Math.PI / 2;
    post.add(ring);
}
```

**4 wall-mounted screens at varied heights** (accessible from any floating position):
```js
const heights = [1.0, 1.6, 2.2, 1.3];
for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.05), MATERIALS.screen);
    screen.position.set(Math.cos(angle) * radius * 0.72, heights[i], Math.sin(angle) * radius * 0.72);
    screen.lookAt(0, heights[i], 0);
    screen.userData.isScreen = true;
    group.add(screen);
}
```

**6 foot restraint pegs** (amber — easy to spot, crew hooks feet to stay in place):
```js
// CylinderGeometry(0.03, 0.03, 0.12, 6) — color: 0xf59e0b (amber), metalness: 0.6
// At radius * 0.5, evenly spaced, y: 0.06
```

**6 D-ring tether attachment points** at wall height 1.4m:
```js
// TorusGeometry(0.07, 0.018, 6, 12) — color: 0xb0b8c4, metalness: 0.9
// At radius * 0.82, lookAt center
```

**Pupilometer device** (physical sensor — wall-mounted at eye level on one wall):
```js
// BoxGeometry housing (0.25, 0.18, 0.12) — plastic material
// Two lens apertures: CylinderGeometry(0.035, 0.035, 0.04, 16) — dark glass
// Small status LED: SphereGeometry(0.02) — green emissive
// Position: radius * 0.7 on one wall face, y: 1.55 (eye height when floating)
// Label: userData.label = 'Pupilometer'
```

**Sensor hotspots — hub (pupilometer only):**
```js
// Remove: voiceStressIndex hotspot
// Keep:   pupilDilationMm, cognitiveLoad (derived from pupil analysis)
group.add(createSensorHotspot(1.5, 1.4, 0, 'pupilDilationMm'));
group.add(createSensorHotspot(-1.5, 1.4, 0, 'cognitiveLoad'));
```

**Update `addHubParticles()`** — slow drifting ambient motes (zero-g suspended dust):
```js
// color: 0xf0f4ff, size: 0.02, opacity: 0.25
// Emission across full volume (yMin: 0, yMax: radius * 0.7)
```

---

## Step 5 — Handrails and Movement Aids Throughout

### NASA 3D Resources handrail models

Source: [https://nasa3d.arc.nasa.gov/models](https://nasa3d.arc.nasa.gov/models) — search "handrail"

The yellow-and-white ISS handrail hardware models are authentic and free. Load via:
```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Load once, clone per placement
const loader = new GLTFLoader();
// dracoLoader optional if models use Draco compression
loader.load('assets/models/iss-handrail.glb', (gltf) => {
    const handrailTemplate = gltf.scene;
    // Clone and position throughout habitat
});
```

Store asset at: `assets/models/iss-handrail.glb`

> **Fallback:** If GLTF loading is deferred, use the procedural geometry described below.
> The GLTF version is a drop-in replacement — same `userData` flags apply.

### Procedural fallback — `addHandrailRing(group, radius, y)` in `scripts/habitat-interiors.js`

```js
function addHandrailRing(group, radius, y, color = 0xc8cdd4) {
    const rail = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.84, 0.025, 6, 48),
        new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.25 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = y;
    group.add(rail);

    // Mounting brackets every 45°
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.12, 0.04),
            new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 0.5 })
        );
        bracket.position.set(Math.cos(a) * radius * 0.84, y - 0.06, Math.sin(a) * radius * 0.84);
        group.add(bracket);
    }
}
```

Two rings per module from `furnishModule()`:
```js
addHandrailRing(moduleGroup, radius, 1.1); // chest height
addHandrailRing(moduleGroup, radius, 2.0); // overhead pull bar
```

### Corridor handrails in `buildCorridor()` — `scripts/habitat-geometry.js`

Two rails (one each side) running the full corridor length with stanchion brackets every 2m.

### Module-specific additions

- **Living:** horizontal grab bar above sleeping bag at `y = 0.75`
- **Research:** overhead anchor rail above bench at `y = 1.9`

---

## Step 6 — Per-Window Environment Selector

### `scripts/habitat-3d.js` — Replace `getEarthTexture()` with view options system

```js
const VIEW_OPTIONS = {
    earth:    { label: 'Earth',    audio: null,                           generate: generateEarthTexture },
    forest:   { label: 'Forest',   audio: '../assets/audio/forest.mp3',  generate: generateForestTexture },
    ocean:    { label: 'Ocean',    audio: '../assets/audio/ocean.mp3',    generate: generateOceanTexture },
    mountain: { label: 'Mountain', audio: null,                           generate: generateMountainTexture },
    aurora:   { label: 'Aurora',   audio: '../assets/audio/aurora.mp3',   generate: generateAuroraTexture }
};
```

Canvas texture generators (128×128 each):

| View | Canvas description |
|------|--------------------|
| Earth | Existing code — move verbatim |
| Forest | Dark sky, tree silhouette polygons, moon disk, scattered stars |
| Ocean | Horizontal gradient, wave arc lines, caustic white dot scatter |
| Mountain | Dark purple sky, jagged ridgeline polygon, dense stars, planet arc |
| Aurora | Near-black sky, sweeping teal/green/violet gradient bands, sharp stars |

Per-panel audio: `Map<panel.uuid → PositionalAudio>` — each window carries its own sound.

### `pages/habitat-3d.html` — Add view selector panel

```html
<div id="view-selector" class="view-selector hud-panel" hidden role="dialog">
    <div class="view-selector-title">Window View</div>
    <div class="view-selector-options">
        <button class="view-option-btn" data-view="earth">Earth</button>
        <button class="view-option-btn" data-view="forest">Forest</button>
        <button class="view-option-btn" data-view="ocean">Ocean</button>
        <button class="view-option-btn" data-view="mountain">Mountain</button>
        <button class="view-option-btn" data-view="aurora">Aurora</button>
        <button class="view-option-btn" data-view="opaque">Opaque</button>
    </div>
</div>
```

### `styles/habitat-3d.css` — View selector styles

```css
.view-selector { position: absolute; z-index: 40; min-width: 160px; padding: 0.6rem;
    pointer-events: auto; animation: selector-appear 0.15s ease; }
.view-selector[hidden] { display: none; }
.view-selector-title { font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-accent, #38bdf8); margin-bottom: 0.4rem; }
.view-selector-options { display: flex; flex-direction: column; gap: 0.25rem; }
.view-option-btn { font-size: 0.72rem; padding: 0.3rem 0.6rem; border-radius: 5px;
    background: rgba(15,23,42,0.7); border: 1px solid rgba(56,189,248,0.2);
    color: var(--color-text, #e2e8f0); cursor: pointer; text-align: left;
    transition: background 0.15s, border-color 0.15s; }
.view-option-btn:hover { background: rgba(56,189,248,0.18); border-color: rgba(56,189,248,0.5); }
.view-option-btn.active { background: rgba(56,189,248,0.25); border-color: #38bdf8; color: #38bdf8; }
@keyframes selector-appear { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
```

### `scripts/habitat-3d.js` — Click handler

- First click on opaque → convert to window, `userData.viewOption = 'earth'`, show selector near cursor
- Click on window → show selector to change view
- "Opaque" option reverts the panel
- Outside click dismisses selector

---

## Step 7 — Sleeping Bag with Pressure Sensors (Living Module)

### `scripts/habitat-interiors.js` — `furnishLiving()` (lines 293–310)

Replace `BoxGeometry` bed + pillow with:

**Sleeping platform:** `BoxGeometry(0.95, 0.06, 2.1)` — light metal `0xd0d4da`

**Sleeping bag** (mummy-bag — `CapsuleGeometry`):
```js
const bag = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 1.35, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.75, metalness: 0.05 })
);
bag.position.set(radius * 0.3, 0.32, 0);
bag.rotation.z = Math.PI / 2;
bag.userData.isSleepingBag = true;
```

**Sleep monitoring grid** (10 scan lines floating above the bag, EEG-like visualization):
```js
// BoxGeometry(0.9, 0.002, 0.08) per line, z spaced -0.7 to +0.7
// color: 0x38bdf8, emissive, opacity: 0.35
// userData.isSleepGrid = true — animated as propagating waves
```

**Wall-mounted motion sensor frame** beside bag (1.1×0.8m — same geometry as doorway frame,
scaled down, corner nodes share `isDoorCornerNode` animation):
```js
// Position: (radius * 0.45, 1.3, 0) — on the wall above the bag
```

**Embedded pressure sensor dot grid** (3×5 on platform surface, `y = 0.11`):
```js
// SphereGeometry(0.015, 4, 4) — green emissive 0x22c55e
// userData.isSleepDot = true — pulsed with per-dot phase offset
```

**Sensor hotspots:**
```js
// Labeled "Sleeping Bag Pressure Sensors"
group.add(createSensorHotspot(radius * 0.3, 0.6, -1, 'sleepMinutes'));
group.add(createSensorHotspot(radius * 0.3, 0.6,  1, 'restlessnessScore'));
group.add(createSensorHotspot(radius * 0.3, 0.6,  0, 'circadianAlignment'));
```

---

## Step 8 — Spatial Feel / High Ceilings

**Camera FOV:** `50` → `70` (line ~152 in `scripts/habitat-3d.js`)

**First-person eye height:** `1.7` → `1.85` (two locations in `scripts/habitat-3d.js`)

**Perimeter pillars** — `addDomePerimeterPillars(group, radius)` — 6 pillars at `radius * 0.88`:
```js
// Column: CylinderGeometry(0.07, 0.09, radius * 0.65, 8) — light metal
// Base cap, top cap
// LED base strip: CylinderGeometry(0.15, 0.15, 0.025, 16) — cyan emissive
```

---

## Step 9 — Remove EVA and Microgravity Scenarios

Both are redundant since the habitat is always in zero gravity.

### `scripts/data.js`

Remove `eva` block (lines 98–117) and `microgravity` block (lines 118–137) from `SCENARIOS`.

### `pages/habitat-3d.html` (lines 48–49), `pages/wristband-3d.html` (lines 33–34), `pages/wristband-product.html` (lines 39–40), `index.html` (line 29)

Remove both dropdown `<option>` elements:
```html
<!-- Remove: -->
<option value="eva">EVA Spacewalk</option>
<option value="microgravity">Microgravity Rest</option>
```

### `scripts/ui.js` (line 836)

Remove `microgravity: 'Microgravity Rest',` from the scenario label map.

---

## Step 10 — Remove Voice Recognition / Voice Stress Analysis

Voice recognition is not a real sensor in this habitat. Remove it completely from the entire website.

### `scripts/data.js`

- Remove `voiceStressIndex` field from every scenario object (all 6 remaining scenarios)
- Remove `voiceStressIndex` from `NOISE_PROFILES` (line 220)
- Remove `voiceStressIndex` from series generation point construction (line 276)
- Remove `voiceStressIndex` from rolling window average (line 344)
- Remove `voiceComponent` from wellbeing calculation (lines 372–373, 416)
- Update wellbeing formula comment accordingly

### `scripts/habitat-3d.js`

- Remove `voiceStressIndex` entry from `METRIC_META` (line 38)
- Remove `'voiceStressIndex'` from `MODULE_SENSORS.hub` array (line 53) — see Step 11
- Remove `'voiceStressIndex'` from `lowerIsBetter` array (line 1282)
- Update hub tour text (line 979) — remove "voice stress" from the description

### `scripts/habitat-interiors.js`

- Remove `createSensorHotspot(0, 1.2, 1.5, 'voiceStressIndex')` from `furnishHub()` (line 244)

### `scripts/ui.js`

- Remove `voice` entry from `HABITAT_SENSOR_INFO` (lines 60–64)
- Remove `voiceRecognition` entry from `SYSTEMS` (lines 134–141)
- Remove voice stress from HUD metrics panel (line 603)
- Remove voice stress from privacy masking logic (lines 315–318)
- Remove voice stress from wellbeing scoring (`case 'voiceStressIndex'`, line 1230)
- Remove voice stress insight conditions (lines 689, 693)
- Remove voice stress from stress indicator array (line 717)
- Remove `voiceRecognition` chart rendering block (lines 1287–1296)
- Remove `case 'voice'` from value formatter (line 267)

### `scripts/import.js`

- Remove `voiceStressIndex` from field validator (line 22)
- Remove `'voice_stress'`, `'voicestress'`, `'voice'` column aliases (lines 56–58)
- Remove `voiceStressIndex` from defaults (lines 269, 309)
- Remove `voiceStressIndex` from help text HTML (lines 377, 389)

### `assets/data/sample-data.csv`

Remove `voiceStressIndex` column from the CSV header row.

### `index.html`

Remove `<tr><td>voiceStressIndex</td>...</tr>` from the data dictionary table (line 177)
and remove `voice` from the aliases list (line 190).

---

## Step 11 — Update MODULE_SENSORS to Reflect Real Sensor Systems

### `scripts/habitat-3d.js` — `MODULE_SENSORS` (lines 51–60)

Remap all modules so hotspots only represent data from the four real sensor sources.

```js
const MODULE_SENSORS = {
    // Pupilometer device physically located here
    hub:         ['pupilDilationMm', 'cognitiveLoad'],

    // Doorway motion sensors track social presence in communal space
    communal:    ['socialScore', 'routineDeviation'],

    // Sleeping bag pressure sensors
    living:      ['sleepMinutes', 'restlessnessScore', 'circadianAlignment'],

    // Cognitive analysis derived from pupil data and task performance
    research:    ['cognitiveLoad'],

    // Environmental sensors (light spectrum, greenery) — habitat infrastructure
    cultivating: ['greeneryExposureMin', 'lightSpectrumScore'],

    // HRV wristband readings (wristband charging dock located here)
    mechanical:  ['heartRateBpm', 'hrvMs', 'edaMicrosiemens', 'skinTempC'],

    // Doorway motion sensors — primary behavioral tracking location
    containment: ['activityScore']
};
```

### `scripts/habitat-interiors.js` — Update sensor hotspot calls to match new mapping

**Hub** (remove voiceStressIndex hotspot, add pupilometer hotspot near device):
```js
group.add(createSensorHotspot(1.5, 1.4, 0, 'pupilDilationMm'));
group.add(createSensorHotspot(-1.5, 1.4, 0, 'cognitiveLoad'));
// Remove: createSensorHotspot(0, 1.2, 1.5, 'voiceStressIndex')
// Remove: createSensorHotspot(1.5, 1.2, 0, 'heartRateBpm')
// Remove: createSensorHotspot(-1.5, 1.2, 0, 'hrvMs')
```

**Communal** (replace natureSoundscapeScore with routineDeviation — motion-sensor derived):
```js
group.add(createSensorHotspot(radius * 0.5, 1.0, 0, 'socialScore'));
group.add(createSensorHotspot(-radius * 0.5, 1.0, 0, 'routineDeviation'));
// Remove: natureSoundscapeScore hotspot
```

**Mechanical** (add wristband metrics — HRV wristband docking station):
```js
group.add(createSensorHotspot(0, 1.0, 0, 'heartRateBpm'));
group.add(createSensorHotspot(radius * 0.3, 1.0, 0, 'hrvMs'));
group.add(createSensorHotspot(-radius * 0.3, 1.0, 0, 'edaMicrosiemens'));
group.add(createSensorHotspot(0, 1.0, radius * 0.3, 'skinTempC'));
// Remove: previous skinTempC and edaMicrosiemens hotspots (keep same metrics, just adjust positions)
```

---

## Step 12 — Rename Mattress → Sleeping Bag Pressure Sensors

### `scripts/ui.js`

- `systemId: 'mattressSensors'` → `'sleepingBagSensors'` (line 93)
- `id: 'mattressSensors'` → `'sleepingBagSensors'` (line 170)
- System name: `'Mattress Sensors'` → `'Sleeping Bag Pressure Sensors'`
- System description: update to reference sleeping bag, not mattress
- `case 'mattressSensors':` → `case 'sleepingBagSensors':` in chart renderer (line 1387)
- `aria-label` at line 1415: update to `'Sleep stage quality from sleeping bag pressure sensors'`
- Insight text at line 709: `'Poor sleep stage composition — review sleeping bag and environment factors'`

### `scripts/habitat-3d.js`

- Tour text line 993: `'mattress-embedded pressure sensors'` → `'sleeping bag pressure sensors'`

### `scripts/data.js`

- Comment line 390: `'// Sleep quality: higher is better (from mattress pressure sensors)'`
  → `'// Sleep quality: higher is better (from sleeping bag pressure sensors)'`

### `habitat.txt` (line 19)

- `'Pressure sensors in mattresses'` → `'Pressure sensors in sleeping bags'`

---

## Implementation Order

1. Remove EVA + microgravity scenarios (data.js + 4 HTML files + ui.js)
2. Remove voiceStressIndex completely (data.js, habitat-3d.js, habitat-interiors.js, ui.js, import.js, CSV, index.html)
3. Rename mattressSensors → sleepingBagSensors (ui.js, habitat-3d.js, data.js, habitat.txt)
4. Update MODULE_SENSORS and sensor hotspot calls
5. MATERIALS palette update (habitat-interiors.js)
6. Floor + corridor floor + tube color changes (habitat-geometry.js)
7. Circadian fixture height/count/geometry (habitat-interiors.js)
8. updateCircadianFixtures() intensity curve + cove strips + accent columns (habitat-3d.js)
9. furnishHub() overhaul — zero-gravity social space + pupilometer device
10. addHandrailRing() helper + furnishModule() calls (habitat-interiors.js)
11. Corridor handrails + stanchions in buildCorridor() (habitat-geometry.js)
12. Module-specific handrail additions
13. furnishLiving() — sleeping bag + pressure sensor dots + wall frame + sleep grid
14. addDomePerimeterPillars() + furnishModule() call
15. Camera FOV + first-person height (habitat-3d.js)
16. Doorway sensor frames (habitat-geometry.js)
17. cacheAnimatedObjects() + new animation callbacks
18. View selector system (DOM, CSS, JS, texture generators, audio routing)

---

## Additional Recommendations

- **SSAO pass**: `SSAOPass` after `RenderPass`, before `UnrealBloomPass` — white floors + ambient occlusion creates dramatic depth.
- **Sleep grid wave animation**: `emissiveIntensity = 0.1 + 0.12 * sin(elapsed * 0.4 + lineIndex * 0.6)` — EEG-style propagating wave.
- **Handrail hover highlight**: When first-person camera looks at a handrail from <1.5m, pulse brightness slightly — good UX affordance for the movement system.
- **Corridor LED strip reduction**: `emissiveIntensity` to `0.25` on floor strips — wayfinding cue, not neon.

---

## Asset Recommendations

### Handrails (NASA 3D Resources)

**[nasa3d.arc.nasa.gov/models](https://nasa3d.arc.nasa.gov/models)** — search "handrail"

Authentic ISS yellow-and-white grab bar hardware, free download. Drop in as GLTF:
```
assets/models/iss-handrail.glb
```

### Free Audio (window environment sounds)

| Asset | Source |
|-------|--------|
| Forest ambience loop (CC0) | [freesound.org](https://freesound.org/search/?q=forest+ambience+loop) — filter CC0 |
| Ocean waves loop (CC0) | [freesound.org](https://freesound.org/search/?q=ocean+waves+loop) — filter CC0 |
| Aurora VLF radio (CC0) | [freesound.org](https://freesound.org/search/?q=aurora+vlf+radio) — filter CC0 |
| All nature categories | [pixabay.com/sound-effects](https://pixabay.com/sound-effects/) — no attribution needed |

Reuse existing `the_mountain-space-438391.mp3` for mountain view.

```
assets/audio/forest-loop.mp3
assets/audio/ocean-loop.mp3
assets/audio/aurora-loop.mp3
```

### Free 3D Models

| Asset | Source |
|-------|--------|
| ISS handrails (authentic) | [nasa3d.arc.nasa.gov](https://nasa3d.arc.nasa.gov/models) |
| Low-poly furniture GLTF | [kenney.nl/assets/furniture-kit](https://kenney.nl/assets/furniture-kit) — CC0 |
| Sci-fi interior models | [sketchfab.com](https://sketchfab.com/3d-models?features=downloadable&license=cc0) — filter CC0 |
| General low-poly | [quaternius.com](https://quaternius.com/packs/ultimatelowpoly.html) — CC0 |

### Free Textures & HDR

| Asset | Source |
|-------|--------|
| NASA Earth Blue Marble | [visibleearth.nasa.gov](https://visibleearth.nasa.gov/images/57735) |
| Aurora / forest / ocean photos | [unsplash.com](https://unsplash.com) — CC0 |
| PBR metal, fabric, floor | [polyhaven.com/textures](https://polyhaven.com/textures) — CC0 |
| Space HDRI environment map | [polyhaven.com/hdris](https://polyhaven.com/hdris) — CC0, load via RGBELoader |

---

## Verification Checklist

1. Open each page — EVA and Microgravity absent from all scenario dropdowns
2. No mention of "voice stress", "voice recognition", or microphone icon anywhere in the UI
3. Sleeping bag label (not mattress) appears in sensor panels and system cards
4. Floors appear light gray/white across all 7 modules
5. First-person mode — wider FOV, taller eye height
6. Corridors — handrails on both sides; green scan-line sensor frames at both doorway ends
7. Hub — anchor post with grab rings; pupilometer device on one wall; varied-height screens; amber foot pegs; D-rings; no chairs or table
8. Living quarters — sleeping bag shape + pulsing sensor dot grid + wall sensor frame + grab bar above bag
9. Every module — two perimeter handrail rings at 1.1m and 2.0m
10. Click a window panel — selector appears; 5 views cycle with distinct textures and sounds; Opaque reverts
11. Mission time slider full cycle — ceiling panels shift warm → white → amber → dim blue
12. Orbit view — perimeter pillars visible in each dome
