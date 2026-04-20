// victory.js — victory / triforce screen
import { SCREEN_W, SCREEN_H, HUD_H } from '../contracts.js';
import { drawText, textWidth } from './font.js';

const TOTAL_H = SCREEN_H + HUD_H;

// --------------------------------------------------------------------------
// Animated triforce — three triangles built from pixel rects
// --------------------------------------------------------------------------
function drawTriforce(ctx, cx, cy, size, timeSec) {
  // Gentle bob
  const bob = Math.floor(2 * Math.sin(timeSec * 1.8));

  // Glow rings (expand/contract)
  const glowR = 1 + Math.floor(3 * (0.5 + 0.5 * Math.sin(timeSec * 2)));
  ctx.fillStyle = `rgba(255,220,0,0.15)`;
  ctx.fillRect(cx - size * 2 - glowR, cy - glowR + bob, size * 4 + glowR * 2, size * 2 + glowR * 2);

  const goldColors = ['#FFD700', '#FFEE44', '#FFC000'];
  const colorIdx = Math.floor(timeSec * 3) % goldColors.length;
  ctx.fillStyle = goldColors[colorIdx];

  const s = size;

  // Helper: draw a filled right-triangle using row-by-row rects
  function tri(tipX, tipY, direction) {
    // direction: 'up' or 'down'
    for (let row = 0; row < s; row++) {
      const w = direction === 'up'
        ? (row + 1) * 2 - 1
        : (s - row) * 2 - 1;
      const y = tipY + (direction === 'up' ? (s - 1 - row) : row) + bob;
      ctx.fillRect(tipX - Math.floor(w / 2), y, w, 1);
    }
  }

  // Top triangle
  tri(cx, cy - s, 'up');
  // Bottom-left triangle
  tri(cx - s, cy, 'up');
  // Bottom-right triangle
  tri(cx + s, cy, 'up');

  // Dark gap between triangles (triforce style)
  ctx.fillStyle = '#000000';
  // Center gap (small inverted triangle)
  for (let row = 0; row < Math.floor(s / 2); row++) {
    const w = (row + 1) * 2 - 1;
    ctx.fillRect(cx - Math.floor(w / 2), cy - Math.floor(s / 2) + row + bob, w, 1);
  }
}

/**
 * Draw the victory screen.
 * @param {CanvasRenderingContext2D} ctx  in screen-pixel space
 * @param {number} timeSec
 */
export function drawVictory(ctx, timeSec) {
  // Background gradient effect (bands)
  const bands = 10;
  const bandH = Math.ceil(TOTAL_H / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const r = Math.floor(t * 20);
    const g = Math.floor(t * 15);
    const b = Math.floor(20 + t * 10);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, i * bandH, SCREEN_W, bandH + 1);
  }

  // Shimmer overlay
  const shimmer = 0.05 + 0.05 * Math.sin(timeSec * 2.5);
  ctx.fillStyle = `rgba(255, 215, 0, ${shimmer.toFixed(3)})`;
  ctx.fillRect(0, 0, SCREEN_W, TOTAL_H);

  const cy = Math.floor(TOTAL_H / 2);

  // Animated triforce
  drawTriforce(ctx, Math.floor(SCREEN_W / 2), cy - 50, 12, timeSec);

  // "YOU GOT THE TRIFORCE"
  const line1 = 'YOU GOT THE TRIFORCE';
  const scale1 = 2;
  const w1 = textWidth(line1, scale1);

  // Colour cycle
  const hue = Math.floor((timeSec * 60) % 60);
  const titleColor = hue < 30 ? '#FFD700' : '#FFEE88';

  drawText(ctx, line1, Math.floor((SCREEN_W - w1) / 2), cy + 8, {
    color: titleColor,
    scale: scale1,
    shadow: true,
  });

  // "THE KINGDOM OF SHANK IS SAVED"
  const line2 = 'THE KINGDOM OF SHANK IS SAVED';
  const w2 = textWidth(line2, 1);
  drawText(ctx, line2, Math.floor((SCREEN_W - w2) / 2), cy + 8 + scale1 * 9 + 4, {
    color: '#88DDFF',
    scale: 1,
  });

  // Twinkling stars around the triforce
  const starAngles = [0, 72, 144, 216, 288];
  for (const angle of starAngles) {
    const rad = (angle + timeSec * 45) * (Math.PI / 180);
    const r = 30 + 4 * Math.sin(timeSec * 3 + angle);
    const sx = Math.floor(SCREEN_W / 2 + Math.cos(rad) * r);
    const sy = Math.floor(cy - 50 + Math.sin(rad) * r);
    const blink = 0.5 + 0.5 * Math.sin(timeSec * 4 + angle);
    if (blink > 0.3) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx, sy, 2, 2);
      ctx.fillRect(sx - 1, sy + 1, 1, 1);
      ctx.fillRect(sx + 2, sy + 1, 1, 1);
      ctx.fillRect(sx + 1, sy - 1, 1, 1);
      ctx.fillRect(sx + 1, sy + 2, 1, 1);
    }
  }
}
