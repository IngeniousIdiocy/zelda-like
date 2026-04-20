// player.js — createPlayer factory.
// Damage unit: quarter-hearts. 1 heart = 4 quarter-hearts.
// takeDamage(dmg) where dmg is in quarter-hearts.

import { EVT, DIR, DIR_VEC, ITEM, SCREEN_W, SCREEN_H, clamp } from '../contracts.js';
import { drawPlayer } from './playerArt.js';

let _idCounter = 0;

const SPEED        = 90;     // px/sec
const SWING_DUR    = 0.18;   // seconds
const INVULN_DUR   = 1.0;    // seconds
const KNOCKBACK_DUR = 0.2;   // seconds
const KNOCKBACK_SPD = 100;   // px/sec
const WALK_FPS     = 8;      // frames per second while walking
const HITBOX_W     = 12;
const HITBOX_H     = 14;

// Default spawn near room centre
const DEFAULT_X = Math.round((SCREEN_W - HITBOX_W) / 2);
const DEFAULT_Y = Math.round((SCREEN_H - HITBOX_H) / 2);

// Sword hitbox size per direction (offset from player top-left)
function swordHitbox(x, y, dir) {
  switch (dir) {
    case DIR.UP:    return { x: x - 1, y: y - 10, w: 14, h: 10 };
    case DIR.DOWN:  return { x: x - 1, y: y + HITBOX_H, w: 14, h: 10 };
    case DIR.LEFT:  return { x: x - 14, y: y + 2, w: 14, h: 10 };
    case DIR.RIGHT: return { x: x + HITBOX_W, y: y + 2, w: 14, h: 10 };
  }
}

// Ordered list of usable items for cycling
function ownedItems(state) {
  const list = [];
  if (state.bombs > 0)       list.push(ITEM.BOMB);
  if (state.hasBow)          list.push(ITEM.BOW);
  if (state.hasBoomerang)    list.push(ITEM.BOOMERANG);
  if (state.hasCandle)       list.push(ITEM.CANDLE);
  return list;
}

export function createPlayer(events, state, opts = {}) {
  const id = `player_${_idCounter++}`;

  // Mutable position + velocity
  let x = opts.x ?? DEFAULT_X;
  let y = opts.y ?? DEFAULT_Y;
  let dir = DIR.DOWN;

  // Walk animation
  let walkTimer = 0;
  let walkFrame = 0;

  // Sword swing
  let swingTimer = 0;

  // Invulnerability + flash
  let invulnTimer = 0;
  let flashTimer  = 0;
  let flashVisible = true;

  // Knockback
  let knockTimer = 0;
  let knockVx = 0;
  let knockVy = 0;

  // Track which axis was pressed more recently for 4-dir priority
  // 0=none, 1=h (left/right), 2=v (up/down)
  let lastAxis = 0;

  // Edge-detect sword beam (avoid re-emitting every frame)
  let diedEmitted = false;

  // prev input for axis tracking
  let prevH = false;
  let prevV = false;

  const self = {
    id,
    kind: 'player',
    get x() { return x; }, set x(v) { x = v; },
    get y() { return y; }, set y(v) { y = v; },
    w: HITBOX_W,
    h: HITBOX_H,
    get hp()    { return state.hearts; },
    get maxHp() { return state.maxHearts; },
    dir,
    dead: false,
    solid: true,
    invulnTimer: 0,

    update(dt, world) {
      // Room-transition lock
      if (world.transitioning) return;

      const input = world.input?.state ?? {};
      const swinging = swingTimer > 0;

      // Knockback takes over movement
      if (knockTimer > 0) {
        knockTimer -= dt;
        const nx = x + knockVx * dt;
        const ny = y + knockVy * dt;
        if (!world.rectSolid(nx, y, HITBOX_W, HITBOX_H, self)) x = nx;
        if (!world.rectSolid(x, ny, HITBOX_W, HITBOX_H, self)) y = ny;
        // still handle timers below, skip movement input
      } else if (!swinging) {
        // Axis priority: if both H and V held, use most recently pressed
        const hHeld = !!(input.left || input.right);
        const vHeld = !!(input.up   || input.down);

        if (hHeld && !prevH) lastAxis = 1;
        if (vHeld && !prevV) lastAxis = 2;
        if (!hHeld) lastAxis = (vHeld ? 2 : lastAxis);
        if (!vHeld) lastAxis = (hHeld ? 1 : lastAxis);

        prevH = hHeld;
        prevV = vHeld;

        let dx = 0;
        let dy = 0;

        if (hHeld && vHeld) {
          if (lastAxis === 1) { dx = input.right ? 1 : -1; }
          else                { dy = input.down  ? 1 : -1; }
        } else {
          if (input.right) dx =  1;
          else if (input.left) dx = -1;
          if (input.down)  dy =  1;
          else if (input.up)   dy = -1;
        }

        if (dx !== 0 || dy !== 0) {
          const dist = SPEED * dt;

          if (dx !== 0) {
            dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
            const nx = x + dx * dist;
            if (!world.rectSolid(nx, y, HITBOX_W, HITBOX_H, self)) x = nx;
          }
          if (dy !== 0) {
            dir = dy > 0 ? DIR.DOWN : DIR.UP;
            const ny = y + dy * dist;
            if (!world.rectSolid(x, ny, HITBOX_W, HITBOX_H, self)) y = ny;
          }

          self.dir = dir;

          // Walk animation
          walkTimer += dt;
          if (walkTimer >= 1 / WALK_FPS) {
            walkTimer = 0;
            walkFrame = walkFrame === 0 ? 1 : 0;
          }
        } else {
          walkTimer = 0;
        }
      }

      // Sword swing timer
      if (swingTimer > 0) {
        swingTimer -= dt;
        self.dir = dir;
      }

      // Invuln + flash
      if (invulnTimer > 0) {
        invulnTimer -= dt;
        self.invulnTimer = invulnTimer;
        flashTimer += dt;
        if (flashTimer >= 0.1) {
          flashTimer = 0;
          flashVisible = !flashVisible;
        }
        if (invulnTimer <= 0) {
          invulnTimer = 0;
          self.invulnTimer = 0;
          flashVisible = true;
        }
      }

      // Attack
      if (input.attackPressed && state.hasSword && swingTimer <= 0) {
        swingTimer = SWING_DUR;
        events.emit(EVT.SFX, { id: 'sword' });

        const hb = swordHitbox(x, y, dir);
        // Spawn visual-only sword_hit entity
        world.spawn({
          id: `sword_hit_${Date.now()}`,
          kind: 'sword_hit',
          x: hb.x, y: hb.y, w: hb.w, h: hb.h,
          hp: 0, maxHp: 0,
          dir,
          dead: false,
          solid: false,
          _ttl: SWING_DUR,
          update(dt2) { this._ttl -= dt2; if (this._ttl <= 0) this.dead = true; },
          render(ctx, cam) {
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
          },
        });

        // Let combat-agent apply damage
        events.emit('PLAYER_ATTACK', {
          x: hb.x, y: hb.y, w: hb.w, h: hb.h,
          dir,
          damage: 1,
        });

        // Sword beam when at full health
        if (state.hearts >= state.maxHearts) {
          events.emit('PLAYER_SWORD_BEAM', { x, y, dir });
        }
      }

      // Use item
      if (input.usePressed && state.selectedItem !== ITEM.NONE) {
        events.emit('PLAYER_USE_ITEM', { item: state.selectedItem, x, y, dir });
      }

      // Cycle item
      if (input.cyclePressed) {
        const items = ownedItems(state);
        if (items.length > 0) {
          const cur = items.indexOf(state.selectedItem);
          state.selectedItem = items[(cur + 1) % items.length];
        } else {
          state.selectedItem = ITEM.NONE;
        }
        events.emit(EVT.SFX, { id: 'menu' });
      }

      // Clamp to room bounds
      x = clamp(x, 0, SCREEN_W - HITBOX_W);
      y = clamp(y, 0, SCREEN_H - HITBOX_H);

      self.dir = dir;
    },

    render(ctx, cam) {
      const swinging = swingTimer > 0;
      const frame = swinging ? 0 : walkFrame;
      drawPlayer(
        ctx,
        x - cam.x,
        y - cam.y,
        dir,
        frame,
        swinging,
        flashVisible,
      );
    },

    takeDamage(dmg, from, knockDir) {
      if (invulnTimer > 0) return;
      if (self.dead) return;

      state.hearts = Math.max(0, state.hearts - dmg);

      invulnTimer = INVULN_DUR;
      flashTimer  = 0;
      flashVisible = true;
      self.invulnTimer = invulnTimer;

      // Knockback
      if (knockDir !== undefined && knockDir !== null) {
        const vec = DIR_VEC[knockDir];
        if (vec) {
          knockTimer = KNOCKBACK_DUR;
          knockVx = vec.x * KNOCKBACK_SPD;
          knockVy = vec.y * KNOCKBACK_SPD;
        }
      }

      events.emit(EVT.PLAYER_HURT, { dmg, hearts: state.hearts });

      if (state.hearts <= 0) {
        if (!diedEmitted) {
          diedEmitted = true;
          self.dead = true;
          events.emit(EVT.PLAYER_DIED, {});
        }
      }
    },

    respawn(room, rx, ry) {
      x = rx ?? DEFAULT_X;
      y = ry ?? DEFAULT_Y;
      dir = DIR.DOWN;
      self.dir = dir;
      self.dead = false;
      diedEmitted = false;
      swingTimer  = 0;
      invulnTimer = 0;
      flashTimer  = 0;
      flashVisible = true;
      knockTimer  = 0;
      walkTimer   = 0;
      walkFrame   = 0;
      lastAxis    = 0;
      prevH = false;
      prevV = false;
    },
  };

  return self;
}
