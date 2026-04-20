// tracks.js — raw note data for each music track.
// Notes: [wave, freq_hz, dur_beats, gain]
// wave: 'square' | 'triangle' | 'sawtooth' | 'noise'
// All melodies are original compositions in a NES chiptune style.

// Helper: note frequencies (A4 = 440 Hz, equal temperament)
function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Named note shortcuts (MIDI numbers)
const N = {
  C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59,
  C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71,
  C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83,
  C6: 84,
  Cs3: 49, Ds3: 51, Fs3: 54, Gs3: 56, As3: 58,
  Cs4: 61, Ds4: 63, Fs4: 66, Gs4: 68, As4: 70,
  Cs5: 73, Ds5: 75, Fs5: 78, Gs5: 80, As5: 82,
  REST: 0,
};

function hz(midi) {
  return midi === 0 ? 0 : midiToHz(midi);
}

// Step entry: [wave, freqHz, durBeats, gain]
// durBeats is in units of one step; actual time = step * (60/bpm)

export const TRACKS = {
  // -------------------------------------------------------------------------
  // OVERWORLD — cheerful, major key, 140 bpm, 16 steps
  // Melody: square wave, original bouncy tune in C major
  // Bass: triangle wave
  // -------------------------------------------------------------------------
  overworld: {
    bpm: 140,
    loop: true,
    layers: [
      // Lead melody (square)
      [
        ['square', hz(N.E5), 0.5, 0.35],
        ['square', hz(N.G5), 0.5, 0.35],
        ['square', hz(N.A5), 1.0, 0.35],
        ['square', hz(N.G5), 0.5, 0.30],
        ['square', hz(N.E5), 0.5, 0.30],
        ['square', hz(N.C5), 1.0, 0.35],
        ['square', hz(N.D5), 0.5, 0.30],
        ['square', hz(N.E5), 0.5, 0.30],
        ['square', hz(N.F5), 0.5, 0.35],
        ['square', hz(N.A5), 0.5, 0.35],
        ['square', hz(N.G5), 1.0, 0.35],
        ['square', hz(N.E5), 0.5, 0.30],
        ['square', hz(N.D5), 0.5, 0.30],
        ['square', hz(N.C5), 0.5, 0.30],
        ['square', hz(N.E5), 0.5, 0.30],
        ['square', hz(N.G5), 1.0, 0.32],
      ],
      // Bass line (triangle)
      [
        ['triangle', hz(N.C3), 1.0, 0.28],
        ['triangle', hz(N.G3), 1.0, 0.28],
        ['triangle', hz(N.A3), 1.0, 0.28],
        ['triangle', hz(N.G3), 1.0, 0.28],
        ['triangle', hz(N.F3), 1.0, 0.28],
        ['triangle', hz(N.C3), 1.0, 0.28],
        ['triangle', hz(N.D3), 1.0, 0.28],
        ['triangle', hz(N.E3), 1.0, 0.28],
        ['triangle', hz(N.F3), 1.0, 0.28],
        ['triangle', hz(N.A3), 1.0, 0.28],
        ['triangle', hz(N.G3), 1.0, 0.28],
        ['triangle', hz(N.E3), 1.0, 0.28],
        ['triangle', hz(N.D3), 1.0, 0.28],
        ['triangle', hz(N.C3), 1.0, 0.28],
        ['triangle', hz(N.E3), 1.0, 0.28],
        ['triangle', hz(N.G3), 1.0, 0.28],
      ],
    ],
  },

  // -------------------------------------------------------------------------
  // DUNGEON — slow, minor, 90 bpm, 16 steps
  // Melody: triangle, spooky A natural minor
  // Bass: square, low and brooding
  // -------------------------------------------------------------------------
  dungeon: {
    bpm: 90,
    loop: true,
    layers: [
      // Lead melody (triangle)
      [
        ['triangle', hz(N.A4), 1.0, 0.30],
        ['triangle', hz(N.REST), 0.5, 0],
        ['triangle', hz(N.C5), 0.5, 0.28],
        ['triangle', hz(N.E5), 1.0, 0.30],
        ['triangle', hz(N.D5), 0.5, 0.26],
        ['triangle', hz(N.B4), 0.5, 0.26],
        ['triangle', hz(N.A4), 1.0, 0.28],
        ['triangle', hz(N.REST), 1.0, 0],
        ['triangle', hz(N.G4), 1.0, 0.28],
        ['triangle', hz(N.REST), 0.5, 0],
        ['triangle', hz(N.As4), 0.5, 0.26],
        ['triangle', hz(N.C5), 1.0, 0.28],
        ['triangle', hz(N.B4), 0.5, 0.24],
        ['triangle', hz(N.Gs4), 0.5, 0.24],
        ['triangle', hz(N.A4), 1.5, 0.30],
        ['triangle', hz(N.REST), 0.5, 0],
      ],
      // Bass (square)
      [
        ['square', hz(N.A3), 2.0, 0.22],
        ['square', hz(N.REST), 1.0, 0],
        ['square', hz(N.E3), 1.0, 0.20],
        ['square', hz(N.A3), 2.0, 0.22],
        ['square', hz(N.REST), 1.0, 0],
        ['square', hz(N.G3), 1.0, 0.20],
        ['square', hz(N.A3), 2.0, 0.22],
        ['square', hz(N.REST), 1.0, 0],
        ['square', hz(N.E3), 1.0, 0.20],
        ['square', hz(N.A3), 2.0, 0.22],
        ['square', hz(N.REST), 2.0, 0],
      ],
    ],
  },

  // -------------------------------------------------------------------------
  // BOSS — urgent, fast, 160 bpm, 16 steps
  // Detuned sawtooth + driving square bass
  // -------------------------------------------------------------------------
  boss: {
    bpm: 160,
    loop: true,
    layers: [
      // Lead (sawtooth, slightly aggressive)
      [
        ['sawtooth', hz(N.E5), 0.5, 0.32],
        ['sawtooth', hz(N.E5), 0.5, 0.28],
        ['sawtooth', hz(N.G5), 0.5, 0.32],
        ['sawtooth', hz(N.E5), 0.5, 0.28],
        ['sawtooth', hz(N.As4), 0.5, 0.30],
        ['sawtooth', hz(N.B4), 0.5, 0.30],
        ['sawtooth', hz(N.E5), 1.0, 0.34],
        ['sawtooth', hz(N.Ds5), 0.5, 0.28],
        ['sawtooth', hz(N.E5), 0.5, 0.28],
        ['sawtooth', hz(N.G5), 0.5, 0.32],
        ['sawtooth', hz(N.Fs5), 0.5, 0.30],
        ['sawtooth', hz(N.E5), 0.5, 0.28],
        ['sawtooth', hz(N.D5), 0.5, 0.28],
        ['sawtooth', hz(N.C5), 0.5, 0.28],
        ['sawtooth', hz(N.B4), 0.5, 0.26],
        ['sawtooth', hz(N.E5), 1.0, 0.34],
      ],
      // Bass (square)
      [
        ['square', hz(N.E3), 0.5, 0.25],
        ['square', hz(N.E3), 0.5, 0.22],
        ['square', hz(N.E3), 0.5, 0.25],
        ['square', hz(N.G3), 0.5, 0.22],
        ['square', hz(N.As3), 0.5, 0.25],
        ['square', hz(N.B3), 0.5, 0.22],
        ['square', hz(N.E3), 1.0, 0.28],
        ['square', hz(N.E3), 0.5, 0.25],
        ['square', hz(N.E3), 0.5, 0.22],
        ['square', hz(N.E3), 0.5, 0.25],
        ['square', hz(N.Fs3), 0.5, 0.22],
        ['square', hz(N.G3), 0.5, 0.25],
        ['square', hz(N.As3), 0.5, 0.22],
        ['square', hz(N.B3), 0.5, 0.22],
        ['square', hz(N.Gs3), 0.5, 0.22],
        ['square', hz(N.E3), 1.0, 0.28],
      ],
    ],
  },

  // -------------------------------------------------------------------------
  // CAVE — eerie, slow, 70 bpm, 16 steps
  // Triangle melody, low sawtooth bass
  // -------------------------------------------------------------------------
  cave: {
    bpm: 70,
    loop: true,
    layers: [
      // Lead (triangle, eerie)
      [
        ['triangle', hz(N.A4), 2.0, 0.22],
        ['triangle', hz(N.REST), 1.0, 0],
        ['triangle', hz(N.Fs4), 1.0, 0.20],
        ['triangle', hz(N.E4), 2.0, 0.22],
        ['triangle', hz(N.REST), 1.0, 0],
        ['triangle', hz(N.D4), 1.0, 0.20],
        ['triangle', hz(N.C4), 2.0, 0.22],
        ['triangle', hz(N.E4), 1.0, 0.20],
        ['triangle', hz(N.Fs4), 2.0, 0.22],
        ['triangle', hz(N.REST), 1.0, 0],
        ['triangle', hz(N.A4), 1.0, 0.20],
      ],
      // Bass (sawtooth, dark)
      [
        ['sawtooth', hz(N.A3), 4.0, 0.16],
        ['sawtooth', hz(N.E3), 4.0, 0.16],
        ['sawtooth', hz(N.D3), 4.0, 0.16],
        ['sawtooth', hz(N.A3), 4.0, 0.16],
      ],
    ],
  },

  // -------------------------------------------------------------------------
  // GAMEOVER — short dirge, 80 bpm, plays once (no loop)
  // -------------------------------------------------------------------------
  gameover: {
    bpm: 80,
    loop: false,
    layers: [
      [
        ['triangle', hz(N.A4), 1.5, 0.30],
        ['triangle', hz(N.Gs4), 1.5, 0.28],
        ['triangle', hz(N.G4), 1.5, 0.28],
        ['triangle', hz(N.Fs4), 1.5, 0.26],
        ['triangle', hz(N.F4), 2.0, 0.26],
        ['triangle', hz(N.E4), 2.0, 0.24],
        ['triangle', hz(N.Ds4), 2.0, 0.22],
        ['triangle', hz(N.D4), 4.0, 0.20],
      ],
      [
        ['square', hz(N.A3), 1.5, 0.22],
        ['square', hz(N.Gs3), 1.5, 0.20],
        ['square', hz(N.G3), 1.5, 0.20],
        ['square', hz(N.Fs3), 1.5, 0.18],
        ['square', hz(N.F3), 2.0, 0.18],
        ['square', hz(N.E3), 2.0, 0.16],
        ['square', hz(N.Ds3), 2.0, 0.16],
        ['square', hz(N.D3), 4.0, 0.18],
      ],
    ],
  },

  // -------------------------------------------------------------------------
  // VICTORY — longer fanfare, 120 bpm, plays once
  // -------------------------------------------------------------------------
  victory: {
    bpm: 120,
    loop: false,
    layers: [
      [
        ['square', hz(N.C5), 0.5, 0.36],
        ['square', hz(N.E5), 0.5, 0.36],
        ['square', hz(N.G5), 0.5, 0.36],
        ['square', hz(N.C6), 1.5, 0.38],
        ['square', hz(N.REST), 0.5, 0],
        ['square', hz(N.A5), 0.5, 0.34],
        ['square', hz(N.G5), 0.5, 0.34],
        ['square', hz(N.F5), 0.5, 0.34],
        ['square', hz(N.E5), 1.0, 0.36],
        ['square', hz(N.C5), 0.5, 0.32],
        ['square', hz(N.E5), 0.5, 0.32],
        ['square', hz(N.G5), 0.5, 0.34],
        ['square', hz(N.C6), 2.0, 0.40],
      ],
      [
        ['triangle', hz(N.C4), 0.5, 0.25],
        ['triangle', hz(N.E4), 0.5, 0.25],
        ['triangle', hz(N.G4), 0.5, 0.25],
        ['triangle', hz(N.C5), 1.5, 0.28],
        ['triangle', hz(N.REST), 0.5, 0],
        ['triangle', hz(N.F4), 0.5, 0.24],
        ['triangle', hz(N.E4), 0.5, 0.24],
        ['triangle', hz(N.D4), 0.5, 0.24],
        ['triangle', hz(N.C4), 1.0, 0.26],
        ['triangle', hz(N.C4), 0.5, 0.24],
        ['triangle', hz(N.E4), 0.5, 0.24],
        ['triangle', hz(N.G4), 0.5, 0.26],
        ['triangle', hz(N.C5), 2.0, 0.30],
      ],
    ],
  },
};
