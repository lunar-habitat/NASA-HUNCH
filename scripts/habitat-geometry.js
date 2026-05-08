/**
 * @fileoverview Habitat Geometry — Truncated Icosahedron (Telstar Ball) dome
 * construction with double-dome shell, swappable panels, connection corridors,
 * and module layout management.
 *
 * Each module is a half truncated icosahedron (cut at equator):
 *   - Inner wireframe (structural ribs)
 *   - Outer panel shell (pentagons + hexagons, individually swappable)
 *   - Connecting struts between inner & outer layers
 *   - Floor disc
 *
 * The main habitat is a hub (central + connected modules).
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/* ============================================
   Constants
   ============================================ */

export const CORRIDOR_RADIUS = 1.8;

/* ============================================
   Module Type Definitions
   ============================================ */

export const MODULE_TYPES = {
    hub: {
        name: 'Central Hub',
        color: 0x38bdf8,
        systems: ['Command & Control', 'Communications', 'Life Support Core', 'Emergency Systems'],
        radius: 9
    },
    communal: {
        name: 'Communal Module',
        color: 0x22c55e,
        systems: ['Dining Area', 'Recreation', 'Social Space', 'Circadian Lighting Control'],
        radius: 7.5
    },
    living: {
        name: 'Living Module',
        color: 0xa78bfa,
        systems: ['Private Quarters', 'Sleep Monitoring', 'Personal Storage', 'Hygiene Facilities'],
        radius: 7
    },
    research: {
        name: 'Research Module',
        color: 0xf59e0b,
        systems: ['Laboratory', 'Data Processing', 'Sample Analysis', 'EVA Prep'],
        radius: 7.5
    },
    mechanical: {
        name: 'Mechanical Module',
        color: 0x64748b,
        systems: ['Power Generation', 'Water Recycling', 'Air Processing', 'Thermal Control'],
        radius: 7
    },
    cultivating: {
        name: 'Cultivating Module',
        color: 0x4ade80,
        systems: ['Hydroponics', 'Aeroponics', 'Growth Monitoring', 'Nutrient Management'],
        radius: 7.5
    },
    containment: {
        name: 'Containment Module',
        color: 0xef4444,
        systems: ['Airlock', 'Decontamination', 'Pressure Control', 'EVA Storage'],
        radius: 6
    }
};

/* ============================================
   Secondary Module Specializations
   ============================================ */

export const SECONDARY_SPECIALIZATIONS = [
    {
        id: 'living',
        moduleType: 'living',
        name: 'Living Quarters',
        color: 0xa78bfa,
        description: 'Private crew berths with sleeping-bag pressure sensors, sleep staging, and personal storage.'
    },
    {
        id: 'communal',
        moduleType: 'communal',
        name: 'Communal / Galley',
        color: 0x22c55e,
        description: 'Shared dining, recreation, social space, circadian lighting.'
    },
    {
        id: 'research',
        moduleType: 'research',
        name: 'Research Laboratory',
        color: 0xf59e0b,
        description: 'Lab benches, sample analysis, data processing, EVA prep.'
    },
    {
        id: 'storage',
        moduleType: 'cultivating',
        name: 'Storage / Logistics',
        color: 0x94a3b8,
        description: 'Consumables, spares, EVA suits, mission cargo, racked stowage.'
    },
    {
        id: 'airlock',
        moduleType: 'containment',
        name: 'Airlock / Containment',
        color: 0xef4444,
        description: 'EVA staging, suit dock, decontamination, pressure cycling.'
    },
    {
        id: 'mechanical',
        moduleType: 'mechanical',
        name: 'Mechanical / Life Support',
        color: 0x64748b,
        description: 'Power generation, water recycling, air processing, thermal control.'
    }
];

/* ============================================
   Default Layout
   ============================================ */

export const DEFAULT_LAYOUT = [
    { type: 'hub',         position: [0, 0, 0],    name: 'Central Hub' },
    { type: 'communal',    position: [20, 0, 0],   name: 'Secondary Module' },
    { type: 'living',      position: [-20, 0, 0],  name: 'Secondary Module' },
    { type: 'research',    position: [0, 0, 20],   name: 'Secondary Module' },
    { type: 'cultivating', position: [0, 0, -20],  name: 'Secondary Module' },
    { type: 'mechanical',  position: [15, 0, 15],  name: 'Secondary Module' },
    { type: 'containment', position: [-15, 0, 15], name: 'Secondary Module' }
];

/* ============================================
   Truncated Icosahedron Geometry Generation
   ============================================ */

/**
 * Generate the vertices and face-groups of a truncated icosahedron (Telstar ball).
 * Returns { vertices: Vector3[], pentagons: number[][], hexagons: number[][] }
 *
 * A truncated icosahedron has 60 vertices, 12 pentagonal faces, 20 hexagonal faces.
 * Uses canonical coordinates + robust face-finding via icosahedron dual relationship:
 *   - Pentagon centers align with icosahedron vertices
 *   - Hexagon centers align with icosahedron face centroids
 */
function generateTruncatedIcosahedron(radius) {
    const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618

    // Generate all 60 vertices using even permutations with sign changes
    const raw = [];
    const eps = 0.001;

    const addUnique = (x, y, z) => {
        for (const v of raw) {
            if (Math.abs(v[0] - x) < eps && Math.abs(v[1] - y) < eps && Math.abs(v[2] - z) < eps) return;
        }
        raw.push([x, y, z]);
    };

    // Coordinate families with even permutations: (a,b,c), (b,c,a), (c,a,b)
    const families = [
        [0, 1, 3 * phi],
        [2, 1 + 2 * phi, phi],
        [1, 2 + phi, 2 * phi]
    ];

    for (const [a, b, c] of families) {
        const perms = [[a, b, c], [b, c, a], [c, a, b]];
        for (const [p, q, r] of perms) {
            for (const sp of [1, -1]) {
                for (const sq of [1, -1]) {
                    for (const sr of [1, -1]) {
                        addUnique(sp * p, sq * q, sr * r);
                    }
                }
            }
        }
    }

    // Scale to desired radius
    const maxDist = Math.max(...raw.map(c => Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2)));
    const scale = radius / maxDist;
    const vertices = raw.map(c => new THREE.Vector3(c[0] * scale, c[1] * scale, c[2] * scale));

    // Find faces using icosahedron dual relationship (robust method)
    const faces = findFacesViaIcosahedron(vertices, radius);
    return { vertices, ...faces };
}

/**
 * Robust face-finding: Pentagon centers = icosahedron vertices,
 * hexagon centers = icosahedron face centroids.
 * For each center direction, find the nearest 5 or 6 vertices.
 */
function findFacesViaIcosahedron(vertices, radius) {
    const phi = (1 + Math.sqrt(5)) / 2;

    // Standard icosahedron 12 vertices
    const icoRaw = [
        [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
        [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
        [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]
    ];
    const icoNorm = icoRaw.map(v => {
        const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
        return [v[0] / len, v[1] / len, v[2] / len];
    });

    // Standard icosahedron 20 faces (vertex indices into icoRaw)
    const icoFaces = [
        [0, 2, 8],  [0, 8, 4],  [0, 4, 6],  [0, 6, 10], [0, 10, 2],
        [2, 5, 8],  [8, 5, 9],  [8, 9, 4],  [4, 9, 1],  [4, 1, 6],
        [6, 1, 11], [6, 11, 10],[10, 11, 7],[10, 7, 2],  [2, 7, 5],
        [3, 5, 7],  [3, 9, 5],  [3, 1, 9],  [3, 11, 1],  [3, 7, 11]
    ];

    // Hexagon center directions = centroids of icosahedron faces
    const hexCenters = icoFaces.map(face => {
        const c = [0, 0, 0];
        for (const idx of face) {
            c[0] += icoNorm[idx][0];
            c[1] += icoNorm[idx][1];
            c[2] += icoNorm[idx][2];
        }
        const len = Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2);
        return [c[0] / len, c[1] / len, c[2] / len];
    });

    const pentagons = [];
    const hexagons = [];

    // Pentagon: for each icosahedron vertex direction, find 5 nearest truncated-ico vertices
    for (const center of icoNorm) {
        const face = findNearestVertices(vertices, center, radius, 5);
        sortFaceVerticesCCW(face, vertices, center, radius);
        pentagons.push(face);
    }

    // Hexagon: for each face centroid direction, find 6 nearest
    for (const center of hexCenters) {
        const face = findNearestVertices(vertices, center, radius, 6);
        sortFaceVerticesCCW(face, vertices, center, radius);
        hexagons.push(face);
    }

    return { pentagons, hexagons };
}

/** Find the N vertices closest to a direction on the unit sphere. */
function findNearestVertices(vertices, centerDir, radius, count) {
    const dists = vertices.map((v, i) => ({
        idx: i,
        dist: (v.x / radius - centerDir[0]) ** 2 +
              (v.y / radius - centerDir[1]) ** 2 +
              (v.z / radius - centerDir[2]) ** 2
    }));
    dists.sort((a, b) => a.dist - b.dist);
    return dists.slice(0, count).map(d => d.idx);
}

/** Sort face vertex indices CCW when viewed from outside the polyhedron. */
function sortFaceVerticesCCW(face, vertices, centerDir, radius) {
    const center = new THREE.Vector3(centerDir[0], centerDir[1], centerDir[2]).multiplyScalar(radius);
    const normal = center.clone().normalize();

    // Build a local 2D coordinate system on the face plane
    const refVec = new THREE.Vector3().subVectors(vertices[face[0]], center);
    const u = refVec.clone().sub(normal.clone().multiplyScalar(refVec.dot(normal))).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u);

    face.sort((a, b) => {
        const va = new THREE.Vector3().subVectors(vertices[a], center);
        const vb = new THREE.Vector3().subVectors(vertices[b], center);
        return Math.atan2(va.dot(v), va.dot(u)) - Math.atan2(vb.dot(v), vb.dot(u));
    });
}

/* ============================================
   Dome Construction — Half Truncated Icosahedron
   ============================================ */

/**
 * Build a single dome module (half truncated icosahedron).
 * @param {Object} moduleInfo - From MODULE_TYPES
 * @param {string} moduleName - Display name
 * @param {string} moduleType - Type key
 * @returns {THREE.Group}
 */
export function buildDomeModule(moduleInfo, moduleName, moduleType, specializationId = null) {
    const group = new THREE.Group();
    group.userData = {
        isDomeModule: true,
        moduleType,
        moduleName,
        domeRadius: moduleInfo.radius,
        specializationId
    };

    const radius = moduleInfo.radius;
    const { vertices, pentagons, hexagons } = generateTruncatedIcosahedron(radius);

    // Filter to upper hemisphere (y >= -0.1 for slight tolerance)
    const upperVertIndices = new Set();
    vertices.forEach((v, i) => {
        if (v.y >= -0.1) upperVertIndices.add(i);
    });

    const allFaces = [...pentagons, ...hexagons];

    // --- Outer panel shell ---
    const panelGroup = new THREE.Group();
    let panelIndex = 0;

    for (const face of allFaces) {
        const upperCount = face.filter(i => upperVertIndices.has(i)).length;
        if (upperCount < face.length / 2) continue;

        // Use upper-hemisphere vertices only (clamped at y=0 for equator)
        const faceVerts = face.map(i => {
            const v = vertices[i].clone();
            if (v.y < 0) v.y = 0;
            return v;
        });

        // Compute face center
        const center = new THREE.Vector3();
        faceVerts.forEach(v => center.add(v));
        center.divideScalar(faceVerts.length);

        // Determine if this is a window panel (alternating pattern for "mixed")
        const isWindow = panelIndex % 3 === 0;
        const isPentagon = face.length === 5;

        const panelMaterial = new THREE.MeshPhysicalMaterial({
            color: isWindow ? 0x88ccff : 0xf0f0f0,
            metalness: isWindow ? 0.1 : 0.3,
            roughness: isWindow ? 0.05 : 0.35,
            transmission: isWindow ? 0.6 : 0,
            thickness: isWindow ? 0.5 : 0,
            opacity: isWindow ? 0.3 : 1.0,
            transparent: true,
            side: THREE.DoubleSide,
            envMapIntensity: 1.0
        });

        // Create triangulated panel geometry from face vertices
        const panelGeo = createFaceGeometry(faceVerts, center);

        const panel = new THREE.Mesh(panelGeo, panelMaterial);
        panel.castShadow = true;
        panel.receiveShadow = true;
        panel.userData = {
            isOuterPanel: true,
            swappable: true,
            panelType: isWindow ? 'window' : 'opaque',
            originalPanelType: isWindow ? 'window' : 'opaque',
            defaultOpacity: isWindow ? 0.3 : 1.0,
            isPentagon,
            moduleType
        };

        panelGroup.add(panel);
        panelIndex++;
    }

    group.add(panelGroup);

    // --- Equatorial base ring (neutral white/grey — no module color) ---
    const ringGeo = new THREE.TorusGeometry(radius * 0.96, 0.12, 6, 24);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xd0d0d0,
        metalness: 0.7,
        roughness: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    ring.castShadow = true;
    group.add(ring);

    // --- Floor disc ---
    const floorGeo = new THREE.CircleGeometry(radius * 0.95, 16);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0xf2f2f2,
        roughness: 0.7,
        metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    floor.userData.isModuleFloor = true;
    group.add(floor);

    // --- Module label (CSS2D) ---
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label-2d module-label';
    labelDiv.textContent = moduleName;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, radius + 1.5, 0);
    label.userData.isModuleLabel = true;
    group.add(label);
    group.userData.labelDiv = labelDiv;

    return group;
}

/**
 * Create a triangulated geometry from an array of coplanar vertices.
 */
function createFaceGeometry(faceVerts, center) {
    // Fan triangulation from center
    const positions = [];
    const normals = [];

    // Compute face normal
    if (faceVerts.length < 3) return new THREE.BufferGeometry();
    const normal = new THREE.Vector3();
    const ab = new THREE.Vector3().subVectors(faceVerts[1], faceVerts[0]);
    const ac = new THREE.Vector3().subVectors(faceVerts[2], faceVerts[0]);
    normal.crossVectors(ab, ac).normalize();

    // Ensure normal points outward (away from origin)
    if (normal.dot(center) < 0) normal.negate();

    for (let i = 0; i < faceVerts.length; i++) {
        const a = center;
        const b = faceVerts[i];
        const c = faceVerts[(i + 1) % faceVerts.length];

        positions.push(a.x, a.y, a.z);
        positions.push(b.x, b.y, b.z);
        positions.push(c.x, c.y, c.z);

        normals.push(normal.x, normal.y, normal.z);
        normals.push(normal.x, normal.y, normal.z);
        normals.push(normal.x, normal.y, normal.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geo;
}

/* ============================================
   Doorway Assembly — Frame, Sliding Doors, LEDs, Motion Sensors
   ============================================ */

/**
 * Build a doorway assembly in local coordinates: frame jambs + lintel +
 * threshold, two sliding panels (closed at center, slide laterally to open),
 * embedded LED strips on the frame, and two flanking motion-sensor pods on
 * the +Z (corridor) side. Pods, LEDs, and panels carry userData flags for
 * the cache + animation systems in habitat-3d.js.
 *
 * Local axes: +Z = corridor side (where sensors live); doors slide along ±X.
 */
function buildDoorwayAssembly(width, height) {
    const group = new THREE.Group();
    group.userData.isDoorwayAssembly = true;
    group.userData.targetOpen = 0;
    group.userData.currentOpen = 0;
    group.userData.proximityBoost = 0;

    const halfW = width / 2;
    const jambDepth = 0.4;
    const jambThickness = 0.14;

    const frameMat = new THREE.MeshStandardMaterial({
        color: 0xc0c4cc, metalness: 0.7, roughness: 0.35
    });
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0xd4d8dd, metalness: 0.6, roughness: 0.3
    });

    // Jambs
    const leftJamb = new THREE.Mesh(
        new THREE.BoxGeometry(jambThickness, height, jambDepth), frameMat
    );
    leftJamb.position.set(-halfW - jambThickness / 2, height / 2, 0);
    leftJamb.castShadow = true;
    group.add(leftJamb);

    const rightJamb = new THREE.Mesh(
        new THREE.BoxGeometry(jambThickness, height, jambDepth), frameMat
    );
    rightJamb.position.set(halfW + jambThickness / 2, height / 2, 0);
    rightJamb.castShadow = true;
    group.add(rightJamb);

    // Lintel
    const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(width + 2 * jambThickness, 0.22, jambDepth), frameMat
    );
    lintel.position.set(0, height + 0.11, 0);
    lintel.castShadow = true;
    group.add(lintel);

    // Threshold
    const threshold = new THREE.Mesh(
        new THREE.BoxGeometry(width + 2 * jambThickness, 0.04, jambDepth + 0.2), frameMat
    );
    threshold.position.set(0, 0.02, 0);
    threshold.receiveShadow = true;
    group.add(threshold);

    // Frame LED strips — visible from both Z sides of the doorway
    const ledMatTemplate = {
        color: 0xffeedd, emissive: 0xffeedd, emissiveIntensity: 0.7,
        roughness: 0.4, metalness: 0.1
    };
    const addLED = (geo, x, y, z) => {
        const mat = new THREE.MeshStandardMaterial({ ...ledMatTemplate });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.userData.isCircadianFixture = true;
        mesh.userData.isDoorwayLED = true;
        mesh.userData.doorAssembly = group;
        group.add(mesh);
    };

    // Lintel LEDs (front + back)
    for (const z of [jambDepth / 2 - 0.02, -(jambDepth / 2 - 0.02)]) {
        addLED(new THREE.BoxGeometry(width, 0.04, 0.05), 0, height + 0.005, z);
    }
    // Jamb LEDs (front + back, on each side)
    for (const x of [-halfW + 0.04, halfW - 0.04]) {
        for (const z of [jambDepth / 2 - 0.02, -(jambDepth / 2 - 0.02)]) {
            addLED(new THREE.BoxGeometry(0.04, height - 0.1, 0.05), x, (height - 0.1) / 2 + 0.05, z);
        }
    }

    // Sliding doors — closed at center, slide outward to open
    const doorThickness = 0.08;
    const doorH = height - 0.08;
    const doorW = width / 2;

    const buildSlidingPanel = (closedX, openX) => {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(doorW, doorH, doorThickness), doorMat.clone()
        );
        panel.position.set(closedX, doorH / 2 + 0.04, 0);
        panel.userData.isSlidingDoor = true;
        panel.userData.closedX = closedX;
        panel.userData.openX = openX;
        panel.userData.doorAssembly = group;
        panel.castShadow = true;
        return panel;
    };
    group.add(buildSlidingPanel(-width / 4, -3 * width / 4));
    group.add(buildSlidingPanel( width / 4,  3 * width / 4));

    // Center seam line — subtle blue accent so doors read as "tech"
    const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, doorH - 0.1, 0.005),
        new THREE.MeshStandardMaterial({
            color: 0x88aaff, emissive: 0x88aaff, emissiveIntensity: 0.5
        })
    );
    seam.position.set(0, doorH / 2 + 0.04, doorThickness / 2 + 0.002);
    seam.userData.isDoorSeam = true;
    seam.userData.doorAssembly = group;
    group.add(seam);

    // Motion-sensor pods flanking the doorway on the +Z (corridor) side
    const sensorY = 1.6;
    const sensorZ = jambDepth / 2 + 0.04;
    for (const sx of [-1, 1]) {
        const pod = new THREE.Group();
        pod.position.set(sx * (halfW + jambThickness + 0.18), sensorY, sensorZ);
        pod.userData.isMotionSensor = true;
        pod.userData.doorAssembly = group;
        pod.userData.activeIntensity = 0.15;
        pod.userData.worldPos = new THREE.Vector3();

        const housing = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.06, 0.18, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0x2a3040, metalness: 0.6, roughness: 0.4 })
        );
        pod.add(housing);

        const lensMat = new THREE.MeshStandardMaterial({
            color: 0x224433, emissive: 0x22ff66, emissiveIntensity: 0.15,
            roughness: 0.2, metalness: 0.5
        });
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), lensMat);
        lens.position.set(0, 0, 0.07);
        pod.add(lens);
        pod.userData.lens = lens;

        group.add(pod);
    }

    return group;
}

/* ============================================
   Connection Corridors
   ============================================ */

/**
 * Build a corridor connecting two module positions. Clean tube + floor +
 * ceiling LED strip + sliding-airlock doorways at each end.
 * The corridor is trimmed to end at each module's dome surface so it
 * doesn't visibly extend into module interiors.
 */
function buildCorridor(posA, posB, radiusA, radiusB) {
    const group = new THREE.Group();
    group.userData.isCorridor = true;

    const centerA = new THREE.Vector3(...posA);
    const centerB = new THREE.Vector3(...posB);
    const fullDir = new THREE.Vector3().subVectors(centerB, centerA);
    const fullLen = fullDir.length();
    if (fullLen < 0.1) return group;

    // Trim corridor to push past each dome's wall with an airtight overlap.
    // The dome is a truncated icosahedron (faceted polyhedron), so we use
    // the spherical projection at the corridor's top height as a baseline
    // and then push an extra `wallBuffer` past it to seal against any
    // polyhedral irregularities — no visible gap, vacuum-tight.
    const corridorRadius = CORRIDOR_RADIUS;
    const tunnelTop = corridorRadius * 2;
    const wallBuffer = 2.0;
    const sphereInsetA = Math.sqrt(Math.max(0, radiusA * radiusA - tunnelTop * tunnelTop));
    const sphereInsetB = Math.sqrt(Math.max(0, radiusB * radiusB - tunnelTop * tunnelTop));
    const insetA = Math.max(0.5, sphereInsetA - wallBuffer);
    const insetB = Math.max(0.5, sphereInsetB - wallBuffer);
    const dirNorm = fullDir.clone().normalize();
    const start = centerA.clone().add(dirNorm.clone().multiplyScalar(insetA));
    const end   = centerB.clone().sub(dirNorm.clone().multiplyScalar(insetB));
    const len   = start.distanceTo(end);
    if (len < 0.1) return group;
    const mid   = start.clone().add(end).multiplyScalar(0.5);
    const angle = Math.atan2(fullDir.x, fullDir.z);

    // Tube (clean, mostly opaque white)
    const tubePath = new THREE.LineCurve3(
        new THREE.Vector3(0, 0, -len / 2),
        new THREE.Vector3(0, 0, len / 2)
    );
    const tubeGeo = new THREE.TubeGeometry(tubePath, Math.max(2, Math.floor(len / 5)), corridorRadius, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xeaeaee,
        metalness: 0.35,
        roughness: 0.45,
        side: THREE.DoubleSide
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.position.copy(mid);
    tube.position.y = corridorRadius;
    tube.rotation.y = angle;
    tube.castShadow = true;
    tube.receiveShadow = true;
    group.add(tube);

    // Floor strip
    const floorGeo = new THREE.PlaneGeometry(corridorRadius * 1.6, len);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
        floorGeo,
        new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.7, metalness: 0.05 })
    );
    floor.position.copy(mid);
    floor.position.y = 0.02;
    floor.rotation.y = angle;
    floor.receiveShadow = true;
    group.add(floor);

    // Ceiling LED strip — emissive bar along the inside top of the tube
    const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(corridorRadius * 0.55, 0.05, Math.max(0.5, len - 0.4)),
        new THREE.MeshStandardMaterial({
            color: 0xffeedd, emissive: 0xffeedd, emissiveIntensity: 0.7,
            roughness: 0.4, metalness: 0.1
        })
    );
    ledStrip.position.copy(mid);
    ledStrip.position.y = 2 * corridorRadius - 0.07;
    ledStrip.rotation.y = angle;
    ledStrip.userData.isCircadianFixture = true;
    ledStrip.userData.isCorridorLED = true;
    group.add(ledStrip);

    // Microgravity handrails — rails distributed around the inside of the
    // tube so crew can grip from any orientation while translating through
    // the corridor. Tagged with isHandrail for interior-only visibility.
    const handrailGroup = new THREE.Group();
    handrailGroup.position.copy(mid);
    handrailGroup.position.y = corridorRadius; // place at tube center
    handrailGroup.rotation.y = angle;
    handrailGroup.userData.isHandrail = true;

    const railMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5, metalness: 0.25, roughness: 0.45
    });
    const railRadius = 0.045;
    const inset = 0.12;
    const railLen = Math.max(0.3, len * 0.92);

    // Six longitudinal rails distributed around the tube — skip the very
    // bottom (where the floor strip lives) and the very top (where the LED
    // strip lives). Angles measured from local +Y (top of tube).
    const railAngles = [
        Math.PI * 0.25,   // upper-right
        Math.PI * 0.5,    // right wall
        Math.PI * 0.75,   // lower-right
        -Math.PI * 0.25,  // upper-left
        -Math.PI * 0.5,   // left wall
        -Math.PI * 0.75   // lower-left
    ];
    const innerR = corridorRadius - inset;

    for (const a of railAngles) {
        const rx = Math.sin(a) * innerR;
        const ry = Math.cos(a) * innerR;
        const rail = new THREE.Mesh(
            new THREE.CylinderGeometry(railRadius, railRadius, railLen, 8),
            railMat
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.set(rx, ry, 0);
        rail.castShadow = true;
        handrailGroup.add(rail);

        // Radial brackets every ~2.5 m anchoring the rail to the tube wall
        const bracketCount = Math.max(2, Math.floor(railLen / 2.5));
        const bracketLen = inset;
        for (let i = 0; i < bracketCount; i++) {
            const t = bracketCount === 1 ? 0 : (i / (bracketCount - 1) - 0.5);
            const bracket = new THREE.Mesh(
                new THREE.CylinderGeometry(0.022, 0.022, bracketLen, 6),
                railMat
            );
            // Orient bracket along the radial direction from tube center
            bracket.position.set(
                rx + Math.sin(a) * (bracketLen / 2),
                ry + Math.cos(a) * (bracketLen / 2),
                t * railLen
            );
            // Rotate cylinder to point along (sin a, cos a)
            bracket.rotation.z = -a;
            bracket.castShadow = true;
            handrailGroup.add(bracket);
        }
    }

    group.add(handrailGroup);

    // A sliding-airlock doorway at each end of the corridor: one entering
    // the central hub, one entering the peripheral module. Both doorways
    // share the corridor metadata used by the airlock-cycling logic in
    // updateMotionSensors (axial player position + per-end active zones).
    const doorwayWidth = corridorRadius * 1.6;
    const doorwayHeight = corridorRadius * 1.7;
    const corridorMeta = {
        startX: start.x, startZ: start.z,
        endX: end.x, endZ: end.z,
        dirX: dirNorm.x, dirZ: dirNorm.z,
        length: len
    };

    const doorwayA = buildDoorwayAssembly(doorwayWidth, doorwayHeight);
    doorwayA.position.set(start.x, 0, start.z);
    doorwayA.rotation.y = angle;
    doorwayA.userData.corridorMeta = corridorMeta;
    doorwayA.userData.endIndex = 0;
    group.add(doorwayA);

    const doorwayB = buildDoorwayAssembly(doorwayWidth, doorwayHeight);
    doorwayB.position.set(end.x, 0, end.z);
    doorwayB.rotation.y = angle + Math.PI;
    doorwayB.userData.corridorMeta = corridorMeta;
    doorwayB.userData.endIndex = 1;
    group.add(doorwayB);

    return group;
}

/* ============================================
   Build Full Habitat
   ============================================ */

/**
 * Build the entire habitat from a layout definition.
 * @param {Array} layout - Array of { type, position, name }
 * @returns {THREE.Group}
 */
export function buildHabitat(layout) {
    const group = new THREE.Group();
    const modules = [];

    // Build each module
    for (const mod of layout) {
        const info = MODULE_TYPES[mod.type];
        if (!info) continue;

        const dome = buildDomeModule(info, mod.name, mod.type, mod.specializationId || null);
        dome.position.set(mod.position[0], mod.position[1], mod.position[2]);
        group.add(dome);
        modules.push({ position: mod.position, radius: info.radius });
    }

    // Build corridors connecting hub (index 0) to all other modules
    if (modules.length > 1) {
        const hub = modules[0];
        for (let i = 1; i < modules.length; i++) {
            const m = modules[i];
            const corridor = buildCorridor(hub.position, m.position, hub.radius, m.radius);
            group.add(corridor);
        }
    }

    // Greenery lights (distributed throughout — small green point lights in each module)
    for (const mod of layout) {
        const pos = mod.position;
        const greenLight = new THREE.PointLight(0x22c55e, 0.15, 8);
        greenLight.position.set(pos[0], 1.5, pos[2]);
        group.add(greenLight);
    }

    return group;
}

/**
 * Rebuild habitat from a modified layout (used in rearrange mode).
 */
export function rebuildHabitat(scene, state) {
    if (state.habitatGroup) {
        scene.remove(state.habitatGroup);
        state.habitatGroup.traverse(child => {
            // Remove leaked CSS2DObject DOM elements
            if (child.isCSS2DObject && child.element && child.element.parentNode) {
                child.element.parentNode.removeChild(child.element);
            }
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    state.habitatGroup = buildHabitat(state.layout);
    scene.add(state.habitatGroup);
}
