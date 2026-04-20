// moblin.js — faster ranged enemy that shoots arrows
import { DIR, DIR_VEC, EVT } from '../../contracts.js';
import {
  makeEnemyBase, contactDamage, tickInvuln, shouldRender,
} from './base.js';

const W = 14;
const H = 14;
const SPEED = 45;
const HP = 3;
const SHOT_INTERVAL_MIN = 1.5;
const SHOT_INTERVAL_MAX = 2.5;
const DIR_CHANGE_INTERVAL = 1.0;

function randomDir() { return Math.floor(Math.random() * 4); }
function randomShot() { return SHOT_INTERVAL_MIN + Math.random() * (SHOT_INTERVAL_MAX - SHOT_INTERVAL_MIN); }

export function createMoblin(events, state, opts = {}) {
  const e = makeEnemyBase('moblin', { x: opts.x, y: opts.y, w: W, h: H, hp: HP, speed: SPEED });
  e.dirTimer = DIR_CHANGE_INTERVAL;
  e.shotTimer = randomShot();

  e.update = function update(dt, world) {
    if (e.dead) return;
    tickInvuln(e, dt);
    e.animTime += dt;

    e.dirTimer -= dt;
    if (e.dirTimer <= 0) {
      e.dir = randomDir();
      e.dirTimer = DIR_CHANGE_INTERVAL;
    }

    const v = DIR_VEC[e.dir];
    const nx = e.x + v.x * SPEED * dt;
    const ny = e.y + v.y * SPEED * dt;
    if (!world.rectSolid(nx, ny, W, H, e)) {
      e.x = nx;
      e.y = ny;
    } else {
      e.dir = randomDir();
      e.dirTimer = DIR_CHANGE_INTERVAL;
    }

    e.shotTimer -= dt;
    if (e.shotTimer <= 0) {
      e.shotTimer = randomShot();
      world.events.emit('enemy_projectile', {
        kind: 'arrow_enemy',
        x: e.x + W / 2,
        y: e.y + H / 2,
        dir: e.dir,
        speed: 110,
        damage: 2,
      });
    }

    contactDamage(e, world.player);
  };

  e.render = function render(ctx, cam) {
    if (e.dead) return;
    if (!shouldRender(e)) return;

    const sx = Math.round(e.x - cam.x);
    const sy = Math.round(e.y - cam.y);
    const frame = Math.floor(e.animTime * 6) % 2;

    // Orange-brown NES palette for moblin
    ctx.fillStyle = '#b05010';
    ctx.fillRect(sx, sy, W, H);

    // belly highlight
    ctx.fillStyle = '#d07838';
    ctx.fillRect(sx + 3, sy + 4, W - 6, 5);

    // snout
    ctx.fillStyle = '#c06020';
    ctx.fillRect(sx + 4, sy + 9, 6, 3);

    // eyes
    ctx.fillStyle = '#000000';
    if (e.dir === DIR.UP) {
      ctx.fillRect(sx + 3, sy + 2, 2, 2);
      ctx.fillRect(sx + 9, sy + 2, 2, 2);
    } else if (e.dir === DIR.DOWN) {
      ctx.fillRect(sx + 3, sy + 8, 2, 2);
      ctx.fillRect(sx + 9, sy + 8, 2, 2);
    } else if (e.dir === DIR.LEFT) {
      ctx.fillRect(sx + 2, sy + 4, 2, 2);
      ctx.fillRect(sx + 2, sy + 8, 2, 2);
    } else {
      ctx.fillRect(sx + 10, sy + 4, 2, 2);
      ctx.fillRect(sx + 10, sy + 8, 2, 2);
    }

    // legs
    const legOff = frame === 0 ? 1 : -1;
    ctx.fillStyle = '#803010';
    ctx.fillRect(sx + 2, sy + H - 3 + legOff, 3, 2);
    ctx.fillRect(sx + W - 5, sy + H - 3 - legOff, 3, 2);
  };

  e.takeDamage = function(dmg, _from, _knockDir) {
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
