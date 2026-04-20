// boss_aquamentus.js — boss dragon, horizontal wobble, 3-way fireball spread
import { DIR, EVT } from '../../contracts.js';
import {
  makeEnemyBase, contactDamage, tickInvuln, shouldRender,
} from './base.js';

const W = 32;
const H = 32;
const HP = 12;
const WOBBLE_SPEED = 25;
const WOBBLE_RANGE = 30;
const SHOT_INTERVAL = 2.0;
const FIREBALL_SPEED = 85;

export function createBossAquamentus(events, state, opts = {}) {
  const e = makeEnemyBase('boss_aquamentus', {
    x: opts.x ?? 100,
    y: opts.y ?? 60,
    w: W,
    h: H,
    hp: HP,
    maxHp: HP,
    speed: WOBBLE_SPEED,
  });

  e.originX = opts.x ?? 100;
  e.wobbleDir = 1; // 1 or -1
  e.shotTimer = SHOT_INTERVAL;
  e.dir = DIR.LEFT; // faces left (toward player entry)
  e.roarTimer = 0;  // brief intro roar pause

  e.update = function update(dt, world) {
    if (e.dead) return;
    tickInvuln(e, dt);
    e.animTime += dt;

    if (e.roarTimer > 0) {
      e.roarTimer -= dt;
      return;
    }

    // Horizontal wobble
    e.x += e.wobbleDir * WOBBLE_SPEED * dt;
    if (e.x > e.originX + WOBBLE_RANGE) { e.wobbleDir = -1; }
    if (e.x < e.originX - WOBBLE_RANGE) { e.wobbleDir =  1; }

    // 3-way fireball spread
    e.shotTimer -= dt;
    if (e.shotTimer <= 0) {
      e.shotTimer = SHOT_INTERVAL;

      const player = world.player;
      let baseAngle = Math.PI; // default: fire left

      if (player) {
        const dx = (player.x + player.w / 2) - (e.x + W / 2);
        const dy = (player.y + player.h / 2) - (e.y + H / 2);
        baseAngle = Math.atan2(dy, dx);
      }

      const spread = Math.PI / 8; // ~22.5 degrees
      const angles = [baseAngle - spread, baseAngle, baseAngle + spread];

      for (const angle of angles) {
        world.events.emit('enemy_projectile', {
          kind: 'fireball',
          x: e.x,            // emerges from mouth (left side)
          y: e.y + H / 2,
          vx: Math.cos(angle) * FIREBALL_SPEED,
          vy: Math.sin(angle) * FIREBALL_SPEED,
          dir: DIR.LEFT,
          speed: FIREBALL_SPEED,
          damage: 2,
        });
      }

      events.emit(EVT.SFX, { key: 'boss_shoot' });
    }

    contactDamage(e, world.player, 4);
  };

  e.render = function render(ctx, cam) {
    if (e.dead) return;
    if (!shouldRender(e)) return;

    const sx = Math.round(e.x - cam.x);
    const sy = Math.round(e.y - cam.y);
    const frame = Math.floor(e.animTime * 4) % 2;
    const hp = e.hp;
    const maxHp = e.maxHp;

    // Dragon body — green
    ctx.fillStyle = '#208040';
    ctx.fillRect(sx + 4, sy + 6, W - 4, H - 8);

    // Head (left side — mouth faces left)
    ctx.fillStyle = '#30a050';
    ctx.fillRect(sx, sy + 8, 12, 16);

    // Horn
    ctx.fillStyle = '#f0d000';
    ctx.fillRect(sx + 2, sy + 2, 3, 6);
    ctx.fillRect(sx + 7, sy, 3, 8);

    // Eye
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(sx + 2, sy + 10, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(sx + 3, sy + 11, 2, 2);

    // Mouth — open when about to shoot
    const mouthOpen = e.shotTimer < 0.4;
    ctx.fillStyle = mouthOpen ? '#ff4000' : '#20603a';
    ctx.fillRect(sx, sy + 18, 8, mouthOpen ? 6 : 3);

    // Legs
    const legOff = frame === 0 ? 1 : 0;
    ctx.fillStyle = '#186030';
    ctx.fillRect(sx + 8, sy + H - 6 + legOff, 5, 6);
    ctx.fillRect(sx + 18, sy + H - 6 - legOff, 5, 6);

    // Tail
    ctx.fillStyle = '#208040';
    ctx.fillRect(sx + W - 4, sy + H / 2 - 3, 6, 6);
    ctx.fillRect(sx + W, sy + H / 2 - 1, 4, 4);

    // HP bar above boss
    const barW = W + 10;
    const barX = sx - 5;
    const barY = sy - 8;
    ctx.fillStyle = '#400000';
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = '#ff2020';
    ctx.fillRect(barX, barY, Math.round(barW * (hp / maxHp)), 4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, 4);
  };

  e.takeDamage = function(dmg, _from, _knockDir) {
    if (e.dead) return;
    if (e.invulnTimer > 0) return;
    // Only sword damage (combat-agent is responsible for routing; we accept all calls)
    e.hp -= dmg;
    e.hurtFlash = 0.15;
    e.invulnTimer = 0.5;
    events.emit(EVT.SFX, { key: 'boss_hurt' });
    if (e.hp <= 0) {
      e.dead = true;
      events.emit(EVT.BOSS_DEFEATED, { bossId: 'aquamentus' });
      // Also emit ENEMY_KILLED so combat-agent can spawn heart_container
      events.emit(EVT.ENEMY_KILLED, { kind: 'boss_aquamentus', x: e.x, y: e.y });
    }
  };

  return e;
}
