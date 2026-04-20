// index.js — UI system entry point
// createUi(ctx, events, state) → { update(dt, input, world), draw(ctx, world) }
import { VIEW_SCALE, EVT } from '../contracts.js';
import { drawHud } from './hud.js';
import { drawTitle, handleTitleInput } from './title.js';
import { createDialogSystem } from './dialog.js';
import { drawPauseMenu, update as pauseUpdate } from './pause.js';
import { drawGameOver, handleInput as gameOverHandleInput } from './gameover.js';
import { drawVictory } from './victory.js';

/**
 * Create the unified UI system.
 *
 * The ctx passed to draw() is expected to be in SCREEN-PIXEL space:
 *   the caller must have applied ctx.scale(VIEW_SCALE, VIEW_SCALE) before
 *   calling draw(), OR the caller passes a raw ctx and we apply the scale here.
 *
 * This implementation applies its own save/restore + scale so it is
 * independent of whether the game loop already scaled the context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../contracts.js').EventBus} events
 * @param {import('../contracts.js').GameState} state
 * @returns {{ update(dt: number, input: object, world: object): void, draw(ctx: CanvasRenderingContext2D, world: object): void }}
 */
export function createUi(ctx, events, state) {
  // Accumulate total time for animation
  let timeSec = 0;

  // Create the dialog subsystem (listens to events.on(EVT.DIALOG_OPEN, …))
  const dialog = createDialogSystem(events, state);

  // Listen to player-died to transition to game-over
  events.on(EVT.PLAYER_DIED, () => {
    state.mode = 'gameover';
  });

  // Listen to boss-defeated to transition to victory
  events.on(EVT.BOSS_DEFEATED, () => {
    state.mode = 'victory';
  });

  /**
   * @param {number} dt  delta-time in seconds
   * @param {import('../contracts.js').InputState} input
   * @param {import('../contracts.js').World} world
   */
  function update(dt, input, world) {
    timeSec += dt;

    switch (state.mode) {
      case 'title':
        handleTitleInput(state, input);
        break;

      case 'playing':
        // Check for pause
        if (input?.startPressed) {
          state.mode = 'paused';
        }
        // Dialog system is always updated in playing mode (it self-gates on active)
        dialog.update(dt, input);
        break;

      case 'dialog':
        dialog.update(dt, input);
        break;

      case 'paused':
        pauseUpdate(input, state);
        break;

      case 'gameover':
        gameOverHandleInput(state, input, events);
        break;

      case 'victory':
        // Stay on victory screen until player presses start
        if (input?.startPressed) {
          state.mode = 'title';
        }
        break;

      default:
        break;
    }
  }

  /**
   * Draw the UI layer.
   * MUST be called AFTER the world/entity draw pass.
   * Applies its own save/restore; does NOT clear the canvas.
   *
   * @param {CanvasRenderingContext2D} drawCtx  raw canvas 2D context (device pixels)
   * @param {import('../contracts.js').World} world
   */
  function draw(drawCtx, world) {
    drawCtx.save();
    // Work in screen-pixel units (each logical pixel = VIEW_SCALE device pixels)
    drawCtx.scale(VIEW_SCALE, VIEW_SCALE);

    switch (state.mode) {
      case 'title':
        drawTitle(drawCtx, timeSec);
        break;

      case 'playing':
        drawHud(drawCtx, state, world);
        dialog.draw(drawCtx);
        break;

      case 'dialog':
        drawHud(drawCtx, state, world);
        dialog.draw(drawCtx);
        break;

      case 'paused':
        drawHud(drawCtx, state, world);
        drawPauseMenu(drawCtx, state);
        break;

      case 'gameover':
        drawGameOver(drawCtx, timeSec);
        break;

      case 'victory':
        drawVictory(drawCtx, timeSec);
        break;

      default:
        // Unknown mode — draw HUD as fallback
        drawHud(drawCtx, state, world);
        break;
    }

    drawCtx.restore();
  }

  return { update, draw };
}
