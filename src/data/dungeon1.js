// dungeon1.js — Dungeon 1 rooms + cave_oldman room.
// Layout (N=up):
//
//         [d1_keyroom]
//              |
//  [d1_combat1]-[d1_h1]-[d1_entry]
//              |
//         [d1_h2]
//              |
//  [d1_combat2]-[d1_prehall]
//              |
//         [d1_boss]
//              |
//         [d1_treasure]

import { T, ROOM_W, ROOM_H } from '../contracts.js';
import { TEXT_OLDMAN_DIALOG } from './items.js';

function makeTiles(rows, legend) {
  const tiles = new Uint8Array(ROOM_W * ROOM_H);
  for (let r = 0; r < ROOM_H; r++) {
    const row = rows[r] || '';
    for (let c = 0; c < ROOM_W; c++) {
      const ch = row[c] || 'B';
      tiles[r * ROOM_W + c] = legend[ch] !== undefined ? legend[ch] : T.BRICK;
    }
  }
  return tiles;
}

const L = {
  'B': T.BRICK,
  '.': T.FLOOR,
  'D': T.DOOR_N,   // overridden per-context by helper
  'N': T.DOOR_N,
  'S': T.DOOR_S,
  'E': T.DOOR_E,
  'W': T.DOOR_W,
  'n': T.DOOR_LOCKED_N,
  's': T.DOOR_LOCKED_S,
  'e': T.DOOR_LOCKED_E,
  'w': T.DOOR_LOCKED_W,
  'X': T.STAIRS,
  'U': T.STATUE,
};

// Standard dungeon room: BRICK border, FLOOR inside, doors at wall centers
// Wall structure: col 0 and 15 = BRICK, row 0 and 10 = BRICK
// Door positions: N=row0 col7,8 | S=row10 col7,8 | E=row5 col15 | W=row5 col0

// d1_entry — south door leads back to overworld (warp tile), east corridor
const d1_entry_tiles = makeTiles([
  'BBBBBBBNNBBBBBBB',
  'B..............B',
  'B..U.......U..B',
  'B..............B',
  'B..............B',
  'W..............E',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBSSBBBBBBB',
], L);

// Mark entry stair at row9, col8
d1_entry_tiles[9 * ROOM_W + 8] = T.STAIRS;

// d1_h1 — horizontal corridor connecting entry(west) to combat1(east), key room north, h2 south
const d1_h1_tiles = makeTiles([
  'BBBBBBBNNBBBBBBB',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'W..............E',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBSSBBBBBBB',
], L);

// d1_h2 — corridor south from h1 to prehall; combat2 exits into west
const d1_h2_tiles = makeTiles([
  'BBBBBBBNNBBBBBBB',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'W..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBSSBBBBBBB',
], L);

// d1_keyroom — north of h1, has chest with key
const d1_keyroom_tiles = makeTiles([
  'BBBBBBBBBBBBBBBB',
  'B..............B',
  'B..U.......U..B',
  'B..............B',
  'B..............B',
  'B......C.......B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBSSBBBBBBB',
], { ...L, 'C': T.FLOOR });
// chest spawn is handled in spawns array, tile is floor

// d1_combat1 — east of h1, enemies room (dead end, west door only)
const d1_combat1_tiles = makeTiles([
  'BBBBBBBBBBBBBBBB',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'W..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBBBBBBBBBB',
], L);

// d1_combat2 — west of h2, enemies room (dead end, east door only)
const d1_combat2_tiles = makeTiles([
  'BBBBBBBBBBBBBBBB',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............E',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBBBBBBBBBB',
], L);

// d1_prehall — locked door north to boss, south to h2
const d1_prehall_tiles = makeTiles([
  'BBBBBBBnnBBBBBBB',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBSSBBBBBBB',
], L);

// d1_boss — BOSS room, entered from south (prehall), north leads to treasure
const d1_boss_tiles = makeTiles([
  'BBBBBBBNNBBBBBBB',
  'B..............B',
  'B..U.......U..B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..U.......U..B',
  'B..............B',
  'B..............B',
  'BBBBBBBSSBBBBBBB',
], L);

// d1_treasure — post-boss, triforce pickup, no exits except south
const d1_treasure_tiles = makeTiles([
  'BBBBBBBBBBBBBBBB',
  'B..............B',
  'B..U.......U..B',
  'B..............B',
  'B..............B',
  'B......T.......B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'BBBBBBBSSBBBBBBB',
], { ...L, 'T': T.FLOOR });
// triforce spawn is in spawns array

// cave_oldman — small cave room, single NPC
const cave_oldman_tiles = makeTiles([
  'BBBBBBBBBBBBBBBB',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B..............B',
  'B......X.......B',
  'B..............B',
  'B..............B',
  'BBBBBBBBBBBBBBBB',
], L);

function makeRoom(id, kind, tiles, neighbors, warps, spawns, music, dark) {
  const room = { id, kind, tiles, ...neighbors, warps: warps || [], spawns: spawns || [], music };
  if (dark) room.dark = true;
  return room;
}

const DNG = 'dungeon';

export const dungeon1 = [
  makeRoom('d1_entry', DNG, d1_entry_tiles,
    { east: 'd1_h1' },
    [{ x: 8, y: 9, toRoom: 'ov_0_1', toX: 10*16, toY: 2*16 }],
    [
      { x: 4*16, y: 5*16, kind: 'stalfos' },
      { x: 11*16, y: 5*16, kind: 'keese' },
    ], DNG),

  makeRoom('d1_h1', DNG, d1_h1_tiles,
    { north: 'd1_keyroom', south: 'd1_h2', west: 'd1_entry', east: 'd1_combat1' },
    [],
    [
      { x: 6*16, y: 5*16, kind: 'stalfos' },
      { x: 9*16, y: 5*16, kind: 'keese' },
    ], DNG),

  makeRoom('d1_keyroom', DNG, d1_keyroom_tiles,
    { south: 'd1_h1' },
    [],
    [
      { x: 7*16, y: 5*16, kind: 'chest', opts: { contains: 'key' } },
      { x: 4*16, y: 4*16, kind: 'keese' },
      { x: 11*16, y: 4*16, kind: 'keese' },
    ], DNG, true),

  makeRoom('d1_combat1', DNG, d1_combat1_tiles,
    { west: 'd1_h1' },
    [],
    [
      { x: 5*16, y: 3*16, kind: 'stalfos' },
      { x: 9*16, y: 6*16, kind: 'stalfos' },
      { x: 12*16, y: 3*16, kind: 'keese' },
    ], DNG),

  makeRoom('d1_h2', DNG, d1_h2_tiles,
    { north: 'd1_h1', south: 'd1_prehall', west: 'd1_combat2' },
    [],
    [
      { x: 7*16, y: 5*16, kind: 'keese' },
      { x: 9*16, y: 5*16, kind: 'stalfos' },
    ], DNG),

  makeRoom('d1_combat2', DNG, d1_combat2_tiles,
    { east: 'd1_h2' },
    [],
    [
      { x: 5*16, y: 3*16, kind: 'stalfos' },
      { x: 9*16, y: 6*16, kind: 'stalfos' },
      { x: 12*16, y: 4*16, kind: 'keese' },
      { x: 4*16, y: 7*16, kind: 'keese' },
    ], DNG),

  makeRoom('d1_prehall', DNG, d1_prehall_tiles,
    { north: 'd1_boss', south: 'd1_h2' },
    [],
    [
      { x: 8*16, y: 0, kind: 'boss_door', opts: { requiredKey: true } },
      { x: 5*16, y: 5*16, kind: 'stalfos' },
      { x: 10*16, y: 5*16, kind: 'keese' },
    ], DNG),

  makeRoom('d1_boss', DNG, d1_boss_tiles,
    { north: 'd1_treasure', south: 'd1_prehall' },
    [],
    [
      { x: 7*16, y: 4*16, kind: 'boss_aquamentus', opts: {} },
    ], 'boss'),

  makeRoom('d1_treasure', DNG, d1_treasure_tiles,
    { south: 'd1_boss' },
    [],
    [
      { x: 7*16, y: 5*16, kind: 'triforce', opts: {} },
    ], DNG),
];

export const caveRooms = [
  makeRoom('cave_oldman', DNG, cave_oldman_tiles,
    {},
    [{ x: 7, y: 9, toRoom: 'ov_2_2', toX: 2*16, toY: 8*16 }],
    [
      { x: 7*16, y: 4*16, kind: 'npc_oldman', opts: { dialog: TEXT_OLDMAN_DIALOG, gives: 'sword' } },
    ], DNG),
];
