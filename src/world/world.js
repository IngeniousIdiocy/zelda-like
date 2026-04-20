// world.js — World object factory.

import { TILE, ROOM_W, ROOM_H, EVT, isSolidTile, DIR, aabb, px2tile } from '../contracts.js';
import { allRooms, loadRoom, tileIndex } from './rooms.js';

let _entityIdCounter = 1;
function nextId() { return 'e' + (_entityIdCounter++); }

export function createWorld({ events, state, player }) {
  const rooms = allRooms();

  // Spawn factory registry: kind -> (spawn, world) => Entity
  const _factories = new Map();
  const _pendingSpawns = [];

  const world = {
    room: null,
    rooms,
    entities: [],
    player,
    state,
    events,

    // Register a spawn factory for a given kind string.
    registerFactory(kind, fn) {
      _factories.set(kind, fn);
      // Drain any pending spawns for this kind.
      for (let i = _pendingSpawns.length - 1; i >= 0; i--) {
        if (_pendingSpawns[i].kind === kind) {
          const s = _pendingSpawns.splice(i, 1)[0];
          const e = fn(s, world);
          if (e) {
            if (!e.id) e.id = nextId();
            world.entities.push(e);
          }
        }
      }
    },

    // Returns the factories map so integrators can also read it.
    get factories() { return _factories; },

    tileAt(px, py) {
      if (!world.room) return 0;
      const tx = px2tile(px);
      const ty = px2tile(py);
      if (tx < 0 || tx >= ROOM_W || ty < 0 || ty >= ROOM_H) return -1;
      return world.room.tiles[tileIndex(tx, ty)];
    },

    // AABB solid check against tiles and solid entities.
    rectSolid(rx, ry, rw, rh, ignore) {
      if (!world.room) return false;
      const x0 = Math.floor(rx / TILE);
      const y0 = Math.floor(ry / TILE);
      const x1 = Math.floor((rx + rw - 1) / TILE);
      const y1 = Math.floor((ry + rh - 1) / TILE);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (tx < 0 || tx >= ROOM_W || ty < 0 || ty >= ROOM_H) return true;
          const tid = world.room.tiles[tileIndex(tx, ty)];
          if (isSolidTile(tid)) return true;
        }
      }
      const rect = { x: rx, y: ry, w: rw, h: rh };
      for (const e of world.entities) {
        if (e === ignore || !e.solid || e.dead) continue;
        if (aabb(rect, e)) return true;
      }
      return false;
    },

    spawn(e) {
      if (!e.id) e.id = nextId();
      world.entities.push(e);
    },

    enterRoom(newRoomId, entryEdge) {
      const newRoom = loadRoom(newRoomId, rooms);
      if (!newRoom) {
        console.warn('[world] enterRoom: unknown room', newRoomId);
        return;
      }

      // Remove all non-player entities.
      world.entities = world.entities.filter(e => e === player);

      world.room = newRoom;
      state.currentRoomId = newRoomId;

      // Position player at entry edge.
      if (entryEdge === 'n') {
        player.x = Math.round(ROOM_W * TILE / 2 - player.w / 2);
        player.y = 1;
      } else if (entryEdge === 's') {
        player.x = Math.round(ROOM_W * TILE / 2 - player.w / 2);
        player.y = (ROOM_H - 1) * TILE - player.h;
      } else if (entryEdge === 'e') {
        player.x = (ROOM_W - 1) * TILE - player.w;
        player.y = Math.round(ROOM_H * TILE / 2 - player.h / 2);
      } else if (entryEdge === 'w') {
        player.x = 1;
        player.y = Math.round(ROOM_H * TILE / 2 - player.h / 2);
      }
      // If no entryEdge (warp), position from warp target is already set by caller.

      // Spawn room entities.
      for (const sp of newRoom.spawns || []) {
        const factory = _factories.get(sp.kind);
        if (!factory) {
          _pendingSpawns.push({ ...sp });
          continue;
        }
        const e = factory(sp, world);
        if (e) {
          if (!e.id) e.id = nextId();
          world.entities.push(e);
        }
      }

      events.emit(EVT.ROOM_CHANGED, { room: newRoom, entryEdge });

      // Set music if room specifies one.
      if (newRoom.music) {
        events.emit('music_change', { key: newRoom.music });
      }
    },

    update(dt) {
      if (!world.room) return;

      // Update entities.
      for (const e of world.entities) {
        if (!e.dead && e.update) e.update(dt, world);
      }

      // Remove dead entities.
      world.entities = world.entities.filter(e => !e.dead);

      // Check warps under player foot-center. Suppress re-triggering the
      // just-used warp until the player has stepped off that tile.
      if (player && !player.dead && world.room.warps) {
        const footX = player.x + player.w / 2;
        const footY = player.y + player.h;
        const tx = Math.floor(footX / TILE);
        const ty = Math.floor(footY / TILE);
        if (world._suppressWarp && (world._suppressWarp.tx !== tx || world._suppressWarp.ty !== ty)) {
          world._suppressWarp = null;
        }
        if (!world._suppressWarp) {
          for (const warp of world.room.warps) {
            if (warp.x === tx && warp.y === ty) {
              if (warp.toX !== undefined) player.x = warp.toX;
              if (warp.toY !== undefined) player.y = warp.toY;
              world.enterRoom(warp.toRoom);
              // Mark the destination's landing tile as suppressed so we don't
              // immediately warp back.
              const lx = Math.floor((player.x + player.w / 2) / TILE);
              const ly = Math.floor((player.y + player.h) / TILE);
              world._suppressWarp = { tx: lx, ty: ly };
              break;
            }
          }
        }
      }
    },
  };

  return world;
}
