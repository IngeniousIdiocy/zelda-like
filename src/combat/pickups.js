// pickups.js — item pickup entity factories
import { EVT, aabb, clamp } from '../contracts.js';

let _nextId = 1;
function uid(prefix) { return `${prefix}_${_nextId++}`; }

// Shared proximity check: if player overlaps this entity, call onPickup.
function makePickupBehavior(ent, world, onPickup) {
  if (!ent._pickedUp) {
    const p = world.player;
    if (p && !p.dead && aabb(ent, p)) {
      ent._pickedUp = true;
      ent.dead = true;
      onPickup(p, world);
    }
  }
}

// ─── Rupee ───────────────────────────────────────────────────────────────────

export function createRupee(events, { x, y, value = 1 }) {
  let age = 0;
  const item = {
    id: uid('rupee'),
    kind: 'rupee',
    x, y, w: 8, h: 12,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _pickedUp: false,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      makePickupBehavior(this, world, (_p, w) => {
        w.state.rupees += value;
        events.emit(EVT.ITEM_PICKED, { item: 'rupee', value });
        events.emit(EVT.SFX, 'rupee');
      });
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      // Classic Zelda-style rupee: small diamond with gem facets
      const bob = Math.sin(age * 4) * 1; // gentle bobbing
      const dy = Math.round(bob);
      // Determine color by value
      const color = value >= 5 ? '#0000ff' : value >= 2 ? '#0000aa' : '#00cc00';
      ctx.fillStyle = color;
      ctx.fillRect(sx + 3, sy + dy, 2, 1);
      ctx.fillRect(sx + 2, sy + 1 + dy, 4, 2);
      ctx.fillRect(sx + 1, sy + 3 + dy, 6, 4);
      ctx.fillRect(sx + 2, sy + 7 + dy, 4, 2);
      ctx.fillRect(sx + 3, sy + 9 + dy, 2, 1);
      // shine
      ctx.fillStyle = '#88ff88';
      if (value < 2) { ctx.fillStyle = '#88ff88'; }
      else if (value < 5) { ctx.fillStyle = '#8888ff'; }
      else { ctx.fillStyle = '#aaaaff'; }
      ctx.fillRect(sx + 3, sy + 1 + dy, 1, 2);
    },
  };
  return item;
}

// ─── Heart ───────────────────────────────────────────────────────────────────

export function createHeart(events, { x, y }) {
  let age = 0;
  return {
    id: uid('heart'),
    kind: 'heart',
    x, y, w: 10, h: 8,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _pickedUp: false,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      makePickupBehavior(this, world, (_p, w) => {
        const s = w.state;
        s.hearts = clamp(s.hearts + 2, 0, s.maxHearts);
        events.emit(EVT.ITEM_PICKED, { item: 'heart' });
        events.emit(EVT.SFX, 'heart_pickup');
      });
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      const bob = Math.round(Math.sin(age * 3.5) * 1);
      ctx.fillStyle = '#cc0000';
      // pixel heart shape
      ctx.fillRect(sx + 1, sy + bob, 3, 2);
      ctx.fillRect(sx + 6, sy + bob, 3, 2);
      ctx.fillRect(sx, sy + 2 + bob, 10, 3);
      ctx.fillRect(sx + 1, sy + 5 + bob, 8, 2);
      ctx.fillRect(sx + 3, sy + 7 + bob, 4, 1);
      // highlight
      ctx.fillStyle = '#ff6666';
      ctx.fillRect(sx + 2, sy + 1 + bob, 1, 1);
      ctx.fillRect(sx + 7, sy + 1 + bob, 1, 1);
    },
  };
}

// ─── Fairy ───────────────────────────────────────────────────────────────────

export function createFairy(events, { x, y }) {
  let age = 0;
  let wx = x;
  let wy = y;
  // Slow wandering offset
  const wanderA = Math.random() * Math.PI * 2;
  const wanderB = Math.random() * Math.PI * 2;

  return {
    id: uid('fairy'),
    kind: 'fairy',
    x: wx, y: wy, w: 8, h: 8,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _pickedUp: false,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      // gentle wander in a figure-eight pattern around spawn
      this.x = wx + Math.cos(age * 1.1 + wanderA) * 12;
      this.y = wy + Math.sin(age * 0.7 + wanderB) * 8;
      makePickupBehavior(this, world, (_p, w) => {
        const s = w.state;
        s.hearts = clamp(s.hearts + 6, 0, s.maxHearts);
        events.emit(EVT.ITEM_PICKED, { item: 'fairy' });
        events.emit(EVT.SFX, 'fairy');
      });
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = Math.round(this.x - cam.x);
      const sy = Math.round(this.y - cam.y);
      const frame = Math.floor(age * 8) % 2;
      // Wings
      ctx.fillStyle = frame === 0 ? '#aaffff' : '#88ddff';
      ctx.fillRect(sx - 4, sy + 2, 4, 3);
      ctx.fillRect(sx + 8, sy + 2, 4, 3);
      // Body
      ctx.fillStyle = '#ffaaff';
      ctx.fillRect(sx + 2, sy, 4, 8);
      ctx.fillRect(sx + 1, sy + 1, 6, 6);
      // Glow halo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 3, sy + 1, 2, 1);
    },
  };
}

// ─── Key Pickup ──────────────────────────────────────────────────────────────

export function createKeyPickup(events, { x, y }) {
  let age = 0;
  return {
    id: uid('key'),
    kind: 'key',
    x, y, w: 10, h: 10,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _pickedUp: false,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      makePickupBehavior(this, world, (_p, w) => {
        w.state.keys++;
        events.emit(EVT.ITEM_PICKED, { item: 'key' });
        events.emit(EVT.SFX, 'key_pickup');
      });
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      const spin = Math.sin(age * 2) * 1;
      const dy = Math.round(spin);
      ctx.fillStyle = '#ddaa00';
      // Key head (circle-ish)
      ctx.fillRect(sx + 1, sy + dy, 5, 4);
      ctx.fillRect(sx, sy + 1 + dy, 7, 2);
      // Key shaft
      ctx.fillRect(sx + 5, sy + 2 + dy, 5, 2);
      // Key teeth
      ctx.fillRect(sx + 7, sy + 4 + dy, 2, 2);
      ctx.fillRect(sx + 9, sy + 4 + dy, 1, 1);
    },
  };
}

// ─── Bomb Pickup ─────────────────────────────────────────────────────────────

export function createBombPickup(events, { x, y }) {
  let age = 0;
  return {
    id: uid('bomb_pickup'),
    kind: 'bomb_pickup',
    x, y, w: 10, h: 10,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _pickedUp: false,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      makePickupBehavior(this, world, (_p, w) => {
        const s = w.state;
        s.bombs = Math.min(s.maxBombs, s.bombs + 4);
        events.emit(EVT.ITEM_PICKED, { item: 'bomb_pickup' });
        events.emit(EVT.SFX, 'bomb_pickup');
      });
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      ctx.fillStyle = '#222222';
      ctx.fillRect(sx + 2, sy + 1, 6, 8);
      ctx.fillRect(sx + 1, sy + 2, 8, 6);
      ctx.fillStyle = '#555555';
      ctx.fillRect(sx + 3, sy + 2, 2, 2);
      ctx.fillStyle = '#886644';
      ctx.fillRect(sx + 4, sy, 2, 2);
    },
  };
}

// ─── Heart Container ─────────────────────────────────────────────────────────

export function createHeartContainer(events, { x, y }) {
  let age = 0;
  return {
    id: uid('heart_container'),
    kind: 'heart_container',
    x, y, w: 14, h: 12,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _pickedUp: false,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      makePickupBehavior(this, world, (_p, w) => {
        const s = w.state;
        s.maxHearts += 4;
        s.hearts = s.maxHearts; // full heal
        events.emit(EVT.ITEM_PICKED, { item: 'heart_container' });
        events.emit(EVT.SFX, 'heart_container');
      });
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      // Larger outlined heart
      const glow = Math.floor(age * 3) % 2 === 0;
      ctx.fillStyle = glow ? '#ff4444' : '#cc0000';
      ctx.fillRect(sx + 2, sy, 4, 2);
      ctx.fillRect(sx + 8, sy, 4, 2);
      ctx.fillRect(sx, sy + 2, 14, 5);
      ctx.fillRect(sx + 2, sy + 7, 10, 3);
      ctx.fillRect(sx + 4, sy + 10, 6, 1);
      ctx.fillRect(sx + 6, sy + 11, 2, 1);
      // hollow center when not glowing
      if (!glow) {
        ctx.fillStyle = '#ff8888';
        ctx.fillRect(sx + 4, sy + 3, 2, 2);
        ctx.fillRect(sx + 8, sy + 3, 2, 2);
      }
    },
  };
}

// ─── Triforce ────────────────────────────────────────────────────────────────

export function createTriforce(events, { x, y }) {
  let age = 0;
  return {
    id: uid('triforce'),
    kind: 'triforce',
    x, y, w: 16, h: 16,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _pickedUp: false,

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      makePickupBehavior(this, world, (_p, w) => {
        w.state.mode = 'victory';
        events.emit(EVT.SFX, 'victory');
      });
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      const glow = Math.floor(age * 4) % 2 === 0;
      ctx.fillStyle = glow ? '#ffee00' : '#ddcc00';
      // Bottom-left triangle
      ctx.fillRect(sx,     sy + 8, 7, 2);
      ctx.fillRect(sx + 1, sy + 6, 5, 2);
      ctx.fillRect(sx + 2, sy + 4, 3, 2);
      ctx.fillRect(sx + 3, sy + 2, 1, 2);
      // Bottom-right triangle
      ctx.fillRect(sx + 9,  sy + 8, 7, 2);
      ctx.fillRect(sx + 10, sy + 6, 5, 2);
      ctx.fillRect(sx + 11, sy + 4, 3, 2);
      ctx.fillRect(sx + 12, sy + 2, 1, 2);
      // Top triangle
      ctx.fillRect(sx + 5,  sy, 6, 2);
      ctx.fillRect(sx + 6,  sy + 2, 4, 2);
      ctx.fillRect(sx + 7,  sy + 4, 2, 2);
    },
  };
}
