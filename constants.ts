// C Major Pentatonic Scale frequencies (Hz)
export const MUSICAL_SCALE = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.00,
  A4: 440.00,
  C5: 523.25,
};

export const PALETTE = [
  '#f87171', // Red
  '#fb923c', // Orange
  '#fbbf24', // Amber
  '#a3e635', // Lime
  '#4ade80', // Green
  '#2dd4bf', // Teal
  '#22d3ee', // Cyan
  '#60a5fa', // Blue
  '#a78bfa', // Violet
  '#f472b6', // Pink
];

export const GAME_BPM = 120;
export const QUARTER_NOTE_MS = 60000 / GAME_BPM;
export const EIGHTH_NOTE_MS = QUARTER_NOTE_MS / 2;

// Possible intervals between notes in the sequence. Weighted towards quarter notes for playability.
export const RHYTHM_INTERVALS = [QUARTER_NOTE_MS, QUARTER_NOTE_MS, EIGHTH_NOTE_MS];

// Scoring parameters
export const MAX_POSITION_ERROR_PX = 150; // Max distance from center for 0 score
export const MAX_RHYTHM_ERROR_MS = 300; // Max time diff from expected interval for 0 score
export const PERFECT_RHYTHM_TOLERANCE_MS = 50; // Window for a "perfect" rhythm hit
export const MAX_PITCH_SHIFT_HZ = 100; // Max pitch shift for inaccurate clicks

// Visual parameters
export const CIRCLE_RADIUS = 30;
export const ANIMATION_DURATION_MS = 400;
export const X_PADDING = 100;
export const Y_PADDING = 100;
