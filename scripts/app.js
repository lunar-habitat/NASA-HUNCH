/**
 * Lunar Habitat — Crew Wellbeing Monitor
 * Main application entry point
 * NASA HUNCH Concept Prototype
 */
import { initUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Lunar Habitat] Initializing...');
    initUI();
    console.log('[Lunar Habitat] Ready.');
});
