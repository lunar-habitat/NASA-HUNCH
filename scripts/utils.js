/**
 * @fileoverview Shared state management and utility functions for Lunar Habitat.
 * Provides global application state (AppState), number formatting, clamping,
 * linear interpolation, and DOM element creation helpers.
 */

/**
 * Global application state object.
 * Tracks current scenario, privacy mode, theme, data, playback state,
 * and data source (simulated vs imported).
 * @type {{currentScenario: string, privacyMode: boolean, theme: string, data: Array|null, isPlaying: boolean, dataSource: string, importedFileName: string|null}}
 */
export const AppState = {
    currentScenario: 'baseline',
    privacyMode: false,
    theme: 'dark',
    data: null,
    isPlaying: false,
    dataSource: 'simulated',       // 'simulated' | 'imported'
    importedFileName: null,
    openSystems: new Set(),        // IDs of expanded accordion sections
};

/**
 * Format a number to a fixed number of decimal places.
 * @param {number} value - The number to format.
 * @param {number} [decimals=1] - Number of decimal places.
 * @returns {string} Formatted number string.
 */
export function formatNumber(value, decimals = 1) {
    return Number(value).toFixed(decimals);
}

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Interpolation factor (0–1).
 * @returns {number}
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * DOM helper — create an element with optional class and text content.
 * @param {string} tag - HTML tag name.
 * @param {string} [className] - CSS class(es) to add.
 * @param {string} [textContent] - Text content for the element.
 * @returns {HTMLElement}
 */
export function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}
