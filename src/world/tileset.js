// tileset.js — procedural tile renderer, NES-Zelda palette.

import { T, TILE } from '../contracts.js';

// NES-ish palette helpers
const C = {
  grassDark:   '#1a7a1a',
  grassMid:    '#2a9a2a',
  grassLight:  '#3acc3a',
  sandLight:   '#e8d090',
  sandMid:     '#d4b870',
  sandDark:    '#b89850',
  treeBody:    '#1a5c1a',
  treeDark:    '#0d3d0d',
  treeTrunk:   '#7a4a1a',
  rockGray:    '#888888',
  rockLight:   '#bbbbbb',
  rockShadow:  '#444444',
  waterDeep:   '#1a4acc',
  waterShallow:'#3a70ee',
  waterFoam:   '#88aaff',
  brickWall:   '#3a2a1a',
  brickLine:   '#5a4a3a',
  brickMortar: '#2a1a0a',
  floorWarm:   '#c8a870',
  floorLight:  '#e0c090',
  floorLine:   '#a88050',
  doorGold:    '#d4a820',
  doorGoldDark:'#a07810',
  doorArch:    '#c08830',
  lockBody:    '#666666',
  stairsGray:  '#808080',
  stairsLight: '#b0b0b0',
  bushGreen:   '#2a8a2a',
  bushDark:    '#1a5a1a',
  bridgeBrown: '#8a5a2a',
  bridgeDark:  '#6a4020',
  caveBlack:   '#000000',
  caveDark:    '#222222',
  caveRock:    '#555555',
  mountGray:   '#777777',
  mountLight:  '#aaaaaa',
  mountSnow:   '#eeeeee',
  statueGray:  '#555566',
  statueDark:  '#333344',
  statueLine:  '#7777aa',
  pathTan:     '#c4a060',
  pathDark:    '#a07840',
  flowerPetal: '#ffdd44',
  flowerCenter:'#ff8800',
  flowerLeaf:  '#2a8a2a',
  signWood:    '#c48040',
  signDark:    '#8a5020',
  signPost:    '#7a4010',
};

function fillRect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawGrass(ctx, x, y) {
  fillRect(ctx, C.grassMid, x, y, TILE, TILE);
  // a few darker tuft marks
  ctx.fillStyle = C.grassDark;
  ctx.fillRect(x+2,  y+3,  1, 2);
  ctx.fillRect(x+6,  y+8,  1, 2);
  ctx.fillRect(x+10, y+4,  1, 2);
  ctx.fillRect(x+13, y+9,  1, 2);
  ctx.fillRect(x+4,  y+12, 1, 2);
  ctx.fillStyle = C.grassLight;
  ctx.fillRect(x+1,  y+1,  1, 1);
  ctx.fillRect(x+8,  y+6,  1, 1);
  ctx.fillRect(x+12, y+11, 1, 1);
}

function drawSand(ctx, x, y) {
  fillRect(ctx, C.sandMid, x, y, TILE, TILE);
  ctx.fillStyle = C.sandLight;
  for (let i = 0; i < 6; i++) {
    const sx = x + (i * 5 + 2) % TILE;
    const sy = y + (i * 7 + 1) % TILE;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.fillStyle = C.sandDark;
  ctx.fillRect(x+3, y+6, 1, 1);
  ctx.fillRect(x+9, y+11, 1, 1);
  ctx.fillRect(x+12, y+4, 1, 1);
}

function drawTree(ctx, x, y) {
  fillRect(ctx, C.treeBody, x, y, TILE, TILE);
  // darker inner
  fillRect(ctx, C.treeDark, x+1, y+1, TILE-2, TILE-2);
  // leaf pattern: lighter top half
  ctx.fillStyle = C.treeBody;
  ctx.fillRect(x+2, y+1, 12, 7);
  ctx.fillRect(x+4, y+0, 8, 3);
  // trunk at bottom
  ctx.fillStyle = C.treeTrunk;
  ctx.fillRect(x+6, y+10, 4, 4);
  // highlight leaf tips
  ctx.fillStyle = C.grassLight;
  ctx.fillRect(x+4, y+1, 2, 1);
  ctx.fillRect(x+10, y+1, 2, 1);
  ctx.fillRect(x+7, y+0, 2, 1);
}

function drawRock(ctx, x, y) {
  fillRect(ctx, C.rockShadow, x, y, TILE, TILE);
  fillRect(ctx, C.rockGray, x+1, y+1, 13, 12);
  // highlights
  ctx.fillStyle = C.rockLight;
  ctx.fillRect(x+2, y+2, 4, 2);
  ctx.fillRect(x+2, y+2, 2, 5);
  // inner shadow
  ctx.fillStyle = C.rockShadow;
  ctx.fillRect(x+10, y+9, 3, 3);
}

function drawWater(ctx, x, y, frame) {
  const f = frame || 0;
  fillRect(ctx, C.waterDeep, x, y, TILE, TILE);
  // alternating wavy rows animated by frame
  for (let row = 0; row < TILE; row += 4) {
    const offset = ((row / 4) + f) % 2 === 0 ? 0 : 2;
    ctx.fillStyle = C.waterShallow;
    for (let col = offset; col < TILE; col += 4) {
      ctx.fillRect(x+col, y+row+1, 2, 1);
    }
  }
  // foam highlights
  ctx.fillStyle = C.waterFoam;
  ctx.fillRect(x+1, y+1, 3, 1);
  ctx.fillRect(x+9, y+5, 3, 1);
  ctx.fillRect(x+3, y+9, 3, 1);
  ctx.fillRect(x+11, y+13, 3, 1);
}

function drawPath(ctx, x, y) {
  fillRect(ctx, C.pathTan, x, y, TILE, TILE);
  ctx.fillStyle = C.pathDark;
  ctx.fillRect(x, y+3, TILE, 1);
  ctx.fillRect(x, y+9, TILE, 1);
  ctx.fillRect(x+3, y, 1, TILE);
  ctx.fillRect(x+9, y, 1, TILE);
}

function drawBrick(ctx, x, y) {
  fillRect(ctx, C.brickMortar, x, y, TILE, TILE);
  ctx.fillStyle = C.brickWall;
  // Row 1
  ctx.fillRect(x+1, y+1, 6, 3);
  ctx.fillRect(x+9, y+1, 6, 3);
  // Row 2
  ctx.fillRect(x+1, y+5, 3, 3);
  ctx.fillRect(x+6, y+5, 4, 3);
  ctx.fillRect(x+12, y+5, 3, 3);
  // Row 3
  ctx.fillRect(x+1, y+9, 6, 4);
  ctx.fillRect(x+9, y+9, 6, 4);
  ctx.fillStyle = C.brickLine;
  ctx.fillRect(x+2, y+2, 4, 1);
  ctx.fillRect(x+10, y+2, 4, 1);
  ctx.fillRect(x+2, y+6, 2, 1);
  ctx.fillRect(x+7, y+6, 2, 1);
  ctx.fillRect(x+2, y+10, 4, 1);
}

function drawFloor(ctx, x, y) {
  fillRect(ctx, C.floorWarm, x, y, TILE, TILE);
  ctx.fillStyle = C.floorLight;
  ctx.fillRect(x+1, y+1, TILE-2, TILE-2);
  // cross-hatch lines
  ctx.fillStyle = C.floorLine;
  ctx.fillRect(x, y+7, TILE, 1);
  ctx.fillRect(x+7, y, 1, TILE);
  // corner insets
  ctx.fillStyle = C.floorWarm;
  ctx.fillRect(x+1, y+1, 2, 2);
  ctx.fillRect(x+13, y+1, 2, 2);
  ctx.fillRect(x+1, y+13, 2, 2);
  ctx.fillRect(x+13, y+13, 2, 2);
}

function drawDoorBase(ctx, x, y) {
  // arch-shaped door
  fillRect(ctx, C.doorArch, x, y, TILE, TILE);
  // opening
  ctx.fillStyle = C.floorWarm;
  ctx.fillRect(x+3, y+2, 10, 12);
  // arch top
  ctx.fillStyle = C.doorGold;
  ctx.fillRect(x+2, y+1, 12, 2);
  ctx.fillRect(x+1, y+2, 2, 3);
  ctx.fillRect(x+13, y+2, 2, 3);
  // keystone
  ctx.fillStyle = C.doorGoldDark;
  ctx.fillRect(x+6, y+1, 4, 1);
}

function drawDoorN(ctx, x, y)  { drawDoorBase(ctx, x, y); }
function drawDoorS(ctx, x, y)  { drawDoorBase(ctx, x, y); }
function drawDoorE(ctx, x, y)  { drawDoorBase(ctx, x, y); }
function drawDoorW(ctx, x, y)  { drawDoorBase(ctx, x, y); }

function drawLockedDoor(ctx, x, y) {
  drawDoorBase(ctx, x, y);
  // padlock motif
  ctx.fillStyle = C.lockBody;
  ctx.fillRect(x+6, y+5, 4, 4);
  ctx.fillStyle = C.rockShadow;
  ctx.fillRect(x+7, y+3, 2, 3);
  ctx.strokeStyle = C.rockShadow;
  // shackle
  ctx.fillRect(x+7, y+3, 1, 2);
  ctx.fillRect(x+8, y+3, 1, 2);
  ctx.fillRect(x+6, y+4, 4, 1);
  // keyhole
  ctx.fillStyle = C.brickMortar;
  ctx.fillRect(x+7, y+6, 2, 2);
}

function drawStairs(ctx, x, y) {
  fillRect(ctx, C.stairsGray, x, y, TILE, TILE);
  // steps
  ctx.fillStyle = C.stairsLight;
  ctx.fillRect(x+2,  y+2,  12, 2);
  ctx.fillRect(x+4,  y+5,  8, 2);
  ctx.fillRect(x+6,  y+8,  4, 2);
  ctx.fillStyle = C.rockShadow;
  ctx.fillRect(x+2,  y+4,  12, 1);
  ctx.fillRect(x+4,  y+7,  8, 1);
  ctx.fillRect(x+6,  y+10, 4, 1);
}

function drawBush(ctx, x, y) {
  fillRect(ctx, C.bushDark, x, y, TILE, TILE);
  // checkerboard pattern
  for (let row = 0; row < TILE; row += 2) {
    for (let col = (row % 4 === 0 ? 0 : 2); col < TILE; col += 4) {
      ctx.fillStyle = C.bushGreen;
      ctx.fillRect(x+col, y+row, 2, 2);
    }
  }
  // outline
  ctx.fillStyle = C.bushDark;
  ctx.fillRect(x, y, TILE, 1);
  ctx.fillRect(x, y+TILE-1, TILE, 1);
  ctx.fillRect(x, y, 1, TILE);
  ctx.fillRect(x+TILE-1, y, 1, TILE);
}

function drawFlower(ctx, x, y) {
  drawGrass(ctx, x, y);
  // flower at center
  ctx.fillStyle = C.flowerPetal;
  ctx.fillRect(x+6, y+5, 4, 1);
  ctx.fillRect(x+7, y+4, 2, 3);
  ctx.fillStyle = C.flowerCenter;
  ctx.fillRect(x+7, y+5, 2, 2);
  // second smaller flower
  ctx.fillStyle = C.flowerPetal;
  ctx.fillRect(x+11, y+10, 2, 1);
  ctx.fillRect(x+11, y+9, 1, 3);
  ctx.fillStyle = C.flowerCenter;
  ctx.fillRect(x+11, y+10, 1, 1);
}

function drawSign(ctx, x, y) {
  drawGrass(ctx, x, y);
  // post
  ctx.fillStyle = C.signPost;
  ctx.fillRect(x+7, y+8, 2, 6);
  // sign board
  ctx.fillStyle = C.signWood;
  ctx.fillRect(x+3, y+3, 10, 6);
  ctx.fillStyle = C.signDark;
  ctx.fillRect(x+3, y+3, 10, 1);
  ctx.fillRect(x+3, y+3, 1, 6);
  // text lines
  ctx.fillStyle = C.signDark;
  ctx.fillRect(x+5, y+5, 6, 1);
  ctx.fillRect(x+5, y+7, 4, 1);
}

function drawCave(ctx, x, y) {
  drawRock(ctx, x, y);
  // dark cave entrance
  ctx.fillStyle = C.caveDark;
  ctx.fillRect(x+3, y+5, 10, 8);
  ctx.fillStyle = C.caveBlack;
  ctx.fillRect(x+4, y+6, 8, 7);
  // arch
  ctx.fillStyle = C.caveRock;
  ctx.fillRect(x+3, y+4, 10, 2);
  ctx.fillRect(x+3, y+4, 2, 5);
  ctx.fillRect(x+11, y+4, 2, 5);
}

function drawMountain(ctx, x, y) {
  fillRect(ctx, C.grassMid, x, y, TILE, TILE);
  // triangle body
  ctx.fillStyle = C.mountGray;
  for (let row = 0; row < 12; row++) {
    const half = row + 2;
    const left = Math.max(0, 8 - half);
    const w = Math.min(TILE, half * 2);
    if (left + w <= TILE) ctx.fillRect(x + left, y + row + 2, w, 1);
  }
  // snow cap
  ctx.fillStyle = C.mountSnow;
  ctx.fillRect(x+7, y+2, 2, 1);
  ctx.fillRect(x+6, y+3, 4, 1);
  ctx.fillRect(x+5, y+4, 6, 1);
  // highlight
  ctx.fillStyle = C.mountLight;
  ctx.fillRect(x+5, y+5, 3, 3);
}

function drawBridge(ctx, x, y) {
  fillRect(ctx, C.waterDeep, x, y, TILE, TILE);
  // planks
  ctx.fillStyle = C.bridgeBrown;
  ctx.fillRect(x, y+3, TILE, 10);
  ctx.fillStyle = C.bridgeDark;
  ctx.fillRect(x, y+3, TILE, 1);
  ctx.fillRect(x, y+6, TILE, 1);
  ctx.fillRect(x, y+9, TILE, 1);
  ctx.fillRect(x, y+12, TILE, 1);
  // rail
  ctx.fillStyle = C.bridgeDark;
  ctx.fillRect(x, y+2, TILE, 1);
  ctx.fillRect(x, y+13, TILE, 1);
}

function drawStatue(ctx, x, y) {
  drawFloor(ctx, x, y);
  // statue base
  ctx.fillStyle = C.statueDark;
  ctx.fillRect(x+4, y+10, 8, 4);
  ctx.fillRect(x+5, y+8,  6, 3);
  // body
  ctx.fillStyle = C.statueGray;
  ctx.fillRect(x+5, y+4, 6, 6);
  // head
  ctx.fillRect(x+6, y+2, 4, 3);
  // arms
  ctx.fillRect(x+3, y+5, 3, 2);
  ctx.fillRect(x+10, y+5, 3, 2);
  // eye accent
  ctx.fillStyle = C.statueLine;
  ctx.fillRect(x+7, y+3, 1, 1);
  ctx.fillRect(x+9, y+3, 1, 1);
}

// Main tile draw dispatch
export function drawTile(ctx, tileId, x, y, state) {
  const frame = (state && state.frame) || 0;
  switch (tileId) {
    case T.GRASS:         drawGrass(ctx, x, y); break;
    case T.SAND:          drawSand(ctx, x, y); break;
    case T.TREE:          drawTree(ctx, x, y); break;
    case T.ROCK:          drawRock(ctx, x, y); break;
    case T.WATER:         drawWater(ctx, x, y, frame); break;
    case T.PATH:          drawPath(ctx, x, y); break;
    case T.BRICK:         drawBrick(ctx, x, y); break;
    case T.FLOOR:         drawFloor(ctx, x, y); break;
    case T.DOOR_N:        drawDoorN(ctx, x, y); break;
    case T.DOOR_S:        drawDoorS(ctx, x, y); break;
    case T.DOOR_E:        drawDoorE(ctx, x, y); break;
    case T.DOOR_W:        drawDoorW(ctx, x, y); break;
    case T.DOOR_LOCKED_N: drawLockedDoor(ctx, x, y); break;
    case T.DOOR_LOCKED_S: drawLockedDoor(ctx, x, y); break;
    case T.DOOR_LOCKED_E: drawLockedDoor(ctx, x, y); break;
    case T.DOOR_LOCKED_W: drawLockedDoor(ctx, x, y); break;
    case T.STAIRS:        drawStairs(ctx, x, y); break;
    case T.BUSH:          drawBush(ctx, x, y); break;
    case T.FLOWER:        drawFlower(ctx, x, y); break;
    case T.SIGN:          drawSign(ctx, x, y); break;
    case T.CAVE:          drawCave(ctx, x, y); break;
    case T.MOUNTAIN:      drawMountain(ctx, x, y); break;
    case T.BRIDGE:        drawBridge(ctx, x, y); break;
    case T.STATUE:        drawStatue(ctx, x, y); break;
    default:
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(x, y, TILE, TILE);
  }
}

// Self-test: draws all tiles in a grid
export function tileAtlasSelfTest(ctx, ox, oy) {
  const ids = Object.values(T);
  const cols = 6;
  ids.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawTile(ctx, id, ox + col * (TILE + 2), oy + row * (TILE + 2), { frame: 0 });
  });
}
