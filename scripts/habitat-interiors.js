/**
 * @fileoverview Habitat Interiors — Procedural furnishings for each module type.
 * Every module includes distributed greenery (planters, hanging plants, wall gardens)
 * and circadian-responsive interior lighting.
 *
 * Systems are represented as glowing sensor hotspots that can be clicked for info.
 */
import * as THREE from 'three';

/* ============================================
   Shared Materials
   ============================================ */

const MATERIALS = {
    metal:        new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.7,  roughness: 0.3  }),
    metalDark:    new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.85, roughness: 0.15 }),
    metalBrushed: new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.6,  roughness: 0.5  }),
    plastic:      new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.55, metalness: 0.05 }),
    plasticDark:  new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.6,  metalness: 0.05 }),
    fabric:       new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.9,  metalness: 0.0  }),
    fabricBlue:   new THREE.MeshStandardMaterial({ color: 0x3d5a7a, roughness: 0.9,  metalness: 0.0  }),
    rubberGrip:   new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0,  metalness: 0.0  }),
    wood:         new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.65, metalness: 0.0  }),
    glass:        new THREE.MeshPhysicalMaterial({ color: 0x88ccff, roughness: 0.05, metalness: 0.1, transmission: 0.5, thickness: 0.2, transparent: true, opacity: 0.4 }),
    screen:       new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x38bdf8, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.5 }),
    greenery:     new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.8,  metalness: 0.0  }),
    soil:         new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95, metalness: 0.0  }),
    sensor:       new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.8 })
};

/* ============================================
   Shared Geometries (reuse across all modules)
   ============================================ */

const SHARED_GEO = {
    hotspotSphere: new THREE.SphereGeometry(0.1, 6, 6),
    hotspotRing:   new THREE.TorusGeometry(0.15, 0.02, 6, 12),
    planterPot:    new THREE.CylinderGeometry(0.25, 0.2, 0.3, 6),
    planterSoil:   new THREE.CylinderGeometry(0.23, 0.23, 0.05, 6),
    planterFoliage:new THREE.SphereGeometry(0.18, 4, 4),
    hangPot:       new THREE.CylinderGeometry(0.18, 0.15, 0.2, 6),
    hangCord:      new THREE.CylinderGeometry(0.015, 0.015, 0.5, 3),
    leaf:          new THREE.SphereGeometry(0.1, 3, 3),
    wallLeaf:      new THREE.SphereGeometry(0.08, 3, 3),
    fixturePanel:  new THREE.PlaneGeometry(0.6, 0.3),
    lodBox:        new THREE.BoxGeometry(1, 1, 1),
};

/* ============================================
   Procedural Canvas Texture Generators
   ============================================ */

const _floorTexCache = new Map();

function getFloorTexture(moduleType) {
    if (_floorTexCache.has(moduleType)) return _floorTexCache.get(moduleType);
    const tex = _buildFloorTex(moduleType);
    _floorTexCache.set(moduleType, tex);
    return tex;
}

function _buildFloorTex(moduleType) {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');

    if (moduleType === 'hub' || moduleType === 'mechanical' || moduleType === 'containment') {
        // Dark industrial deck plate — 16×16 grid with scuff marks
        ctx.fillStyle = '#4a4f58'; ctx.fillRect(0, 0, S, S);
        const cell = S / 16;
        ctx.strokeStyle = 'rgba(30,33,40,0.9)'; ctx.lineWidth = 1;
        for (let i = 0; i <= 16; i++) {
            ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, S); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(S, i * cell); ctx.stroke();
        }
        // Subtle cell fill variation
        for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
            const v = Math.random() * 18 - 9;
            const base = 74 + v;
            ctx.fillStyle = `rgba(${base},${base + 3},${base + 8},0.35)`;
            ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
        }
        // Scuff marks
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 18; i++) {
            const x = Math.random() * S, y = Math.random() * S;
            const a = Math.random() * Math.PI;
            const l = 6 + Math.random() * 14;
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
        }

    } else if (moduleType === 'living') {
        // Soft woven matting — parallel horizontal lines
        ctx.fillStyle = '#7a7f88'; ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = 'rgba(200,205,215,0.28)'; ctx.lineWidth = 1;
        for (let y = 0; y < S; y += 4) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
        }
        // Cross-weave lighter verticals
        ctx.strokeStyle = 'rgba(220,225,235,0.12)'; ctx.lineWidth = 0.5;
        for (let x = 0; x < S; x += 8) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
        }
        // Faint pressure circle marks where sleeping platform legs sit
        ctx.strokeStyle = 'rgba(100,105,115,0.5)'; ctx.lineWidth = 1;
        for (const [px, py] of [[0.35, 0.45], [0.35, 0.55], [0.65, 0.45], [0.65, 0.55]]) {
            ctx.beginPath(); ctx.arc(px * S, py * S, 8, 0, Math.PI * 2); ctx.stroke();
        }

    } else if (moduleType === 'communal') {
        // Warm tan synthetic linoleum
        ctx.fillStyle = '#c2a87e'; ctx.fillRect(0, 0, S, S);
        // Subtle diagonal sheen
        const sheen = ctx.createLinearGradient(0, 0, S, S);
        sheen.addColorStop(0, 'rgba(255,245,225,0.12)');
        sheen.addColorStop(0.5, 'rgba(255,245,225,0)');
        sheen.addColorStop(1, 'rgba(255,245,225,0.08)');
        ctx.fillStyle = sheen; ctx.fillRect(0, 0, S, S);
        // Grain noise dots
        for (let i = 0; i < 280; i++) {
            ctx.fillStyle = `rgba(${150 + (Math.random() * 30 | 0)},${130 + (Math.random() * 20 | 0)},90,0.38)`;
            const sz = 1 + Math.random();
            ctx.fillRect(Math.random() * S, Math.random() * S, sz, sz);
        }

    } else if (moduleType === 'research') {
        // White lab-grade epoxy — clean with spill stains
        ctx.fillStyle = '#eaeef2'; ctx.fillRect(0, 0, S, S);
        const shine = ctx.createLinearGradient(0, 0, S * 0.7, S * 0.7);
        shine.addColorStop(0, 'rgba(255,255,255,0.14)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shine; ctx.fillRect(0, 0, S, S);
        // Faint grid lines (lab grid marks)
        ctx.strokeStyle = 'rgba(180,185,195,0.35)'; ctx.lineWidth = 0.5;
        for (let i = 0; i < S; i += 16) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
        }
        // Sample spill stains
        for (const [sx, sy, sr] of [[0.3, 0.6, 12], [0.7, 0.35, 8], [0.5, 0.7, 6]]) {
            const g = ctx.createRadialGradient(sx*S, sy*S, 0, sx*S, sy*S, sr);
            g.addColorStop(0, 'rgba(150,200,240,0.18)');
            g.addColorStop(1, 'rgba(150,200,240,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        }

    } else if (moduleType === 'cultivating') {
        // Drainage grating — dark slots with green tinge
        ctx.fillStyle = '#2e3330'; ctx.fillRect(0, 0, S, S);
        const slotW = 6, slotH = 18, cols = 10, rows = 10;
        const cw = S / cols, ch = S / rows;
        ctx.fillStyle = 'rgba(8,12,8,0.85)';
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const x = c * cw + (cw - slotW) / 2;
            const y = r * ch + (ch - slotH) / 2;
            ctx.fillRect(x, y, slotW, slotH);
        }
        // Moss/algae green tinge
        const moss = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S * 0.55);
        moss.addColorStop(0, 'rgba(40,90,40,0.22)');
        moss.addColorStop(1, 'rgba(40,90,40,0)');
        ctx.fillStyle = moss; ctx.fillRect(0, 0, S, S);
        // Moisture sheen
        ctx.fillStyle = 'rgba(80,140,100,0.06)'; ctx.fillRect(0, 0, S, S);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
}

function generatePanelTexture() {
    const S = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, S, S);
    // Sub-panel grid lines
    ctx.strokeStyle = 'rgba(60,60,60,0.65)'; ctx.lineWidth = 0.8;
    for (const x of [S*0.33, S*0.67]) {
        ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, S-4); ctx.stroke();
    }
    for (const y of [S*0.33, S*0.67]) {
        ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(S-4, y); ctx.stroke();
    }
    // Perimeter groove
    ctx.strokeStyle = 'rgba(50,50,50,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, S-4, S-4);
    // Corner bolt circles
    ctx.fillStyle = 'rgba(55,55,55,0.75)';
    for (const [bx, by] of [[7,7],[S-7,7],[7,S-7],[S-7,S-7]]) {
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

let _panelTexture = null;
function getPanelTexture() {
    if (!_panelTexture) _panelTexture = generatePanelTexture();
    return _panelTexture;
}

function generateEquipmentTexture(type) {
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');

    const configs = {
        power:   { base: '#2a2820', accent: '#ffaa00', label: 'PWR' },
        water:   { base: '#1a2530', accent: '#00ccff', label: 'H₂O' },
        air:     { base: '#1c2030', accent: '#4488ff', label: 'AIR' },
        thermal: { base: '#2a1a14', accent: '#ff6600', label: 'THM' }
    };
    const cfg = configs[type] || configs.power;

    ctx.fillStyle = cfg.base; ctx.fillRect(0, 0, S, S);

    // Vent slots — two rows of horizontal slots
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    for (let row = 0; row < 2; row++) {
        const baseY = 18 + row * 14;
        for (let s = 0; s < 5; s++) {
            ctx.fillRect(10 + s * 22, baseY, 16, 5);
        }
    }

    // Indicator LED grid (3 cols × 4 rows)
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        const on = Math.random() > 0.3;
        ctx.fillStyle = on ? cfg.accent : 'rgba(60,60,60,0.8)';
        ctx.beginPath();
        ctx.arc(10 + c * 14, 55 + r * 14, 4, 0, Math.PI * 2);
        ctx.fill();
        if (on) {
            ctx.fillStyle = cfg.accent.replace(')', ',0.3)').replace('rgb', 'rgba');
            ctx.beginPath();
            ctx.arc(10 + c * 14, 55 + r * 14, 7, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Digital readout rectangle
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(50, 48, 68, 24);
    ctx.strokeStyle = cfg.accent + '88'; ctx.lineWidth = 1;
    ctx.strokeRect(50, 48, 68, 24);
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 11px monospace';
    ctx.fillText((Math.random() * 99 + 1 | 0) + '%', 57, 65);

    // Label strip at bottom
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, S - 20, S, 20);
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(cfg.label, 8, S - 6);

    // Access panel seam
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(S * 0.62, 4); ctx.lineTo(S * 0.62, S - 4); ctx.stroke();

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

function generateLabBenchTexture() {
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#d8dce0'; ctx.fillRect(0, 0, S, S);
    // Subtle directional sheen
    const sh = ctx.createLinearGradient(0, 0, S, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0.1)');
    sh.addColorStop(0.5, 'rgba(255,255,255,0.0)');
    sh.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, S, S);
    // Sample position circles
    ctx.strokeStyle = 'rgba(160,165,175,0.45)'; ctx.lineWidth = 0.8;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
        ctx.beginPath();
        ctx.arc(8 + c * 16, 24 + r * 24, 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    // Ruler tick marks along bottom edge
    ctx.strokeStyle = 'rgba(120,125,135,0.5)'; ctx.lineWidth = 0.8;
    for (let x = 0; x < S; x += 8) {
        const h = x % 32 === 0 ? 6 : 3;
        ctx.beginPath(); ctx.moveTo(x, S - h - 2); ctx.lineTo(x, S - 2); ctx.stroke();
    }
    // Spill stain
    const sp = ctx.createRadialGradient(S*0.65, S*0.55, 0, S*0.65, S*0.55, 14);
    sp.addColorStop(0, 'rgba(140,185,220,0.22)');
    sp.addColorStop(1, 'rgba(140,185,220,0)');
    ctx.fillStyle = sp; ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    return tex;
}

/* ============================================
   Cable Run Helper
   ============================================ */

function addCableRun(group, points, thickness = 0.015, color = 0x2a2a3a) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 });
    const geo = new THREE.CylinderGeometry(thickness, thickness, 1, 4);
    for (let i = 0; i < points.length - 1; i++) {
        const a = new THREE.Vector3(...points[i]);
        const b = new THREE.Vector3(...points[i + 1]);
        const len = a.distanceTo(b);
        const mid = a.clone().lerp(b, 0.5);
        const seg = new THREE.Mesh(geo, mat);
        seg.scale.y = len;
        seg.position.copy(mid);
        seg.lookAt(b);
        seg.rotateX(Math.PI / 2);
        group.add(seg);
    }
}

/* ============================================
   Equipment Unit Builder (Mechanical module)
   ============================================ */

function createEquipmentUnit(type) {
    const group = new THREE.Group();
    const ledColors = { power: 0xffaa00, water: 0x00ccff, air: 0x4488ff, thermal: 0xff6600 };
    const ledColor = ledColors[type] || 0xffffff;

    // Main housing with canvas texture
    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.5, 0.8),
        new THREE.MeshStandardMaterial({
            map: generateEquipmentTexture(type),
            color: 0xffffff,
            metalness: 0.55, roughness: 0.45
        })
    );
    group.add(housing);

    // Venting panel on top
    const ventPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.05, 0.68),
        MATERIALS.metalDark
    );
    ventPanel.position.y = 0.77;
    group.add(ventPanel);

    // 3 status LEDs on front face
    for (let l = 0; l < 3; l++) {
        const led = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 6, 6),
            new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 0.85 })
        );
        led.position.set(0.42, 0.25 + l * 0.15, 0.41);
        group.add(led);
    }

    // Cooling pipe stubs on sides
    for (const side of [-1, 1]) {
        const pipe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6),
            MATERIALS.metalDark
        );
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(side * 0.61, 0.45, 0.2);
        group.add(pipe);
        // Pipe end cap
        const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.03, 6),
            MATERIALS.metal
        );
        cap.rotation.z = Math.PI / 2;
        cap.position.set(side * 0.725, 0.45, 0.2);
        group.add(cap);
    }

    // Front foot-plate
    const foot = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.06, 0.85),
        MATERIALS.metalDark
    );
    foot.position.y = -0.78;
    group.add(foot);

    return group;
}

/* ============================================
   Greenery Helpers (used in every module)
   ============================================ */

function createPlanter(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Pot
    const pot = new THREE.Mesh(SHARED_GEO.planterPot, MATERIALS.metal);
    pot.position.y = 0.15;
    group.add(pot);

    // Soil
    const soil = new THREE.Mesh(SHARED_GEO.planterSoil, MATERIALS.soil);
    soil.position.y = 0.32;
    group.add(soil);

    // Plant (simplified foliage — single merged shape)
    const foliage = new THREE.Mesh(SHARED_GEO.planterFoliage, MATERIALS.greenery);
    foliage.position.y = 0.5;
    group.add(foliage);
    return group;
}

function createHangingPlant(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Hanging cord
    const cord = new THREE.Mesh(SHARED_GEO.hangCord, MATERIALS.metal);
    cord.position.y = 0.25;
    group.add(cord);

    // Hanging pot
    const pot = new THREE.Mesh(SHARED_GEO.hangPot, MATERIALS.metal);
    group.add(pot);

    // Trailing foliage (simplified — 2 leaves)
    for (let i = 0; i < 2; i++) {
        const leaf = new THREE.Mesh(SHARED_GEO.leaf, MATERIALS.greenery);
        leaf.position.set(
            (Math.random() - 0.5) * 0.3,
            -0.1 - Math.random() * 0.3,
            (Math.random() - 0.5) * 0.3
        );
        group.add(leaf);
    }

    return group;
}

function createWallGarden(x, y, z, width, height) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Frame
    const frameGeo = new THREE.BoxGeometry(width, height, 0.1);
    const frame = new THREE.Mesh(frameGeo, MATERIALS.metal);
    group.add(frame);

    // Grid of small plants (reduced density)
    const cols = Math.floor(width / 0.4);
    const rows = Math.floor(height / 0.4);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (Math.random() > 0.6) continue;
            const leaf = new THREE.Mesh(SHARED_GEO.wallLeaf, MATERIALS.greenery);
            leaf.position.set(
                -width / 2 + 0.2 + c * 0.4,
                -height / 2 + 0.2 + r * 0.4,
                0.08
            );
            group.add(leaf);
        }
    }

    return group;
}

/**
 * Add distributed greenery to any module.
 * Called for every module type to ensure greenery is throughout the entire habitat.
 */
function addGreenery(group, radius) {
    const r = radius * 0.6;

    // Floor planters at cardinal points (2 instead of 4)
    group.add(createPlanter(r, 0, 0));
    group.add(createPlanter(-r, 0, 0));

    // Hanging plants (1 instead of 2)
    const hangHeight = radius * 0.7;
    group.add(createHangingPlant(r * 0.5, hangHeight, r * 0.5));

    // Wall garden panel (rotated to face inward)
    const wg = createWallGarden(0, radius * 0.4, -r * 0.9, 1.2, 0.6);
    group.add(wg);
}

/* ============================================
   Sensor Hotspot
   ============================================ */

function createSensorHotspot(x, y, z, sensorId) {
    const mesh = new THREE.Mesh(SHARED_GEO.hotspotSphere, MATERIALS.sensor.clone());
    mesh.position.set(x, y, z);
    mesh.userData.sensorId = sensorId;
    mesh.userData.isHotspot = true;

    // Glow ring
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.6
    });
    const ring = new THREE.Mesh(SHARED_GEO.hotspotRing, ringMat);
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);

    return mesh;
}

/* ============================================
   Interior Lighting (Circadian-responsive)
   ============================================ */

function addInteriorLights(group, radius) {
    // Warm ceiling light
    const ceilingLight = new THREE.PointLight(0xffeedd, 0.6, radius * 2.5);
    ceilingLight.position.set(0, radius * 0.65, 0);
    ceilingLight.userData.isCircadianLight = true;
    group.add(ceilingLight);

    // Accent strip glow — emissive-only ring (no PointLight) to save draw calls
    const stripGeo = new THREE.TorusGeometry(radius * 0.8, 0.03, 4, 16);
    const stripMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.6
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.rotation.x = Math.PI / 2;
    strip.position.y = 0.06;
    group.add(strip);

    // Cove floor strip — wayfinding light at floor perimeter
    const cove = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.92, 0.025, 4, 32),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.25, transparent: true, opacity: 0.6 })
    );
    cove.rotation.x = Math.PI / 2;
    cove.position.y = 0.04;
    cove.userData.isCoveStrip = true;
    group.add(cove);

    // Vertical accent light columns — 4 thin emissive cylinders
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, radius * 0.65, 6),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.3, transparent: true, opacity: 0.5 })
        );
        col.position.set(Math.cos(a) * radius * 0.82, radius * 0.325, Math.sin(a) * radius * 0.82);
        col.userData.isAccentColumn = true;
        group.add(col);
    }
}

/* ============================================
   Module-specific Furnishing
   ============================================ */

function furnishHub(group, radius) {
    // Central anchor post with grab rings (zero-g stability)
    const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, radius * 0.5, 8), MATERIALS.metal
    );
    post.position.y = radius * 0.25;
    group.add(post);

    for (let i = 0; i < 3; i++) {
        const grabRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.14, 0.025, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.8, roughness: 0.2 })
        );
        grabRing.position.y = 0.5 + i * 0.7;
        grabRing.rotation.x = Math.PI / 2;
        post.add(grabRing);
    }

    // 4 wall-mounted screens at varied floating-accessible heights
    const screenHeights = [1.0, 1.6, 2.2, 1.3];
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const screen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.05), MATERIALS.screen);
        screen.position.set(Math.cos(angle) * radius * 0.72, screenHeights[i], Math.sin(angle) * radius * 0.72);
        screen.lookAt(0, screenHeights[i], 0);
        screen.userData.isScreen = true;
        group.add(screen);
    }

    // 6 foot restraint pegs (amber — easy to spot)
    for (let i = 0; i < 6; i++) {
        const pegAngle = (i / 6) * Math.PI * 2;
        const peg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.4 })
        );
        peg.position.set(Math.cos(pegAngle) * radius * 0.5, 0.06, Math.sin(pegAngle) * radius * 0.5);
        group.add(peg);
    }

    // 6 D-ring tether attachment points at wall height 1.4m
    for (let i = 0; i < 6; i++) {
        const ringAngle = (i / 6) * Math.PI * 2;
        const dring = new THREE.Mesh(
            new THREE.TorusGeometry(0.07, 0.018, 6, 12),
            new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.9, roughness: 0.1 })
        );
        dring.position.set(Math.cos(ringAngle) * radius * 0.82, 1.4, Math.sin(ringAngle) * radius * 0.82);
        dring.lookAt(0, 1.4, 0);
        group.add(dring);
    }

    // Pupilometer device — wall-mounted at eye level on one wall
    const pupilAngle = Math.PI * 0.5;
    const pupilHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.18, 0.12), MATERIALS.plastic
    );
    pupilHousing.position.set(Math.cos(pupilAngle) * radius * 0.7, 1.55, Math.sin(pupilAngle) * radius * 0.7);
    pupilHousing.lookAt(0, 1.55, 0);
    pupilHousing.userData.label = 'Pupilometer';
    group.add(pupilHousing);

    for (const offset of [-0.07, 0.07]) {
        const lens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.1 })
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(offset, 0, 0.065);
        pupilHousing.add(lens);
    }
    const statusLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.8 })
    );
    statusLed.position.set(0.08, -0.06, 0.065);
    pupilHousing.add(statusLed);

    // Emergency O2 box on wall (red with white cross)
    const o2Angle = Math.PI * 1.25;
    const o2Box = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.2, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, metalness: 0.3 })
    );
    o2Box.position.set(Math.cos(o2Angle) * radius * 0.75, 1.6, Math.sin(o2Angle) * radius * 0.75);
    o2Box.lookAt(0, 1.6, 0);
    group.add(o2Box);
    // White cross symbol
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.01), crossMat);
    crossH.position.z = 0.055;
    o2Box.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.01), crossMat);
    crossV.position.z = 0.055;
    o2Box.add(crossV);

    // 3 tool pouches on central post
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75, metalness: 0.1 });
    for (let i = 0; i < 3; i++) {
        const pouch = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.12, 0.06),
            pouchMat
        );
        pouch.position.set(0.1, 0.35 + i * 0.22, 0);
        post.add(pouch);
    }

    // Sensor hotspots — near pupilometer device
    group.add(createSensorHotspot(1.5, 1.4, 0, 'pupilDilationMm'));
    group.add(createSensorHotspot(-1.5, 1.4, 0, 'cognitiveLoad'));
}

function furnishCommunal(group, radius) {
    // Dining table
    const tableGeo = new THREE.BoxGeometry(2.5, 0.08, 1.2);
    const table = new THREE.Mesh(tableGeo, MATERIALS.wood);
    table.position.y = 0.75;
    table.castShadow = true;
    group.add(table);

    // Table legs
    for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) {
        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6);
        const leg = new THREE.Mesh(legGeo, MATERIALS.metal);
        leg.position.set(x, 0.37, z);
        group.add(leg);
    }

    // Chairs (simple cubes)
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const cx = Math.cos(angle) * 1.8;
        const cz = Math.sin(angle) * 1.8;
        const chairSeat = new THREE.BoxGeometry(0.4, 0.05, 0.4);
        const chair = new THREE.Mesh(chairSeat, MATERIALS.fabricBlue);
        chair.position.set(cx, 0.45, cz);
        group.add(chair);

        const backGeo = new THREE.BoxGeometry(0.4, 0.5, 0.05);
        const back = new THREE.Mesh(backGeo, MATERIALS.fabricBlue);
        const backOffset = new THREE.Vector3(cx, 0.7, cz).normalize().multiplyScalar(0.18);
        back.position.set(cx + backOffset.x, 0.7, cz + backOffset.z);
        back.lookAt(0, 0.7, 0);
        group.add(back);
    }

    // Recreation screen
    const screenGeo = new THREE.BoxGeometry(2.0, 1.2, 0.05);
    const screen = new THREE.Mesh(screenGeo, MATERIALS.screen);
    screen.position.set(0, 1.5, -radius * 0.65);
    group.add(screen);

    // Sensor hotspots
    group.add(createSensorHotspot(radius * 0.5, 1.0, 0, 'socialScore'));
    group.add(createSensorHotspot(-radius * 0.5, 1.0, 0, 'routineDeviation'));
}

function furnishLiving(group, radius) {
    // Sleeping platform (wall-mounted berth)
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.06, 2.1),
        new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 0.5, roughness: 0.4 })
    );
    platform.position.set(radius * 0.3, 0.06, 0);
    platform.castShadow = true;
    group.add(platform);

    // Sleeping bag (mummy-bag shape)
    const bag = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 1.35, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.75, metalness: 0.05 })
    );
    bag.position.set(radius * 0.3, 0.32, 0);
    bag.rotation.z = Math.PI / 2;
    bag.userData.isSleepingBag = true;
    group.add(bag);

    // Sleep monitoring scan lines — EEG-style visualization above bag
    const scanLineMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.35,
        transparent: true, opacity: 0.35
    });
    for (let l = 0; l < 10; l++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.002, 0.08), scanLineMat);
        line.position.set(radius * 0.3, 0.72, -0.7 + l * 0.155);
        line.userData.isSleepGrid = true;
        line.userData.sleepGridIndex = l;
        group.add(line);
    }

    // Embedded pressure sensor dot grid (3×5 on platform surface)
    const dotMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.6 });
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), dotMat);
            dot.position.set(radius * 0.3 + (row - 1) * 0.25, 0.095, -0.7 + col * 0.35);
            dot.userData.isSleepDot = true;
            dot.userData.sleepDotPhase = row * 5 + col;
            group.add(dot);
        }
    }

    // Wall-mounted motion sensor frame above sleeping bag
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.6, roughness: 0.3 });
    const frameNodeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.7 });
    const frameGroup = new THREE.Group();
    frameGroup.position.set(radius * 0.45, 1.3, 0);
    frameGroup.rotation.y = -Math.PI / 2;
    // Frame bars
    const fTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.05), frameMat);
    fTop.position.set(0, 0.4, 0);
    frameGroup.add(fTop);
    const fBot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.05), frameMat);
    fBot.position.set(0, -0.4, 0);
    frameGroup.add(fBot);
    const fLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.05), frameMat);
    fLeft.position.set(-0.52, 0, 0);
    frameGroup.add(fLeft);
    const fRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.05), frameMat);
    fRight.position.set(0.52, 0, 0);
    frameGroup.add(fRight);
    // Corner sensor nodes
    for (const [cx, cy] of [[-0.52, 0.4], [0.52, 0.4], [-0.52, -0.4], [0.52, -0.4]]) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), frameNodeMat.clone());
        node.position.set(cx, cy, 0);
        node.userData.isDoorCornerNode = true;
        frameGroup.add(node);
    }
    group.add(frameGroup);

    // Grab bar above sleeping bag
    const grabBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 2.0),
        new THREE.MeshStandardMaterial({ color: 0xc8cdd4, metalness: 0.75, roughness: 0.25 })
    );
    grabBar.position.set(radius * 0.3 - 0.5, 0.75, 0);
    group.add(grabBar);

    // Desk
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.6), MATERIALS.wood);
    desk.position.set(-radius * 0.35, 0.75, 0);
    group.add(desk);

    // Personal locker
    const locker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), MATERIALS.metal);
    locker.position.set(-radius * 0.4, 0.75, radius * 0.4);
    locker.castShadow = true;
    group.add(locker);
    // Locker door handle bar
    const lockerHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6),
        MATERIALS.metalBrushed
    );
    lockerHandle.rotation.z = Math.PI / 2;
    lockerHandle.position.set(-radius * 0.4 + 0.27, 0.75, radius * 0.4 - 0.01);
    group.add(lockerHandle);
    // Locker vertical door seam
    const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 1.48, 0.01),
        MATERIALS.metalDark
    );
    seam.position.set(-radius * 0.4, 0.75, radius * 0.4 - 0.256);
    group.add(seam);

    // Tablet on desk (thin glowing slab)
    const tabletScreen = MATERIALS.screen.clone();
    tabletScreen.emissiveIntensity = 0.45;
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.16), tabletScreen);
    tablet.position.set(-radius * 0.35, 0.78, -0.05);
    tablet.rotation.y = 0.18;
    group.add(tablet);

    // Water bottle beside desk
    const bottleMat = new THREE.MeshPhysicalMaterial({
        color: 0x88aacc, metalness: 0.1, roughness: 0.15,
        transmission: 0.55, thickness: 0.12, transparent: true, opacity: 0.75
    });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), bottleMat);
    bottle.position.set(-radius * 0.35 + 0.38, 0.86, 0.12);
    group.add(bottle);
    // Bottle cap
    const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.043, 0.043, 0.03, 8),
        MATERIALS.plasticDark
    );
    cap.position.set(-radius * 0.35 + 0.38, 0.98, 0.12);
    group.add(cap);

    // Photo frame on wall above desk
    const frameMat2 = new THREE.MeshStandardMaterial({ color: 0x8b7355, metalness: 0.3, roughness: 0.6 });
    const photoFrame = new THREE.Group();
    photoFrame.position.set(-radius * 0.5 + 0.02, 1.35, -0.05);
    photoFrame.rotation.y = Math.PI / 2;
    const photoBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.02), frameMat2);
    photoFrame.add(photoBack);
    // Photo surface (slight emissive warm tone)
    const photoSurf = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.10, 0.005),
        new THREE.MeshStandardMaterial({ color: 0xffd8a0, emissive: 0xffd8a0, emissiveIntensity: 0.05, roughness: 0.8 })
    );
    photoSurf.position.z = 0.013;
    photoFrame.add(photoSurf);
    photoFrame.rotation.z = 0.04; // slight tilt for lived-in feel
    group.add(photoFrame);

    // Cable run from desk to wall (3-point path)
    addCableRun(group,
        [[-radius * 0.35, 0.78, 0], [-radius * 0.38, 0.62, 0.05], [-radius * 0.5 + 0.02, 0.55, 0.1]],
        0.012, 0x2a2a3a
    );

    // Grab bar — use metalBrushed
    grabBar.material = MATERIALS.metalBrushed;

    // Sensor hotspots
    group.add(createSensorHotspot(radius * 0.3, 0.6, -1, 'sleepMinutes'));
    group.add(createSensorHotspot(radius * 0.3, 0.6,  1, 'restlessnessScore'));
    group.add(createSensorHotspot(radius * 0.3, 0.6,  0, 'circadianAlignment'));
}

function furnishResearch(group, radius) {
    // Lab bench — white epoxy surface with canvas texture
    const benchGeo = new THREE.BoxGeometry(3.0, 0.08, 0.9);
    const benchMat = new THREE.MeshStandardMaterial({
        map: generateLabBenchTexture(),
        color: 0xffffff,
        roughness: 0.55, metalness: 0.05
    });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(0, 0.9, radius * 0.3);
    bench.castShadow = true;
    group.add(bench);

    // Microscope (cylinder + small lens)
    const scopeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6);
    const scope = new THREE.Mesh(scopeGeo, MATERIALS.plasticDark);
    scope.position.set(0.5, 1.2, radius * 0.3);
    group.add(scope);

    const eyeGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.2, 6);
    const eye = new THREE.Mesh(eyeGeo, MATERIALS.plasticDark);
    eye.position.set(0.5, 1.5, radius * 0.3);
    eye.rotation.z = Math.PI / 6;
    group.add(eye);

    // Data screens
    for (let i = 0; i < 3; i++) {
        const screenGeo = new THREE.BoxGeometry(0.8, 0.6, 0.03);
        const screen = new THREE.Mesh(screenGeo, MATERIALS.screen);
        screen.position.set(-1.0 + i * 1.0, 1.6, -radius * 0.5);
        screen.userData.isScreen = true;
        group.add(screen);
    }

    // Specimen tray with 4 glass tubes (MeshPhysicalMaterial transmission)
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.5, metalness: 0.2 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.12), trayMat);
    tray.position.set(-0.65, 0.95, radius * 0.3 - 0.25);
    group.add(tray);
    const tubeMat = new THREE.MeshPhysicalMaterial({
        color: 0xcceecc, roughness: 0.05, metalness: 0.0,
        transmission: 0.7, thickness: 0.08, transparent: true, opacity: 0.75
    });
    for (let t = 0; t < 4; t++) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), tubeMat);
        tube.position.set(-0.78 + t * 0.18, 1.01, radius * 0.3 - 0.25);
        group.add(tube);
        // Liquid in tube (partial fill)
        const liqColors = [0x88ee44, 0xee4488, 0x44aaee, 0xeecc44];
        const liq = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 0.06, 8),
            new THREE.MeshStandardMaterial({ color: liqColors[t], emissive: liqColors[t], emissiveIntensity: 0.15, transparent: true, opacity: 0.85 })
        );
        liq.position.set(-0.78 + t * 0.18, 0.965, radius * 0.3 - 0.25);
        group.add(liq);
    }

    // Centrifuge — short cylinder base + tapered lid
    const centBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.2, 0.22, 12),
        MATERIALS.plasticDark
    );
    centBase.position.set(-1.1, 1.02, radius * 0.3 + 0.15);
    group.add(centBase);
    const centLid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.1, 12),
        MATERIALS.metalBrushed
    );
    centLid.position.set(-1.1, 1.18, radius * 0.3 + 0.15);
    group.add(centLid);
    // Centrifuge status LED
    const centLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9 })
    );
    centLed.position.set(-1.1 + 0.18, 1.08, radius * 0.3 + 0.25);
    group.add(centLed);

    // Overhead anchor rail above bench — metalBrushed
    const anchorRail = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.05, 0.05),
        MATERIALS.metalBrushed
    );
    anchorRail.position.set(0, 1.9, radius * 0.3);
    group.add(anchorRail);

    // Cable bundle from anchor rail down to bench
    addCableRun(group,
        [[0.5, 1.9, radius * 0.3 - 0.02], [0.5, 1.55, radius * 0.3 - 0.05], [0.5, 0.95, radius * 0.3 - 0.1]],
        0.018, 0x2a2a3a
    );

    // Sensor hotspots
    group.add(createSensorHotspot(1.5, 1.0, radius * 0.3, 'cognitiveLoad'));
}

function furnishCultivating(group, radius) {
    // Hydroponic racks
    for (let row = 0; row < 3; row++) {
        const rackGeo = new THREE.BoxGeometry(2.5, 0.05, 0.6);
        const rack = new THREE.Mesh(rackGeo, MATERIALS.metal);
        rack.position.set(0, 0.4 + row * 0.6, -radius * 0.3 + row * 0.6);
        group.add(rack);

        // Plants on rack
        for (let p = 0; p < 8; p++) {
            const plantGeo = new THREE.ConeGeometry(0.08, 0.2 + Math.random() * 0.15, 5);
            const plant = new THREE.Mesh(plantGeo, MATERIALS.greenery);
            plant.position.set(
                -1.0 + p * 0.3,
                0.5 + row * 0.6 + 0.1,
                -radius * 0.3 + row * 0.6
            );
            group.add(plant);
        }
    }

    // Water trough
    const troughGeo = new THREE.BoxGeometry(2.5, 0.15, 0.3);
    const troughMat = new THREE.MeshPhysicalMaterial({
        color: 0x4488aa,
        roughness: 0.1,
        metalness: 0.2,
        transmission: 0.4,
        transparent: true,
        opacity: 0.5
    });
    const trough = new THREE.Mesh(troughGeo, troughMat);
    trough.position.set(0, 0.1, radius * 0.4);
    group.add(trough);

    // Grow lights (magenta tint)
    const growLightMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xff66aa, emissive: 0xff66aa, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 })
    );
    growLightMesh.position.set(0, radius * 0.6, 0);
    growLightMesh.userData.isGrowLight = true;
    group.add(growLightMesh);

    const growLight = new THREE.PointLight(0xff66aa, 0.3, 6);
    growLight.position.set(0, radius * 0.6, 0);
    group.add(growLight);

    // Sensor hotspots
    group.add(createSensorHotspot(1.2, 0.8, 0, 'greeneryExposureMin'));
    group.add(createSensorHotspot(-1.2, 0.8, 0, 'lightSpectrumScore'));
}

function furnishMechanical(group, radius) {
    const types = ['power', 'water', 'air', 'thermal'];
    const unitPositions = [];

    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
        const r = radius * 0.45;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        const unit = createEquipmentUnit(types[i]);
        unit.position.set(x, 0.78, z);
        // Face unit toward center
        unit.lookAt(0, 0.78, 0);
        unit.castShadow = true;
        group.add(unit);
        unitPositions.push([x, z]);
    }

    // Overhead manifold pipes — two crossing pipes at 2.2m
    const manifoldLen = radius * 1.6;
    for (const rotY of [0, Math.PI / 2]) {
        const manifold = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, manifoldLen, 6),
            MATERIALS.metalDark
        );
        manifold.rotation.z = Math.PI / 2;
        manifold.rotation.y = rotY;
        manifold.position.y = 2.2;
        group.add(manifold);
    }

    // Vertical branch drops from manifold down to each unit
    for (const [x, z] of unitPositions) {
        addCableRun(group,
            [[x, 2.2, z], [x, 1.65, z]],
            0.04, 0x6b7280
        );
        // Bracket clip at top of drop
        const clip = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.06, 0.14),
            MATERIALS.metalDark
        );
        clip.position.set(x, 2.2, z);
        group.add(clip);
    }

    // Electrical cable bundle across ceiling
    addCableRun(group,
        [[-radius * 0.6, 2.35, 0], [0, 2.45, 0], [radius * 0.6, 2.35, 0]],
        0.025, 0x1a1a2e
    );
    addCableRun(group,
        [[0, 2.35, -radius * 0.6], [0, 2.45, 0], [0, 2.35, radius * 0.6]],
        0.025, 0x1a1a2e
    );

    // Sensor hotspots
    group.add(createSensorHotspot(0, 1.0, 0, 'heartRateBpm'));
    group.add(createSensorHotspot(radius * 0.3, 1.0, 0, 'hrvMs'));
    group.add(createSensorHotspot(-radius * 0.3, 1.0, 0, 'edaMicrosiemens'));
    group.add(createSensorHotspot(0, 1.0, radius * 0.3, 'skinTempC'));
}

function furnishContainment(group, radius) {
    // Airlock door frame
    const doorFrameGeo = new THREE.BoxGeometry(1.2, 2.2, 0.15);
    const doorFrame = new THREE.Mesh(doorFrameGeo, MATERIALS.metal);
    doorFrame.position.set(0, 1.1, radius * 0.6);
    group.add(doorFrame);

    // Door panels (split doors)
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        metalness: 0.8,
        roughness: 0.2
    });
    for (const side of [-0.28, 0.28]) {
        const doorGeo = new THREE.BoxGeometry(0.55, 2.0, 0.08);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(side, 1.1, radius * 0.55);
        group.add(door);
    }

    // Warning stripes (yellow/black)
    const stripeGeo = new THREE.BoxGeometry(1.5, 0.1, 0.02);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.2 });
    for (const y of [0.1, 2.15]) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, y, radius * 0.62);
        group.add(stripe);
    }

    // EVA suit silhouettes on racks
    const suitMat = new THREE.MeshStandardMaterial({ color: 0xd8dfe8, metalness: 0.3, roughness: 0.55 });
    const helmetMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0e8f0, metalness: 0.25, roughness: 0.1,
        transmission: 0.3, thickness: 0.15, transparent: true, opacity: 0.82
    });
    for (let i = 0; i < 3; i++) {
        const sx = -radius * 0.4 + i * 0.8;
        const sz = -radius * 0.4;

        // Suit body
        const suitBody = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.18, 0.8, 4, 8),
            suitMat
        );
        suitBody.position.set(sx, 0.95, sz);
        suitBody.castShadow = true;
        group.add(suitBody);

        // Helmet
        const helmet = new THREE.Mesh(
            new THREE.SphereGeometry(0.17, 8, 8),
            helmetMat
        );
        helmet.position.set(sx, 1.7, sz);
        group.add(helmet);

        // Suit legs
        for (const lx of [-0.09, 0.09]) {
            const leg = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.07, 0.42, 4, 6),
                suitMat
            );
            leg.position.set(sx + lx, 0.34, sz);
            group.add(leg);
        }

        // Rack back plate
        const rackBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1.85, 0.06),
            MATERIALS.metalDark
        );
        rackBack.position.set(sx, 0.93, sz - 0.22);
        group.add(rackBack);
    }

    // Decon zone floor glow (emissive disc below UV light)
    const glowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 16),
        new THREE.MeshStandardMaterial({
            color: 0x8844ff, emissive: 0x8844ff, emissiveIntensity: 0.15,
            transparent: true, opacity: 0.25, side: THREE.DoubleSide
        })
    );
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.set(0, 0.02, 0);
    group.add(glowDisc);

    // Decontamination light (UV tint)
    const uvLight = new THREE.PointLight(0x8844ff, 0.2, 5);
    uvLight.position.set(0, radius * 0.5, 0);
    group.add(uvLight);

    // Sensor hotspots
    group.add(createSensorHotspot(0, 1.5, radius * 0.4, 'activityScore'));
}

/* ============================================
   Main Entry Point
   ============================================ */

const FURNISH_MAP = {
    hub: furnishHub,
    communal: furnishCommunal,
    living: furnishLiving,
    research: furnishResearch,
    cultivating: furnishCultivating,
    mechanical: furnishMechanical,
    containment: furnishContainment
};

/* ============================================
   Particle Systems
   ============================================ */

/**
 * Create a generic particle system (BufferGeometry Points).
 * @param {Object} opts
 * @returns {THREE.Points}
 */
function createParticleSystem({ count, radius, color, size, yMin, yMax, opacity }) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        positions[i * 3]     = Math.cos(angle) * r;
        positions[i * 3 + 1] = yMin + Math.random() * (yMax - yMin);
        positions[i * 3 + 2] = Math.sin(angle) * r;
        velocities[i * 3]     = (Math.random() - 0.5) * 0.002;
        velocities[i * 3 + 1] = Math.random() * 0.003 + 0.001;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color,
        size: size || 0.06,
        transparent: true,
        opacity: opacity || 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    points.userData.isParticleSystem = true;
    points.userData.velocities = velocities;
    points.userData.bounds = { radius, yMin, yMax };
    return points;
}

function addCultivatingParticles(group, radius) {
    // Pollen / spore motes drifting up from hydroponic racks
    const pollen = createParticleSystem({
        count: 30,
        radius: radius * 0.7,
        color: 0xccff88,
        size: 0.04,
        yMin: 0.3,
        yMax: radius * 0.5,
        opacity: 0.5
    });
    pollen.userData.particleType = 'pollen';
    group.add(pollen);

    // Water mist around the trough area
    const mist = createParticleSystem({
        count: 20,
        radius: radius * 0.4,
        color: 0xaaddff,
        size: 0.08,
        yMin: 0.0,
        yMax: 0.6,
        opacity: 0.3
    });
    mist.position.z = radius * 0.4; // Near trough
    mist.userData.particleType = 'mist';
    group.add(mist);
}

function addHubParticles(group, radius) {
    // Slow-drifting ambient motes — zero-g suspended dust across full volume
    const ambientMotes = createParticleSystem({
        count: 50,
        radius: radius * 0.7,
        color: 0xf0f4ff,
        size: 0.02,
        yMin: 0,
        yMax: radius * 0.7,
        opacity: 0.25
    });
    ambientMotes.userData.particleType = 'ambientDust';
    group.add(ambientMotes);
}

function addContainmentParticles(group, radius) {
    // Dust motes in the UV decontamination beam
    const dust = createParticleSystem({
        count: 20,
        radius: radius * 0.3,
        color: 0xbb88ff,
        size: 0.03,
        yMin: 0.1,
        yMax: radius * 0.5,
        opacity: 0.4
    });
    dust.userData.particleType = 'uv_dust';
    group.add(dust);
}

/* ============================================
   Circadian Ceiling Fixtures
   ============================================ */

function addCircadianCeilingFixtures(group, radius) {
    const fixtureCount = 5;
    for (let i = 0; i < fixtureCount; i++) {
        const angle = (i / fixtureCount) * Math.PI * 2;
        const r = radius * 0.45;
        const y = radius * 0.72;

        const mat = new THREE.MeshStandardMaterial({
            color: 0xffeedd,
            emissive: 0xffeedd,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9
        });
        const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.5), mat);
        fixture.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        fixture.lookAt(0, y, 0);
        fixture.userData.isCircadianFixture = true;
        group.add(fixture);
    }
}

/* ============================================
   Dome Perimeter Pillars
   ============================================ */

function addDomePerimeterPillars(group, radius) {
    const columnMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.7, roughness: 0.3 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd4, metalness: 0.6, roughness: 0.35 });
    const ledMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.8
    });

    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * radius * 0.88;
        const z = Math.sin(a) * radius * 0.88;
        const height = radius * 0.65;

        // Column
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, height, 8), columnMat);
        col.position.set(x, height / 2, z);
        group.add(col);

        // Base cap
        const baseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8), capMat);
        baseCap.position.set(x, 0.03, z);
        group.add(baseCap);

        // Top cap
        const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), capMat);
        topCap.position.set(x, height + 0.03, z);
        group.add(topCap);

        // LED base strip
        const ledStrip = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 16), ledMat);
        ledStrip.position.set(x, 0.013, z);
        group.add(ledStrip);
    }
}

/* ============================================
   Handrail Helper
   ============================================ */

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

const PARTICLE_MAP = {
    hub: addHubParticles,
    cultivating: addCultivatingParticles,
    containment: addContainmentParticles
};

/**
 * Furnish a dome module group with type-specific interior objects.
 * Also adds distributed greenery, interior lighting, ceiling fixtures,
 * and particle effects to every module.
 * @param {THREE.Group} moduleGroup - The dome module group
 * @param {string} moduleType - Key from MODULE_TYPES
 */
export function furnishModule(moduleGroup, moduleType) {
    const radius = moduleGroup.userData.domeRadius || 5;

    // Apply floor texture to any mesh flagged as the module floor
    moduleGroup.traverse(child => {
        if (child.isMesh && child.userData.isModuleFloor) {
            const tex = getFloorTexture(moduleType);
            child.material = child.material.clone();
            child.material.map = tex;
            child.material.color.set(0xffffff);
            child.material.roughness = 0.82;
            child.material.needsUpdate = true;
        }
    });

    // Apply panel texture to opaque outer panels
    moduleGroup.traverse(child => {
        if (child.isMesh && child.userData.isOuterPanel && child.userData.panelType === 'opaque') {
            const tex = getPanelTexture();
            child.material = child.material.clone();
            child.material.map = tex;
            child.material.needsUpdate = true;
        }
    });

    // Type-specific furnishing — wrap in LOD
    const furnisher = FURNISH_MAP[moduleType];
    if (furnisher) {
        const detailGroup = new THREE.Group();
        furnisher(detailGroup, radius);

        // Simplified LOD level — single box approximation
        const simpleGroup = new THREE.Group();
        const box = new THREE.Mesh(
            SHARED_GEO.lodBox,
            new THREE.MeshStandardMaterial({ color: 0x4a5568, transparent: true, opacity: 0.3 })
        );
        box.scale.set(radius * 0.8, radius * 0.4, radius * 0.8);
        box.position.y = radius * 0.2;
        simpleGroup.add(box);

        const lod = new THREE.LOD();
        lod.addLevel(detailGroup, 0);    // Full detail when close
        lod.addLevel(simpleGroup, 35);   // Simplified box at distance
        lod.addLevel(new THREE.Group(), 80); // Invisible at far distance
        moduleGroup.add(lod);
    }

    // Greenery throughout (every module)
    addGreenery(moduleGroup, radius);

    // Dome perimeter pillars (every module)
    addDomePerimeterPillars(moduleGroup, radius);

    // Handrail rings for zero-g movement (every module)
    addHandrailRing(moduleGroup, radius, 1.1); // chest height
    addHandrailRing(moduleGroup, radius, 2.0); // overhead pull bar

    // Interior circadian-responsive lighting (every module)
    addInteriorLights(moduleGroup, radius);

    // Circadian ceiling fixtures (every module)
    addCircadianCeilingFixtures(moduleGroup, radius);

    // Module-specific particle effects
    const particleFn = PARTICLE_MAP[moduleType];
    if (particleFn) particleFn(moduleGroup, radius);
}
