# Task: Phase 3 — Data Simulation Engine

## Metadata
- **Created**: 2026-02-12
- **Type**: implementation
- **Status**: accepted
- **Depends on**: Phase 0, 1, 2 (all validated and accepted)

## Objective
Implement a realistic time-series mock data generator in `data.js` that produces minute-by-minute biometric data for 4 scenarios, with natural variation, and upgrade `computeWellbeingIndex` to support a rolling window.

## Context
- Workspace root: `/Users/techmonkey/Development/lunar-habitat/`
- `scripts/data.js` already has: `SCENARIOS` (4 static presets), `getCurrentSample()`, `computeWellbeingIndex(sample)`, `computeStatus(index)`, and a stub `generateSeries()`
- `scripts/utils.js` already exports: `clamp`, `lerp`, `formatNumber`, `AppState`
- The existing `computeWellbeingIndex` takes a single sample — it needs to also accept an optional rolling window (array of recent samples) per the prompt spec
- This is a **data-only** task. Do NOT modify `ui.js`, `charts.js`, `index.html`, or `main.css`

## Deliverables

### 1. Implement `generateSeries(scenario, minutes)` in `data.js`
**File**: `/Users/techmonkey/Development/lunar-habitat/scripts/data.js`

Replace the stub with a full implementation that:

**Returns**: An array of `minutes` data points, each an object:
```javascript
{
    timestamp: Date,          // minute-by-minute, ending at "now"
    heartRateBpm: Number,     // 55–140
    hrvMs: Number,            // 20–120
    edaMicrosiemens: Number,  // 0.5–8.0
    skinTempC: Number,        // 32.0–36.5
    activityScore: Number,    // 0–100 (integer)
    sleepMinutes: Number,     // 0–480 (for the period, only in last sample or summary)
    restlessnessScore: Number // 0–100 (integer)
}
```

**Generation approach:**
Each scenario preset in `SCENARIOS` defines the CENTER values. The generator should:

1. Start from the scenario's center values
2. For each minute, add realistic variation using a **random walk with mean reversion**:
   - `nextValue = currentValue + (scenarioCenter - currentValue) * reversion + noise`
   - `reversion` factor: ~0.1 (pulls gently back toward center)
   - `noise`: Gaussian-like noise (use Box-Muller or simple uniform-to-normal transform)
   - Different noise amplitudes per metric:
     - HR: stdDev ~3 bpm
     - HRV: stdDev ~4 ms
     - EDA: stdDev ~0.3 µS
     - Skin Temp: stdDev ~0.15 °C
     - Activity: stdDev ~5
     - Restlessness: stdDev ~4

3. Clamp all values to their valid ranges after each step:
   - heartRateBpm: 40–180 (wide clamp; scenarios define typical range)
   - hrvMs: 10–150
   - edaMicrosiemens: 0.1–10.0
   - skinTempC: 30.0–38.0
   - activityScore: 0–100 (round to integer)
   - restlessnessScore: 0–100 (round to integer)

4. `sleepMinutes` is a summary stat — keep it constant for all points in a series (same as scenario preset value)

5. `timestamp`: Each point gets a Date. Point 0 = `now - (minutes - 1) * 60000`, last point = `now`

**Add a helper** (private to module, do not export):
```javascript
function gaussianNoise(stdDev) { ... }
```
Use the Box-Muller transform:
```javascript
function gaussianNoise(stdDev = 1) {
    const u1 = Math.random();
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return normal * stdDev;
}
```

**Add scenario-specific noise profiles** as a config object (private to module):
```javascript
const NOISE_PROFILES = {
    heartRateBpm:      { stdDev: 3,    reversion: 0.1, min: 40,  max: 180 },
    hrvMs:             { stdDev: 4,    reversion: 0.1, min: 10,  max: 150 },
    edaMicrosiemens:   { stdDev: 0.3,  reversion: 0.1, min: 0.1, max: 10.0 },
    skinTempC:         { stdDev: 0.15, reversion: 0.1, min: 30.0, max: 38.0 },
    activityScore:     { stdDev: 5,    reversion: 0.12, min: 0,   max: 100 },
    restlessnessScore: { stdDev: 4,    reversion: 0.1, min: 0,   max: 100 }
};
```

The fields that should be walked are: `heartRateBpm`, `hrvMs`, `edaMicrosiemens`, `skinTempC`, `activityScore`, `restlessnessScore`. `sleepMinutes` stays constant.

### 2. Upgrade `computeWellbeingIndex` to accept optional rolling window
**File**: `/Users/techmonkey/Development/lunar-habitat/scripts/data.js`

Current signature: `computeWellbeingIndex(sample)`
New signature: `computeWellbeingIndex(sample, rollingWindow = null)`

If `rollingWindow` is provided (an array of sample objects):
- Average each metric across the window first
- Then apply the same formula to the averaged values
- This gives a smoothed wellbeing index

If `rollingWindow` is null (default), use the single sample (backward compatible).

### 3. Store generated series in `AppState`
**File**: `/Users/techmonkey/Development/lunar-habitat/scripts/data.js`

After generating a series, the caller should be able to store it. Add:
```javascript
/**
 * Generate series and store it in AppState.data
 * @param {string} scenario
 * @param {number} minutes
 * @returns {Array} The generated series
 */
export function generateAndStore(scenario, minutes = 60) {
    const series = generateSeries(scenario, minutes);
    AppState.data = series;
    return series;
}
```

Import `AppState` from utils.js (it's already imported via `clamp` — add `AppState` to the import).

### 4. Add a `getLatestSample(series)` helper
**File**: `/Users/techmonkey/Development/lunar-habitat/scripts/data.js`

```javascript
/**
 * Return the last data point from a series, or null if empty.
 */
export function getLatestSample(series) {
    if (!series || series.length === 0) return null;
    return series[series.length - 1];
}
```

### 5. Add a `getRollingWindow(series, windowSize)` helper
**File**: `/Users/techmonkey/Development/lunar-habitat/scripts/data.js`

```javascript
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
```

## Acceptance Criteria
- [ ] `generateSeries('baseline', 60)` returns an array of exactly 60 objects
- [ ] Each object has all 7 fields: heartRateBpm, hrvMs, edaMicrosiemens, skinTempC, activityScore, sleepMinutes, restlessnessScore, plus a `timestamp` (Date)
- [ ] Timestamps are monotonically increasing, 60 seconds apart, ending near `now`
- [ ] Values vary realistically (not all identical) — HR should fluctuate ±5-10 around center
- [ ] All values stay within their clamped ranges (no NaN, no negative HR, etc.)
- [ ] `activityScore` and `restlessnessScore` are integers
- [ ] `sleepMinutes` is constant across all points in a series (equals scenario preset)
- [ ] `generateSeries('stress', 60)` produces data centered around stress scenario values (higher HR, lower HRV, etc.)
- [ ] All 4 scenarios generate valid series without errors
- [ ] `computeWellbeingIndex(sample)` still works with single sample (backward compatible)
- [ ] `computeWellbeingIndex(sample, rollingWindow)` returns a smoothed index when window is provided
- [ ] `generateAndStore()` sets `AppState.data` to the generated series
- [ ] `getLatestSample()` returns the last element of a series
- [ ] `getRollingWindow(series, 10)` returns last 10 elements
- [ ] No console errors when module is loaded
- [ ] Existing functions (`getCurrentSample`, `computeStatus`, `SCENARIOS`) still work unchanged
- [ ] All exports are correct — no broken imports in `app.js` or `ui.js`

## Out of Scope
- Do NOT modify `ui.js`, `charts.js`, `index.html`, or `main.css`
- Do NOT wire the generated data to the wristband display (that's a later integration task)
- Do NOT implement chart rendering
- Do NOT add scenario UI controls

---

## Findings

**Implementation completed — 2026-02-12**

All 5 deliverables implemented in `scripts/data.js`. 34/34 acceptance tests passed.

### Changes to `scripts/data.js`

1. **Import updated** (line 5): `import { clamp, AppState } from './utils.js';`

2. **`gaussianNoise(stdDev)`** — private helper using Box-Muller transform for Gaussian random noise.

3. **`NOISE_PROFILES`** — private config object defining stdDev, reversion factor, and clamp range for each walked metric (heartRateBpm, hrvMs, edaMicrosiemens, skinTempC, activityScore, restlessnessScore).

4. **`generateSeries(scenario, minutes)`** — replaced stub. Produces `minutes` data points via random walk with mean reversion toward scenario center. Timestamps are minute-by-minute ending at `now`. `activityScore` and `restlessnessScore` rounded to integers. `sleepMinutes` held constant at scenario value. All values clamped per NOISE_PROFILES ranges.

5. **`computeWellbeingIndex(sample, rollingWindow = null)`** — added optional second parameter. When `rollingWindow` is provided, metrics are averaged across the window before applying the formula. Fully backward compatible (single-arg calls unchanged).

6. **`generateAndStore(scenario, minutes)`** — new exported function. Calls `generateSeries`, stores result in `AppState.data`, returns the series.

7. **`getLatestSample(series)`** — new exported function. Returns last element or `null` if empty/null.

8. **`getRollingWindow(series, windowSize)`** — new exported function. Returns last `windowSize` elements via `slice`.

### Files modified
- `scripts/data.js` — all changes above
- `scripts/utils.js` — **not modified** (read-only reference)

### Verified
- All 4 scenarios generate valid series (correct length, all fields, proper ranges)
- Timestamps monotonically increasing, 60 000 ms apart
- HR varies realistically around scenario center; stress HR > baseline HR
- Integer rounding on activityScore and restlessnessScore
- sleepMinutes constant per series
- computeWellbeingIndex backward-compatible and smoothed-window mode both return valid 0–100 integers
- generateAndStore correctly sets AppState.data
- getLatestSample and getRollingWindow handle edge cases (empty, null)

---

## Validation

**Validated**: 2026-02-12
**Verdict**: ✅ **ACCEPT**

All 17 acceptance criteria pass. Runtime validation confirmed (21/21 checks passed via Node.js test harness). Code review of `scripts/data.js` complete — implementation matches the spec precisely.

### Acceptance Criteria Results

| # | Criterion | Result |
|---|-----------|--------|
| a | `generateSeries('baseline', 60)` returns array of exactly 60 objects | ✅ PASS |
| b | Each object has all 7 metrics + `timestamp` (8 fields) | ✅ PASS |
| c | Timestamps monotonically increasing, 60 s apart, ending near `now` | ✅ PASS |
| d | Values vary realistically (HR fluctuates ±5-10 around center) | ✅ PASS |
| e | All values within clamped ranges (no NaN, no negatives) | ✅ PASS |
| f | `activityScore` and `restlessnessScore` are integers | ✅ PASS |
| g | `sleepMinutes` constant across series (equals scenario preset) | ✅ PASS |
| h | Stress scenario → higher HR, lower HRV vs baseline centers | ✅ PASS |
| i | All 4 scenarios generate valid series without errors | ✅ PASS |
| j | `computeWellbeingIndex(sample)` backward compatible (single arg) | ✅ PASS |
| k | `computeWellbeingIndex(sample, window)` returns smoothed index | ✅ PASS |
| l | `generateAndStore()` sets `AppState.data` to generated series | ✅ PASS |
| m | `getLatestSample()` returns last element (null on empty/null) | ✅ PASS |
| n | `getRollingWindow(series, 10)` returns last 10 (empty on null) | ✅ PASS |
| o | No console errors on module load | ✅ PASS |
| p | Existing functions (`getCurrentSample`, `computeStatus`, `SCENARIOS`) unchanged | ✅ PASS |
| q | All exports correct — no broken imports in `app.js` or `ui.js` | ✅ PASS |

### Quality Review

| Check | Result |
|-------|--------|
| `gaussianNoise` uses correct Box-Muller formula | ✅ Correct |
| `NOISE_PROFILES` values match spec exactly | ✅ Correct |
| Mean-reversion formula: `next = curr + (center - curr) * reversion + noise` | ✅ Correct |
| `AppState` properly imported from `utils.js` | ✅ Correct |
| No division-by-zero or NaN risks | ⚠️ Theoretical: `Math.random()` can return 0, causing `log(0) = -Infinity` in Box-Muller → `Infinity` output. Clamp handles this (maps to max). NaN only possible if simultaneously `u1=0` AND `cos(...)=0` (probability ≈ 0). Standard accepted limitation. |

### Import Integrity

- **`ui.js`** imports `getCurrentSample`, `computeWellbeingIndex`, `computeStatus` from `data.js` — all exported ✅
- **`app.js`** imports `AppState` from `utils.js` and `initUI` from `ui.js` — no direct `data.js` dependency, unaffected ✅
- **`utils.js`** not modified ✅

### Issues Found

**None blocking.** One theoretical observation:
- The Box-Muller `gaussianNoise` does not guard against `Math.random() === 0` (which would produce `log(0) = -Infinity`). In practice this is a ~2⁻⁵³ probability event and the downstream `clamp()` call would cap the result at the profile max. This is standard practice and not worth fixing.
