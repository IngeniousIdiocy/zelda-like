// pause.js — inventory / pause screen
import { SCREEN_W, SCREEN_H, HUD_H, ITEM } from '../contracts.js';
import { drawText, textWidth } from './font.js';

const TOTAL_H = SCREEN_H + HUD_H;

// All possible item slots in display order
const ITEM_SLOTS = [
  ITEM.BOMB,
  ITEM.BOW,
  ITEM.BOOMERANG,
  ITEM.CANDLE,
  ITEM.POTION,
];

const SLOT_W = 28;
const SLOT_H = 28;
const SLOT_GAP = 8;
const COLS = 5;
const ROWS = Math.ceil(ITEM_SLOTS.length / COLS);
const GRID_W = COLS * SLOT_W + (COLS - 1) * SLOT_GAP;
const GRID_H = ROWS * SLOT_H + (ROWS - 1) * SLOT_GAP;
const GRID_X = Math.floor((SCREEN_W - GRID_W) / 2);
const GRID_Y = Math.floor(TOTAL_H / 2) - Math.floor(GRID_H / 2) + 10;

const C = {
  overlay: 'rgba(0,0,0,0.75)',
  bg: '#001133',
  border: '#4466AA',
  slotBg: '#002255',
  slotBorder: '#3355AA',
  slotSelected: '#FFD700',
  slotHasItem: '#335588',
  slotNoItem: '#111122',
  text: '#FFFFFF',
  textDim: '#556677',
  title: '#FFD700',
  cursor: '#FFD700',
};

// Maps ITEM value → has-item flag on state
const ITEM_OWNED_KEY = {
  [ITEM.BOMB]:      s => (s.bombs ?? 0) > 0,
  [ITEM.BOW]:       s => !!s.hasBow,
  [ITEM.BOOMERANG]: s => !!s.hasBoomerang,
  [ITEM.CANDLE]:    s => !!s.hasCandle,
  [ITEM.POTION]:    s => false, // future
};

// Inline item icon drawing (16×16 within a slot)
function drawSlotIcon(ctx, item, x, y) {
  // Center a 12×12 icon in the slot
  const ix = x + Math.floor((SLOT_W - 12) / 2);
  const iy = y + Math.floor((SLOT_H - 12) / 2);
  const s = 2; // 2× scale for icon pixels

  switch (item) {
    case ITEM.BOMB:
      ctx.fillStyle = '#888888';
      ctx.fillRect(ix + 2*s, iy + 1*s, 2*s, 3*s);
      ctx.fillRect(ix + 1*s, iy + 2*s, 4*s, 2*s);
      ctx.fillStyle = '#555555';
      ctx.fillRect(ix + 1*s, iy + 3*s, 4*s, 1*s);
      ctx.fillStyle = '#FFAA00';
      ctx.fillRect(ix + 4*s, iy,        1*s, 1*s);
      ctx.fillRect(ix + 3*s, iy + 1*s,  1*s, 1*s);
      break;
    case ITEM.BOW:
      ctx.fillStyle = '#AA7700';
      for (let i = 0; i < 5; i++) {
        const off = i < 2 ? i : 4 - i;
        ctx.fillRect(ix + off * s, iy + i * s, s, s);
      }
      ctx.fillStyle = '#DDDDDD';
      ctx.fillRect(ix + 4*s, iy + s, s, 3*s);
      break;
    case ITEM.BOOMERANG:
      ctx.fillStyle = '#AA8800';
      ctx.fillRect(ix,       iy + s,  4*s, s);
      ctx.fillRect(ix + 4*s, iy + s,  s,   3*s);
      ctx.fillRect(ix + 2*s, iy + 4*s,3*s, s);
      break;
    case ITEM.CANDLE:
      ctx.fillStyle = '#EEEEBB';
      ctx.fillRect(ix + s,   iy + 2*s, 2*s, 3*s);
      ctx.fillStyle = '#FFAA00';
      ctx.fillRect(ix + s,   iy + s,   2*s, s);
      ctx.fillStyle = '#FFFF44';
      ctx.fillRect(ix + s,   iy,       2*s, s);
      break;
    case ITEM.POTION:
      ctx.fillStyle = '#2244FF';
      ctx.fillRect(ix + s,   iy + 2*s, 3*s, 3*s);
      ctx.fillStyle = '#AAAAAA';
      ctx.fillRect(ix + s,   iy,       2*s, s);
      ctx.fillRect(ix + s,   iy + s,   2*s, s);
      break;
    default:
      ctx.fillStyle = '#334455';
      ctx.fillRect(ix + s, iy + 2*s, 3*s, s);
  }
}

function getSelectedIndex(state) {
  const idx = ITEM_SLOTS.indexOf(state.selectedItem);
  return idx >= 0 ? idx : 0;
}

/**
 * Draw the pause / inventory screen.
 * @param {CanvasRenderingContext2D} ctx  in screen-pixel space
 * @param {import('../contracts.js').GameState} state
 */
export function drawPauseMenu(ctx, state) {
  // Dim overlay
  ctx.fillStyle = C.overlay;
  ctx.fillRect(0, 0, SCREEN_W, TOTAL_H);

  // Panel background
  const panelW = GRID_W + 40;
  const panelH = GRID_H + 60;
  const panelX = Math.floor((SCREEN_W - panelW) / 2);
  const panelY = Math.floor((TOTAL_H - panelH) / 2);

  ctx.fillStyle = C.bg;
  ctx.fillRect(panelX, panelY, panelW, panelH);
  // Double border
  ctx.fillStyle = C.border;
  ctx.fillRect(panelX, panelY, panelW, 1);
  ctx.fillRect(panelX, panelY + panelH - 1, panelW, 1);
  ctx.fillRect(panelX, panelY, 1, panelH);
  ctx.fillRect(panelX + panelW - 1, panelY, 1, panelH);
  ctx.fillRect(panelX + 1, panelY + 1, panelW - 2, 1);
  ctx.fillRect(panelX + 1, panelY + panelH - 2, panelW - 2, 1);
  ctx.fillRect(panelX + 1, panelY + 1, 1, panelH - 2);
  ctx.fillRect(panelX + panelW - 2, panelY + 1, 1, panelH - 2);

  // Title
  const titleStr = 'INVENTORY';
  const titleW = textWidth(titleStr, 1);
  drawText(ctx, titleStr, Math.floor((SCREEN_W - titleW) / 2), panelY + 8, {
    color: C.title, scale: 1,
  });

  // Divider
  ctx.fillStyle = C.border;
  ctx.fillRect(panelX + 4, panelY + 18, panelW - 8, 1);

  // Item slots
  const selectedIdx = getSelectedIndex(state);

  for (let i = 0; i < ITEM_SLOTS.length; i++) {
    const item = ITEM_SLOTS[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const sx = GRID_X + col * (SLOT_W + SLOT_GAP);
    const sy = GRID_Y + row * (SLOT_H + SLOT_GAP);

    const owned = ITEM_OWNED_KEY[item]?.(state) ?? false;
    const isSelected = (i === selectedIdx);

    // Slot background
    ctx.fillStyle = owned ? C.slotHasItem : C.slotNoItem;
    ctx.fillRect(sx, sy, SLOT_W, SLOT_H);

    // Slot border
    ctx.fillStyle = isSelected ? C.slotSelected : (owned ? C.slotBorder : C.slotBorder);
    ctx.fillRect(sx, sy, SLOT_W, 1);
    ctx.fillRect(sx, sy + SLOT_H - 1, SLOT_W, 1);
    ctx.fillRect(sx, sy, 1, SLOT_H);
    ctx.fillRect(sx + SLOT_W - 1, sy, 1, SLOT_H);
    if (isSelected) {
      // Inner highlight
      ctx.fillStyle = C.slotSelected;
      ctx.fillRect(sx + 1, sy + 1, SLOT_W - 2, 1);
      ctx.fillRect(sx + 1, sy + SLOT_H - 2, SLOT_W - 2, 1);
      ctx.fillRect(sx + 1, sy + 1, 1, SLOT_H - 2);
      ctx.fillRect(sx + SLOT_W - 2, sy + 1, 1, SLOT_H - 2);
    }

    // Icon (dimmed if not owned)
    if (!owned) ctx.globalAlpha = 0.3;
    drawSlotIcon(ctx, item, sx, sy);
    ctx.globalAlpha = 1;

    // Item label
    const label = item.toUpperCase();
    const lw = textWidth(label, 1);
    drawText(ctx, label, sx + Math.floor((SLOT_W - lw) / 2), sy + SLOT_H + 2, {
      color: owned ? C.text : C.textDim,
    });
  }

  // Bottom hint
  const hint = 'LEFT/RIGHT: SELECT   ENTER: CLOSE';
  const hw = textWidth(hint, 1);
  drawText(ctx, hint, Math.floor((SCREEN_W - hw) / 2), panelY + panelH - 12, {
    color: C.textDim,
  });
}

/**
 * Update pause menu logic (selection cycling).
 * @param {import('../contracts.js').InputState} input
 * @param {import('../contracts.js').GameState} state
 * @returns {boolean} true if still paused
 */
export function update(input, state) {
  if (!input) return true;

  if (input.startPressed) {
    state.mode = 'playing';
    return false;
  }

  const currentIdx = getSelectedIndex(state);

  if (input.rightPressed ?? input.cyclePressed) {
    const next = (currentIdx + 1) % ITEM_SLOTS.length;
    state.selectedItem = ITEM_SLOTS[next];
  }
  if (input.leftPressed) {
    const prev = (currentIdx - 1 + ITEM_SLOTS.length) % ITEM_SLOTS.length;
    state.selectedItem = ITEM_SLOTS[prev];
  }

  return true;
}
