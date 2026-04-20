// events.js — lightweight pub/sub EventBus

/**
 * @returns {import('../contracts.js').EventBus}
 */
export function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  function on(type, cb) {
    let set = listeners.get(type);
    if (!set) { set = new Set(); listeners.set(type, set); }
    set.add(cb);
    return () => set.delete(cb);
  }

  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const cb of set) {
      try { cb(payload); } catch (e) { console.error('EventBus error in', type, e); }
    }
  }

  return { on, emit };
}
