// npc.js — OldMan NPC: grants sword on first interaction
import { EVT, aabb } from '../../contracts.js';
import { makeEnemyBase, shouldRender } from './base.js';

const W = 14;
const H = 16;

const TEXT_INITIAL = 'IT IS DANGEROUS TO GO ALONE! TAKE THIS.';
const TEXT_ALREADY  = 'GOOD LUCK';

export function createOldMan(events, state, opts = {}) {
  const e = makeEnemyBase('npc_oldman', {
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    w: W,
    h: H,
    hp: 1,
    maxHp: 1,
    speed: 0,
    solid: false,
  });

  e.interacted = false;
  e.dialogOpen = false;

  // NPC does not take damage
  e.takeDamage = function() {};

  e._reopenCooldown = 0;
  e._wasOverlapping = false;

  e.update = function update(dt, world) {
    if (e.dead) return;
    if (e._reopenCooldown > 0) e._reopenCooldown -= dt;
    if (e.dialogOpen) return;

    const player = world.player;
    if (!player) return;

    const overlapping = aabb(e, player);
    // Re-trigger only on a fresh edge (player was not overlapping last frame).
    const edgeIn = overlapping && !e._wasOverlapping && e._reopenCooldown <= 0;
    e._wasOverlapping = overlapping;

    if (edgeIn) {
      e.dialogOpen = true;

      const alreadyGot = state.flags && state.flags.has('got_sword');
      const text = alreadyGot ? TEXT_ALREADY : TEXT_INITIAL;

      events.emit(EVT.DIALOG_OPEN, {
        text,
        onClose: () => {
          e.dialogOpen = false;
          e._reopenCooldown = 0.8;
          if (!alreadyGot) {
            state.hasSword = true;
            if (state.flags) state.flags.add('got_sword');
            events.emit(EVT.SFX, { id: 'item_get' });
          }
        },
      });
    }
  };

  e.render = function render(ctx, cam) {
    if (e.dead) return;
    if (!shouldRender(e)) return;

    const sx = Math.round(e.x - cam.x);
    const sy = Math.round(e.y - cam.y);
    const frame = Math.floor(Date.now() / 500) % 2; // slow idle blink

    // Robe — blue/grey old man
    ctx.fillStyle = '#4060b0';
    ctx.fillRect(sx + 2, sy + 7, W - 4, H - 7);

    // Hood
    ctx.fillStyle = '#5070c0';
    ctx.fillRect(sx + 3, sy + 4, W - 6, 6);

    // Face
    ctx.fillStyle = '#e8c880';
    ctx.fillRect(sx + 4, sy + 2, W - 8, 7);

    // Eyes — blink occasionally
    ctx.fillStyle = '#303030';
    if (frame === 0) {
      ctx.fillRect(sx + 5, sy + 4, 2, 2);
      ctx.fillRect(sx + 9, sy + 4, 2, 2);
    } else {
      // blink
      ctx.fillRect(sx + 5, sy + 5, 2, 1);
      ctx.fillRect(sx + 9, sy + 5, 2, 1);
    }

    // Beard
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(sx + 4, sy + 7, W - 8, 3);

    // Staff
    ctx.fillStyle = '#a07040';
    ctx.fillRect(sx + W - 2, sy + 2, 2, H - 2);

    // Proximity indicator (subtle glow when player is near)
    if (e.dialogOpen) {
      ctx.strokeStyle = '#ffff80';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 1, sy - 1, W + 2, H + 2);
    }
  };

  return e;
}
