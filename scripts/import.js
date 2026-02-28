/**
 * @fileoverview CSV/JSON data import for Lunar Habitat.
 * Parses user-provided files into the same data-point shape used by
 * generateSeries(), validates field names and ranges, and surfaces
 * warnings for clamped or missing values.
 */
import { clamp, AppState } from './utils.js';

/* ============================================
   Field Definitions
   ============================================ */

/** Required biometric fields with type and valid range. */
const FIELD_DEFS = {
    heartRateBpm:      { type: 'number', min: 40,   max: 180,  decimals: 0 },
    hrvMs:             { type: 'number', min: 10,   max: 150,  decimals: 0 },
    edaMicrosiemens:   { type: 'number', min: 0.1,  max: 10.0, decimals: 2 },
    skinTempC:         { type: 'number', min: 30.0, max: 38.0, decimals: 2 },
    activityScore:     { type: 'number', min: 0,    max: 100,  decimals: 0 },
    sleepMinutes:      { type: 'number', min: 0,    max: 600,  decimals: 0 },
    restlessnessScore: { type: 'number', min: 0,    max: 100,  decimals: 0 },
    voiceStressIndex:  { type: 'number', min: 0,    max: 100,  decimals: 0 },
    pupilDilationMm:   { type: 'number', min: 2.0,  max: 8.0,  decimals: 1 },
    socialScore:       { type: 'number', min: 0,    max: 100,  decimals: 0 },
    routineDeviation:  { type: 'number', min: 0,    max: 100,  decimals: 0 },
    cognitiveLoad:     { type: 'number', min: 0,    max: 100,  decimals: 0 },
    sleepQuality:      { type: 'number', min: 0,    max: 100,  decimals: 0 },
    circadianAlignment:{ type: 'number', min: 0,    max: 100,  decimals: 0 },
    lightSpectrumScore:{ type: 'number', min: 0,    max: 100,  decimals: 0 },
    greeneryExposureMin:{ type: 'number', min: 0,   max: 120,  decimals: 0 },
    natureSoundscapeScore:{ type: 'number', min: 0, max: 100,  decimals: 0 },
    windowSimStatus:   { type: 'number', min: 0,    max: 100,  decimals: 0 }
};

const FIELD_KEYS = Object.keys(FIELD_DEFS);

/** Common column name aliases → canonical key. */
const ALIASES = {
    'heart_rate':       'heartRateBpm',
    'heartrate':        'heartRateBpm',
    'hr':               'heartRateBpm',
    'hrv':              'hrvMs',
    'heart_rate_variability': 'hrvMs',
    'eda':              'edaMicrosiemens',
    'electrodermal':    'edaMicrosiemens',
    'skin_temp':        'skinTempC',
    'skintemp':         'skinTempC',
    'temperature':      'skinTempC',
    'temp':             'skinTempC',
    'activity':         'activityScore',
    'activity_score':   'activityScore',
    'sleep':            'sleepMinutes',
    'sleep_minutes':    'sleepMinutes',
    'restlessness':     'restlessnessScore',
    'restlessness_score': 'restlessnessScore',
    'voice_stress':     'voiceStressIndex',
    'voicestress':      'voiceStressIndex',
    'voice':            'voiceStressIndex',
    'pupil':            'pupilDilationMm',
    'pupil_dilation':   'pupilDilationMm',
    'pupildilation':    'pupilDilationMm',
    'social':           'socialScore',
    'social_score':     'socialScore',
    'routine':          'routineDeviation',
    'routine_deviation':'routineDeviation',
    'routinedeviation': 'routineDeviation',
    'cognitive':        'cognitiveLoad',
    'cognitive_load':   'cognitiveLoad',
    'cognitiveload':    'cognitiveLoad',
    'sleep_quality':    'sleepQuality',
    'sleepquality':     'sleepQuality',
    'circadian':        'circadianAlignment',
    'circadian_alignment': 'circadianAlignment',
    'circadianalignment':  'circadianAlignment',
    'light_spectrum':      'lightSpectrumScore',
    'lightspectrum':       'lightSpectrumScore',
    'spectrum':            'lightSpectrumScore',
    'greenery':            'greeneryExposureMin',
    'greenery_exposure':   'greeneryExposureMin',
    'greeneryexposure':    'greeneryExposureMin',
    'nature_soundscape':   'natureSoundscapeScore',
    'naturesoundscape':    'natureSoundscapeScore',
    'soundscape':          'natureSoundscapeScore',
    'window_sim':          'windowSimStatus',
    'windowsim':           'windowSimStatus',
    'window':              'windowSimStatus'
};

/* ============================================
   CSV Parser
   ============================================ */

/**
 * Parse CSV text into an array of row objects.
 * Expects the first line to be a header row.
 * @param {string} text - Raw CSV content.
 * @returns {Object[]} Array of row objects keyed by header names.
 */
export function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] ?? '';
        });
        rows.push(row);
    }
    return rows;
}

/* ============================================
   JSON Parser
   ============================================ */

/**
 * Parse JSON text into an array of row objects.
 * Accepts either a plain array or { data: [...] } wrapper.
 * @param {string} text - Raw JSON content.
 * @returns {Object[]} Array of row objects.
 */
export function parseJSON(text) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        throw new Error(`Invalid JSON: ${e.message}`);
    }

    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    throw new Error('JSON must be an array of objects or { "data": [...] }.');
}

/* ============================================
   Column-Name Resolution
   ============================================ */

/**
 * Build a mapping from raw column names to canonical field keys.
 * Returns { mapping: {rawName → canonicalKey}, unmatched: string[] }.
 */
function resolveColumns(rawKeys) {
    const mapping = {};
    const unmatched = [];

    for (const raw of rawKeys) {
        const lower = raw.toLowerCase().trim();
        if (lower === 'timestamp') {
            mapping[raw] = 'timestamp';
            continue;
        }
        // Direct match
        if (FIELD_KEYS.includes(raw)) {
            mapping[raw] = raw;
            continue;
        }
        // Case-insensitive match
        const ciMatch = FIELD_KEYS.find(k => k.toLowerCase() === lower);
        if (ciMatch) {
            mapping[raw] = ciMatch;
            continue;
        }
        // Alias match
        if (ALIASES[lower]) {
            mapping[raw] = ALIASES[lower];
            continue;
        }
        unmatched.push(raw);
    }
    return { mapping, unmatched };
}

/* ============================================
   Validation & Cleaning
   ============================================ */

/**
 * Validate and clean an array of raw row objects into the canonical
 * data-point shape used throughout the app.
 *
 * @param {Object[]} rows - Raw parsed rows.
 * @returns {{ valid: boolean, errors: string[], warnings: string[], cleaned: Object[] }}
 */
export function validateSeries(rows) {
    const errors = [];
    const warnings = [];

    if (!rows || rows.length === 0) {
        return { valid: false, errors: ['File contains no data rows.'], warnings, cleaned: [] };
    }

    // Resolve columns from the first row's keys
    const rawKeys = Object.keys(rows[0]);
    const { mapping, unmatched } = resolveColumns(rawKeys);

    if (unmatched.length > 0) {
        warnings.push(`Unrecognised columns ignored: ${unmatched.join(', ')}`);
    }

    // Check which canonical fields are present
    const canonicalPresent = new Set(Object.values(mapping));
    const missingFields = FIELD_KEYS.filter(k => !canonicalPresent.has(k));
    if (missingFields.length > 0) {
        warnings.push(`Missing columns (will use defaults): ${missingFields.join(', ')}`);
    }

    // At least one biometric field must be present
    const hasBiometric = FIELD_KEYS.some(k => canonicalPresent.has(k));
    if (!hasBiometric) {
        errors.push(
            'No recognised biometric columns found. ' +
            'Expected columns: timestamp, ' + FIELD_KEYS.join(', ')
        );
        return { valid: false, errors, warnings, cleaned: [] };
    }

    // Clean each row
    const cleaned = [];
    const now = Date.now();
    let clampCount = 0;

    for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const point = {};

        // Timestamp
        if (mapping.timestamp && raw[Object.keys(mapping).find(k => mapping[k] === 'timestamp')]) {
            const tsRaw = raw[Object.keys(mapping).find(k => mapping[k] === 'timestamp')];
            const ts = new Date(tsRaw);
            point.timestamp = isNaN(ts.getTime()) ? new Date(now - (rows.length - 1 - i) * 60000) : ts;
        } else {
            // Generate timestamps: minute-by-minute ending at now
            point.timestamp = new Date(now - (rows.length - 1 - i) * 60000);
        }

        // Biometric fields
        for (const fieldKey of FIELD_KEYS) {
            const rawColName = Object.keys(mapping).find(k => mapping[k] === fieldKey);
            if (rawColName && raw[rawColName] !== undefined && raw[rawColName] !== '') {
                const num = Number(raw[rawColName]);
                if (isNaN(num)) {
                    errors.push(`Row ${i + 1}: "${fieldKey}" value "${raw[rawColName]}" is not a number.`);
                    continue;
                }
                const def = FIELD_DEFS[fieldKey];
                if (num < def.min || num > def.max) {
                    clampCount++;
                    point[fieldKey] = clamp(num, def.min, def.max);
                } else {
                    point[fieldKey] = num;
                }
            } else {
                // Default values for missing fields
                point[fieldKey] = getDefaultValue(fieldKey);
            }
        }

        // Round integer fields
        point.activityScore = Math.round(point.activityScore);
        point.sleepMinutes = Math.round(point.sleepMinutes);
        point.restlessnessScore = Math.round(point.restlessnessScore);
        point.voiceStressIndex = Math.round(point.voiceStressIndex ?? 15);
        point.socialScore = Math.round(point.socialScore ?? 70);
        point.routineDeviation = Math.round(point.routineDeviation ?? 12);
        point.cognitiveLoad = Math.round(point.cognitiveLoad ?? 30);
        point.sleepQuality = Math.round(point.sleepQuality ?? 78);
        point.circadianAlignment = Math.round(point.circadianAlignment ?? 85);
        point.lightSpectrumScore = Math.round(point.lightSpectrumScore ?? 88);
        point.greeneryExposureMin = Math.round(point.greeneryExposureMin ?? 65);
        point.natureSoundscapeScore = Math.round(point.natureSoundscapeScore ?? 75);
        point.windowSimStatus = Math.round(point.windowSimStatus ?? 82);

        cleaned.push(point);
    }

    if (clampCount > 0) {
        warnings.push(`${clampCount} value(s) were outside valid range and were clamped.`);
    }

    // Non-fatal errors still produce partial data
    const hasData = cleaned.length > 0;
    return {
        valid: hasData && errors.length === 0,
        errors,
        warnings,
        cleaned: hasData ? cleaned : []
    };
}

/**
 * Return a sensible default for a missing biometric field.
 */
function getDefaultValue(fieldKey) {
    const defaults = {
        heartRateBpm: 72,
        hrvMs: 45,
        edaMicrosiemens: 1.2,
        skinTempC: 33.8,
        activityScore: 25,
        sleepMinutes: 420,
        restlessnessScore: 15,
        voiceStressIndex: 15,
        pupilDilationMm: 3.2,
        socialScore: 70,
        routineDeviation: 12,
        cognitiveLoad: 30,
        sleepQuality: 78,
        circadianAlignment: 85,
        lightSpectrumScore: 88,
        greeneryExposureMin: 65,
        natureSoundscapeScore: 75,
        windowSimStatus: 82
    };
    return defaults[fieldKey] ?? 0;
}

/* ============================================
   File Import
   ============================================ */

/**
 * Read a File, detect format, parse, validate, and return cleaned data.
 *
 * @param {File} file - The uploaded file.
 * @returns {Promise<{ valid: boolean, errors: string[], warnings: string[], cleaned: Object[], fileName: string }>}
 */
export function importFile(file) {
    return new Promise((resolve, reject) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'csv' && ext !== 'json') {
            reject(new Error(`Unsupported file type ".${ext}". Please use .csv or .json.`));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = reader.result;
                const rows = ext === 'csv' ? parseCSV(text) : parseJSON(text);
                const result = validateSeries(rows);
                resolve({ ...result, fileName: file.name });
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsText(file);
    });
}

/* ============================================
   Format Help Text
   ============================================ */

/**
 * Return a user-facing help string describing the expected file format.
 * @returns {string} HTML help content.
 */
export function getFormatHelp() {
    return `
        <strong>Expected columns:</strong><br>
        <code>timestamp</code> (optional, ISO 8601)<br>
        <code>heartRateBpm</code> (40–180)<br>
        <code>hrvMs</code> (10–150)<br>
        <code>edaMicrosiemens</code> (0.1–10.0)<br>
        <code>skinTempC</code> (30.0–38.0)<br>
        <code>activityScore</code> (0–100)<br>
        <code>sleepMinutes</code> (0–600)<br>
        <code>restlessnessScore</code> (0–100)<br>
        <code>voiceStressIndex</code> (0–100)<br>
        <code>pupilDilationMm</code> (2.0–8.0)<br>
        <code>socialScore</code> (0–100)<br>
        <code>routineDeviation</code> (0–100)<br>
        <code>cognitiveLoad</code> (0–100)<br>
        <code>sleepQuality</code> (0–100)<br>
        <code>circadianAlignment</code> (0–100)<br>
        <code>lightSpectrumScore</code> (0–100)<br>
        <code>greeneryExposureMin</code> (0–120)<br>
        <code>natureSoundscapeScore</code> (0–100)<br>
        <code>windowSimStatus</code> (0–100)<br>
        <br>
        <strong>Aliases accepted:</strong> hr, hrv, eda, temp, activity, sleep, restlessness, voice, pupil, social, routine, cognitive, circadian, spectrum, greenery, soundscape, window<br>
        <strong>Formats:</strong> .csv (comma-separated) or .json (array of objects)
    `;
}
