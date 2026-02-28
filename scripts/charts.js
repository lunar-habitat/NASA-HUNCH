/**
 * @fileoverview Canvas-based charting library for Lunar Habitat biometric visualization.
 * Provides line chart and dual-line chart rendering with retina support,
 * gradient fills, grid lines, and data point markers.
 */

/* ============================================
   Private Helpers
   ============================================ */

/**
 * Map a value from one range to another.
 * @param {number} value
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {number}
 */
function mapValue(value, inMin, inMax, outMin, outMax) {
    return outMin + (value - inMin) / (inMax - inMin) * (outMax - outMin);
}

/**
 * Convert a hex color string to an rgba string with the given alpha.
 * @param {string} hex - CSS hex color (e.g. "#ef4444").
 * @param {number} alpha - Opacity 0–1.
 * @returns {string} rgba() string.
 */
function colorWithAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

/* ============================================
   Core Drawing Functions
   ============================================ */

/**
 * Draw a single-line chart on a canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{value: number, label: string}>} data
 * @param {Object} options
 */
export function drawLineChart(ctx, canvas, data, options = {}) {
    const {
        yMin = 0,
        yMax = 100,
        lineColor = '#38bdf8',
        fillAlpha = 0.15,
        gradientFill = true,
        showGrid = true,
        gridColor = 'rgba(255,255,255,0.06)',
        textColor = '#94a3b8',
        yLabel = ''
    } = options;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Layout padding
    const padLeft = 42;
    const padRight = 12;
    const padTop = 10;
    const padBottom = 22;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // ---- Grid lines ----
    if (showGrid) {
        const gridLines = 4;
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridLines; i++) {
            const y = padTop + (plotH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(w - padRight, y);
            ctx.stroke();
        }
    }

    // ---- Y-axis labels ----
    ctx.font = `10px 'JetBrains Mono','Fira Code',monospace`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
        const val = yMax - (yMax - yMin) / ySteps * i;
        const y = padTop + (plotH / ySteps) * i;
        const label = Number.isInteger(val) ? `${val}` : val.toFixed(1);
        ctx.fillText(yLabel && i === 0 ? `${label} ${yLabel}` : label, padLeft - 6, y);
    }

    // ---- X-axis labels ----
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xLabels = ['60m ago', '30m', 'now'];
    const xPositions = [padLeft, padLeft + plotW / 2, padLeft + plotW];
    for (let i = 0; i < xLabels.length; i++) {
        ctx.fillText(xLabels[i], xPositions[i], h - padBottom + 6);
    }

    if (!data || data.length === 0) return;

    // ---- Plot line ----
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = padLeft + (i / (data.length - 1)) * plotW;
        const y = padTop + plotH - mapValue(data[i].value, yMin, yMax, 0, plotH);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // ---- Gradient fill ----
    if (gradientFill) {
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, colorWithAlpha(lineColor, fillAlpha));
        grad.addColorStop(1, colorWithAlpha(lineColor, 0));

        ctx.lineTo(padLeft + plotW, padTop + plotH);
        ctx.lineTo(padLeft, padTop + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }
    ctx.restore();

    // ---- Data point dots ----
    const dotInterval = Math.max(1, Math.floor(data.length / 6));
    ctx.fillStyle = lineColor;
    for (let i = 0; i < data.length; i += dotInterval) {
        const x = padLeft + (i / (data.length - 1)) * plotW;
        const y = padTop + plotH - mapValue(data[i].value, yMin, yMax, 0, plotH);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    // Always draw last point
    const lastIdx = data.length - 1;
    if (lastIdx % dotInterval !== 0) {
        const x = padLeft + plotW;
        const y = padTop + plotH - mapValue(data[lastIdx].value, yMin, yMax, 0, plotH);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw a dual-line chart (e.g. HR + HRV overlay).
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{value: number, label: string}>} data1
 * @param {Array<{value: number, label: string}>} data2
 * @param {Object} options - includes lineColor, lineColor2
 */
function drawDualLineChart(ctx, canvas, data1, data2, options = {}) {
    const {
        yMin = 0,
        yMax = 100,
        lineColor = '#ef4444',
        lineColor2 = '#38bdf8',
        fillAlpha = 0.1,
        gradientFill = true,
        showGrid = true,
        gridColor = 'rgba(255,255,255,0.06)',
        textColor = '#94a3b8',
        yLabel = ''
    } = options;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const padLeft = 42;
    const padRight = 12;
    const padTop = 10;
    const padBottom = 22;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    ctx.clearRect(0, 0, w, h);

    // Grid
    if (showGrid) {
        const gridLines = 4;
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridLines; i++) {
            const y = padTop + (plotH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(w - padRight, y);
            ctx.stroke();
        }
    }

    // Y-axis labels
    ctx.font = `10px 'JetBrains Mono','Fira Code',monospace`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
        const val = yMax - (yMax - yMin) / ySteps * i;
        const y = padTop + (plotH / ySteps) * i;
        ctx.fillText(Number.isInteger(val) ? `${val}` : val.toFixed(1), padLeft - 6, y);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xLabels = ['60m ago', '30m', 'now'];
    const xPositions = [padLeft, padLeft + plotW / 2, padLeft + plotW];
    for (let i = 0; i < xLabels.length; i++) {
        ctx.fillText(xLabels[i], xPositions[i], h - padBottom + 6);
    }

    // Helper to draw one series
    function drawSeries(data, color) {
        if (!data || data.length === 0) return;

        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const x = padLeft + (i / (data.length - 1)) * plotW;
            const y = padTop + plotH - mapValue(data[i].value, yMin, yMax, 0, plotH);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        if (gradientFill) {
            const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
            grad.addColorStop(0, colorWithAlpha(color, fillAlpha));
            grad.addColorStop(1, colorWithAlpha(color, 0));
            ctx.lineTo(padLeft + plotW, padTop + plotH);
            ctx.lineTo(padLeft, padTop + plotH);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
        }
        ctx.restore();

        // Dots
        const dotInterval = Math.max(1, Math.floor(data.length / 6));
        ctx.fillStyle = color;
        for (let i = 0; i < data.length; i += dotInterval) {
            const x = padLeft + (i / (data.length - 1)) * plotW;
            const y = padTop + plotH - mapValue(data[i].value, yMin, yMax, 0, plotH);
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        const lastIdx = data.length - 1;
        if (lastIdx % dotInterval !== 0) {
            const x = padLeft + plotW;
            const y = padTop + plotH - mapValue(data[lastIdx].value, yMin, yMax, 0, plotH);
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawSeries(data1, lineColor);
    drawSeries(data2, lineColor2);
}

/* ============================================
   Public API — createChart
   ============================================ */

/**
 * Create a chart inside a container element.
 * @param {HTMLElement} container - Parent element to append the chart canvas to.
 * @param {Object} options - Chart configuration.
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, update: Function, destroy: Function }}
 */
export function createChart(container, options = {}) {
    const {
        yMin = 0,
        yMax = 100,
        lineColor = '#38bdf8',
        lineColor2 = null,
        fillAlpha = 0.15,
        height = 160,
        showGrid = true,
        gradientFill = true,
        yLabel = ''
    } = options;

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-container';
    container.appendChild(wrapper);

    // Create canvas
    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);

    // Size canvas for retina
    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    const cssWidth = rect.width || 300;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = height + 'px';
    canvas.width = cssWidth * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const chartOpts = {
        yMin, yMax, lineColor, lineColor2,
        fillAlpha, gradientFill, showGrid,
        gridColor: 'rgba(255,255,255,0.06)',
        textColor: '#94a3b8',
        yLabel
    };

    return {
        canvas,
        ctx,
        /**
         * Update the chart with new data.
         * @param {Array<{value: number, label: string}>} series1
         * @param {Array<{value: number, label: string}>} [series2]
         */
        update(series1, series2) {
            // Re-measure in case layout shifted
            const dpr = window.devicePixelRatio || 1;
            const rect = wrapper.getBoundingClientRect();
            const cssW = rect.width || 300;
            canvas.style.width = cssW + 'px';
            canvas.style.height = height + 'px';
            canvas.width = cssW * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);

            if (series2) {
                drawDualLineChart(ctx, canvas, series1, series2, chartOpts);
            } else {
                drawLineChart(ctx, canvas, series1, chartOpts);
            }
        },
        /** Remove the chart from the DOM. */
        destroy() {
            wrapper.remove();
        }
    };
}
