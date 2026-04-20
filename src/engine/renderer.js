// renderer.js — canvas 2D renderer with pixel-text support

import { VIEW_SCALE, HUD_H } from '../contracts.js';

// ---------------------------------------------------------------------------
// 5×7 bitmap font. Each character is 7 rows of 5 bits (MSB = leftmost pixel).
// ---------------------------------------------------------------------------
// prettier-ignore
const FONT = (() => {
  const raw = {
    'A': [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b00000],
    'B': [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b11110, 0b00000],
    'C': [0b01110, 0b10001, 0b10000, 0b10000, 0b10001, 0b01110, 0b00000],
    'D': [0b11100, 0b10010, 0b10001, 0b10001, 0b10010, 0b11100, 0b00000],
    'E': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b11111, 0b00000],
    'F': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b00000],
    'G': [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b01111, 0b00000],
    'H': [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b00000],
    'I': [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110, 0b00000],
    'J': [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100, 0b00000],
    'K': [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10001, 0b00000],
    'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111, 0b00000],
    'M': [0b10001, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001, 0b00000],
    'N': [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b00000],
    'O': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110, 0b00000],
    'P': [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b00000],
    'Q': [0b01110, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101, 0b00000],
    'R': [0b11110, 0b10001, 0b10001, 0b11110, 0b10010, 0b10001, 0b00000],
    'S': [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b11110, 0b00000],
    'T': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000],
    'U': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110, 0b00000],
    'V': [0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100, 0b00000],
    'W': [0b10001, 0b10001, 0b10001, 0b10101, 0b11011, 0b10001, 0b00000],
    'X': [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b00000],
    'Y': [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00000],
    'Z': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111, 0b00000],
    '0': [0b01110, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110, 0b00000],
    '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110, 0b00000],
    '2': [0b01110, 0b10001, 0b00010, 0b00100, 0b01000, 0b11111, 0b00000],
    '3': [0b11111, 0b00010, 0b00100, 0b00010, 0b10001, 0b01110, 0b00000],
    '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00000],
    '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b10001, 0b01110, 0b00000],
    '6': [0b01110, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110, 0b00000],
    '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b00000],
    '8': [0b01110, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110, 0b00000],
    '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110, 0b00000],
    ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
    '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00000],
    ',': [0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100, 0b01000],
    '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100, 0b00000],
    '?': [0b01110, 0b10001, 0b00010, 0b00100, 0b00000, 0b00100, 0b00000],
    ':': [0b00000, 0b00100, 0b00000, 0b00000, 0b00100, 0b00000, 0b00000],
    '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
    "'": [0b00100, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
    '<': [0b00010, 0b00100, 0b01000, 0b01000, 0b00100, 0b00010, 0b00000],
    '>': [0b01000, 0b00100, 0b00010, 0b00010, 0b00100, 0b01000, 0b00000],
    '/': [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b00000, 0b00000],
    '(': [0b00100, 0b01000, 0b10000, 0b10000, 0b01000, 0b00100, 0b00000],
    ')': [0b00100, 0b00010, 0b00001, 0b00001, 0b00010, 0b00100, 0b00000],
  };
  return raw;
})();

const CHAR_W = 5;
const CHAR_H = 7;
const CHAR_GAP = 1; // pixel gap between chars

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let _savedCamera = null;

  return {
    ctx,

    /** Fill the whole canvas with `color`. */
    clear(color = '#000') {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    /** Draw a filled rectangle in pixel-space (within the current transform). */
    drawRect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    },

    /**
     * Save context, apply VIEW_SCALE, HUD offset, and camera translation.
     * Everything drawn after this is in world-pixel space.
     * @param {{ x: number, y: number }} camera
     */
    beginWorld(camera) {
      _savedCamera = camera;
      ctx.save();
      ctx.scale(VIEW_SCALE, VIEW_SCALE);
      ctx.translate(0, HUD_H / VIEW_SCALE); // shift down past HUD
      ctx.translate(-camera.x, -camera.y);
    },

    /** Restore context after world drawing. */
    endWorld() {
      ctx.restore();
      _savedCamera = null;
    },

    /**
     * Render text using the built-in 5×7 pixel font.
     * Coordinates are in the current transform space (call outside beginWorld/endWorld for HUD).
     *
     * @param {string} text
     * @param {number} x       top-left x in current space
     * @param {number} y       top-left y in current space
     * @param {string} color
     * @param {number} [scale=1]  integer upscale factor
     */
    drawPixelText(text, x, y, color, scale = 1) {
      ctx.fillStyle = color;
      const upper = text.toUpperCase();
      let cx = x;
      for (const ch of upper) {
        const rows = FONT[ch] ?? FONT[' '];
        for (let row = 0; row < CHAR_H; row++) {
          const bits = rows[row];
          for (let col = 0; col < CHAR_W; col++) {
            if (bits & (1 << (CHAR_W - 1 - col))) {
              ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
            }
          }
        }
        cx += (CHAR_W + CHAR_GAP) * scale;
      }
    },
  };
}
