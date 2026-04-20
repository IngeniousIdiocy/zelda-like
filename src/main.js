// main.js — integration layer. Wires every subsystem from its own PR together.
// Responsibilities:
//   * instantiate engine (input, renderer, camera, events bus, loop, rng),
//   * instantiate state + world + player,
//   * register spawn factories (adapting their signatures to the world),
//   * install the combat system,
//   * instantiate UI + audio,
//   * bridge event-name / payload mismatches between subsystems,
//   * add edge-of-screen room transitions + a replaceTile helper.

import {
  EVT, ITEM, TILE, ROOM_W, ROOM_H, SCREEN_W, SCREEN_H,
  CANVAS_W, CANVAS_H, VIEW_SCALE, HUD_H, DIR, T,
} from './contracts.js';

import { createEventBus } from './engine/events.js';
import { createInput }    from './engine/input.js';
import { startLoop }      from './engine/loop.js';
import { createRenderer } from './engine/renderer.js';
import { createCamera }   from './engine/camera.js';

import { createWorld }    from './world/world.js';
import { drawTile }       from './world/tileset.js';

import { createPlayer }   from './entities/player.js';
import {
  createOctorok, createMoblin, createKeese, createZora, createStalfos,
  createBossAquamentus, createOldMan,
} from './entities/enemies/index.js';

import {
  createRupee, createHeart, createFairy, createKeyPickup,
  createBombPickup, createHeartContainer, createTriforce,
} from './combat/pickups.js';
import { createChest }            from './combat/chest.js';
import { installCombatSystem }    from './combat/system.js';

import { createUi }       from './ui/index.js';
import { drawText }       from './ui/font.js';
import { createAudio }    from './audio/audio.js';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const events   = createEventBus();
const input    = createInput(canvas);
const renderer = createRenderer(canvas);
const camera   = createCamera();

// --------- Initial game state (matches GameState contract) -----------------
const state = {
  hearts: 12,        // quarter-hearts, 3 hearts * 4
  maxHearts: 12,
  rupees: 0,
  keys: 0,
  bombs: 0,
  arrows: 0,
  maxBombs: 8,
  maxArrows: 30,
  hasSword: false,   // granted by old man in the cave
  hasBow: false,
  hasBoomerang: false,
  hasCandle: false,
  hasRaft: false,
  selectedItem: ITEM.NONE,
  flags: new Set(),
  currentRoomId: 'ov_2_2',
  deaths: 0,
  mode: 'title',
};

// --------- Player + world --------------------------------------------------
const player = createPlayer(events, state, {
  x: Math.round((SCREEN_W - 12) / 2),
  y: Math.round((SCREEN_H - 14) / 2),
});

const world = createWorld({ events, state, player });
world.input = input; // player reads world.input.state
world.entities.push(player); // include player in the update loop

// replaceTile helper — combat-agent needs it for bush cutting.
world.replaceTile = (tx, ty, id) => {
  if (!world.room) return;
  if (tx < 0 || tx >= ROOM_W || ty < 0 || ty >= ROOM_H) return;
  world.room.tiles[ty * ROOM_W + tx] = id;
};

// ---------------------------------------------------------------------------
// Spawn-factory signature bridge.
// World calls factory(spawn, world) where spawn = {x,y,kind,opts}.
// But enemies/pickups expect (events, state?, opts) with opts carrying x,y.
// ---------------------------------------------------------------------------
function adaptEnemy(ctor) {
  return (sp /* spawn */) => ctor(events, state, { x: sp.x, y: sp.y, ...(sp.opts || {}) });
}
function adaptPickup(ctor) {
  return (sp) => ctor(events, { x: sp.x, y: sp.y, ...(sp.opts || {}) });
}

world.registerFactory('octorok',         adaptEnemy(createOctorok));
world.registerFactory('moblin',          adaptEnemy(createMoblin));
world.registerFactory('keese',           adaptEnemy(createKeese));
world.registerFactory('zora',            adaptEnemy(createZora));
world.registerFactory('stalfos',         adaptEnemy(createStalfos));
world.registerFactory('boss_aquamentus', adaptEnemy(createBossAquamentus));
world.registerFactory('npc_oldman',      adaptEnemy(createOldMan));

world.registerFactory('rupee',            adaptPickup(createRupee));
world.registerFactory('heart',            adaptPickup(createHeart));
world.registerFactory('fairy',            adaptPickup(createFairy));
world.registerFactory('key',              adaptPickup(createKeyPickup));
world.registerFactory('bomb',             adaptPickup(createBombPickup));
world.registerFactory('heart_container',  adaptPickup(createHeartContainer));
world.registerFactory('triforce',         adaptPickup(createTriforce));

// Chest: contents is a factory (x,y) => Entity. Translate spawn.opts.contains string.
const PICKUP_BY_NAME = {
  key:  (x, y) => createKeyPickup(events, { x, y }),
  rupee:(x, y) => createRupee(events, { x, y, value: 5 }),
  heart:(x, y) => createHeart(events, { x, y }),
  bomb: (x, y) => createBombPickup(events, { x, y }),
  heart_container: (x, y) => createHeartContainer(events, { x, y }),
};
world.registerFactory('chest', (sp) => {
  const name = sp.opts?.contains || 'rupee';
  const contents = PICKUP_BY_NAME[name] || PICKUP_BY_NAME.rupee;
  return createChest(events, { x: sp.x, y: sp.y, contents });
});

// Sign — static readable tile. On overlap + usePressed, open dialog.
world.registerFactory('sign', (sp) => {
  const text = sp.opts?.text || 'A WEATHERED SIGN.';
  return {
    id: 'sign_' + sp.x + '_' + sp.y,
    kind: 'sign',
    x: sp.x, y: sp.y, w: TILE, h: TILE,
    hp: 0, maxHp: 0, dir: DIR.DOWN, dead: false, solid: true,
    invulnTimer: 0,
    _cooldown: 0,
    update(dt, w) {
      this._cooldown = Math.max(0, this._cooldown - dt);
      const p = w.player;
      const adjacent = Math.abs((p.x + p.w / 2) - (this.x + this.w / 2)) < 20
                    && Math.abs((p.y + p.h / 2) - (this.y + this.h / 2)) < 20;
      if (adjacent && this._cooldown === 0 && w.input?.state?.usePressed) {
        this._cooldown = 0.5;
        events.emit(EVT.DIALOG_OPEN, { text });
      }
    },
    render(ctx, cam) {
      ctx.fillStyle = '#a07050'; ctx.fillRect(this.x - cam.x, this.y - cam.y + 2, 14, 10);
      ctx.fillStyle = '#6b4020'; ctx.fillRect(this.x - cam.x + 6, this.y - cam.y + 10, 4, 6);
      ctx.fillStyle = '#f0e0a0';
      for (let i = 0; i < 3; i++) ctx.fillRect(this.x - cam.x + 2, this.y - cam.y + 4 + i * 2, 10, 1);
    },
  };
});

// Boss door — locked until boss dead; opens when player has a key, or after boss death.
world.registerFactory('boss_door', (sp) => {
  return {
    id: 'bossdoor_' + sp.x + '_' + sp.y,
    kind: 'boss_door',
    x: sp.x, y: sp.y, w: TILE, h: TILE,
    hp: 0, maxHp: 0, dir: DIR.UP, dead: false,
    solid: !state.flags.has('d1_prehall_door_open'),
    invulnTimer: 0,
    update(_dt, w) {
      if (state.flags.has('d1_prehall_door_open')) {
        this.solid = false;
        this.dead = true;
        // Replace the locked tile above with an open door tile.
        const tx = Math.floor(this.x / TILE);
        const ty = Math.floor(this.y / TILE);
        w.replaceTile(tx, ty, T.DOOR_N);
        return;
      }
      const p = w.player;
      const near = Math.abs((p.x + p.w/2) - (this.x + this.w/2)) < 18
                && Math.abs((p.y + p.h/2) - (this.y + this.h/2)) < 18;
      if (near && state.keys > 0 && w.input?.state?.usePressed) {
        state.keys -= 1;
        state.flags.add('d1_prehall_door_open');
        events.emit(EVT.SFX, { id: 'door' });
      }
    },
    render(ctx, cam) {
      ctx.fillStyle = '#3a1a0a'; ctx.fillRect(this.x - cam.x, this.y - cam.y, 16, 16);
      ctx.fillStyle = '#c0a040'; ctx.fillRect(this.x - cam.x + 2, this.y - cam.y + 2, 12, 12);
      ctx.fillStyle = '#000';    ctx.fillRect(this.x - cam.x + 6, this.y - cam.y + 5, 4, 6);
    },
  };
});

// ---------------------------------------------------------------------------
// Combat system + UI + audio
// ---------------------------------------------------------------------------
installCombatSystem(world, events, state);

const ui = createUi(canvas.getContext('2d'), events, state);
const audio = createAudio(events);

// ---------------------------------------------------------------------------
// Event-name + SFX-payload bridges between subsystems
// ---------------------------------------------------------------------------
// Player emits uppercase; combat listens lowercase.
events.on('PLAYER_ATTACK',      (p) => events.emit('player_attack', p));
events.on('PLAYER_SWORD_BEAM',  (p) => events.emit('player_sword_beam', p));
events.on('PLAYER_USE_ITEM',    (p) => events.emit('player_use_item', p));

// SFX payload shape is handled inside audio.js (accepts string OR {id}).

// Mute: input.mutePressed → emit 'mute_toggle'
// (checked in the main loop below.)

// ---------------------------------------------------------------------------
// Edge-of-screen room transitions.
// When the player walks off one edge of a room, enter the neighbour room.
// ---------------------------------------------------------------------------
// Edge-transition: player clamps itself to the room, so we trigger on
// "hugging edge + pushing further in that direction" with a neighbor room.
function checkEdgeTransition() {
  const p = world.player;
  if (!p || p.dead || !world.room) return;
  const r = world.room;
  const s = input.state;
  if (s.left  && p.x <= 0                  && r.west)  return world.enterRoom(r.west,  'e');
  if (s.right && p.x + p.w >= SCREEN_W     && r.east)  return world.enterRoom(r.east,  'w');
  if (s.up    && p.y <= 0                  && r.north) return world.enterRoom(r.north, 's');
  if (s.down  && p.y + p.h >= SCREEN_H     && r.south) return world.enterRoom(r.south, 'n');
}

// ---------------------------------------------------------------------------
// Room visited tracking (used by HUD mini-map).
// ---------------------------------------------------------------------------
events.on(EVT.ROOM_CHANGED, ({ room }) => {
  state.flags.add('visited_' + room.id);
});

// Gameover: ui emits EVT.ROOM_CHANGED on continue (per agent contract).
// World already handles ROOM_CHANGED as an emit side-effect, not listener — so wire here.
events.on(EVT.ROOM_CHANGED, (p) => {
  if (p && p.roomId && p.roomId !== state.currentRoomId) {
    // `roomId` is the ui-agent's shape on game-over continue.
    state.hearts = state.maxHearts;
    world.enterRoom(p.roomId);
  }
});

// ---------------------------------------------------------------------------
// Render pass
// ---------------------------------------------------------------------------
function drawRoomTiles(ctx) {
  const r = world.room;
  if (!r) return;
  const tFrame = Math.floor(performance.now() / 400) % 2;
  for (let ty = 0; ty < ROOM_H; ty++) {
    for (let tx = 0; tx < ROOM_W; tx++) {
      const id = r.tiles[ty * ROOM_W + tx];
      drawTile(ctx, id, tx * TILE, ty * TILE, { frame: tFrame });
    }
  }
}

function render() {
  renderer.clear('#000');

  if (state.mode === 'title' || state.mode === 'gameover' || state.mode === 'victory') {
    ui.draw(renderer.ctx, world);
    return;
  }

  // World pass (scaled, camera-translated, HUD-offset)
  renderer.beginWorld(camera);
  drawRoomTiles(renderer.ctx);
  // Draw entities sorted by y for a pseudo-3D feel
  const sorted = [...world.entities].sort((a, b) => (a.y + (a.h || 0)) - (b.y + (b.h || 0)));
  for (const e of sorted) {
    if (e === world.player) continue;
    if (e.render) e.render(renderer.ctx, camera);
  }
  // Player last so it renders on top of most things
  if (world.player.render) world.player.render(renderer.ctx, camera);
  renderer.endWorld();

  // UI pass (HUD, dialog, pause overlay)
  ui.draw(renderer.ctx, world);
}

// ---------------------------------------------------------------------------
// Game loop
// ---------------------------------------------------------------------------
let _firstGesture = false;
let _prevMode = state.mode;

function update(dt) {
  // Resume audio on first input.
  const anyInput = input.state.up || input.state.down || input.state.left || input.state.right
                || input.state.attackPressed || input.state.usePressed || input.state.startPressed;
  if (!_firstGesture && anyInput) {
    _firstGesture = true;
    audio.resume();
  }

  // Mute toggle bridge
  if (input.state.mutePressed) events.emit('mute_toggle');

  // Title → playing transition: when ui flips state.mode, enterRoom + grant starting hearts
  if (_prevMode === 'title' && state.mode === 'playing') {
    world.enterRoom(state.currentRoomId || 'ov_2_2');
  }
  _prevMode = state.mode;

  // UI update (handles title/paused/dialog/gameover/victory input)
  ui.update(dt, input.state, world);

  // While playing, run world + camera
  if (state.mode === 'playing') {
    world.update(dt);
    checkEdgeTransition();
    camera.follow(world.player, { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H });
  }

  input.endFrame();
}

startLoop({ update, render });

// Expose a few things for debugging.
window.__zelda = { state, world, events, input, audio };
