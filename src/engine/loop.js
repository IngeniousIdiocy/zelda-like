// loop.js — fixed-timestep-ish RAF game loop

const MAX_DT = 1 / 30;

/**
 * @param {{ update: (dt: number) => void, render: () => void }} opts
 * @returns {{ stop: () => void }}
 */
export function startLoop({ update, render }) {
  let rafId = 0;
  let last = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = last === 0 ? MAX_DT : Math.min((now - last) / 1000, MAX_DT);
    last = now;
    update(dt);
    render();
  }

  rafId = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }
  };
}
