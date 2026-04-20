// gameover.js — game-over screen
import { SCREEN_W, SCREEN_H, HUD_H, EVT } from '../contracts.js';
import { drawText, textWidth } from './font.js';

const TOTAL_H = SCREEN_H + HUD_H;

/**
 * Draw the game-over screen.
 * @param {CanvasRenderingContext2D} ctx  in screen-pixel space
 * @param {number} timeSec
 */
export function drawGameOver(ctx, timeSec) {
  // Dark overlay
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, SCREEN_W, TOTAL_H);

  // Pulsing red background glow
  const pulse = 0.12 + 0.08 * Math.sin(timeSec * 1.5);
  ctx.fillStyle = `rgba(180,0,0,${pulse.toFixed(3)})`;
  ctx.fillRect(0, 0, SCREEN_W, TOTAL_H);

  const cy = Math.floor(TOTAL_H / 2);

  // "GAME" line
  const line1 = 'GAME';
  const scale1 = 3;
  const w1 = textWidth(line1, scale1);
  drawText(ctx, line1, Math.floor((SCREEN_W - w1) / 2), cy - 40, {
    color: '#FF2222',
    scale: scale1,
    shadow: true,
  });

  // "OVER" line
  const line2 = 'OVER';
  const w2 = textWidth(line2, scale1);
  drawText(ctx, line2, Math.floor((SCREEN_W - w2) / 2), cy - 40 + scale1 * 8 + 2, {
    color: '#FF2222',
    scale: scale1,
    shadow: true,
  });

  // Blinking continue prompt
  const visible = Math.floor(timeSec * 2) % 2 === 0;
  if (visible) {
    const sub = 'PRESS ENTER TO CONTINUE';
    const subW = textWidth(sub, 1);
    drawText(ctx, sub, Math.floor((SCREEN_W - subW) / 2), cy + 30, {
      color: '#AAAAAA',
    });
  }
}

/**
 * Handle input on the game-over screen.
 * Resets player HP and returns to playing; emits EVT for world-agent to load
 * the respawn room (ov_2_2).
 * @param {import('../contracts.js').GameState} state
 * @param {import('../contracts.js').InputState} input
 * @param {import('../contracts.js').EventBus} events
 * @returns {boolean} true if game was restarted
 */
export function handleInput(state, input, events) {
  if (input?.startPressed || input?.attackPressed) {
    state.hearts = state.maxHearts;
    state.mode = 'playing';
    state.deaths = (state.deaths ?? 0) + 1;
    // Signal world-agent to enter the starting room
    if (events) {
      events.emit(EVT.ROOM_CHANGED, { roomId: 'ov_2_2', edge: 's' });
    }
    return true;
  }
  return false;
}
