/**
 * @fileoverview Habitat Interiors — Minimal clean interior for each dome module.
 * Exterior dome panels remain untouched. Interior is intentionally empty so
 * nothing visibly clutters the dome shell when viewed from outside.
 *
 * Each module gets:
 *   - Per-module floor texture
 *   - Soft warm point light (no visible mesh)
 *   - Subtle floor cove ring for wayfinding
 *   - Low-profile sensor hotspots for interaction
 */
import * as THREE from 'three';

/* ============================================
   Sensor mapping (per module type)
   ============================================ */

const MODULE_SENSORS = {
    hub:         ['pupilDilationMm', 'cognitiveLoad'],
    communal:    ['socialScore', 'routineDeviation'],
    living:      ['sleepMinutes', 'restlessnessScore', 'circadianAlignment'],
    research:    ['cognitiveLoad'],
    cultivating: ['greeneryExposureMin', 'lightSpectrumScore'],
    mechanical:  ['heartRateBpm', 'hrvMs', 'edaMicrosiemens', 'skinTempC'],
    containment: ['activityScore']
};

/* ============================================
   Procedural floor textures (per module type)
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
        // Clean white deck plate — 16x16 grid with subtle seams
        ctx.fillStyle = '#ececec'; ctx.fillRect(0, 0, S, S);
        const cell = S / 16;
        ctx.strokeStyle = 'rgba(200,200,205,0.7)'; ctx.lineWidth = 1;
        for (let i = 0; i <= 16; i++) {
            ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, S); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(S, i * cell); ctx.stroke();
        }
    } else if (moduleType === 'living') {
        ctx.fillStyle = '#f0f0f2'; ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = 'rgba(210,212,218,0.25)'; ctx.lineWidth = 1;
        for (let y = 0; y < S; y += 4) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
        }
    } else if (moduleType === 'communal') {
        ctx.fillStyle = '#f2f0ec'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 180; i++) {
            const v = 220 + (Math.random() * 20 | 0);
            ctx.fillStyle = `rgba(${v},${v},${v - 5},0.25)`;
            const sz = 1 + Math.random();
            ctx.fillRect(Math.random() * S, Math.random() * S, sz, sz);
        }
    } else if (moduleType === 'research') {
        ctx.fillStyle = '#f4f6f8'; ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = 'rgba(210,212,220,0.3)'; ctx.lineWidth = 0.5;
        for (let i = 0; i < S; i += 16) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
        }
    } else if (moduleType === 'cultivating') {
        ctx.fillStyle = '#e8eae8'; ctx.fillRect(0, 0, S, S);
        const slotW = 6, slotH = 18, cols = 10, rows = 10;
        const cw = S / cols, ch = S / rows;
        ctx.fillStyle = 'rgba(200,205,200,0.6)';
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const x = c * cw + (cw - slotW) / 2;
            const y = r * ch + (ch - slotH) / 2;
            ctx.fillRect(x, y, slotW, slotH);
        }
    } else {
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, S, S);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
}

/* ============================================
   Outer panel surface texture
   ============================================ */

let _panelTexture = null;

function getPanelTexture() {
    if (_panelTexture) return _panelTexture;
    const S = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(180,180,180,0.65)'; ctx.lineWidth = 0.8;
    for (const x of [S * 0.33, S * 0.67]) {
        ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, S - 4); ctx.stroke();
    }
    for (const y of [S * 0.33, S * 0.67]) {
        ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(S - 4, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(190,190,190,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, S - 4, S - 4);
    ctx.fillStyle = 'rgba(180,180,180,0.75)';
    for (const [bx, by] of [[7, 7], [S - 7, 7], [7, S - 7], [S - 7, S - 7]]) {
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    _panelTexture = tex;
    return tex;
}

/* ============================================
   Sensor hotspot (small, low-profile)
   ============================================ */

const HOTSPOT_GEO = new THREE.SphereGeometry(0.08, 6, 6);
const HOTSPOT_RING_GEO = new THREE.TorusGeometry(0.13, 0.018, 6, 12);
const HOTSPOT_MAT = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.8
});

function createSensorHotspot(x, y, z, sensorId) {
    const mesh = new THREE.Mesh(HOTSPOT_GEO, HOTSPOT_MAT.clone());
    mesh.position.set(x, y, z);
    mesh.userData.sensorId = sensorId;
    mesh.userData.isHotspot = true;

    const ring = new THREE.Mesh(
        HOTSPOT_RING_GEO,
        new THREE.MeshStandardMaterial({
            color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.4,
            transparent: true, opacity: 0.6
        })
    );
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);

    return mesh;
}

/* ============================================
   Furnish module — minimal clean interior
   ============================================ */

export function furnishModule(moduleGroup, moduleType) {
    const radius = moduleGroup.userData.domeRadius || 5;

    // Apply floor texture and panel texture in one traversal
    moduleGroup.traverse(child => {
        if (!child.isMesh) return;
        if (child.userData.isModuleFloor && child.material) {
            const tex = getFloorTexture(moduleType);
            child.material = child.material.clone();
            child.material.map = tex;
            child.material.needsUpdate = true;
        }
        if (child.userData.isOuterPanel && child.userData.panelType === 'opaque') {
            const tex = getPanelTexture();
            child.material = child.material.clone();
            child.material.map = tex;
            child.material.needsUpdate = true;
        }
    });

    // Soft warm circadian-responsive point light (no visible mesh) — its
    // color and intensity shift with the time slider via updateCircadianFixtures.
    const ceilingLight = new THREE.PointLight(0xffeedd, 0.7, radius * 2.5);
    ceilingLight.position.set(0, radius * 0.65, 0);
    ceilingLight.userData.isCircadianLight = true;
    ceilingLight.userData.baseIntensityFactor = 1.0; // multiplier on the global circadian intensity
    moduleGroup.add(ceilingLight);

    // Subtle floor cove ring for wayfinding (kept as a static blue accent)
    const cove = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.92, 0.022, 4, 32),
        new THREE.MeshStandardMaterial({
            color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.3,
            transparent: true, opacity: 0.6
        })
    );
    cove.rotation.x = Math.PI / 2;
    cove.position.y = 0.04;
    cove.userData.isCoveStrip = true;
    moduleGroup.add(cove);

    // Microgravity handrail network — distributed along walls and ceiling
    // so crew can grip and translate from any orientation (no "down").
    // Tagged with isHandrail so visibility can be tied to interior views.
    const railMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5, metalness: 0.25, roughness: 0.45
    });
    const railThickness = 0.04;
    const wallInset = 0.12;

    // Latitude rings climbing the dome (treat dome as hemisphere of `radius`)
    for (const yFrac of [0.25, 0.5, 0.75]) {
        const y = radius * yFrac;
        const ringR = Math.sqrt(Math.max(0, radius * radius - y * y)) - wallInset;
        if (ringR < 0.5) continue;
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(ringR, railThickness, 6, 48),
            railMat
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        ring.castShadow = true;
        ring.userData.isHandrail = true;
        moduleGroup.add(ring);
    }

    // Curved vertical rails — 4 longitudes following the dome surface from
    // floor edge up toward the apex
    const verticalCount = 4;
    for (let i = 0; i < verticalCount; i++) {
        const theta = (i / verticalCount) * Math.PI * 2;
        const points = [];
        const samples = 12;
        for (let s = 0; s <= samples; s++) {
            const t = s / samples;
            const y = t * radius * 0.92;
            const r = Math.sqrt(Math.max(0, radius * radius - y * y)) - wallInset;
            points.push(new THREE.Vector3(
                Math.cos(theta) * r,
                y,
                Math.sin(theta) * r
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const railGeo = new THREE.TubeGeometry(curve, 24, railThickness, 6, false);
        const railMesh = new THREE.Mesh(railGeo, railMat);
        railMesh.castShadow = true;
        railMesh.userData.isHandrail = true;
        moduleGroup.add(railMesh);
    }

    // Sensor hotspots — small, at low height so they're not visible from outside above
    const sensors = MODULE_SENSORS[moduleType] || [];
    if (sensors.length > 0) {
        const hotspotR = radius * 0.5;
        for (let i = 0; i < sensors.length; i++) {
            const a = (i / sensors.length) * Math.PI * 2;
            const x = Math.cos(a) * hotspotR;
            const z = Math.sin(a) * hotspotR;
            moduleGroup.add(createSensorHotspot(x, 0.5, z, sensors[i]));
        }
    }
}
