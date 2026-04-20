// zora.js — water-dwelling enemy, stationary turret that shoots fireballs at player
import { EVT } from '../../contracts.js';
import {
  makeEnemyBase, contactDamage, tickInvuln, shouldRender,
} from './base.js';

const W = 14;
const H = 14;
const HP = 3;
const SHOT_INTERVAL_MIN = 2.0;
const SHOT_INTERVAL_MAX = 3.5;
const POP_DURATION = 0.5; // seconds before shooting, then submerge

function randomShotInterval() {
  return SHOT_INTERVAL_MIN + Math.random() * (SHOT_INTERVAL_MAX - SHOT_INTERVAL_MIN);
}

export function createZora(events, state, opts = {}) {
  const e = makeEnemyBase('zora', { x: opts.x, y: opts.y, w: W, h: H, hp: HP, speed: 0 });
  e.shotTimer = randomShotInterval();
  e.popTimer = 0;     // countdown while popped up
  e.popped = false;   // visible/shooting state

  e.update = function update(dt, world) {
    if (e.dead) return;
    tickInvuln(e, dt);
    e.animTime += dt;

    if (e.popped) {
      e.popTimer -= dt;
      if (e.popTimer <= 0) {
        e.popped = false;
        e.shotTimer = randomShotInterval();
      }
    } else {
      e.shotTimer -= dt;
      if (e.shotTimer <= 0) {
        // Pop up and shoot at player
        e.popped = true;
        e.popTimer = POP_DURATION;

        const player = world.player;
        if (player) {
          // Aim toward player
          const dx = (player.x + player.w / 2) - (e.x + W / 2);
          const dy = (player.y + player.h / 2) - (e.y + H / 2);
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const vx = dx / len;
          const vy = dy / len;

          world.events.emit('enemy_projectile', {
            kind: 'fireball',
            x: e.x + W / 2,
            y: e.y + H / 2,
            // Free-aim: pass velocity components directly
            vx: vx * 80,
            vy: vy * 80,
            dir: e.dir,
            speed: 80,
            damage: 2,
          });
        }
      }
    }

    if (e.popped) {
      contactDamage(e, world.player);
    }
  };

  e.render = function render(ctx, cam) {
    if (e.dead) return;
    if (!e.popped) return; // submerged — invisible
    if (!shouldRender(e)) return;

    const sx = Math.round(e.x - cam.x);
    const sy = Math.round(e.y - cam.y);
    const frame = Math.floor(e.animTime * 4) % 2;

    // Blue-green aquatic color
    ctx.fillStyle = '#205080';
    ctx.fillRect(sx, sy, W, H);

    // Scales pattern
    ctx.fillStyle = '#2878a8';
    ctx.fillRect(sx + 2, sy + 2, 4, 4);
    ctx.fillRect(sx + 8, sy + 2, 4, 4);
    ctx.fillRect(sx + 5, sy + 6, 4, 4);

    // Eyes
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(sx + 2, sy + 2, 2, 2);
    ctx.fillRect(sx + 10, sy + 2, 2, 2);

    // Mouth indicator (tells player it can shoot)
    ctx.fillStyle = '#ff8000';
    ctx.fillRect(sx + 4, sy + 9, 6, 2);

    // Ripple animation when popping
    if (frame === 0) {
      ctx.strokeStyle = '#4090c0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx + W / 2, sy + H + 2, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
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
