// chest.js — openable treasure chest entity
import { EVT, aabb, DIR } from '../contracts.js';

let _nextId = 1;
function uid() { return `chest_${_nextId++}`; }

const CHEST_W = 16;
const CHEST_H = 16;

// DIR values for directional adjacency checks
const CHEST_OPEN_RANGE = 4; // pixels of extra reach for open check

export function createChest(events, { x, y, contents }) {
  let opened = false;
  let openAnim = 0; // 0..1 lid animation
  let touchTime = 0; // seconds player has been touching/adjacent

  return {
    id: uid(),
    kind: 'chest',
    x, y, w: CHEST_W, h: CHEST_H,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: true,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      if (opened) {
        openAnim = Math.min(1, openAnim + dt * 4);
        return;
      }

      const p = world.player;
      if (!p || p.dead) { touchTime = 0; return; }

      // Check adjacency: expand hitbox slightly to detect player facing toward chest
      const expanded = {
        x: this.x - CHEST_OPEN_RANGE,
        y: this.y - CHEST_OPEN_RANGE,
        w: this.w + CHEST_OPEN_RANGE * 2,
        h: this.h + CHEST_OPEN_RANGE * 2,
      };
      const adjacent = aabb(p, expanded);

      if (adjacent) {
        // Check if player is facing toward chest
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        const px = p.x + p.w / 2;
        const py = p.y + p.h / 2;
        const dx = cx - px;
        const dy = cy - py;

        let facing = false;
        if (p.dir === DIR.UP    && dy < 0 && Math.abs(dy) > Math.abs(dx)) facing = true;
        if (p.dir === DIR.DOWN  && dy > 0 && Math.abs(dy) > Math.abs(dx)) facing = true;
        if (p.dir === DIR.LEFT  && dx < 0 && Math.abs(dx) > Math.abs(dy)) facing = true;
        if (p.dir === DIR.RIGHT && dx > 0 && Math.abs(dx) > Math.abs(dy)) facing = true;

        const inp = world.input ? world.input.state : null;
        const usePressed = inp && (inp.usePressed || inp.attackPressed);

        if (usePressed && facing) {
          _openChest(this, world, events, contents);
        } else if (facing) {
          touchTime += dt;
          if (touchTime >= 0.3) {
            _openChest(this, world, events, contents);
          }
        } else {
          touchTime = 0;
        }
      } else {
        touchTime = 0;
      }
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;

      if (!opened) {
        _drawChestClosed(ctx, sx, sy);
      } else {
        _drawChestOpen(ctx, sx, sy, openAnim);
      }
    },
  };
}

function _openChest(chest, world, events, contents) {
  chest.solid = false; // no longer blocks movement
  // Mark as opened via flags so it won't respawn
  const flagKey = `chest_opened_${chest.id}`;
  world.state.flags.add(flagKey);

  // Spawn the contents pickup above the chest
  if (contents) {
    const spawnX = chest.x + (chest.w - 8) / 2;
    const spawnY = chest.y - 16;
    const item = contents(spawnX, spawnY);
    if (item) world.spawn(item);
  }

  events.emit(EVT.SFX, 'chest_open');
  // Notify chest open for any listeners (UI fanfare etc.)
  events.emit('chest_opened', { id: chest.id, x: chest.x, y: chest.y });

  // Mark opened after all side effects so render update is deferred
  chest.opened = true; // set own property for render access
  Object.defineProperty(chest, '_opened', { value: true, writable: false });
}

// Expose opened state for render via a closure flag accessed through the
// object property set in _openChest.
function _drawChestClosed(ctx, sx, sy) {
  // Base / body
  ctx.fillStyle = '#7a4a1a';
  ctx.fillRect(sx, sy + 6, 16, 10);
  // Lid
  ctx.fillStyle = '#7a4a1a';
  ctx.fillRect(sx, sy, 16, 7);
  // Gold trim on lid
  ctx.fillStyle = '#daa520';
  ctx.fillRect(sx, sy, 16, 1);
  ctx.fillRect(sx, sy + 6, 16, 1);
  ctx.fillRect(sx, sy, 1, 7);
  ctx.fillRect(sx + 15, sy, 1, 7);
  // Gold trim on body
  ctx.fillRect(sx, sy + 6, 1, 10);
  ctx.fillRect(sx + 15, sy + 6, 1, 10);
  ctx.fillRect(sx, sy + 15, 16, 1);
  // Latch
  ctx.fillStyle = '#daa520';
  ctx.fillRect(sx + 6, sy + 5, 4, 4);
  ctx.fillStyle = '#7a4a1a';
  ctx.fillRect(sx + 7, sy + 6, 2, 2);
  // Lock keyhole
  ctx.fillStyle = '#111111';
  ctx.fillRect(sx + 7, sy + 6, 2, 3);
}

function _drawChestOpen(ctx, sx, sy, t) {
  // Body stays same
  ctx.fillStyle = '#7a4a1a';
  ctx.fillRect(sx, sy + 6, 16, 10);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(sx, sy + 6, 1, 10);
  ctx.fillRect(sx + 15, sy + 6, 1, 10);
  ctx.fillRect(sx, sy + 15, 16, 1);
  // Interior dark
  ctx.fillStyle = '#110800';
  ctx.fillRect(sx + 1, sy + 7, 14, 8);
  // Lid flipped open (rotates around top edge)
  const lidH = Math.round(7 * (1 - t)); // lid collapses as it opens
  if (lidH > 0) {
    ctx.fillStyle = '#7a4a1a';
    ctx.fillRect(sx, sy, 16, lidH);
    ctx.fillStyle = '#daa520';
    ctx.fillRect(sx, sy, 16, 1);
    ctx.fillRect(sx, sy, 1, lidH);
    ctx.fillRect(sx + 15, sy, 1, lidH);
  }
  // Fully open lid lying flat behind chest
  if (t >= 1) {
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(sx, sy - 3, 16, 3);
    ctx.fillStyle = '#daa520';
    ctx.fillRect(sx, sy - 3, 16, 1);
  }
}
