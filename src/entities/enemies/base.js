// base.js — shared enemy base factory and helpers
import { EVT, DIR, aabb } from '../../contracts.js';

let _uid = 0;

/**
 * makeEnemyBase(kind, opts) — returns a plain object with default Entity fields.
 * opts: { x, y, w, h, hp, maxHp, dir, speed, solid }
 */
export function makeEnemyBase(kind, opts = {}) {
  const maxHp = opts.maxHp ?? opts.hp ?? 2;
  return {
    id: `${kind}_${++_uid}`,
    kind,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    w: opts.w ?? 14,
    h: opts.h ?? 14,
    hp: opts.hp ?? maxHp,
    maxHp,
    dir: opts.dir ?? DIR.DOWN,
    dead: false,
    solid: opts.solid ?? false,
    invulnTimer: 0,
    hurtFlash: 0,     // seconds remaining of hurt-flash visual
    animTime: 0,
    speed: opts.speed ?? 35,
  };
}

/**
 * contactDamage(enemy, player, dmg) — if AABB overlaps and player not invuln,
 * deal damage to player.
 */
export function contactDamage(enemy, player, dmg = 2) {
  if (!player || player.dead) return;
  if (player.invulnTimer > 0) return;
  if (aabb(enemy, player)) {
    if (typeof player.takeDamage === 'function') {
      player.takeDamage(dmg, enemy, enemy.dir);
    }
  }
}

/**
 * onDeath(enemy, world) — emit ENEMY_KILLED and mark dead.
 */
export function onDeath(enemy, world) {
  enemy.dead = true;
  world.events.emit(EVT.ENEMY_KILLED, {
    kind: enemy.kind,
    x: enemy.x,
    y: enemy.y,
  });
}

/**
 * tickInvuln(enemy, dt) — call each update to tick down invuln/hurtFlash.
 */
export function tickInvuln(enemy, dt) {
  if (enemy.invulnTimer > 0) enemy.invulnTimer = Math.max(0, enemy.invulnTimer - dt);
  if (enemy.hurtFlash > 0) enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt);
}

/**
 * shouldRender(enemy) — returns false when hurt-flash should hide the sprite.
 * Alternates every 0.05s during hurtFlash window.
 */
export function shouldRender(enemy) {
  if (enemy.hurtFlash <= 0) return true;
  // flash by toggling on 0.05s intervals
  const tick = Math.floor(enemy.hurtFlash / 0.05);
  return (tick % 2) === 0;
}

/**
 * makeTakeDamage(enemy, world) — returns a takeDamage function bound to this enemy.
 */
export function makeTakeDamage(enemy, world) {
  return function takeDamage(dmg, _from, _knockDir) {
    if (enemy.dead) return;
    if (enemy.invulnTimer > 0) return;
    enemy.hp -= dmg;
    enemy.hurtFlash = 0.15;
    enemy.invulnTimer = 0.4;
    world.events.emit(EVT.SFX, { key: 'enemy_hurt' });
    if (enemy.hp <= 0) {
      onDeath(enemy, world);
    }
  };
}
