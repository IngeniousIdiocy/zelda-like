// contracts.js — the API surface every subsystem agrees on.
// This file intentionally has no runtime code beyond constants and JSDoc types,
// so every module can depend on it without creating cycles.

// ============================================================================
// WORLD GEOMETRY
// ============================================================================
export const TILE = 16;             // pixel size of one tile
export const ROOM_W = 16;           // tiles per room horizontally
export const ROOM_H = 11;           // tiles per room vertically (top bar for HUD)
export const SCREEN_W = ROOM_W * TILE; // 256
export const SCREEN_H = ROOM_H * TILE; // 176
export const HUD_H = 48;            // pixels reserved at the top of the canvas
export const VIEW_SCALE = 2;        // canvas is rendered at 2x
export const CANVAS_W = SCREEN_W * VIEW_SCALE; // 512
export const CANVAS_H = (SCREEN_H + HUD_H) * VIEW_SCALE; // 448

// ============================================================================
// TILE TYPES — the numeric ids stored in room maps
// ============================================================================
export const T = Object.freeze({
  GRASS: 0,
  SAND: 1,
  TREE: 2,          // solid
  ROCK: 3,          // solid, liftable with power bracelet (future)
  WATER: 4,         // solid unless swimming
  PATH: 5,
  BRICK: 6,         // solid (dungeon wall)
  FLOOR: 7,         // dungeon floor
  DOOR_N: 8,        // open door edges
  DOOR_S: 9,
  DOOR_E: 10,
  DOOR_W: 11,
  DOOR_LOCKED_N: 12,
  DOOR_LOCKED_S: 13,
  DOOR_LOCKED_E: 14,
  DOOR_LOCKED_W: 15,
  STAIRS: 16,       // warps between overworld and dungeon
  BUSH: 17,         // solid, cuttable with sword
  FLOWER: 18,       // decoration
  SIGN: 19,         // readable
  CAVE: 20,         // overworld entrance (warps)
  MOUNTAIN: 21,     // solid
  BRIDGE: 22,
  STATUE: 23,       // solid dungeon decoration
});

// returns true if tile blocks normal walking movement
export function isSolidTile(tileId) {
  switch (tileId) {
    case T.TREE: case T.ROCK: case T.WATER: case T.BRICK:
    case T.BUSH: case T.SIGN: case T.MOUNTAIN: case T.STATUE:
    case T.DOOR_LOCKED_N: case T.DOOR_LOCKED_S:
    case T.DOOR_LOCKED_E: case T.DOOR_LOCKED_W:
      return true;
    default:
      return false;
  }
}

// ============================================================================
// DIRECTIONS
// ============================================================================
export const DIR = Object.freeze({ UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 });
export const DIR_VEC = Object.freeze({
  0: { x: 0, y: -1 }, 1: { x: 0, y: 1 },
  2: { x: -1, y: 0 }, 3: { x: 1, y: 0 },
});

// ============================================================================
// ITEMS / INVENTORY
// ============================================================================
export const ITEM = Object.freeze({
  NONE: 'none',
  BOMB: 'bomb',
  BOW: 'bow',
  BOOMERANG: 'boomerang',
  CANDLE: 'candle',
  POTION: 'potion',
});

// ============================================================================
// GAME EVENTS (lightweight pub/sub used across systems)
// ============================================================================
export const EVT = Object.freeze({
  ENEMY_KILLED: 'enemy_killed',
  ITEM_PICKED: 'item_picked',
  ROOM_CHANGED: 'room_changed',
  PLAYER_HURT: 'player_hurt',
  PLAYER_DIED: 'player_died',
  BOSS_DEFEATED: 'boss_defeated',
  DIALOG_OPEN: 'dialog_open',
  DIALOG_CLOSE: 'dialog_close',
  SFX: 'sfx',
});

// ============================================================================
// TYPEDEFS (JSDoc) — every implementation conforms to these shapes.
// ============================================================================
/**
 * @typedef {Object} InputState
 * @property {boolean} up
 * @property {boolean} down
 * @property {boolean} left
 * @property {boolean} right
 * @property {boolean} attack   Z/J — primary (sword)
 * @property {boolean} use      X/K — use selected item
 * @property {boolean} cycle    C/L — cycle selected item (edge-triggered in Input)
 * @property {boolean} start    Enter — pause/menu
 * @property {boolean} mute     M — toggle audio
 *
 * Edge-triggered flags: turn true for exactly one frame on press.
 * @property {boolean} attackPressed
 * @property {boolean} usePressed
 * @property {boolean} cyclePressed
 * @property {boolean} startPressed
 */

/**
 * @typedef {Object} Entity
 * Every entity-like object in the world (player, enemies, projectiles, drops).
 * @property {string} id
 * @property {string} kind        e.g. 'player', 'octorok', 'rupee', 'arrow'
 * @property {number} x           world pixel x (top-left of hitbox)
 * @property {number} y           world pixel y
 * @property {number} w           hitbox width in pixels
 * @property {number} h           hitbox height in pixels
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} dir         DIR constant
 * @property {boolean} dead
 * @property {boolean} solid      blocks other entities' movement if true
 * @property {number=} invulnTimer seconds remaining of invuln frames
 * @property {(dt:number, world:World)=>void} update
 * @property {(ctx:CanvasRenderingContext2D, cam:{x:number,y:number})=>void} render
 * @property {(dmg:number, from:Entity, knockDir?:number)=>void=} takeDamage
 */

/**
 * @typedef {Object} Room
 * @property {string} id              unique key, e.g. 'ov_3_4' or 'd1_entry'
 * @property {'overworld'|'dungeon'} kind
 * @property {Uint8Array} tiles       length ROOM_W*ROOM_H, values from T
 * @property {string=} north          neighbor room id
 * @property {string=} south
 * @property {string=} east
 * @property {string=} west
 * @property {Array<{x:number,y:number,toRoom:string,toX:number,toY:number}>=} warps
 * @property {Array<{x:number,y:number,kind:string,opts?:object}>=} spawns
 *           spawn.kind = 'octorok'|'moblin'|'keese'|'zora'|'stalfos'|'boss_aquamentus'|'npc_oldman'|'chest'|'heart'|'rupee'|'key'|'sign'|'boss_door'
 * @property {string=} music          music key, e.g. 'overworld'|'dungeon'|'boss'
 * @property {boolean=} dark          lit only by candle radius
 */

/**
 * @typedef {Object} World
 * @property {Room} room                  current room
 * @property {Map<string,Room>} rooms     all rooms by id
 * @property {Entity[]} entities          entities in the current room
 * @property {Entity} player
 * @property {GameState} state
 * @property {EventBus} events
 * @property {(dt:number)=>void} update
 * @property {(newRoomId:string, entryEdge?:'n'|'s'|'e'|'w')=>void} enterRoom
 * @property {(e:Entity)=>void} spawn
 * @property {(x:number,y:number)=>number} tileAt       pixel coords → tile id
 * @property {(x:number,y:number,w:number,h:number, ignore?:Entity)=>boolean} rectSolid
 *           rectangle intersects a solid tile or a solid entity
 */

/**
 * @typedef {Object} GameState
 * @property {number} hearts           current hp in quarter-hearts (1 heart = 4)
 * @property {number} maxHearts        current max hp in quarter-hearts
 * @property {number} rupees
 * @property {number} keys
 * @property {number} bombs
 * @property {number} arrows
 * @property {number} maxBombs
 * @property {number} maxArrows
 * @property {boolean} hasSword
 * @property {boolean} hasBow
 * @property {boolean} hasBoomerang
 * @property {boolean} hasCandle
 * @property {boolean} hasRaft
 * @property {string} selectedItem     ITEM.*
 * @property {Set<string>} flags       arbitrary flags ('d1_boss_dead', 'chest_ov_3_4_opened'...)
 * @property {string} currentRoomId
 * @property {number} deaths
 * @property {'title'|'playing'|'paused'|'dialog'|'gameover'|'victory'} mode
 */

/**
 * @typedef {Object} EventBus
 * @property {(type:string, cb:(payload:any)=>void)=>()=>void} on   returns unsubscribe
 * @property {(type:string, payload?:any)=>void} emit
 */

// Utility: clamp
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Utility: AABB overlap
export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Utility: tile coord helpers
export const px2tile = (p) => Math.floor(p / TILE);
export const tile2px = (t) => t * TILE;
