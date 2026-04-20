// title.js — full-screen title card with animated starfield
import { SCREEN_W, SCREEN_H, HUD_H } from '../contracts.js';
import { drawText, textWidth } from './font.js';

const TOTAL_H = SCREEN_H + HUD_H;  // full canvas height in screen pixels

// --------------------------------------------------------------------------
// Deterministic star field (seeded positions so it looks consistent)
// --------------------------------------------------------------------------
const STAR_COUNT = 48;
const stars = (() => {
  const arr = [];
  // Simple LCG for deterministic positions
  let seed = 0xDEADBEEF;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xFFFFFFFF; };
  for (let i = 0; i < STAR_COUNT; i++) {
    arr.push({
      x: Math.floor(rng() * SCREEN_W),
      y: Math.floor(rng() * TOTAL_H),
      speed: 0.3 + rng() * 0.7,
      phase: rng() * Math.PI * 2,
      size: rng() > 0.8 ? 2 : 1,
    });
  }
  return arr;
})();

// --------------------------------------------------------------------------
// Triforce decorative icon (small, top of title area)
// --------------------------------------------------------------------------
function drawTriforceSmall(ctx, cx, y, size) {
  ctx.fillStyle = '#FFD700';
  // Bottom-left triangle
  _fillTri(ctx, cx - size, y + size, cx, y, cx - size * 2, y + size * 2);
  // Bottom-right triangle
  _fillTri(ctx, cx, y, cx + size, y + size, cx + size * 2 - size, y + size * 2);
  // Wait — draw as pixel rects for clarity
  // Simple pixel triforce: 3 triangles using rect approximation
  for (let row = 0; row < size; row++) {
    const w = (row + 1) * 2 - 1;
    const leftOff = size - 1 - row;
    // top triangle
    ctx.fillRect(cx - Math.floor(w / 2), y + row, w, 1);
    // bottom-left triangle
    ctx.fillRect(cx - size + leftOff, y + size + row, w, 1);
    // bottom-right triangle
    ctx.fillRect(cx + leftOff + 1, y + size + row, w, 1);
  }
}

// eslint-disable-next-line no-unused-vars
function _fillTri(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

// --------------------------------------------------------------------------
// Sparkle effect — rotating pixel crosses at animated positions
// --------------------------------------------------------------------------
function drawSparkles(ctx, timeSec) {
  for (const s of stars) {
    const blink = 0.5 + 0.5 * Math.sin(timeSec * s.speed * 3.14 + s.phase);
    if (blink < 0.2) continue;

    const alpha = blink;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';

    if (s.size === 2) {
      // 4-point sparkle
      const x = s.x;
      const y = s.y;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    } else {
      ctx.fillRect(s.x, s.y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// --------------------------------------------------------------------------
// Gradient-like background using horizontal rect bands
// --------------------------------------------------------------------------
function drawBackground(ctx, timeSec) {
  // Deep navy → slightly lighter at center
  const bands = 8;
  const bandH = Math.ceil(TOTAL_H / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    // Subtle shimmer
    const shimmer = Math.floor(4 * Math.sin(timeSec * 0.3 + i * 0.5));
    const b = Math.floor(t * 30) + 10 + shimmer;
    const clampedB = Math.max(10, Math.min(60, b));
    ctx.fillStyle = `rgb(0,0,${clampedB})`;
    ctx.fillRect(0, i * bandH, SCREEN_W, bandH + 1);
  }
}

// --------------------------------------------------------------------------
// Main exports
// --------------------------------------------------------------------------

/**
 * Draw the full-screen title card.
 * @param {CanvasRenderingContext2D} ctx  in screen-pixel space
 * @param {number} timeSec
 */
export function drawTitle(ctx, timeSec) {
  drawBackground(ctx, timeSec);
  drawSparkles(ctx, timeSec);

  const cy = TOTAL_H / 2;

  // Triforce ornament
  drawTriforceSmall(ctx, SCREEN_W / 2, cy - 70, 8);

  // Main title
  const title = 'THE LEGEND OF SHANK';
  const tScale = 2;
  const tW = textWidth(title, tScale);
  const tx = Math.floor((SCREEN_W - tW) / 2);
  const ty = Math.floor(cy - 30);

  // Golden glow pass (1px offset in each corner)
  const glowColors = ['#AA8800', '#886600'];
  for (let goff = 2; goff >= 1; goff--) {
    drawText(ctx, title, tx + goff, ty + goff, { color: glowColors[goff - 1], scale: tScale });
    drawText(ctx, title, tx - goff, ty + goff, { color: glowColors[goff - 1], scale: tScale });
  }
  drawText(ctx, title, tx, ty, { color: '#FFD700', scale: tScale, shadow: false });

  // Subtitle with blink
  const sub = 'PRESS ENTER TO BEGIN';
  const subScale = 1;
  const subW = textWidth(sub, subScale);
  const subX = Math.floor((SCREEN_W - subW) / 2);
  const subY = ty + 24;

  const visible = Math.floor(timeSec * 2) % 2 === 0;
  if (visible) {
    drawText(ctx, sub, subX, subY, { color: '#88BBFF', scale: subScale });
  }

  // Copyright-ish footer
  const footer = '2025';
  drawText(ctx, footer, Math.floor((SCREEN_W - textWidth(footer)) / 2), TOTAL_H - 12, {
    color: '#445566',
  });
}

/**
 * Handle input on the title screen.
 * @param {import('../contracts.js').GameState} state
 * @param {import('../contracts.js').InputState} input
 * @returns {{ startGame: boolean }}
 */
export function handleTitleInput(state, input) {
  if (input?.startPressed || input?.attackPressed) {
    state.mode = 'playing';
    return { startGame: true };
  }
  return { startGame: false };
}
