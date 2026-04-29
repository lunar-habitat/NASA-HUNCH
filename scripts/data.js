/**
 * @fileoverview Mock data generation for Lunar Habitat biometric simulation.
 * Generates time-series data for HR, HRV, EDA, skin temperature, activity, and sleep.
 * Supports multiple scenario presets (baseline, stress, sleepDeprived, exercise).
 * Includes wellbeing index computation and status classification.
 */
import { clamp, AppState } from './utils.js';

/* ============================================
   Scenario Presets
   ============================================ */

/**
 * Pre-defined biometric scenarios.
 * Each key maps to a current-sample object with all sensor readings.
 */
export const SCENARIOS = {
    baseline: {
        heartRateBpm: 72,
        hrvMs: 45,
        edaMicrosiemens: 1.2,
        skinTempC: 33.8,
        activityScore: 25,
        sleepMinutes: 432,   // 7.2 hours
        restlessnessScore: 15,
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
    },
    stress: {
        heartRateBpm: 98,
        hrvMs: 22,
        edaMicrosiemens: 5.8,
        skinTempC: 34.5,
        activityScore: 40,
        sleepMinutes: 300,   // 5 hours
        restlessnessScore: 65,
        pupilDilationMm: 5.8,
        socialScore: 35,
        routineDeviation: 55,
        cognitiveLoad: 68,
        sleepQuality: 35,
        circadianAlignment: 50,
        lightSpectrumScore: 70,
        greeneryExposureMin: 20,
        natureSoundscapeScore: 35,
        windowSimStatus: 55
    },
    sleepDeprived: {
        heartRateBpm: 82,
        hrvMs: 30,
        edaMicrosiemens: 3.5,
        skinTempC: 33.2,
        activityScore: 15,
        sleepMinutes: 210,   // 3.5 hours
        restlessnessScore: 80,
        pupilDilationMm: 4.5,
        socialScore: 40,
        routineDeviation: 65,
        cognitiveLoad: 55,
        sleepQuality: 18,
        circadianAlignment: 30,
        lightSpectrumScore: 45,
        greeneryExposureMin: 15,
        natureSoundscapeScore: 25,
        windowSimStatus: 40
    },
    exercise: {
        heartRateBpm: 135,
        hrvMs: 18,
        edaMicrosiemens: 6.2,
        skinTempC: 35.8,
        activityScore: 92,
        sleepMinutes: 420,   // 7 hours
        restlessnessScore: 20,
        pupilDilationMm: 4.0,
        socialScore: 65,
        routineDeviation: 20,
        cognitiveLoad: 35,
        sleepQuality: 72,
        circadianAlignment: 80,
        lightSpectrumScore: 85,
        greeneryExposureMin: 50,
        natureSoundscapeScore: 60,
        windowSimStatus: 78
    },
    emergency: {
        heartRateBpm: 125,
        hrvMs: 15,
        edaMicrosiemens: 7.5,
        skinTempC: 35.0,
        activityScore: 65,
        sleepMinutes: 180,   // 3 hours
        restlessnessScore: 90,
        pupilDilationMm: 7.0,
        socialScore: 30,
        routineDeviation: 80,
        cognitiveLoad: 90,
        sleepQuality: 15,
        circadianAlignment: 25,
        lightSpectrumScore: 30,
        greeneryExposureMin: 5,
        natureSoundscapeScore: 10,
        windowSimStatus: 20
    },
    isolation: {
        heartRateBpm: 88,
        hrvMs: 20,
        edaMicrosiemens: 4.5,
        skinTempC: 32.6,
        activityScore: 5,
        sleepMinutes: 240,   // 4 hours — insomnia from isolation
        restlessnessScore: 75,
        pupilDilationMm: 4.8,
        socialScore: 10,
        routineDeviation: 70,
        cognitiveLoad: 55,
        sleepQuality: 22,
        circadianAlignment: 35,
        lightSpectrumScore: 40,
        greeneryExposureMin: 8,
        natureSoundscapeScore: 15,
        windowSimStatus: 30
    }
};

/* ============================================
   Data Access
   ============================================ */

/**
 * Return the current biometric sample for a scenario.
 * @param {string} [scenario='baseline'] - Scenario key.
 * @returns {Object} Shallow copy of the scenario data.
 */
export function getCurrentSample(scenario = 'baseline') {
    const data = SCENARIOS[scenario] || SCENARIOS.baseline;
    return { ...data };
}

/* ============================================
   Noise Helpers (module-private)
   ============================================ */

/**
 * Generate a random sample from a Gaussian (normal) distribution
 * using the Box-Muller transform.
 * @param {number} [stdDev=1] - Standard deviation.
 * @returns {number}
 */
function gaussianNoise(stdDev = 1) {
    // Clamp away from 0 to prevent Math.log(0) = -Infinity
    const u1 = Math.random() || Number.MIN_VALUE;
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return normal * stdDev;
}

/** Per-metric noise configuration for the random-walk generator. */
const NOISE_PROFILES = {
    heartRateBpm:      { stdDev: 3,    reversion: 0.1,  min: 40,   max: 180 },
    hrvMs:             { stdDev: 4,    reversion: 0.1,  min: 10,   max: 150 },
    edaMicrosiemens:   { stdDev: 0.3,  reversion: 0.1,  min: 0.1,  max: 10.0 },
    skinTempC:         { stdDev: 0.15, reversion: 0.1,  min: 30.0, max: 38.0 },
    activityScore:     { stdDev: 5,    reversion: 0.12, min: 0,    max: 100 },
    restlessnessScore: { stdDev: 4,    reversion: 0.1,  min: 0,    max: 100 },
    pupilDilationMm:   { stdDev: 0.2,  reversion: 0.1,  min: 2.0,  max: 8.0 },
    socialScore:       { stdDev: 3,    reversion: 0.08, min: 0,    max: 100 },
    routineDeviation:  { stdDev: 4,    reversion: 0.1,  min: 0,    max: 100 },
    cognitiveLoad:     { stdDev: 5,    reversion: 0.12, min: 0,    max: 100 },
    sleepQuality:      { stdDev: 3,    reversion: 0.08, min: 0,    max: 100 },
    circadianAlignment:{ stdDev: 2,    reversion: 0.06, min: 0,    max: 100 },
    lightSpectrumScore:{ stdDev: 2,    reversion: 0.06, min: 0,    max: 100 },
    greeneryExposureMin:{ stdDev: 5,   reversion: 0.08, min: 0,    max: 120 },
    natureSoundscapeScore:{ stdDev: 3, reversion: 0.08, min: 0,    max: 100 },
    windowSimStatus:   { stdDev: 2,    reversion: 0.06, min: 0,    max: 100 }
};

/* ============================================
   Series Generation
   ============================================ */

/**
 * Generate a time-series data array for a given scenario using a
 * random walk with mean reversion toward the scenario center values.
 * @param {string} scenario - Scenario identifier.
 * @param {number} [minutes=60] - Duration in minutes.
 * @returns {Array<Object>} Array of data points.
 */
export function generateSeries(scenario, minutes = 60) {
    const center = SCENARIOS[scenario] || SCENARIOS.baseline;
    const now = Date.now();
    const series = [];

    // Initialise current values to scenario center
    const current = {};
    const walkedKeys = Object.keys(NOISE_PROFILES);
    for (const key of walkedKeys) {
        current[key] = center[key];
    }

    for (let i = 0; i < minutes; i++) {
        // Advance each metric via random walk with mean reversion
        for (const key of walkedKeys) {
            const profile = NOISE_PROFILES[key];
            const noise = gaussianNoise(profile.stdDev);
            current[key] = current[key]
                + (center[key] - current[key]) * profile.reversion
                + noise;
            current[key] = clamp(current[key], profile.min, profile.max);
        }

        series.push({
            timestamp: new Date(now - (minutes - 1 - i) * 60000),
            heartRateBpm:      current.heartRateBpm,
            hrvMs:             current.hrvMs,
            edaMicrosiemens:   current.edaMicrosiemens,
            skinTempC:         current.skinTempC,
            activityScore:     Math.round(current.activityScore),
            sleepMinutes:      center.sleepMinutes,
            restlessnessScore: Math.round(current.restlessnessScore),
            pupilDilationMm:   current.pupilDilationMm,
            socialScore:       Math.round(current.socialScore),
            routineDeviation:  Math.round(current.routineDeviation),
            cognitiveLoad:     Math.round(current.cognitiveLoad),
            sleepQuality:      Math.round(current.sleepQuality),
            circadianAlignment:Math.round(current.circadianAlignment),
            lightSpectrumScore:Math.round(current.lightSpectrumScore),
            greeneryExposureMin:Math.round(current.greeneryExposureMin),
            natureSoundscapeScore:Math.round(current.natureSoundscapeScore),
            windowSimStatus:   Math.round(current.windowSimStatus)
        });
    }

    return series;
}

/* ============================================
   Wellbeing Computation
   ============================================ */

/**
 * Compute the composite Wellbeing Index from a biometric sample.
 *
 * Components (each 0–100, higher = better):
 *   HR:              100 − |heartRate − 70| × 0.8
 *   HRV:             hrvMs / 60 × 100
 *   EDA:             100 − (eda / 8) × 100
 *   Sleep Duration:  sleepMinutes / 480 × 100
 *   Restlessness:    100 − restlessnessScore
 *   Activity:        bell-curve around 35
 *   Pupil Dilation:  100 − ((pupil − 2) / 6) × 100
 *   Social:          socialScore directly
 *   Routine Dev:     100 − routineDeviation
 *   Cognitive Load:  100 − cognitiveLoad × 0.8
 *   Sleep Quality:   sleepQuality directly
 *   Circadian:       circadianAlignment directly
 *   Light Spectrum:  lightSpectrumScore directly
 *   Greenery:        greeneryExposureMin / 90 × 100 (90 min is ideal)
 *   Soundscape:      natureSoundscapeScore directly
 *   Window Sim:      windowSimStatus directly
 *
 * Final index = weighted average, clamped 0–100.
 * Weights: HR(10%), HRV(8%), EDA(8%), SleepDur(8%), Restlessness(6%),
 *          Activity(4%), Pupil(8%), Social(6%),
 *          RoutineDev(4%), CogLoad(6%), SleepQuality(8%), Circadian(6%),
 *          LightSpectrum(5%), Greenery(4%), Soundscape(4%), WindowSim(5%)
 *
 * If `rollingWindow` is provided, metrics are averaged across the
 * window before applying the formula (produces a smoothed index).
 *
 * @param {Object} sample - Current biometric data sample.
 * @param {Array<Object>|null} [rollingWindow=null] - Optional array of recent samples.
 * @returns {number} Wellbeing index (0–100), rounded integer.
 */
export function computeWellbeingIndex(sample, rollingWindow = null) {
    let effective = sample;

    if (rollingWindow && rollingWindow.length > 0) {
        const len = rollingWindow.length;
        effective = {
            heartRateBpm:       rollingWindow.reduce((s, p) => s + p.heartRateBpm, 0) / len,
            hrvMs:              rollingWindow.reduce((s, p) => s + p.hrvMs, 0) / len,
            edaMicrosiemens:    rollingWindow.reduce((s, p) => s + p.edaMicrosiemens, 0) / len,
            sleepMinutes:       rollingWindow.reduce((s, p) => s + p.sleepMinutes, 0) / len,
            restlessnessScore:  rollingWindow.reduce((s, p) => s + (p.restlessnessScore || 0), 0) / len,
            activityScore:      rollingWindow.reduce((s, p) => s + (p.activityScore || 0), 0) / len,
            pupilDilationMm:    rollingWindow.reduce((s, p) => s + (p.pupilDilationMm ?? 3.2), 0) / len,
            socialScore:        rollingWindow.reduce((s, p) => s + (p.socialScore ?? 70), 0) / len,
            routineDeviation:   rollingWindow.reduce((s, p) => s + (p.routineDeviation ?? 12), 0) / len,
            cognitiveLoad:      rollingWindow.reduce((s, p) => s + (p.cognitiveLoad ?? 30), 0) / len,
            sleepQuality:       rollingWindow.reduce((s, p) => s + (p.sleepQuality ?? 78), 0) / len,
            circadianAlignment: rollingWindow.reduce((s, p) => s + (p.circadianAlignment ?? 85), 0) / len,
            lightSpectrumScore: rollingWindow.reduce((s, p) => s + (p.lightSpectrumScore ?? 88), 0) / len,
            greeneryExposureMin: rollingWindow.reduce((s, p) => s + (p.greeneryExposureMin ?? 65), 0) / len,
            natureSoundscapeScore: rollingWindow.reduce((s, p) => s + (p.natureSoundscapeScore ?? 75), 0) / len,
            windowSimStatus:    rollingWindow.reduce((s, p) => s + (p.windowSimStatus ?? 82), 0) / len
        };
    }

    const hrComponent    = 100 - Math.abs(effective.heartRateBpm - 70) * 0.8;
    const hrvComponent   = clamp(effective.hrvMs / 60 * 100, 0, 100);
    const edaComponent   = 100 - (effective.edaMicrosiemens / 8) * 100;
    const sleepComponent = clamp(effective.sleepMinutes / 480 * 100, 0, 100);

    // Restlessness: 0 is best, 100 is worst
    const restlessness = effective.restlessnessScore ?? 15;
    const restComponent = clamp(100 - restlessness, 0, 100);

    // Activity: bell-curve centered at ~35 (moderate activity is ideal)
    const act = effective.activityScore ?? 30;
    const actComponent = clamp(100 - Math.abs(act - 35) * 1.2, 0, 100);

    // Pupil Dilation: 2mm is calm baseline, 8mm is extreme
    const pupil = effective.pupilDilationMm ?? 3.2;
    const pupilComponent = clamp(100 - ((pupil - 2.0) / 6.0) * 100, 0, 100);

    // Social interaction: higher is better
    const socialComponent = clamp(effective.socialScore ?? 70, 0, 100);

    // Routine deviation: lower is better (0 = perfect routine)
    const routineDev = effective.routineDeviation ?? 12;
    const routineComponent = clamp(100 - routineDev, 0, 100);

    // Cognitive load: moderate is OK, very high is bad
    const cogLoad = effective.cognitiveLoad ?? 30;
    const cogComponent = clamp(100 - cogLoad * 0.8, 0, 100);

    // Sleep quality: higher is better (from sleeping bag pressure sensors)
    const sleepQualComponent = clamp(effective.sleepQuality ?? 78, 0, 100);

    // Circadian alignment: higher is better (LED panel + rhythm tracking)
    const circadianComponent = clamp(effective.circadianAlignment ?? 85, 0, 100);

    // Light spectrum: higher is better (how closely LED replicates Earth spectrum)
    const lightSpectrumComponent = clamp(effective.lightSpectrumScore ?? 88, 0, 100);

    // Greenery exposure: 90 minutes is ideal daily target
    const greenery = effective.greeneryExposureMin ?? 65;
    const greeneryComponent = clamp(greenery / 90 * 100, 0, 100);

    // Nature soundscape: higher is better
    const soundscapeComponent = clamp(effective.natureSoundscapeScore ?? 75, 0, 100);

    // Window simulation: higher is better
    const windowSimComponent = clamp(effective.windowSimStatus ?? 82, 0, 100);

    // Rebalanced weighted average across all 16 components (sum = 1.00)
    const avg = hrComponent       * 0.10
             + hrvComponent      * 0.08
             + edaComponent      * 0.08
             + sleepComponent    * 0.08
             + restComponent     * 0.06
             + actComponent      * 0.04
             + pupilComponent    * 0.08
             + socialComponent   * 0.06
             + routineComponent  * 0.04
             + cogComponent      * 0.06
             + sleepQualComponent * 0.08
             + circadianComponent * 0.06
             + lightSpectrumComponent * 0.05
             + greeneryComponent * 0.04
             + soundscapeComponent * 0.04
             + windowSimComponent * 0.05;

    return Math.round(clamp(avg, 0, 100));
}

/**
 * Map a wellbeing index to a status colour string.
 * @param {number} index - Wellbeing index (0–100).
 * @returns {'green'|'yellow'|'red'} Status colour.
 */
export function computeStatus(index) {
    if (index >= 70) return 'green';
    if (index >= 40) return 'yellow';
    return 'red';
}

/* ============================================
   Series Helpers
   ============================================ */

/**
 * Generate series and store it in AppState.data.
 * @param {string} scenario - Scenario identifier.
 * @param {number} [minutes=60] - Duration in minutes.
 * @returns {Array} The generated series.
 */
export function generateAndStore(scenario, minutes = 60) {
    const series = generateSeries(scenario, minutes);
    AppState.data = series;
    return series;
}

/**
 * Return the last data point from a series, or null if empty.
 * @param {Array} series
 * @returns {Object|null}
 */
export function getLatestSample(series) {
    if (!series || series.length === 0) return null;
    return series[series.length - 1];
}

/**
 * Return the last `windowSize` samples from a series.
 * @param {Array} series
 * @param {number} [windowSize=10] - Number of recent samples.
 * @returns {Array}
 */
export function getRollingWindow(series, windowSize = 10) {
    if (!series || series.length === 0) return [];
    return series.slice(-windowSize);
}
