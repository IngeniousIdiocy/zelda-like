// stalfos.js — skeleton enemy that walks toward player
import { DIR, EVT } from '../../contracts.js';
import {
  makeEnemyBase, contactDamage, tickInvuln, shouldRender,
} from './base.js';

const W = 14;
const H = 14;
const SPEED = 30;
const HP = 2;

export function createStalfos(events, state, opts = {}) {
  const e = makeEnemyBase('stalfos', { x: opts.x, y: opts.y, w: W, h: H, hp: HP, speed: SPEED });

  e.update = function update(dt, world) {
    if (e.dead) return;
    tickInvuln(e, dt);
    e.animTime += dt;

    const player = world.player;
    if (player) {
      const dx = (player.x + player.w / 2) - (e.x + W / 2);
      const dy = (player.y + player.h / 2) - (e.y + H / 2);
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      // Pick dominant axis for cardinal movement
      let vx = 0, vy = 0;
      if (adx > ady) {
        vx = dx > 0 ? 1 : -1;
        e.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
      } else {
        vy = dy > 0 ? 1 : -1;
        e.dir = dy > 0 ? DIR.DOWN : DIR.UP;
      }

      const nx = e.x + vx * SPEED * dt;
      const ny = e.y + vy * SPEED * dt;

      if (!world.rectSolid(nx, e.y, W, H, e)) {
        e.x = nx;
      }
      if (!world.rectSolid(e.x, ny, W, H, e)) {
        e.y = ny;
      }
    }

    contactDamage(e, world.player);
  };

  e.render = function render(ctx, cam) {
    if (e.dead) return;
    if (!shouldRender(e)) return;

    const sx = Math.round(e.x - cam.x);
    const sy = Math.round(e.y - cam.y);
    const frame = Math.floor(e.animTime * 5) % 2;

    // Bone white with grey shadow — skeleton
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(sx + 2, sy, W - 4, H);

    // Skull
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(sx + 3, sy, W - 6, 7);

    // Eye sockets — dark
    ctx.fillStyle = '#202020';
    ctx.fillRect(sx + 4, sy + 2, 2, 2);
    ctx.fillRect(sx + 8, sy + 2, 2, 2);

    // Ribs
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(sx + 3, sy + 7, W - 6, 1);
    ctx.fillRect(sx + 3, sy + 9, W - 6, 1);

    // Legs walking
    const legOff = frame === 0 ? 1 : 0;
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(sx + 3, sy + H - 4, 3, 4 + legOff);
    ctx.fillRect(sx + W - 6, sy + H - 4, 3, 4 - legOff);
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
