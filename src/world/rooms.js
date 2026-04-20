// rooms.js — room loading utilities.

import { ROOM_W } from '../contracts.js';
import { overworld } from '../data/overworld.js';
import { dungeon1, caveRooms } from '../data/dungeon1.js';

// tileIndex: tile coordinate (x,y) to flat array index
export function tileIndex(x, y) {
  return y * ROOM_W + x;
}

// allRooms: returns a Map<string, Room> of every room
export function allRooms() {
  const map = new Map();
  for (const room of overworld) map.set(room.id, room);
  for (const room of dungeon1)  map.set(room.id, room);
  for (const room of caveRooms) map.set(room.id, room);
  return map;
}

// loadRoom: retrieve a single room by id from an allRoomsData map
export function loadRoom(id, allRoomsData) {
  return allRoomsData.get(id) || null;
}
