// rng.js — deterministic PRNG utilities

/**
 * mulberry32 PRNG. Returns a function that yields floats in [0, 1).
 * @param {number} seed  32-bit unsigned integer seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random integer in [lo, hi] inclusive.
 * @param {() => number} rng
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export function randInt(rng, lo, hi) {
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

/**
 * Random element from an array.
 * @template T
 * @param {() => number} rng
 * @param {T[]} arr
 * @returns {T}
 */
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
