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
    metal: new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.7, roughness: 0.3 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.6, metalness: 0.1 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.9, metalness: 0.0 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.7, metalness: 0.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x88ccff, roughness: 0.05, metalness: 0.1, transmission: 0.5, thickness: 0.2, transparent: true, opacity: 0.4 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x38bdf8, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.5 }),
    greenery: new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.8, metalness: 0.0 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95, metalness: 0.0 }),
    sensor: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.8 })
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
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.6
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.rotation.x = Math.PI / 2;
    strip.position.y = 0.06;
    group.add(strip);
}

/* ============================================
   Module-specific Furnishing
   ============================================ */

function furnishHub(group, radius) {
    // Central command console (hexagonal table)
    const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 6);
    const table = new THREE.Mesh(tableGeo, MATERIALS.metal);
    table.position.y = 0.9;
    table.castShadow = true;
    group.add(table);

    // Table pedestal
    const pedGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.85, 6);
    const ped = new THREE.Mesh(pedGeo, MATERIALS.metal);
    ped.position.y = 0.45;
    group.add(ped);

    // Holographic display ring above table
    const holoGeo = new THREE.TorusGeometry(0.8, 0.03, 6, 20);
    const holoMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.5
    });
    const holo = new THREE.Mesh(holoGeo, holoMat);
    holo.position.y = 1.4;
    holo.rotation.x = Math.PI / 2;
    holo.userData.isHologramRing = true;
    group.add(holo);

    // Screen panels around perimeter
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const r = radius * 0.7;
        const screenGeo = new THREE.BoxGeometry(1.5, 1.0, 0.05);
        const screen = new THREE.Mesh(screenGeo, MATERIALS.screen);
        screen.position.set(Math.cos(angle) * r, 1.5, Math.sin(angle) * r);
        screen.lookAt(0, 1.5, 0);
        screen.castShadow = true;
        screen.userData.isScreen = true;
        group.add(screen);
    }

    // Sensor hotspots
    group.add(createSensorHotspot(1.5, 1.2, 0, 'heartRateBpm'));
    group.add(createSensorHotspot(-1.5, 1.2, 0, 'hrvMs'));
    group.add(createSensorHotspot(0, 1.2, 1.5, 'voiceStressIndex'));
    group.add(createSensorHotspot(0, 1.2, -1.5, 'cognitiveLoad'));
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
        const chair = new THREE.Mesh(chairSeat, MATERIALS.fabric);
        chair.position.set(cx, 0.45, cz);
        group.add(chair);

        const backGeo = new THREE.BoxGeometry(0.4, 0.5, 0.05);
        const back = new THREE.Mesh(backGeo, MATERIALS.fabric);
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
    group.add(createSensorHotspot(-radius * 0.5, 1.0, 0, 'natureSoundscapeScore'));
}

function furnishLiving(group, radius) {
    // Bed
    const bedGeo = new THREE.BoxGeometry(0.9, 0.3, 2.0);
    const bed = new THREE.Mesh(bedGeo, MATERIALS.fabric);
    bed.position.set(radius * 0.3, 0.2, 0);
    bed.castShadow = true;
    group.add(bed);

    // Pillow
    const pillowGeo = new THREE.BoxGeometry(0.5, 0.1, 0.35);
    const pillow = new THREE.Mesh(pillowGeo, new THREE.MeshStandardMaterial({
        color: 0x7c8db0, roughness: 0.9, metalness: 0.0
    }));
    pillow.position.set(radius * 0.3, 0.4, -0.7);
    group.add(pillow);

    // Desk
    const deskGeo = new THREE.BoxGeometry(1.0, 0.05, 0.6);
    const desk = new THREE.Mesh(deskGeo, MATERIALS.wood);
    desk.position.set(-radius * 0.35, 0.75, 0);
    group.add(desk);

    // Personal locker
    const lockerGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    const locker = new THREE.Mesh(lockerGeo, MATERIALS.metal);
    locker.position.set(-radius * 0.4, 0.75, radius * 0.4);
    locker.castShadow = true;
    group.add(locker);

    // Sensor hotspots
    group.add(createSensorHotspot(radius * 0.3, 0.6, -1, 'sleepMinutes'));
    group.add(createSensorHotspot(-radius * 0.3, 1.0, 0, 'restlessnessScore'));
    group.add(createSensorHotspot(0, 1.5, 0, 'circadianAlignment'));
}

function furnishResearch(group, radius) {
    // Lab bench
    const benchGeo = new THREE.BoxGeometry(3.0, 0.08, 0.9);
    const bench = new THREE.Mesh(benchGeo, MATERIALS.metal);
    bench.position.set(0, 0.9, radius * 0.3);
    bench.castShadow = true;
    group.add(bench);

    // Microscope (cylinder + small lens)
    const scopeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6);
    const scope = new THREE.Mesh(scopeGeo, MATERIALS.plastic);
    scope.position.set(0.5, 1.2, radius * 0.3);
    group.add(scope);

    const eyeGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.2, 6);
    const eye = new THREE.Mesh(eyeGeo, MATERIALS.plastic);
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

    // Sample containers
    for (let i = 0; i < 5; i++) {
        const jarGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 6);
        const jar = new THREE.Mesh(jarGeo, MATERIALS.glass);
        jar.position.set(-0.8 + i * 0.4, 1.0, radius * 0.3);
        group.add(jar);
    }

    // Sensor hotspots
    group.add(createSensorHotspot(1.5, 1.0, radius * 0.3, 'cognitiveLoad'));
    group.add(createSensorHotspot(-1.0, 1.0, -radius * 0.4, 'pupilDilationMm'));
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
    // Large equipment blocks
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
        const r = radius * 0.45;
        const boxGeo = new THREE.BoxGeometry(1.0, 1.5, 0.8);
        const box = new THREE.Mesh(boxGeo, MATERIALS.metal);
        box.position.set(Math.cos(angle) * r, 0.75, Math.sin(angle) * r);
        box.lookAt(0, 0.75, 0);
        box.castShadow = true;
        group.add(box);

        // Status indicator light on top
        const indicatorGeo = new THREE.SphereGeometry(0.06, 4, 4);
        const indicatorMat = new THREE.MeshStandardMaterial({
            color: 0x22c55e,
            emissive: 0x22c55e,
            emissiveIntensity: 0.8
        });
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.position.set(Math.cos(angle) * r, 1.55, Math.sin(angle) * r);
        group.add(indicator);
    }

    // Pipe network (visual only)
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.8, roughness: 0.2 });
    for (let i = 0; i < 6; i++) {
        const pipeGeo = new THREE.CylinderGeometry(0.05, 0.05, radius * 1.2, 4);
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.position.y = 1.8 + (i % 2) * 0.3;
        pipe.rotation.z = Math.PI / 2;
        pipe.rotation.y = (i / 6) * Math.PI;
        group.add(pipe);
    }

    // Sensor hotspots
    group.add(createSensorHotspot(0, 1.0, 0, 'skinTempC'));
    group.add(createSensorHotspot(1, 1.0, 1, 'edaMicrosiemens'));
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

    // EVA suit racks
    for (let i = 0; i < 3; i++) {
        const rackGeo = new THREE.BoxGeometry(0.6, 1.8, 0.3);
        const rack = new THREE.Mesh(rackGeo, MATERIALS.plastic);
        rack.position.set(-radius * 0.4 + i * 0.8, 0.9, -radius * 0.4);
        rack.castShadow = true;
        group.add(rack);
    }

    // Decontamination light (UV tint)
    const uvLight = new THREE.PointLight(0x8844ff, 0.2, 5);
    uvLight.position.set(0, radius * 0.5, 0);
    group.add(uvLight);

    // Sensor hotspots
    group.add(createSensorHotspot(0, 1.5, radius * 0.4, 'activityScore'));
    group.add(createSensorHotspot(0, 1.5, -radius * 0.3, 'windowSimStatus'));
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
    // Holographic particles swirling above the command table
    const holoParticles = createParticleSystem({
        count: 40,
        radius: 1.2,
        color: 0x38bdf8,
        size: 0.035,
        yMin: 1.0,
        yMax: 2.0,
        opacity: 0.7
    });
    holoParticles.userData.particleType = 'holographic';
    group.add(holoParticles);
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
    const fixtureCount = 3;
    for (let i = 0; i < fixtureCount; i++) {
        const angle = (i / fixtureCount) * Math.PI * 2;
        const r = radius * 0.45;
        const y = radius * 0.55 + Math.random() * 0.15;

        const mat = new THREE.MeshStandardMaterial({
            color: 0xffeedd,
            emissive: 0xffeedd,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const fixture = new THREE.Mesh(SHARED_GEO.fixturePanel, mat);
        fixture.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        fixture.lookAt(0, 0, 0);
        fixture.rotateX(Math.PI / 2.5);
        fixture.userData.isCircadianFixture = true;
        group.add(fixture);
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

    // Interior circadian-responsive lighting (every module)
    addInteriorLights(moduleGroup, radius);

    // Circadian ceiling fixtures (every module)
    addCircadianCeilingFixtures(moduleGroup, radius);

    // Module-specific particle effects
    const particleFn = PARTICLE_MAP[moduleType];
    if (particleFn) particleFn(moduleGroup, radius);
}
