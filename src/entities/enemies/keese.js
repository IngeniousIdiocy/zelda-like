// keese.js — flying bat enemy, diagonal movement, erratic direction changes
import { EVT } from '../../contracts.js';
import {
  makeEnemyBase, contactDamage, tickInvuln, shouldRender,
} from './base.js';

const W = 10;
const H = 10;
const SPEED = 55;
const HP = 1;
const DIR_CHANGE_MIN = 0.4;
const DIR_CHANGE_MAX = 0.8;

// Diagonal direction vectors
const DIAG_VECS = [
  { x:  1, y:  1 },
  { x:  1, y: -1 },
  { x: -1, y:  1 },
  { x: -1, y: -1 },
];

function randomDiagDir() { return Math.floor(Math.random() * 4); }
function randomChangeTimer() { return DIR_CHANGE_MIN + Math.random() * (DIR_CHANGE_MAX - DIR_CHANGE_MIN); }

export function createKeese(events, state, opts = {}) {
  const e = makeEnemyBase('keese', { x: opts.x, y: opts.y, w: W, h: H, hp: HP, speed: SPEED });
  e.diagDir = randomDiagDir();
  e.dirTimer = randomChangeTimer();

  e.update = function update(dt, world) {
    if (e.dead) return;
    tickInvuln(e, dt);
    e.animTime += dt;

    e.dirTimer -= dt;
    if (e.dirTimer <= 0) {
      e.diagDir = randomDiagDir();
      e.dirTimer = randomChangeTimer();
    }

    const v = DIAG_VECS[e.diagDir];
    const nx = e.x + v.x * SPEED * dt;
    const ny = e.y + v.y * SPEED * dt;

    // Keese respects solid tiles but bounces off them
    const blockedX = world.rectSolid(nx, e.y, W, H, e);
    const blockedY = world.rectSolid(e.x, ny, W, H, e);

    if (!blockedX) {
      e.x = nx;
    } else {
      // flip x component
      e.diagDir = [1, 0, 3, 2][e.diagDir]; // flip x axis
    }

    if (!blockedY) {
      e.y = ny;
    } else {
      // flip y component
      e.diagDir = [2, 3, 0, 1][e.diagDir]; // flip y axis
    }

    contactDamage(e, world.player);
  };

  e.render = function render(ctx, cam) {
    if (e.dead) return;
    if (!shouldRender(e)) return;

    const sx = Math.round(e.x - cam.x);
    const sy = Math.round(e.y - cam.y);
    const frame = Math.floor(e.animTime * 8) % 2; // faster wing flap

    // Dark purple/blue bat — NES palette
    ctx.fillStyle = '#303060';
    ctx.fillRect(sx + 2, sy + 3, W - 4, H - 4);

    // Wings — alternate up/down
    ctx.fillStyle = '#5050a0';
    if (frame === 0) {
      // wings up
      ctx.fillRect(sx, sy + 1, 3, 4);
      ctx.fillRect(sx + W - 3, sy + 1, 3, 4);
    } else {
      // wings down
      ctx.fillRect(sx, sy + 4, 3, 4);
      ctx.fillRect(sx + W - 3, sy + 4, 3, 4);
    }

    // Eyes
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(sx + 3, sy + 3, 2, 2);
    ctx.fillRect(sx + W - 5, sy + 3, 2, 2);
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
