// overworld.js — 4x4 grid of overworld rooms.
// Room ids: ov_r_c  r=row(0=north), c=col(0=west)

import { T, ROOM_W, ROOM_H } from '../contracts.js';
import { TEXT_SIGN_START } from './items.js';

// ---- tile map authoring helper ----
// legend: single char -> tile id
// rows: array of 11 strings each exactly 16 chars
function makeTiles(rows, legend) {
  const tiles = new Uint8Array(ROOM_W * ROOM_H);
  for (let r = 0; r < ROOM_H; r++) {
    const row = rows[r] || '';
    for (let c = 0; c < ROOM_W; c++) {
      const ch = row[c] || '.';
      tiles[r * ROOM_W + c] = legend[ch] !== undefined ? legend[ch] : T.GRASS;
    }
  }
  return tiles;
}

const L = {
  '.': T.GRASS,
  'T': T.TREE,
  'R': T.ROCK,
  '~': T.WATER,
  'm': T.MOUNTAIN,
  'p': T.PATH,
  '*': T.BUSH,
  'f': T.FLOWER,
  'S': T.SIGN,
  'C': T.CAVE,
  'b': T.BRIDGE,
  'D': T.STAIRS,
  'X': T.FLOWER,
};

// ---- room layout helpers ----
// Opening in tree border: N=top row, S=bottom row, E=right col, W=left col
// Opening is 3 tiles centered at mid (col 7,8,9 for W/E openings or col 7,8 for N/S)
// For rows: opening at col 6,7,8 on N/S edge; for cols: row 4,5,6 on E/W edge

// ov_0_0 — NW corner, only S and E neighbors
// Borders: N closed (TTTTTTTTTTTTTTTT), W closed, S open (path at col7-9), E open (path at row4-6)
// Content: mountains in NW, some trees, rocks
const ov_0_0_tiles = makeTiles([
  'TTTTTTTTTTTTTTTT',
  'TmmmmTT..*.T...T',
  'TmmmmmT.....R..T',
  'TmmmmT..f.......',
  'T...............',
  'T.....R.*.....f.',
  'T...f.....R.....',
  'T...........*...',
  'TT........f.....',
  'TT.....R........',
  'TTTTTTT...TTTTTT',
], L);

// ov_0_1 — N=closed, W has ov_0_0, E has ov_0_2, S has ov_1_1
// Dungeon entrance D at approx center
const ov_0_1_tiles = makeTiles([
  'TTTTTTTTTTTTTTTT',
  'T.....*.....*.fT',
  'T..R.....D.....T',
  'T.....f.........',
  '................',
  '.....f...R......',
  '...*.....f......',
  '.....R..........',
  'TT....f.........',
  'TT.*............',
  'TTTTTTT...TTTTTT',
], L);

// ov_0_2 — N=closed, W has ov_0_1, E has ov_0_3, S has ov_1_2
const ov_0_2_tiles = makeTiles([
  'TTTTTTTTTTTTTTTT',
  'TmmmmmmTTT.*...T',
  'Tmmmmmm........T',
  'Tmmmmmm....R....',
  '...m..........f.',
  '....f....R......',
  '...........*....',
  '.....f..........',
  'TT..............',
  'TT.....*.....f..',
  'TTTTTTT...TTTTTT',
], L);

// ov_0_3 — NE corner, N=closed, E=closed, W has ov_0_2, S has ov_1_3
const ov_0_3_tiles = makeTiles([
  'TTTTTTTTTTTTTTTT',
  'TmmmmmmmmmmmmmmmT'.substring(0,16),
  'Tmmmmmmmmmmmmm.T',
  'Tmmmmmmmm......T',
  'Tmmmmm.........T',
  'T....f....R....T',
  'T.....*.....f..T',
  'T....R.........T',
  'TT.............T',
  'TT....f........T',
  'TTTTTTT...TTTTT',
], L);

// ov_1_0 — W=closed, N has ov_0_0, S has ov_2_0, E has ov_1_1
const ov_1_0_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  'T...............',
  'T....R...f......',
  'T...............',
  'T....*..........',
  'T..f......R.....',
  'T...............',
  'T.....f.....*...',
  'TT..R...........',
  'TT..............',
  'TTTTTTT...TTTTTT',
], L);

// ov_1_1 — N has ov_0_1, S has ov_2_1, W has ov_1_0, E has ov_1_2
const ov_1_1_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  '................',
  '....R....f......',
  '....f...........',
  '................',
  '........*.....f.',
  '...R............',
  '....f...........',
  '................',
  '.....*..........',
  'TTTTTTT...TTTTTT',
], L);

// ov_1_2 — N has ov_0_2, S has ov_2_2, W has ov_1_1, E has ov_1_3
// Has a pond (water) with a bridge
const ov_1_2_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  '..f.............',
  '...~~~.......R..',
  '..b~~~b......f..',
  '...~~~..........',
  '....f....R......',
  '..*.............',
  '......f.........',
  '................',
  '.....*..........',
  'TTTTTTT...TTTTTT',
], L);

// ov_1_3 — N has ov_0_3, S has ov_2_3, W has ov_1_2, E=closed
const ov_1_3_tiles = makeTiles([
  'TTTTTTT...TTTTT',
  '..............T',
  '....R.........T',
  '..f...........T',
  '..............T',
  '........*.....T',
  '....f.........T',
  '..R...........T',
  '..............T',
  '....f.........T',
  'TTTTTTT...TTTTTT'.substring(0,16),
], L);

// ov_2_0 — W=closed, N has ov_1_0, S has ov_3_0, E has ov_2_1
// Path going east from left side
const ov_2_0_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  'T...............',
  'T..R.f..........',
  'T...............',
  'T..*............',
  'Tppppppppp......',
  'T...............',
  'T.....R.........',
  'TT.f............',
  'TT..........*...',
  'TTTTTTT...TTTTTT',
], L);

// ov_2_1 — N has ov_1_1, S has ov_3_1, W has ov_2_0, E has ov_2_2
// Path connecting west to east
const ov_2_1_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  '................',
  '....R...........',
  '....f...........',
  '................',
  'pppppppppppppppp',
  '..f.............',
  '.....R..........',
  '..........f.....',
  '...*..........*.',
  'TTTTTTT...TTTTTT',
], L);

// ov_2_2 — START ROOM — N has ov_1_2, S has ov_3_2, W has ov_2_1, E has ov_2_3
// Cave entrance C, sign S, no enemies
const ov_2_2_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  '................',
  '....f...........',
  '................',
  '..*.....S.......',
  'ppppppppp.......',
  '..f.............',
  '..C.............',
  '................',
  '....f...........',
  'TTTTTTT...TTTTTT',
], L);

// ov_2_3 — N has ov_1_3, S has ov_3_3, W has ov_2_2, E=closed
const ov_2_3_tiles = makeTiles([
  'TTTTTTT...TTTTT',
  '..............T',
  '....R.........T',
  '..f...........',
  '..*..........',
  'pppppppppp....',
  '..f...........',
  '..R...........',
  '..............',
  '....f.........',
  'TTTTTTT...TTTTTT'.substring(0,16),
], L);

// ov_3_0 — SW corner, W=closed, S=closed, N has ov_2_0, E has ov_3_1
const ov_3_0_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  'T...............',
  'T....R..........',
  'T..f............',
  'T...............',
  'Tppppppppp......',
  'T..f..........R.',
  'T....*..........',
  'TT..............',
  'TT....f.........',
  'TTTTTTTTTTTTTTTT',
], L);

// ov_3_1 — S=closed, N has ov_2_1, W has ov_3_0, E has ov_3_2
const ov_3_1_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  '................',
  '....R...........',
  '..f.............',
  '...*............',
  'pppppppppppppppp',
  '..f.............',
  '......R.........',
  '..........f.....',
  '...*..........*.',
  'TTTTTTTTTTTTTTTT',
], L);

// ov_3_2 — S=closed, N has ov_2_2, W has ov_3_1, E has ov_3_3
const ov_3_2_tiles = makeTiles([
  'TTTTTTT...TTTTTT',
  '................',
  '....f...........',
  '.....*..........',
  '..R.............',
  'pppppppppppppppp',
  '..f.............',
  '..........R.....',
  '..*.............',
  '....f...........',
  'TTTTTTTTTTTTTTTT',
], L);

// ov_3_3 — SE corner, S=closed, E=closed, N has ov_2_3, W has ov_3_2
const ov_3_3_tiles = makeTiles([
  'TTTTTTT...TTTTT',
  '..............T',
  '....R.........T',
  '....f.........T',
  '..*..........*T',
  'pppppppppp....T',
  '..f...........T',
  '......R.......T',
  '..............T',
  '....f.........T',
  'TTTTTTTTTTTTTTT'.substring(0,16),
], L);

// ---- assemble rooms ----

function makeRoom(id, kind, tiles, neighbors, warps, spawns, music) {
  return { id, kind, tiles, ...neighbors, warps: warps || [], spawns: spawns || [], music };
}

const OV = 'overworld';

// Neighbors: { north, south, east, west } — undefined at grid edges
// Grid layout:
//   row0: ov_0_0 ov_0_1 ov_0_2 ov_0_3
//   row1: ov_1_0 ov_1_1 ov_1_2 ov_1_3
//   row2: ov_2_0 ov_2_1 ov_2_2 ov_2_3
//   row3: ov_3_0 ov_3_1 ov_3_2 ov_3_3

export const overworld = [
  // row 0
  makeRoom('ov_0_0', OV, ov_0_0_tiles,
    { south: 'ov_1_0', east: 'ov_0_1' },
    [],
    [
      { x: 6*16, y: 3*16, kind: 'octorok' },
      { x: 10*16, y: 7*16, kind: 'keese' },
    ], 'overworld'),

  makeRoom('ov_0_1', OV, ov_0_1_tiles,
    { south: 'ov_1_1', west: 'ov_0_0', east: 'ov_0_2' },
    [{ x: 10, y: 2, toRoom: 'd1_entry', toX: 8, toY: 9 }],
    [
      { x: 4*16, y: 4*16, kind: 'octorok' },
      { x: 11*16, y: 6*16, kind: 'moblin' },
    ], 'overworld'),

  makeRoom('ov_0_2', OV, ov_0_2_tiles,
    { south: 'ov_1_2', west: 'ov_0_1', east: 'ov_0_3' },
    [],
    [
      { x: 8*16, y: 5*16, kind: 'keese' },
      { x: 11*16, y: 3*16, kind: 'octorok' },
    ], 'overworld'),

  makeRoom('ov_0_3', OV, ov_0_3_tiles,
    { south: 'ov_1_3', west: 'ov_0_2' },
    [],
    [
      { x: 12*16, y: 7*16, kind: 'moblin' },
      { x: 8*16, y: 5*16, kind: 'keese' },
      { x: 10*16, y: 3*16, kind: 'octorok' },
    ], 'overworld'),

  // row 1
  makeRoom('ov_1_0', OV, ov_1_0_tiles,
    { north: 'ov_0_0', south: 'ov_2_0', east: 'ov_1_1' },
    [],
    [
      { x: 5*16, y: 4*16, kind: 'octorok' },
      { x: 9*16, y: 7*16, kind: 'moblin' },
    ], 'overworld'),

  makeRoom('ov_1_1', OV, ov_1_1_tiles,
    { north: 'ov_0_1', south: 'ov_2_1', west: 'ov_1_0', east: 'ov_1_2' },
    [],
    [
      { x: 6*16, y: 3*16, kind: 'keese' },
      { x: 10*16, y: 7*16, kind: 'octorok' },
    ], 'overworld'),

  makeRoom('ov_1_2', OV, ov_1_2_tiles,
    { north: 'ov_0_2', south: 'ov_2_2', west: 'ov_1_1', east: 'ov_1_3' },
    [],
    [
      { x: 5*16, y: 6*16, kind: 'moblin' },
      { x: 12*16, y: 4*16, kind: 'keese' },
    ], 'overworld'),

  makeRoom('ov_1_3', OV, ov_1_3_tiles,
    { north: 'ov_0_3', south: 'ov_2_3', west: 'ov_1_2' },
    [],
    [
      { x: 5*16, y: 4*16, kind: 'octorok' },
      { x: 9*16, y: 7*16, kind: 'moblin' },
      { x: 11*16, y: 2*16, kind: 'keese' },
    ], 'overworld'),

  // row 2
  makeRoom('ov_2_0', OV, ov_2_0_tiles,
    { north: 'ov_1_0', south: 'ov_3_0', east: 'ov_2_1' },
    [],
    [
      { x: 6*16, y: 3*16, kind: 'octorok' },
      { x: 11*16, y: 7*16, kind: 'keese' },
    ], 'overworld'),

  makeRoom('ov_2_1', OV, ov_2_1_tiles,
    { north: 'ov_1_1', south: 'ov_3_1', west: 'ov_2_0', east: 'ov_2_2' },
    [],
    [
      { x: 5*16, y: 3*16, kind: 'moblin' },
      { x: 10*16, y: 7*16, kind: 'octorok' },
    ], 'overworld'),

  // START ROOM — no enemies, has sign and cave
  makeRoom('ov_2_2', OV, ov_2_2_tiles,
    { north: 'ov_1_2', south: 'ov_3_2', west: 'ov_2_1', east: 'ov_2_3' },
    [{ x: 2, y: 7, toRoom: 'cave_oldman', toX: 7*16, toY: 8*16 }],
    [
      { x: 8*16, y: 4*16, kind: 'sign', opts: { text: TEXT_SIGN_START } },
    ], 'overworld'),

  makeRoom('ov_2_3', OV, ov_2_3_tiles,
    { north: 'ov_1_3', south: 'ov_3_3', west: 'ov_2_2' },
    [],
    [
      { x: 5*16, y: 4*16, kind: 'keese' },
      { x: 9*16, y: 7*16, kind: 'moblin' },
    ], 'overworld'),

  // row 3
  makeRoom('ov_3_0', OV, ov_3_0_tiles,
    { north: 'ov_2_0', east: 'ov_3_1' },
    [],
    [
      { x: 6*16, y: 3*16, kind: 'octorok' },
      { x: 11*16, y: 7*16, kind: 'keese' },
    ], 'overworld'),

  makeRoom('ov_3_1', OV, ov_3_1_tiles,
    { north: 'ov_2_1', west: 'ov_3_0', east: 'ov_3_2' },
    [],
    [
      { x: 5*16, y: 3*16, kind: 'moblin' },
      { x: 10*16, y: 7*16, kind: 'octorok' },
      { x: 12*16, y: 6*16, kind: 'keese' },
    ], 'overworld'),

  makeRoom('ov_3_2', OV, ov_3_2_tiles,
    { north: 'ov_2_2', west: 'ov_3_1', east: 'ov_3_3' },
    [],
    [
      { x: 6*16, y: 3*16, kind: 'octorok' },
      { x: 10*16, y: 7*16, kind: 'keese' },
    ], 'overworld'),

  makeRoom('ov_3_3', OV, ov_3_3_tiles,
    { north: 'ov_2_3', west: 'ov_3_2' },
    [],
    [
      { x: 5*16, y: 3*16, kind: 'octorok' },
      { x: 9*16, y: 6*16, kind: 'moblin' },
    ], 'overworld'),
];
