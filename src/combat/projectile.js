// projectile.js — projectile entity factories
import { EVT, DIR, DIR_VEC, aabb, SCREEN_W, SCREEN_H } from '../contracts.js';

let _nextId = 1;
function uid(prefix) { return `${prefix}_${_nextId++}`; }

// Enemy kinds that can receive damage from player projectiles.
const ENEMY_KINDS = new Set([
  'octorok', 'moblin', 'keese', 'zora', 'stalfos', 'boss_aquamentus',
]);

// Apply damage to every enemy-like entity overlapping the projectile, then
// mark the projectile dead.
function hitEnemies(proj, world, dmg) {
  for (const e of world.entities) {
    if (!ENEMY_KINDS.has(e.kind)) continue;
    if (e.dead) continue;
    if (!aabb(proj, e)) continue;
    if (typeof e.takeDamage === 'function') e.takeDamage(dmg, proj);
    proj.dead = true;
    return; // one hit per frame is enough
  }
}

// Apply damage to the player entity if overlapping the projectile.
function hitPlayer(proj, world, dmg) {
  const p = world.player;
  if (!p || p.dead) return;
  if (!aabb(proj, p)) return;
  if (typeof p.takeDamage === 'function') p.takeDamage(dmg, proj);
  proj.dead = true;
}

// True if the projectile's centre is outside the room bounds.
function outOfRoom(proj) {
  const cx = proj.x + proj.w / 2;
  const cy = proj.y + proj.h / 2;
  return cx < 0 || cy < 0 || cx > SCREEN_W || cy > SCREEN_H;
}

// ─── Sword Beam ─────────────────────────────────────────────────────────────

export function createSwordBeam(events, { x, y, dir, damage = 1 }) {
  const vec = DIR_VEC[dir];
  const SPEED = 200;
  const W = 6; const H = 6;
  let age = 0;
  const MAX_TTL = 2;

  return {
    id: uid('sword_beam'),
    kind: 'sword_beam',
    x, y, w: W, h: H,
    hp: 1, maxHp: 1,
    dir, dead: false, solid: false,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      if (age > MAX_TTL) { this.dead = true; return; }

      this.x += vec.x * SPEED * dt;
      this.y += vec.y * SPEED * dt;

      if (outOfRoom(this)) { this.dead = true; return; }
      if (world.rectSolid(this.x, this.y, this.w, this.h, this)) {
        this.dead = true; return;
      }
      hitEnemies(this, world, damage);
    },

    render(ctx, cam) {
      if (this.dead) return;
      const blink = Math.floor(age * 16) % 2 === 0;
      ctx.fillStyle = blink ? '#ffffff' : '#ffffaa';
      ctx.fillRect(this.x - cam.x + 1, this.y - cam.y + 1, this.w - 2, this.h - 2);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(this.x - cam.x + 2, this.y - cam.y + 2, this.w - 4, this.h - 4);
    },
  };
}

// ─── Arrow (player) ──────────────────────────────────────────────────────────

export function createArrowPlayer(events, { x, y, dir, damage = 2 }) {
  return _makeArrow(events, { x, y, dir, damage }, false);
}

// ─── Arrow (enemy) ───────────────────────────────────────────────────────────

export function createArrowEnemy(events, { x, y, dir, damage = 2 }) {
  return _makeArrow(events, { x, y, dir, damage }, true);
}

function _makeArrow(events, { x, y, dir, damage }, hitsPlayer) {
  const vec = DIR_VEC[dir];
  const SPEED = 180;
  const W = 8; const H = 4;
  const isHoriz = dir === DIR.LEFT || dir === DIR.RIGHT;
  let age = 0;
  const MAX_TTL = 2.5;

  return {
    id: uid(hitsPlayer ? 'arrow_enemy' : 'arrow_player'),
    kind: hitsPlayer ? 'arrow_enemy' : 'arrow_player',
    x, y,
    w: isHoriz ? W : H,
    h: isHoriz ? H : W,
    hp: 1, maxHp: 1,
    dir, dead: false, solid: false,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      if (age > MAX_TTL) { this.dead = true; return; }

      this.x += vec.x * SPEED * dt;
      this.y += vec.y * SPEED * dt;

      if (outOfRoom(this)) { this.dead = true; return; }
      if (world.rectSolid(this.x, this.y, this.w, this.h, this)) {
        this.dead = true; return;
      }
      if (hitsPlayer) {
        hitPlayer(this, world, damage);
      } else {
        hitEnemies(this, world, damage);
      }
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      ctx.fillStyle = '#8b5c00';
      if (isHoriz) {
        // shaft
        ctx.fillRect(sx, sy + 1, this.w - 2, 2);
        // head
        const hx = dir === DIR.RIGHT ? sx + this.w - 2 : sx;
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(hx, sy, 2, 4);
        // fletching
        const tx = dir === DIR.RIGHT ? sx : sx + this.w - 2;
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(tx, sy, 2, 1);
        ctx.fillRect(tx, sy + 3, 2, 1);
      } else {
        ctx.fillRect(sx + 1, sy, 2, this.h - 2);
        const hy = dir === DIR.DOWN ? sy + this.h - 2 : sy;
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(sx, hy, 4, 2);
        const ty = dir === DIR.DOWN ? sy : sy + this.h - 2;
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(sx, ty, 1, 2);
        ctx.fillRect(sx + 3, ty, 1, 2);
      }
    },
  };
}

// ─── Rock (Octorok) ──────────────────────────────────────────────────────────

export function createRock(events, { x, y, dir, damage = 2 }) {
  const vec = DIR_VEC[dir];
  const SPEED = 90;
  const S = 6;
  let age = 0;
  const MAX_TTL = 3;

  return {
    id: uid('rock'),
    kind: 'rock',
    x, y, w: S, h: S,
    hp: 1, maxHp: 1,
    dir, dead: false, solid: false,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      if (age > MAX_TTL) { this.dead = true; return; }

      this.x += vec.x * SPEED * dt;
      this.y += vec.y * SPEED * dt;

      if (outOfRoom(this)) { this.dead = true; return; }
      if (world.rectSolid(this.x, this.y, this.w, this.h, this)) {
        this.dead = true; return;
      }
      hitPlayer(this, world, damage);
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      // pebble
      ctx.fillStyle = '#888888';
      ctx.fillRect(sx + 1, sy, S - 2, S);
      ctx.fillRect(sx, sy + 1, S, S - 2);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(sx + 1, sy + 1, 2, 2);
    },
  };
}

// ─── Fireball ────────────────────────────────────────────────────────────────

export function createFireball(events, { x, y, dir, damage = 2 }) {
  const vec = DIR_VEC[dir];
  const SPEED = 80;
  const S = 8;
  let age = 0;
  const MAX_TTL = 3;

  return {
    id: uid('fireball'),
    kind: 'fireball',
    x, y, w: S, h: S,
    hp: 1, maxHp: 1,
    dir, dead: false, solid: false,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      if (age > MAX_TTL) { this.dead = true; return; }

      this.x += vec.x * SPEED * dt;
      this.y += vec.y * SPEED * dt;

      if (outOfRoom(this)) { this.dead = true; return; }
      if (world.rectSolid(this.x, this.y, this.w, this.h, this)) {
        this.dead = true; return;
      }
      hitPlayer(this, world, damage);
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      const frame = Math.floor(age * 8) % 2;
      ctx.fillStyle = frame === 0 ? '#ff6600' : '#ffaa00';
      ctx.fillRect(sx + 1, sy, S - 2, S);
      ctx.fillRect(sx, sy + 1, S, S - 2);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
    },
  };
}

// ─── Boomerang ───────────────────────────────────────────────────────────────

export function createBoomerang(events, { x, y, dir, origin, damage = 1 }) {
  const vec = DIR_VEC[dir];
  const SPEED_OUT = 140;
  const SPEED_BACK = 160;
  const MAX_DIST = 80;
  const S = 8;
  let age = 0;
  let returning = false;
  let distTravelled = 0;
  let spin = 0;

  return {
    id: uid('boomerang'),
    kind: 'boomerang',
    x, y, w: S, h: S,
    hp: 1, maxHp: 1,
    dir, dead: false, solid: false,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      spin += dt * 8;

      if (!returning) {
        const dx = vec.x * SPEED_OUT * dt;
        const dy = vec.y * SPEED_OUT * dt;
        this.x += dx;
        this.y += dy;
        distTravelled += Math.sqrt(dx * dx + dy * dy);

        const hitSolid = world.rectSolid(this.x, this.y, this.w, this.h, this);
        if (distTravelled >= MAX_DIST || outOfRoom(this) || hitSolid) {
          returning = true;
        } else {
          // Stun enemies on outbound pass
          for (const e of world.entities) {
            if (!ENEMY_KINDS.has(e.kind)) continue;
            if (e.dead) continue;
            if (!aabb(this, e)) continue;
            if (typeof e.takeDamage === 'function') e.takeDamage(damage, this);
            e.invulnTimer = (e.invulnTimer || 0) + 0.5;
            e.stunTimer = 0.5;
            // zero move velocity if exposed
            if (e.vx !== undefined) e.vx = 0;
            if (e.vy !== undefined) e.vy = 0;
          }
        }
      } else {
        // Return toward origin (current player position if we have reference)
        const tx = (origin.x !== undefined ? origin.x : origin.x) + 4;
        const ty = (origin.y !== undefined ? origin.y : origin.y) + 4;
        const rx = tx - (this.x + this.w / 2);
        const ry = ty - (this.y + this.h / 2);
        const dist = Math.sqrt(rx * rx + ry * ry);
        if (dist < 4) {
          this.dead = true;
          return;
        }
        const nx = rx / dist;
        const ny = ry / dist;
        this.x += nx * SPEED_BACK * dt;
        this.y += ny * SPEED_BACK * dt;
      }
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = Math.round(this.x - cam.x);
      const sy = Math.round(this.y - cam.y);
      ctx.save();
      ctx.translate(sx + S / 2, sy + S / 2);
      ctx.rotate(spin);
      // L-shape boomerang
      ctx.fillStyle = '#c8a040';
      ctx.fillRect(-4, -1, 8, 2);  // horizontal arm
      ctx.fillRect(-1, -4, 2, 4);  // vertical arm
      ctx.fillStyle = '#e0b860';
      ctx.fillRect(-3, -1, 2, 2);
      ctx.restore();
    },
  };
}

// ─── Bomb Explosion ──────────────────────────────────────────────────────────

export function createBombExplosion(events, { x, y, damage = 4, radius = 20 }) {
  const SIZE = radius * 2;
  const TTL = 0.5;
  let age = 0;
  let damageDealt = false;

  const ex = { x: x - radius, y: y - radius, w: SIZE, h: SIZE };

  return {
    id: uid('explosion'),
    kind: 'explosion',
    x: ex.x, y: ex.y, w: ex.w, h: ex.h,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      age += dt;

      if (!damageDealt) {
        damageDealt = true;
        // Damage enemies in radius
        for (const e of world.entities) {
          if (!ENEMY_KINDS.has(e.kind)) continue;
          if (e.dead) continue;
          if (aabb(this, e) && typeof e.takeDamage === 'function') {
            e.takeDamage(damage, this);
          }
        }
        // Damage player if in blast radius
        const p = world.player;
        if (p && !p.dead && aabb(this, p)) {
          if (typeof p.takeDamage === 'function') p.takeDamage(damage, this);
        }
      }

      if (age > TTL) this.dead = true;
    },

    render(ctx, cam) {
      if (this.dead) return;
      const t = age / TTL; // 0..1
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      // expanding ring
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = alpha;
      // outer orange
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, radius * (0.5 + t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      // inner white flash
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, radius * 0.4 * (1 - t), 0, Math.PI * 2);
      ctx.fill();
      // pixel sparks
      ctx.fillStyle = '#ffff00';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + age * 5;
        const r = radius * t;
        const px = sx + this.w / 2 + Math.cos(a) * r;
        const py = sy + this.h / 2 + Math.sin(a) * r;
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      ctx.restore();
    },
  };
}
