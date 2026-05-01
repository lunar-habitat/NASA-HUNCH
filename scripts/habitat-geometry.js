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
   Default Layout
   ============================================ */

export const DEFAULT_LAYOUT = [
    { type: 'hub',         position: [0, 0, 0],    name: 'Central Hub' },
    { type: 'communal',    position: [20, 0, 0],   name: 'Communal Module' },
    { type: 'living',      position: [-20, 0, 0],  name: 'Living Quarters' },
    { type: 'research',    position: [0, 0, 20],   name: 'Research Lab' },
    { type: 'cultivating', position: [0, 0, -20],  name: 'Cultivating Bay' },
    { type: 'mechanical',  position: [15, 0, 15],  name: 'Mechanical Systems' },
    { type: 'containment', position: [-15, 0, 15], name: 'Airlock / Containment' }
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
export function buildDomeModule(moduleInfo, moduleName, moduleType) {
    const group = new THREE.Group();
    group.userData = {
        isDomeModule: true,
        moduleType,
        moduleName,
        domeRadius: moduleInfo.radius
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
    group.add(label);

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
   Connection Corridors
   ============================================ */

/**
 * Build a corridor connecting two module positions. Clean tube + floor.
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

        const dome = buildDomeModule(info, mod.name, mod.type);
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
        // Dispose geometries and materials
        state.habitatGroup.traverse(child => {
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
