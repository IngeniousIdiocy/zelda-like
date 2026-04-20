// playerArt.js — procedural 14×14 Link-ish sprite, no external assets.

// Palette
const C = {
  skin:    '#f5c896',
  tunic:   '#3a9c3a',
  hat:     '#3a9c3a',
  hatDark: '#2a6c2a',
  hair:    '#e8a020',
  eye:     '#1a1a2e',
  sword:   '#d0d0e8',
  swordHl: '#ffffff',
  belt:    '#8b4513',
  boot:    '#5c3317',
  shadow:  'rgba(0,0,0,0.18)',
};

/**
 * Draw the 14×14 Link-ish sprite.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x     top-left world x (already camera-adjusted by caller)
 * @param {number} y     top-left world y
 * @param {number} dir   DIR constant (0=UP,1=DOWN,2=LEFT,3=RIGHT)
 * @param {number} walkFrame  0 or 1
 * @param {boolean} swinging
 * @param {boolean} visible  false during invuln flash-off frames
 */
export function drawPlayer(ctx, x, y, dir, walkFrame, swinging, visible) {
  if (!visible) return;

  const ix = Math.round(x);
  const iy = Math.round(y);

  const p = (rx, ry, rw, rh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(ix + rx, iy + ry, rw, rh);
  };

  // ground shadow
  ctx.fillStyle = C.shadow;
  ctx.fillRect(ix + 2, iy + 13, 10, 2);

  if (dir === 0) { // UP
    _drawUp(p, walkFrame, swinging);
  } else if (dir === 1) { // DOWN
    _drawDown(p, walkFrame, swinging);
  } else if (dir === 2) { // LEFT
    _drawSide(p, walkFrame, swinging, true);
  } else { // RIGHT
    _drawSide(p, walkFrame, swinging, false);
  }
}

function _drawDown(p, f, sw) {
  // hat (top)
  p(3, 0, 8, 2, C.hat);
  p(2, 2, 10, 1, C.hatDark);
  // head
  p(3, 3, 8, 5, C.skin);
  // eyes
  p(4, 5, 2, 2, C.eye);
  p(8, 5, 2, 2, C.eye);
  // hair sides
  p(2, 3, 1, 4, C.hair);
  p(11, 3, 1, 4, C.hair);
  // body / tunic
  p(3, 8, 8, 4, C.tunic);
  // belt
  p(3, 10, 8, 1, C.belt);
  // legs (walk anim)
  p(3, 12, 3, 2, C.boot);
  p(8, 12, 3, 2, C.boot);
  if (f === 1) {
    p(4, 12, 3, 2, C.boot);
    p(7, 12, 3, 2, C.boot);
  }
  // sword if swinging (held out below)
  if (sw) {
    p(6, 14, 2, 4, C.sword);
    p(6, 14, 2, 1, C.swordHl);
  }
}

function _drawUp(p, f, sw) {
  // hat
  p(3, 0, 8, 3, C.hat);
  p(2, 3, 10, 1, C.hatDark);
  // head (back of head)
  p(3, 4, 8, 5, C.hair);
  // body
  p(3, 9, 8, 3, C.tunic);
  p(3, 11, 8, 1, C.belt);
  // legs
  p(3, 12, 3, 2, C.boot);
  p(8, 12, 3, 2, C.boot);
  if (f === 1) {
    p(4, 12, 3, 2, C.boot);
    p(7, 12, 3, 2, C.boot);
  }
  // sword (held up above head)
  if (sw) {
    p(6, -4, 2, 6, C.sword);
    p(6, -4, 2, 1, C.swordHl);
  }
}

function _drawSide(p, f, sw, flipLeft) {
  // mirror helper: if flipLeft, mirror rx within 14px
  const m = (rx, ry, rw, rh, color) => {
    if (flipLeft) {
      p(14 - rx - rw, ry, rw, rh, color);
    } else {
      p(rx, ry, rw, rh, color);
    }
  };

  // hat
  m(3, 0, 7, 2, C.hat);
  m(2, 2, 9, 1, C.hatDark);
  // hat tip (right side)
  m(10, 0, 2, 2, C.hat);
  // head
  m(3, 3, 6, 5, C.skin);
  // hair back
  m(2, 3, 1, 5, C.hair);
  // eye
  m(7, 5, 1, 2, C.eye);
  // ear
  m(9, 5, 1, 2, C.skin);
  // body
  m(3, 8, 7, 4, C.tunic);
  m(3, 10, 7, 1, C.belt);
  // arm (sword arm)
  m(10, 8, 2, 3, C.skin);
  // legs
  const legOff = f === 0 ? 0 : 1;
  m(3, 12, 3, 2, C.boot);
  m(7 + legOff, 12, 3, 2, C.boot);
  // sword
  if (sw) {
    if (flipLeft) {
      p(-4, 8, 6, 2, C.sword);
      p(-4, 8, 1, 2, C.swordHl);
    } else {
      p(12, 8, 6, 2, C.sword);
      p(17, 8, 1, 2, C.swordHl);
    }
  }
}
