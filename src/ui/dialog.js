// dialog.js — typewriter dialog box at the bottom of the play area
import { SCREEN_W, SCREEN_H, HUD_H, EVT } from '../contracts.js';
import { drawText, textWidth } from './font.js';

const BOX_H = 40;
const BOX_X = 4;
const BOX_Y = HUD_H + SCREEN_H - BOX_H - 4;  // near bottom of play area
const BOX_W = SCREEN_W - 8;
const PAD_X = 6;
const PAD_Y = 5;
const LINE_H = 10;
const MAX_LINES = 3;
const CHARS_PER_LINE = Math.floor((BOX_W - PAD_X * 2) / 6); // ~6px per char at scale 1
const CHARS_PER_TICK = 3;
const TICK_INTERVAL = 0.03; // seconds per tick
const SFX_EVERY_N = 3;     // emit SFX every N chars typed

const C = {
  bg: '#000033',
  border: '#FFFFFF',
  text: '#FFFFFF',
  cursor: '#AADDFF',
};

/**
 * Word-wrap text into lines of at most `maxChars` characters.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string[]}
 */
function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/**
 * Create a dialog system instance.
 * @param {import('../contracts.js').EventBus} events
 * @param {import('../contracts.js').GameState} state
 */
export function createDialogSystem(events, state) {
  let lines = [];          // full wrapped lines
  let visibleChars = 0;    // total chars revealed
  let totalChars = 0;
  let tickAccum = 0;
  let sfxAccum = 0;
  let currentOnClose = null;
  let active = false;

  // Listen for DIALOG_OPEN events
  events.on(EVT.DIALOG_OPEN, ({ text, onClose } = {}) => {
    const raw = String(text ?? '');
    lines = wrapText(raw.toUpperCase(), CHARS_PER_LINE).slice(0, MAX_LINES);
    totalChars = lines.reduce((sum, l) => sum + l.length, 0);
    visibleChars = 0;
    tickAccum = 0;
    sfxAccum = 0;
    currentOnClose = onClose ?? null;
    active = true;
    state.mode = 'dialog';
  });

  /**
   * @param {number} dt  delta time in seconds
   * @param {import('../contracts.js').InputState} input
   */
  function update(dt, input) {
    if (!active) return;

    const advance = input?.startPressed || input?.attackPressed || input?.usePressed;

    if (advance) {
      if (visibleChars < totalChars) {
        // Complete typewriter instantly
        visibleChars = totalChars;
      } else {
        // Close dialog
        _close();
        return;
      }
    }

    // Typewriter tick
    if (visibleChars < totalChars) {
      tickAccum += dt;
      while (tickAccum >= TICK_INTERVAL && visibleChars < totalChars) {
        tickAccum -= TICK_INTERVAL;
        const prev = visibleChars;
        visibleChars = Math.min(totalChars, visibleChars + CHARS_PER_TICK);
        sfxAccum += visibleChars - prev;
        if (sfxAccum >= SFX_EVERY_N) {
          sfxAccum -= SFX_EVERY_N;
          events.emit(EVT.SFX, 'text');
        }
      }
    }
  }

  function _close() {
    active = false;
    state.mode = 'playing';
    const cb = currentOnClose;
    currentOnClose = null;
    if (cb) cb();
    events.emit(EVT.DIALOG_CLOSE);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx  in screen-pixel space (HUD offset already in BOX_Y)
   */
  function draw(ctx) {
    if (!active) return;

    // Box background
    ctx.fillStyle = C.bg;
    ctx.fillRect(BOX_X, BOX_Y, BOX_W, BOX_H);

    // Border (2px)
    ctx.fillStyle = C.border;
    ctx.fillRect(BOX_X, BOX_Y, BOX_W, 1);
    ctx.fillRect(BOX_X, BOX_Y + BOX_H - 1, BOX_W, 1);
    ctx.fillRect(BOX_X, BOX_Y, 1, BOX_H);
    ctx.fillRect(BOX_X + BOX_W - 1, BOX_Y, 1, BOX_H);
    // Inner border
    ctx.fillRect(BOX_X + 1, BOX_Y + 1, BOX_W - 2, 1);
    ctx.fillRect(BOX_X + 1, BOX_Y + BOX_H - 2, BOX_W - 2, 1);
    ctx.fillRect(BOX_X + 1, BOX_Y + 1, 1, BOX_H - 2);
    ctx.fillRect(BOX_X + BOX_W - 2, BOX_Y + 1, 1, BOX_H - 2);

    // Text
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const charsOnThisLine = Math.max(0, Math.min(lineText.length, visibleChars - charCount));
      if (charsOnThisLine <= 0) break;

      const visible = lineText.slice(0, charsOnThisLine);
      drawText(ctx, visible, BOX_X + PAD_X, BOX_Y + PAD_Y + i * LINE_H, { color: C.text });
      charCount += lineText.length;
    }

    // Blinking cursor when fully typed
    if (visibleChars >= totalChars && active) {
      const blinkOn = Math.floor(Date.now() / 400) % 2 === 0;
      if (blinkOn) {
        const lastLine = Math.min(lines.length - 1, MAX_LINES - 1);
        const lastText = lines[lastLine] ?? '';
        const cursorX = BOX_X + PAD_X + textWidth(lastText) + 3;
        const cursorY = BOX_Y + PAD_Y + lastLine * LINE_H + 2;
        ctx.fillStyle = C.cursor;
        ctx.fillRect(cursorX, cursorY, 4, 2);
      }
    }
  }

  return { update, draw };
}

// Named exports for consumers who want direct update/draw references —
// they should use the object returned by createDialogSystem.
export { createDialogSystem as default };
