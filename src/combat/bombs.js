// bombs.js — placeable bomb entity
import { EVT, aabb } from '../contracts.js';
import { createBombExplosion } from './projectile.js';

let _nextId = 1;
function uid() { return `bomb_${_nextId++}`; }

const BOMB_W = 10;
const BOMB_H = 10;

export function createBomb(events, { x, y, fuse = 1.5 }) {
  let elapsed = 0;
  let exploded = false;

  events.emit(EVT.SFX, 'bomb_place');

  return {
    id: uid(),
    kind: 'bomb',
    x, y, w: BOMB_W, h: BOMB_H,
    hp: 1, maxHp: 1,
    dir: 0, dead: false, solid: false,
    invulnTimer: 0,

    update(dt, world) {
      if (this.dead) return;
      elapsed += dt;

      if (!exploded && elapsed >= fuse) {
        exploded = true;
        this.dead = true;
        events.emit(EVT.SFX, 'bomb_explode');
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        world.spawn(createBombExplosion(events, { x: cx, y: cy, damage: 4, radius: 20 }));
      }
    },

    render(ctx, cam) {
      if (this.dead) return;
      const sx = this.x - cam.x;
      const sy = this.y - cam.y;
      const blink = elapsed > fuse - 0.4 && Math.floor(elapsed * 10) % 2 === 0;
      const bodyColor = blink ? '#ffffff' : '#222222';

      // bomb body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx + 2, sy + 1, 6, 8);
      ctx.fillRect(sx + 1, sy + 2, 8, 6);
      // shine
      ctx.fillStyle = '#555555';
      ctx.fillRect(sx + 3, sy + 2, 2, 2);
      // fuse
      ctx.fillStyle = '#886644';
      ctx.fillRect(sx + 4, sy, 2, 2);
      ctx.fillRect(sx + 5, sy - 1, 1, 2);
      // spark at tip when about to blow
      if (elapsed > fuse - 0.8) {
        const sparkOn = Math.floor(elapsed * 12) % 2 === 0;
        ctx.fillStyle = sparkOn ? '#ffff00' : '#ff8800';
        ctx.fillRect(sx + 5, sy - 2, 2, 2);
      }
    },
  };
}
