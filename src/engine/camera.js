// camera.js — camera tracking and room transition

import { TILE, ROOM_W, ROOM_H, clamp } from '../contracts.js';

const ROOM_PX_W = ROOM_W * TILE; // 256
const ROOM_PX_H = ROOM_H * TILE; // 176

/**
 * @returns {{ x: number, y: number, follow: (entity: {x:number,y:number,w:number,h:number}, roomBounds: {x:number,y:number,w:number,h:number}) => void }}
 */
export function createCamera() {
  const cam = {
    x: 0,
    y: 0,

    /**
     * Center the camera on `entity`, clamped inside `roomBounds` (in pixels).
     * For single-screen rooms this always resolves to (0, 0).
     * @param {{ x:number, y:number, w:number, h:number }} entity
     * @param {{ x:number, y:number, w:number, h:number }} [roomBounds]
     */
    follow(entity, roomBounds) {
      const bounds = roomBounds ?? { x: 0, y: 0, w: ROOM_PX_W, h: ROOM_PX_H };
      const cx = entity.x + entity.w / 2 - ROOM_PX_W / 2;
      const cy = entity.y + entity.h / 2 - ROOM_PX_H / 2;
      cam.x = clamp(cx, bounds.x, bounds.x + bounds.w - ROOM_PX_W);
      cam.y = clamp(cy, bounds.y, bounds.y + bounds.h - ROOM_PX_H);
    },
  };
  return cam;
}

/**
 * Trigger a linear scroll transition between rooms.
 * Slides the camera by one room-width/height in the given direction.
 *
 * @param {{ x:number, y:number }} camera
 * @param {any} _fromRoom  (reserved)
 * @param {any} _toRoom    (reserved)
 * @param {number} dir  DIR constant (0=UP 1=DOWN 2=LEFT 3=RIGHT)
 * @param {number} durationSec
 * @param {() => void} onDone
 * @returns {{ cancel: () => void }}
 */
export function screenTransition(camera, _fromRoom, _toRoom, dir, durationSec, onDone) {
  // Target offset deltas per direction.
  const delta = [
    { dx: 0,         dy: -ROOM_PX_H }, // UP
    { dx: 0,         dy:  ROOM_PX_H }, // DOWN
    { dx: -ROOM_PX_W, dy: 0 },         // LEFT
    { dx:  ROOM_PX_W, dy: 0 },         // RIGHT
  ][dir] ?? { dx: 0, dy: 0 };

  const startX = camera.x;
  const startY = camera.y;
  const startTime = performance.now();
  const durationMs = durationSec * 1000;

  let cancelled = false;
  let rafId = 0;

  function tick(now) {
    if (cancelled) return;
    const t = Math.min((now - startTime) / durationMs, 1);
    camera.x = startX + delta.dx * t;
    camera.y = startY + delta.dy * t;
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      onDone();
    }
  }

  rafId = requestAnimationFrame(tick);

  return {
    cancel() {
      cancelled = true;
      cancelAnimationFrame(rafId);
    }
  };
}
