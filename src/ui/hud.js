// hud.js — top HUD strip drawn in screen-pixel units (caller applies VIEW_SCALE).
import { HUD_H, SCREEN_W, ITEM } from '../contracts.js';
import { drawText, textWidth } from './font.js';

// --------------------------------------------------------------------------
// Minimap constants
// --------------------------------------------------------------------------
const MAP_COLS = 8;
const MAP_ROWS = 4;
const MAP_CELL_W = 5;
const MAP_CELL_H = 4;
const MAP_GAP = 1;
const MAP_X = 80;
const MAP_Y = 4;

// --------------------------------------------------------------------------
// Heart constants
// --------------------------------------------------------------------------
const HEART_W = 8;
const HEART_H = 7;
const HEART_GAP = 1;
const HEARTS_PER_ROW = 8;
const HEARTS_X = 144;
const HEARTS_Y = 26;

// --------------------------------------------------------------------------
// Colours
// --------------------------------------------------------------------------
const C = {
  bg: '#000',
  hudBar: '#0000AA',
  hudBorder: '#3333CC',
  text: '#FFFFFF',
  textDim: '#AAAAAA',
  heartFull: '#FF2020',
  heartEmpty: '#400000',
  heartBorder: '#800000',
  rupee: '#00FF88',
  key: '#FFFF00',
  bomb: '#FF8800',
  mapCurrent: '#FFFFFF',
  mapVisited: '#4488CC',
  mapUnvisited: '#112244',
  mapBorder: '#223366',
  itemBg: '#001133',
  itemBorder: '#4466AA',
};

// --------------------------------------------------------------------------
// Tiny item icons (8×8, drawn with rects)
// --------------------------------------------------------------------------
function drawItemIcon(ctx, item, x, y) {
  switch (item) {
    case ITEM.BOMB:
      // round bomb body
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 2, y + 1, 4, 5);
      ctx.fillStyle = '#444';
      ctx.fillRect(x + 1, y + 2, 6, 3);
      // fuse
      ctx.fillStyle = '#AA6600';
      ctx.fillRect(x + 4, y, 1, 2);
      ctx.fillRect(x + 5, y, 1, 1);
      break;
    case ITEM.BOW:
      // bow arc
      ctx.fillStyle = '#AA7700';
      for (let i = 0; i < 7; i++) {
        const off = i < 3 ? i : 6 - i;
        ctx.fillRect(x + 1 + off, y + i, 1, 1);
      }
      // string
      ctx.fillStyle = '#EEEEEE';
      ctx.fillRect(x + 6, y + 1, 1, 5);
      break;
    case ITEM.BOOMERANG:
      ctx.fillStyle = '#886600';
      ctx.fillRect(x + 1, y + 1, 5, 2);
      ctx.fillRect(x + 5, y + 2, 2, 4);
      ctx.fillRect(x + 3, y + 5, 3, 2);
      break;
    case ITEM.CANDLE:
      // candle body
      ctx.fillStyle = '#EEEEBB';
      ctx.fillRect(x + 2, y + 2, 4, 5);
      // flame
      ctx.fillStyle = '#FFAA00';
      ctx.fillRect(x + 3, y + 1, 2, 2);
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(x + 3, y, 2, 1);
      // wick
      ctx.fillStyle = '#333333';
      ctx.fillRect(x + 4, y + 1, 1, 1);
      break;
    case ITEM.POTION:
      ctx.fillStyle = '#0044FF';
      ctx.fillRect(x + 2, y + 3, 4, 4);
      ctx.fillStyle = '#0022AA';
      ctx.fillRect(x + 1, y + 4, 1, 2);
      ctx.fillRect(x + 6, y + 4, 1, 2);
      // neck
      ctx.fillStyle = '#AAAAAA';
      ctx.fillRect(x + 3, y + 1, 2, 2);
      ctx.fillRect(x + 2, y, 4, 1);
      break;
    case ITEM.NONE:
    default:
      // dash placeholder
      ctx.fillStyle = '#334455';
      ctx.fillRect(x + 2, y + 3, 4, 1);
      break;
  }
}

// --------------------------------------------------------------------------
// Rupee icon (6×7)
// --------------------------------------------------------------------------
function drawRupeeIcon(ctx, x, y) {
  ctx.fillStyle = C.rupee;
  ctx.fillRect(x + 1, y, 4, 1);
  ctx.fillRect(x, y + 1, 1, 5);
  ctx.fillRect(x + 1, y + 1, 3, 1);
  ctx.fillRect(x + 1, y + 3, 3, 1);
  ctx.fillRect(x + 4, y + 1, 1, 2);
  ctx.fillRect(x + 4, y + 4, 1, 2);
  ctx.fillRect(x + 1, y + 5, 2, 1);
  ctx.fillRect(x + 3, y + 4, 1, 1);
}

// --------------------------------------------------------------------------
// Key icon (8×7)
// --------------------------------------------------------------------------
function drawKeyIcon(ctx, x, y) {
  ctx.fillStyle = C.key;
  // head circle
  ctx.fillRect(x, y, 5, 1);
  ctx.fillRect(x, y + 1, 1, 3);
  ctx.fillRect(x + 4, y + 1, 1, 3);
  ctx.fillRect(x + 1, y + 3, 3, 1);
  // shaft
  ctx.fillRect(x + 2, y + 4, 1, 3);
  // teeth
  ctx.fillRect(x + 3, y + 5, 2, 1);
  ctx.fillRect(x + 3, y + 7, 2, 1);
}

// --------------------------------------------------------------------------
// Bomb count icon (simple circle)
// --------------------------------------------------------------------------
function drawBombCountIcon(ctx, x, y) {
  ctx.fillStyle = C.bomb;
  ctx.fillRect(x + 1, y, 4, 1);
  ctx.fillRect(x, y + 1, 6, 3);
  ctx.fillRect(x + 1, y + 4, 4, 1);
  ctx.fillStyle = '#FFCC00';
  ctx.fillRect(x + 4, y - 1, 1, 2);
  ctx.fillRect(x + 5, y - 1, 1, 1);
}

// --------------------------------------------------------------------------
// Heart drawing
// --------------------------------------------------------------------------
// quarters: 4=full, 3=three-quarter, 2=half, 1=quarter, 0=empty
function drawHeart(ctx, x, y, quarters) {
  // Empty background
  ctx.fillStyle = C.heartEmpty;
  // Draw heart shape (8×7 pixel heart)
  _heartShape(ctx, x, y);

  if (quarters > 0) {
    ctx.fillStyle = C.heartFull;
    // Fill portions left to right
    const fillW = Math.round((quarters / 4) * (HEART_W - 2));
    ctx.fillRect(x + 1, y, Math.min(fillW, HEART_W - 2), HEART_H - 1);
    // Re-clip to heart shape
    _heartClip(ctx, x, y, quarters);
  }
}

function _heartShape(ctx, x, y) {
  // 8×7 heart using filled rects
  // Row 0: skip col0,col3 → gaps at top lobes
  ctx.fillRect(x + 1, y, 2, 1);
  ctx.fillRect(x + 5, y, 2, 1);
  // Rows 1-2: full width top
  ctx.fillRect(x, y + 1, HEART_W, 2);
  // Rows 3-4: slight taper
  ctx.fillRect(x + 1, y + 3, HEART_W - 2, 2);
  // Row 5: narrow
  ctx.fillRect(x + 2, y + 5, HEART_W - 4, 1);
  // Row 6: point
  ctx.fillRect(x + 3, y + 6, 2, 1);
}

function _heartClip(ctx, x, y, quarters) {
  // Re-draw filled portions in red, respecting heart shape
  // We just overdraw the heart in full red up to the fill width, then
  // black-out the parts outside the heart. Simpler: draw full red heart
  // then mask right portion empty.
  const fillW = Math.round((quarters / 4) * HEART_W);
  ctx.fillStyle = C.heartFull;
  _heartShapeClipped(ctx, x, y, fillW);
  // Draw empty portion if partial
  if (fillW < HEART_W) {
    ctx.fillStyle = C.heartEmpty;
    _heartShapeClippedRight(ctx, x, y, fillW);
  }
}

function _heartShapeClipped(ctx, x, y, maxX) {
  // Draw heart pixels only up to x+maxX
  const rows = [
    [1, 2], // row 0: cols 1-2
    [5, 6], // row 0 second lobe
    [0, 7], // rows 1-2: full
    [1, 6], // rows 3-4
    [2, 5], // row 5
    [3, 4], // row 6
  ];
  // Simplified: just draw each row segment clipped
  const segments = [
    { row: 0, x1: 1, x2: 3 }, { row: 0, x1: 5, x2: 7 },
    { row: 1, x1: 0, x2: 8 }, { row: 2, x1: 0, x2: 8 },
    { row: 3, x1: 1, x2: 7 }, { row: 4, x1: 1, x2: 7 },
    { row: 5, x1: 2, x2: 6 }, { row: 6, x1: 3, x2: 5 },
  ];
  for (const seg of segments) {
    const sx = x + seg.x1;
    const ex = Math.min(x + seg.x2, x + maxX);
    if (ex > sx) ctx.fillRect(sx, y + seg.row, ex - sx, 1);
  }
}

function _heartShapeClippedRight(ctx, x, y, fromX) {
  const segments = [
    { row: 0, x1: 1, x2: 3 }, { row: 0, x1: 5, x2: 7 },
    { row: 1, x1: 0, x2: 8 }, { row: 2, x1: 0, x2: 8 },
    { row: 3, x1: 1, x2: 7 }, { row: 4, x1: 1, x2: 7 },
    { row: 5, x1: 2, x2: 6 }, { row: 6, x1: 3, x2: 5 },
  ];
  for (const seg of segments) {
    const sx = Math.max(x + seg.x1, x + fromX);
    const ex = x + seg.x2;
    if (ex > sx) ctx.fillRect(sx, y + seg.row, ex - sx, 1);
  }
}

// --------------------------------------------------------------------------
// Minimap
// --------------------------------------------------------------------------
function drawMinimap(ctx, state, world) {
  const room = world?.room;
  const kind = room?.kind ?? 'overworld';

  // Background
  ctx.fillStyle = C.mapBorder;
  ctx.fillRect(MAP_X - 1, MAP_Y - 1,
    MAP_COLS * (MAP_CELL_W + MAP_GAP) + 1,
    MAP_ROWS * (MAP_CELL_H + MAP_GAP) + 1);

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const cx = MAP_X + col * (MAP_CELL_W + MAP_GAP);
      const cy = MAP_Y + row * (MAP_CELL_H + MAP_GAP);

      // Derive room id for this cell
      let cellId;
      if (kind === 'overworld') {
        cellId = `ov_${col}_${row}`;
      } else {
        cellId = `d1_${col}_${row}`;
      }

      // Determine cell color
      let cellColor = C.mapUnvisited;
      const isCurrent = state.currentRoomId === cellId ||
        (room?.id === cellId);

      if (isCurrent) {
        cellColor = C.mapCurrent;
      } else if (state.flags?.has?.(`visited_${cellId}`)) {
        cellColor = C.mapVisited;
      } else if (kind === 'overworld') {
        // Overworld: show all cells as dim visited by default
        cellColor = C.mapVisited;
      }

      ctx.fillStyle = cellColor;
      ctx.fillRect(cx, cy, MAP_CELL_W, MAP_CELL_H);
    }
  }
}

// --------------------------------------------------------------------------
// Main export
// --------------------------------------------------------------------------
/**
 * Draw the HUD strip.
 * Assumes ctx is in screen-pixel space (caller scales by VIEW_SCALE).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../contracts.js').GameState} state
 * @param {import('../contracts.js').World} world
 */
export function drawHud(ctx, state, world) {
  // Background bar
  ctx.fillStyle = C.hudBar;
  ctx.fillRect(0, 0, SCREEN_W, HUD_H);

  // Bottom border line
  ctx.fillStyle = C.hudBorder;
  ctx.fillRect(0, HUD_H - 1, SCREEN_W, 1);

  // ---- Left block: level/area label ----
  const room = world?.room;
  let label = 'OVERWORLD';
  if (room?.kind === 'dungeon') {
    // Try to extract dungeon number from room id (e.g. 'd1_entry' → 'LEVEL-1')
    const m = room.id?.match(/^d(\d+)/);
    label = m ? `LEVEL-${m[1]}` : 'DUNGEON';
  }
  drawText(ctx, label, 4, 4, { color: C.text, scale: 1 });

  // ---- Minimap ----
  drawMinimap(ctx, state, world);

  // ---- Center block: selected item ----
  const itemX = 116;
  const itemY = 4;
  ctx.fillStyle = C.itemBg;
  ctx.fillRect(itemX, itemY, 12, 12);
  ctx.strokeStyle = C.itemBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(itemX + 0.5, itemY + 0.5, 11, 11);
  drawItemIcon(ctx, state?.selectedItem ?? ITEM.NONE, itemX + 2, itemY + 2);

  // ---- Right block: rupees, keys, bombs ----
  const statsX = 188;
  let sy = 2;

  // Rupees
  drawRupeeIcon(ctx, statsX, sy + 1);
  drawText(ctx, `x${String(state?.rupees ?? 0).padStart(2, '0')}`, statsX + 8, sy, { color: C.rupee });
  sy += 10;

  // Keys
  drawKeyIcon(ctx, statsX, sy);
  drawText(ctx, `x${state?.keys ?? 0}`, statsX + 8, sy, { color: C.key });
  sy += 10;

  // Bombs
  drawBombCountIcon(ctx, statsX, sy + 1);
  drawText(ctx, `x${String(state?.bombs ?? 0).padStart(2, '0')}`, statsX + 8, sy, { color: C.bomb });

  // ---- Hearts ----
  const totalHearts = Math.ceil((state?.maxHearts ?? 12) / 4);
  const currentQH = state?.hearts ?? 0;

  for (let i = 0; i < totalHearts; i++) {
    const qh = Math.max(0, Math.min(4, currentQH - i * 4));
    const col = i % HEARTS_PER_ROW;
    const row = Math.floor(i / HEARTS_PER_ROW);
    const hx = HEARTS_X + col * (HEART_W + HEART_GAP);
    const hy = HEARTS_Y + row * (HEART_H + HEART_GAP);

    // Draw empty heart background first
    ctx.fillStyle = C.heartEmpty;
    _heartShape(ctx, hx, hy);

    // Draw filled portion
    if (qh > 0) {
      _heartClip(ctx, hx, hy, qh);
    }
  }
}
