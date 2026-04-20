// input.js — keyboard InputState with edge-triggered press flags

// Keys that need preventDefault so the page doesn't scroll/navigate.
const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyZ', 'KeyJ', 'KeyX', 'KeyK', 'KeyC', 'KeyL',
  'Enter', 'KeyM',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

/**
 * @param {HTMLCanvasElement} _canvas  (unused at runtime; reserved for future pointer events)
 * @returns {{ state: import('../contracts.js').InputState, beginFrame: () => void, endFrame: () => void }}
 */
export function createInput(_canvas) {
  // Raw held state
  const held = {
    up: false, down: false, left: false, right: false,
    attack: false, use: false, cycle: false, start: false, mute: false,
  };

  // Edge-triggered: set to true on keydown, cleared in endFrame.
  // "consumed" mirrors: once the edge flag is written, we don't re-write it
  // until the key is released and pressed again.
  const edgeConsumed = {
    attack: false, use: false, cycle: false, start: false, mute: false,
  };

  /** @type {import('../contracts.js').InputState} */
  const state = {
    up: false, down: false, left: false, right: false,
    attack: false, use: false, cycle: false, start: false, mute: false,
    attackPressed: false, usePressed: false, cyclePressed: false,
    startPressed: false, mutePressed: false,
  };

  function onKeyDown(e) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();

    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': held.up     = true; break;
      case 'ArrowDown':  case 'KeyS': held.down   = true; break;
      case 'ArrowLeft':  case 'KeyA': held.left   = true; break;
      case 'ArrowRight': case 'KeyD': held.right  = true; break;
      case 'KeyZ': case 'KeyJ':
        held.attack = true;
        if (!edgeConsumed.attack) { state.attackPressed = true; edgeConsumed.attack = true; }
        break;
      case 'KeyX': case 'KeyK':
        held.use = true;
        if (!edgeConsumed.use) { state.usePressed = true; edgeConsumed.use = true; }
        break;
      case 'KeyC': case 'KeyL':
        held.cycle = true;
        if (!edgeConsumed.cycle) { state.cyclePressed = true; edgeConsumed.cycle = true; }
        break;
      case 'Enter':
        held.start = true;
        if (!edgeConsumed.start) { state.startPressed = true; edgeConsumed.start = true; }
        break;
      case 'KeyM':
        held.mute = true;
        if (!edgeConsumed.mute) { state.mutePressed = true; edgeConsumed.mute = true; }
        break;
    }

    // Mirror held → state (non-edge keys)
    state.up    = held.up;
    state.down  = held.down;
    state.left  = held.left;
    state.right = held.right;
    state.attack = held.attack;
    state.use    = held.use;
    state.cycle  = held.cycle;
    state.start  = held.start;
    state.mute   = held.mute;
  }

  function onKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': held.up     = false; break;
      case 'ArrowDown':  case 'KeyS': held.down   = false; break;
      case 'ArrowLeft':  case 'KeyA': held.left   = false; break;
      case 'ArrowRight': case 'KeyD': held.right  = false; break;
      case 'KeyZ': case 'KeyJ': held.attack = false; edgeConsumed.attack = false; break;
      case 'KeyX': case 'KeyK': held.use    = false; edgeConsumed.use    = false; break;
      case 'KeyC': case 'KeyL': held.cycle  = false; edgeConsumed.cycle  = false; break;
      case 'Enter':  held.start = false; edgeConsumed.start = false; break;
      case 'KeyM':   held.mute  = false; edgeConsumed.mute  = false; break;
    }

    state.up    = held.up;
    state.down  = held.down;
    state.left  = held.left;
    state.right = held.right;
    state.attack = held.attack;
    state.use    = held.use;
    state.cycle  = held.cycle;
    state.start  = held.start;
    state.mute   = held.mute;
  }

  function onBlur() {
    // Zero everything to prevent stuck keys when window loses focus.
    for (const k of Object.keys(held)) held[k] = false;
    for (const k of Object.keys(edgeConsumed)) edgeConsumed[k] = false;
    Object.assign(state, {
      up: false, down: false, left: false, right: false,
      attack: false, use: false, cycle: false, start: false, mute: false,
      attackPressed: false, usePressed: false, cyclePressed: false,
      startPressed: false, mutePressed: false,
    });
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);
  window.addEventListener('blur',    onBlur);

  return {
    state,
    beginFrame() { /* reserved */ },
    endFrame() {
      // Clear edge-triggered pressed flags after one frame.
      state.attackPressed = false;
      state.usePressed    = false;
      state.cyclePressed  = false;
      state.startPressed  = false;
      state.mutePressed   = false;
    },
  };
}
