// system.js — combat system glue; wire up all event-driven combat logic.
import { EVT, ITEM, DIR, DIR_VEC, T, aabb, px2tile, clamp } from '../contracts.js';
import {
  createSwordBeam,
  createArrowPlayer,
  createArrowEnemy,
  createRock,
  createFireball,
  createBoomerang,
  createBombExplosion,
} from './projectile.js';
import { createBomb } from './bombs.js';
import {
  createRupee,
  createHeart,
  createKeyPickup,
  createBombPickup,
  createHeartContainer,
} from './pickups.js';

// Enemy kinds we can damage / interact with.
const ENEMY_KINDS = new Set([
  'octorok', 'moblin', 'keese', 'zora', 'stalfos', 'boss_aquamentus',
]);

// Mapping from enemy-emitted projectile kind to a factory function.
const ENEMY_PROJECTILE_FACTORIES = {
  arrow: createArrowEnemy,
  rock: createRock,
  fireball: createFireball,
};

// Track whether a boomerang is already in flight.
let _boomerangActive = false;

// Short-lived flame entity for the candle item.
function createFlame(events, { x, y }) {
  let age = 0;
  const TTL = 2;
  const S = 10;

  const ENEMY_KINDS_LOCAL = new Set([
    'octorok', 'moblin', 'keese', 'zora', 'stalfos', 'boss_aquamentus',
  ]);

  return {
    id: `flame_${Math.random().toString(36).slice(2)}`,
    kind: 'flame',
    x: x - S / 2, y: y - S / 2, w: S, h: S,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,
    _hitSet: new Set(),

    update(dt, world) {
      if (this.dead) return;
      age += dt;
      if (age > TTL) { this.dead = true; return; }

      // Light the room
      if (world.room && age < TTL) {
        world.room.illuminated = true;
      }

      // Damage nearby enemies (once each)
      for (const e of world.entities) {
        if (!ENEMY_KINDS_LOCAL.has(e.kind)) continue;
        if (e.dead || this._hitSet.has(e.id)) continue;
        if (!aabb(this, e)) continue;
        if (typeof e.takeDamage === 'function') {
          e.takeDamage(1, this);
          this._hitSet.add(e.id);
        }
      }
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      const t = age / TTL;
      const frame = Math.floor(age * 8) % 2;
      ctx.globalAlpha = 1 - t * 0.7;
      ctx.fillStyle = frame === 0 ? '#ff6600' : '#ffaa00';
      ctx.fillRect(sx + 2, sy + 3, S - 4, S - 3);
      ctx.fillRect(sx + 3, sy + 1, S - 6, 3);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(sx + 3, sy + 4, S - 6, S - 6);
      ctx.globalAlpha = 1;
    },
  };
}

/**
 * installCombatSystem — call once after world is created.
 *
 * @param {import('../contracts.js').World}     world
 * @param {import('../contracts.js').EventBus}  events
 * @param {import('../contracts.js').GameState} state
 * @returns {()=>void} uninstall function
 */
export function installCombatSystem(world, events, state) {
  const unsubs = [];

  // ── PLAYER_ATTACK ──────────────────────────────────────────────────────────
  // The player subsystem emits this when the sword swing hitbox is active.
  // Payload: { x, y, w, h, dir, damage }
  unsubs.push(events.on('player_attack', ({ x, y, w, h, dir, damage }) => {
    const hitbox = { x, y, w, h };

    // Damage enemies
    for (const e of world.entities) {
      if (!ENEMY_KINDS.has(e.kind)) continue;
      if (e.dead) continue;
      if (!aabb(hitbox, e)) continue;
      if (typeof e.takeDamage === 'function') e.takeDamage(damage ?? 1, world.player);
    }

    // Cut bushes: check every tile the hitbox covers
    const tx0 = px2tile(x);
    const ty0 = px2tile(y);
    const tx1 = px2tile(x + w - 1);
    const ty1 = px2tile(y + h - 1);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const tileId = world.tileAt ? world.tileAt(tx * 16, ty * 16) : -1;
        if (tileId === T.BUSH) {
          events.emit('bush_cut', { tx, ty });
          if (typeof world.replaceTile === 'function') {
            world.replaceTile(tx, ty, T.GRASS);
          }
        }
      }
    }
  }));

  // ── PLAYER_SWORD_BEAM ──────────────────────────────────────────────────────
  // Payload: { x, y, dir }
  unsubs.push(events.on('player_sword_beam', ({ x, y, dir }) => {
    if (state.hearts >= state.maxHearts) {
      const beam = createSwordBeam(events, { x, y, dir, damage: 1 });
      world.spawn(beam);
    }
  }));

  // ── PLAYER_USE_ITEM ────────────────────────────────────────────────────────
  // Payload: { item, x, y, dir }
  unsubs.push(events.on('player_use_item', ({ item, x, y, dir }) => {
    switch (item) {
      case ITEM.BOMB: {
        if (state.bombs > 0) {
          state.bombs--;
          // Place bomb at player feet (slightly below centre)
          const bomb = createBomb(events, { x, y, fuse: 1.5 });
          world.spawn(bomb);
        }
        break;
      }
      case ITEM.BOW: {
        if (state.arrows > 0) {
          state.arrows--;
          const arrow = createArrowPlayer(events, { x, y, dir, damage: 2 });
          world.spawn(arrow);
        }
        break;
      }
      case ITEM.BOOMERANG: {
        if (!_boomerangActive) {
          _boomerangActive = true;
          const origin = world.player; // live reference — boomerang reads .x/.y each frame
          const bm = createBoomerang(events, { x, y, dir, origin, damage: 1 });
          // Wrap dead-detection so we can clear the flag
          const origUpdate = bm.update.bind(bm);
          bm.update = function (dt, w) {
            origUpdate(dt, w);
            if (this.dead) _boomerangActive = false;
          };
          world.spawn(bm);
        }
        break;
      }
      case ITEM.CANDLE: {
        const flame = createFlame(events, { x, y });
        world.spawn(flame);
        break;
      }
    }
  }));

  // ── ENEMY PROJECTILE ───────────────────────────────────────────────────────
  // Enemies emit this when they want to fire.
  // Payload: { kind, x, y, dir, damage, speed }
  unsubs.push(events.on('enemy_projectile', ({ kind, x, y, dir, damage, speed: _speed }) => {
    let proj = null;
    switch (kind) {
      case 'arrow':    proj = createArrowEnemy(events, { x, y, dir, damage: damage ?? 2 }); break;
      case 'rock':     proj = createRock(events,       { x, y, dir, damage: damage ?? 2 }); break;
      case 'fireball': proj = createFireball(events,   { x, y, dir, damage: damage ?? 2 }); break;
      default: break;
    }
    if (proj) world.spawn(proj);
  }));

  // ── ENEMY_KILLED ───────────────────────────────────────────────────────────
  // Payload: { kind, x, y }
  unsubs.push(events.on(EVT.ENEMY_KILLED, ({ kind, x, y }) => {
    if (kind === 'boss_aquamentus') {
      // Boss: spawn heart container at boss-room centre
      const cx = 128 - 7; // approximate room centre
      const cy = 88 - 6;
      world.spawn(createHeartContainer(events, { x: cx, y: cy }));
      state.flags.add('d1_boss_dead');
      events.emit(EVT.SFX, 'boss_dead');
      return;
    }

    // Regular enemy: roll a drop
    const roll = Math.random();
    const isDungeon = world.room && world.room.kind === 'dungeon';

    if (roll < 0.30) {
      // 30 % rupee
      world.spawn(createRupee(events, { x, y, value: 1 }));
    } else if (roll < 0.40) {
      // 10 % heart
      world.spawn(createHeart(events, { x, y }));
    } else if (roll < 0.50) {
      // 10 % bomb pickup
      world.spawn(createBombPickup(events, { x, y }));
    } else if (roll < 0.60 && isDungeon) {
      // 10 % key, dungeon rooms only
      world.spawn(createKeyPickup(events, { x, y }));
    }
    // else: 40 % (or 50 % overworld) — nothing
  }));

  // Return uninstall function
  return function uninstall() {
    for (const unsub of unsubs) {
      if (typeof unsub === 'function') unsub();
    }
  };
}
