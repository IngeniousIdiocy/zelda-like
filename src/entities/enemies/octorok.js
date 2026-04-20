// octorok.js — ranged rock-shooter enemy
import { DIR, DIR_VEC, EVT } from '../../contracts.js';
import {
  makeEnemyBase, contactDamage, tickInvuln, shouldRender, makeTakeDamage,
} from './base.js';

const W = 14;
const H = 14;
const SPEED = 35;
const HP = 2;
const SHOT_INTERVAL_MIN = 1.5;
const SHOT_INTERVAL_MAX = 2.5;
const DIR_CHANGE_INTERVAL = 1.0;

function randomDir() {
  return Math.floor(Math.random() * 4);
}

function randomShotInterval() {
  return SHOT_INTERVAL_MIN + Math.random() * (SHOT_INTERVAL_MAX - SHOT_INTERVAL_MIN);
}

/**
 * createOctorok(events, state, opts)
 * opts: { x, y }
 */
export function createOctorok(events, state, opts = {}) {
  const e = makeEnemyBase('octorok', { x: opts.x, y: opts.y, w: W, h: H, hp: HP, speed: SPEED });
  e.dirTimer = DIR_CHANGE_INTERVAL;
  e.shotTimer = randomShotInterval();

  e.update = function update(dt, world) {
    if (e.dead) return;
    tickInvuln(e, dt);
    e.animTime += dt;

    // direction change timer
    e.dirTimer -= dt;
    if (e.dirTimer <= 0) {
      e.dir = randomDir();
      e.dirTimer = DIR_CHANGE_INTERVAL;
    }

    // movement
    const v = DIR_VEC[e.dir];
    const nx = e.x + v.x * SPEED * dt;
    const ny = e.y + v.y * SPEED * dt;
    const blocked = world.rectSolid(nx, ny, W, H, e);
    if (!blocked) {
      e.x = nx;
      e.y = ny;
    } else {
      e.dir = randomDir();
      e.dirTimer = DIR_CHANGE_INTERVAL;
    }

    // shooting
    e.shotTimer -= dt;
    if (e.shotTimer <= 0) {
      e.shotTimer = randomShotInterval();
      const cx = e.x + W / 2;
      const cy = e.y + H / 2;
      world.events.emit('enemy_projectile', {
        kind: 'rock',
        x: cx,
        y: cy,
        dir: e.dir,
        speed: 90,
        damage: 2,
      });
    }

    // contact damage
    contactDamage(e, world.player);
  };

  e.render = function render(ctx, cam) {
    if (e.dead) return;
    if (!shouldRender(e)) return;

    const sx = Math.round(e.x - cam.x);
    const sy = Math.round(e.y - cam.y);
    const frame = Math.floor(e.animTime * 6) % 2; // 2-frame cycle at ~6fps

    // NES palette: octorok is red/pink
    ctx.fillStyle = '#d03030';
    ctx.fillRect(sx, sy, W, H);

    // body highlight
    ctx.fillStyle = '#e87070';
    ctx.fillRect(sx + 2, sy + 2, W - 4, 4);

    // eyes (direction-aware)
    ctx.fillStyle = '#000000';
    if (e.dir === DIR.UP) {
      ctx.fillRect(sx + 3, sy + 2, 2, 2);
      ctx.fillRect(sx + 9, sy + 2, 2, 2);
    } else if (e.dir === DIR.DOWN) {
      ctx.fillRect(sx + 3, sy + 10, 2, 2);
      ctx.fillRect(sx + 9, sy + 10, 2, 2);
    } else if (e.dir === DIR.LEFT) {
      ctx.fillRect(sx + 2, sy + 4, 2, 2);
      ctx.fillRect(sx + 2, sy + 9, 2, 2);
    } else {
      ctx.fillRect(sx + 10, sy + 4, 2, 2);
      ctx.fillRect(sx + 10, sy + 9, 2, 2);
    }

    // walk animation legs
    const legOff = frame === 0 ? 1 : -1;
    ctx.fillStyle = '#902020';
    ctx.fillRect(sx + 1, sy + H - 3 + legOff, 3, 2);
    ctx.fillRect(sx + W - 4, sy + H - 3 - legOff, 3, 2);
  };

  e.takeDamage = makeTakeDamage(e, { events, player: null, ...{ events } });
  // Rebind with world access at call time — use a closure trick:
  e._takeDamageWorld = null;
  e.takeDamage = function(dmg, from, knockDir) {
    if (e.dead) return;
    if (e.invulnTimer > 0) return;
    e.hp -= dmg;
    e.hurtFlash = 0.15;
    e.invulnTimer = 0.4;
    events.emit(EVT.SFX, { key: 'enemy_hurt' });
    if (e.hp <= 0) {
      e.dead = true;
      events.emit(EVT.ENEMY_KILLED, { kind: e.kind, x: e.x, y: e.y });
    }
  };

  return e;
}
