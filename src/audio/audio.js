// audio.js — WebAudio chiptune music + SFX for the Zelda-like engine.
// Vanilla ESM, no deps beyond contracts.js and tracks.js.
// AudioContext is created lazily on first user gesture (via resume()).

import { EVT } from '../contracts.js';
import { TRACKS } from './tracks.js';

// ---------------------------------------------------------------------------
// AudioContext — lazy singleton
// ---------------------------------------------------------------------------
let _ctx = null;
let _masterGain = null;
let _gestureReceived = false;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = 1.0;
    _masterGain.connect(_ctx.destination);
  }
  return _ctx;
}

function masterGain() {
  getCtx();
  return _masterGain;
}

// ---------------------------------------------------------------------------
// White-noise AudioBuffer (reused across noise bursts)
// ---------------------------------------------------------------------------
let _noiseBuffer = null;

function getNoiseBuffer() {
  if (_noiseBuffer) return _noiseBuffer;
  const ctx = getCtx();
  const length = ctx.sampleRate * 1; // 1 second of noise
  _noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = _noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return _noiseBuffer;
}

// ---------------------------------------------------------------------------
// Core synth: playNote(wave, freq, dur, gain, attack, release)
// ---------------------------------------------------------------------------
export function playNote(wave, freq, dur, gain, attack = 0.005, release = 0.05) {
  if (!_gestureReceived) return;
  if (!freq || freq <= 0) return; // REST

  const ctx = getCtx();
  const now = ctx.currentTime;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + attack);
  // hold
  const holdEnd = now + dur - release;
  if (holdEnd > now + attack) {
    gainNode.gain.setValueAtTime(gain, holdEnd);
  }
  gainNode.gain.linearRampToValueAtTime(0, now + dur);
  gainNode.connect(masterGain());

  if (wave === 'noise') {
    const source = ctx.createBufferSource();
    source.buffer = getNoiseBuffer();
    source.loop = true;
    source.connect(gainNode);
    source.start(now);
    source.stop(now + dur);
  } else {
    const osc = ctx.createOscillator();
    osc.type = wave; // 'square', 'triangle', 'sawtooth'
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + dur);
  }
}

// ---------------------------------------------------------------------------
// SFX catalog
// ---------------------------------------------------------------------------
function playSfx(id) {
  if (!_gestureReceived) return;

  switch (id) {
    case 'sword':
      // Short square blip, descending
      playNote('square', 880, 0.05, 0.30, 0.003, 0.04);
      setTimeout(() => playNote('square', 660, 0.07, 0.25, 0.003, 0.05), 50);
      setTimeout(() => playNote('square', 440, 0.08, 0.20, 0.003, 0.06), 110);
      break;

    case 'hurt':
      // Low growl — detuned noise + low tone
      playNote('noise', 1, 0.18, 0.35, 0.005, 0.12);
      playNote('square', 110, 0.18, 0.20, 0.005, 0.12);
      break;

    case 'kill':
      // Noise burst + descending pitch
      playNote('noise', 1, 0.25, 0.40, 0.005, 0.15);
      playNote('square', 330, 0.10, 0.28, 0.005, 0.08);
      setTimeout(() => playNote('square', 220, 0.10, 0.22, 0.005, 0.08), 80);
      setTimeout(() => playNote('square', 110, 0.12, 0.18, 0.005, 0.10), 160);
      break;

    case 'pickup':
      // Two ascending beeps
      playNote('square', 523, 0.08, 0.28, 0.003, 0.05);
      setTimeout(() => playNote('square', 784, 0.10, 0.30, 0.003, 0.06), 110);
      break;

    case 'rupee':
      // Quick triangle arpeggio up (C-E-G)
      playNote('triangle', 523, 0.07, 0.32, 0.003, 0.04);
      setTimeout(() => playNote('triangle', 659, 0.07, 0.32, 0.003, 0.04), 80);
      setTimeout(() => playNote('triangle', 784, 0.09, 0.34, 0.003, 0.06), 160);
      break;

    case 'heart':
      // Ascending triad (C-E-G-C5)
      playNote('triangle', 523, 0.07, 0.30, 0.003, 0.04);
      setTimeout(() => playNote('triangle', 659, 0.07, 0.30, 0.003, 0.04), 80);
      setTimeout(() => playNote('triangle', 784, 0.07, 0.30, 0.003, 0.04), 160);
      setTimeout(() => playNote('triangle', 1047, 0.10, 0.32, 0.003, 0.06), 240);
      break;

    case 'key':
      // Bright square blip — quick high tone
      playNote('square', 1318, 0.04, 0.28, 0.003, 0.03);
      setTimeout(() => playNote('square', 1568, 0.06, 0.30, 0.003, 0.04), 60);
      break;

    case 'door':
      // Low thud
      playNote('square', 98, 0.20, 0.35, 0.005, 0.15);
      playNote('noise', 1, 0.12, 0.20, 0.005, 0.10);
      break;

    case 'bomb_place':
      // Short click
      playNote('noise', 1, 0.04, 0.28, 0.002, 0.03);
      break;

    case 'bomb_explode':
      // Noise burst 0.4s
      playNote('noise', 1, 0.40, 0.50, 0.005, 0.25);
      playNote('square', 80, 0.30, 0.35, 0.005, 0.25);
      break;

    case 'menu':
      // Small blip
      playNote('square', 660, 0.06, 0.25, 0.003, 0.04);
      break;

    case 'text':
      // Short tick
      playNote('square', 440, 0.03, 0.18, 0.002, 0.02);
      break;

    case 'item_get':
      // Victory 4-note fanfare, triangle (C-E-G-C5)
      playNote('triangle', 523, 0.12, 0.36, 0.005, 0.06);
      setTimeout(() => playNote('triangle', 659, 0.12, 0.36, 0.005, 0.06), 140);
      setTimeout(() => playNote('triangle', 784, 0.12, 0.36, 0.005, 0.06), 280);
      setTimeout(() => playNote('triangle', 1047, 0.35, 0.40, 0.005, 0.20), 420);
      break;

    case 'stairs':
      // Descending glide — step through a few notes
      playNote('triangle', 880, 0.08, 0.28, 0.004, 0.05);
      setTimeout(() => playNote('triangle', 740, 0.08, 0.26, 0.004, 0.05), 90);
      setTimeout(() => playNote('triangle', 587, 0.08, 0.24, 0.004, 0.05), 180);
      setTimeout(() => playNote('triangle', 440, 0.10, 0.22, 0.004, 0.07), 270);
      break;

    case 'boss_hit':
      // Low crunch
      playNote('sawtooth', 110, 0.12, 0.40, 0.003, 0.09);
      playNote('noise', 1, 0.10, 0.30, 0.003, 0.08);
      break;

    case 'dead':
      // Downward slow triad (A-F-D)
      playNote('triangle', 880, 0.25, 0.30, 0.010, 0.15);
      setTimeout(() => playNote('triangle', 698, 0.25, 0.28, 0.010, 0.15), 300);
      setTimeout(() => playNote('triangle', 587, 0.30, 0.26, 0.010, 0.20), 600);
      break;

    case 'victory':
      // Longer fanfare — ascending arpeggios
      [0, 100, 200, 340, 480, 620, 760, 900].forEach((t, i) => {
        const freqs = [523, 659, 784, 1047, 784, 659, 523, 1047];
        setTimeout(() => playNote('square', freqs[i], 0.18, 0.34, 0.004, 0.10), t);
      });
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Music step-sequencer
// ---------------------------------------------------------------------------
let _currentTrackKey = null;
let _currentScheduler = null;
let _muted = false;

// Each scheduler returns a stop() function.
function buildScheduler(trackDef) {
  if (!trackDef) return null;

  const ctx = getCtx();
  const { bpm, loop, layers } = trackDef;
  const secPerBeat = 60 / bpm;

  // Flatten each layer into a flat sequence of [wave, freq, durSec, gain]
  // with absolute start times, then schedule them in rolling windows.
  const flatLayers = layers.map(steps => {
    let t = 0;
    return steps.map(([wave, freq, durBeats, gain]) => {
      const entry = { wave, freq, durSec: durBeats * secPerBeat, gain, startOffset: t };
      t += durBeats * secPerBeat;
      return entry;
    });
  });

  // Total duration of one loop pass (use the longest layer)
  const loopDuration = Math.max(...flatLayers.map(layer => {
    const last = layer[layer.length - 1];
    return last ? last.startOffset + last.durSec : 0;
  }));

  let stopped = false;
  let loopStart = ctx.currentTime + 0.05; // small buffer

  // Per-layer gain nodes for fade control
  const layerGains = flatLayers.map(() => {
    const g = ctx.createGain();
    g.gain.value = 1.0;
    g.connect(masterGain());
    return g;
  });

  function schedulePass(passStart) {
    if (stopped) return;
    flatLayers.forEach((layer, li) => {
      layer.forEach(({ wave, freq, durSec, gain, startOffset }) => {
        if (stopped) return;
        if (!freq || freq <= 0) return;
        const noteStart = passStart + startOffset;
        const noteEnd = noteStart + durSec;
        const now = ctx.currentTime;
        if (noteEnd < now) return; // already past

        const attack = 0.005;
        const release = Math.min(0.06, durSec * 0.25);

        const gNode = ctx.createGain();
        gNode.gain.setValueAtTime(0, noteStart);
        gNode.gain.linearRampToValueAtTime(gain, noteStart + attack);
        const holdEnd = noteEnd - release;
        if (holdEnd > noteStart + attack) {
          gNode.gain.setValueAtTime(gain, holdEnd);
        }
        gNode.gain.linearRampToValueAtTime(0, noteEnd);
        gNode.connect(layerGains[li]);

        if (wave === 'noise') {
          const src = ctx.createBufferSource();
          src.buffer = getNoiseBuffer();
          src.loop = true;
          src.connect(gNode);
          src.start(noteStart);
          src.stop(noteEnd);
        } else {
          const osc = ctx.createOscillator();
          osc.type = wave;
          osc.frequency.setValueAtTime(freq, noteStart);
          osc.connect(gNode);
          osc.start(noteStart);
          osc.stop(noteEnd);
        }
      });
    });
  }

  // Schedule first pass
  schedulePass(loopStart);

  // For looping tracks, use setTimeout to schedule subsequent passes
  let nextPassTime = loopStart + loopDuration;
  let lookahead = null;

  function scheduleLoop() {
    if (stopped || !loop) return;
    const now = ctx.currentTime;
    // Schedule ~0.5s ahead
    if (nextPassTime - now < 0.5) {
      schedulePass(nextPassTime);
      nextPassTime += loopDuration;
    }
    lookahead = setTimeout(scheduleLoop, 250);
  }

  if (loop) {
    lookahead = setTimeout(scheduleLoop, 250);
  }

  function stop(fadeTime = 0.3) {
    stopped = true;
    if (lookahead !== null) clearTimeout(lookahead);
    const now = ctx.currentTime;
    layerGains.forEach(g => {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + fadeTime);
    });
    setTimeout(() => {
      layerGains.forEach(g => {
        try { g.disconnect(); } catch (_) { /* already gone */ }
      });
    }, (fadeTime + 0.1) * 1000);
  }

  return { stop };
}

function playMusic(key) {
  if (_currentTrackKey === key) return;

  // Fade out old track
  if (_currentScheduler) {
    _currentScheduler.stop(0.3);
    _currentScheduler = null;
  }
  _currentTrackKey = key;

  if (!key || !TRACKS[key]) return;
  if (!_gestureReceived) return;
  if (_muted) return;

  _currentScheduler = buildScheduler(TRACKS[key]);
}

function stopMusic(fadeTime = 0.3) {
  if (_currentScheduler) {
    _currentScheduler.stop(fadeTime);
    _currentScheduler = null;
  }
  _currentTrackKey = null;
}

// ---------------------------------------------------------------------------
// Public API: createAudio(events)
// ---------------------------------------------------------------------------
export function createAudio(events) {
  // Wire SFX
  events.on(EVT.SFX, ({ id }) => playSfx(id));

  // Wire room changes → music
  events.on(EVT.ROOM_CHANGED, ({ room }) => {
    if (room && room.music) {
      playMusic(room.music);
    }
  });

  // Boss defeated → stop music, play item_get fanfare
  events.on(EVT.BOSS_DEFEATED, () => {
    stopMusic(0.2);
    // slight delay so the fade has started
    setTimeout(() => playSfx('item_get'), 300);
  });

  // Player died → stop music, start gameover track
  events.on(EVT.PLAYER_DIED, () => {
    stopMusic(0.2);
    _currentTrackKey = null;
    setTimeout(() => {
      if (!_gestureReceived || _muted) return;
      _currentScheduler = buildScheduler(TRACKS['gameover']);
    }, 350);
  });

  // Mute toggle (main.js must emit this on Input.mutePressed)
  events.on('mute_toggle', () => toggle());

  // -------------------------------------------------------------------------
  // Mute / unmute helpers
  // -------------------------------------------------------------------------
  function mute() {
    _muted = true;
    if (_masterGain) {
      const now = getCtx().currentTime;
      _masterGain.gain.cancelScheduledValues(now);
      _masterGain.gain.setValueAtTime(_masterGain.gain.value, now);
      _masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
    }
  }

  function unmute() {
    _muted = false;
    if (_masterGain) {
      const now = getCtx().currentTime;
      _masterGain.gain.cancelScheduledValues(now);
      _masterGain.gain.setValueAtTime(_masterGain.gain.value, now);
      _masterGain.gain.linearRampToValueAtTime(1.0, now + 0.05);
    }
    // If music should be playing but isn't (e.g. muted before first gesture),
    // restart the current track.
    if (_currentTrackKey && !_currentScheduler) {
      _currentScheduler = buildScheduler(TRACKS[_currentTrackKey]);
    }
  }

  function toggle() {
    if (_muted) unmute(); else mute();
  }

  function isMuted() {
    return _muted;
  }

  // resume() — call on first user input gesture to unblock AudioContext.
  function resume() {
    _gestureReceived = true;
    if (_ctx && _ctx.state === 'suspended') {
      _ctx.resume();
    }
    // If AudioContext hasn't been created yet, mark gesture received so the
    // next playNote/playMusic call will proceed normally.
    // If music was queued before gesture, start it now.
    if (_currentTrackKey && !_currentScheduler && !_muted) {
      _currentScheduler = buildScheduler(TRACKS[_currentTrackKey]);
    }
  }

  return { mute, unmute, toggle, resume, isMuted };
}
