import { CircleDefinition, PlayerClick, Score } from '../types';
import { MUSICAL_SCALE, PALETTE, RHYTHM_INTERVALS, CIRCLE_RADIUS, X_PADDING, Y_PADDING } from '../constants';

const scaleFrequencies = Object.values(MUSICAL_SCALE);
const minFreq = Math.min(...scaleFrequencies);
const maxFreq = Math.max(...scaleFrequencies);
const freqRange = maxFreq - minFreq;

/**
 * Generates a musical sequence of circles, arranged from left-to-right
 * with vertical position based on pitch.
 * @param count - The number of circles in the sequence.
 * @param canvasWidth - The width of the game area.
 * @param canvasHeight - The height of the game area.
 * @returns An array of CircleDefinition objects.
 */
export const generateSequence = (
  count: number,
  canvasWidth: number,
  canvasHeight: number,
): CircleDefinition[] => {
  const sequence: CircleDefinition[] = [];
  let currentTime = 0;

  const availableWidth = canvasWidth - X_PADDING * 2;
  const availableHeight = canvasHeight - Y_PADDING * 2;
  
  const xStep = count > 1 ? availableWidth / (count - 1) : 0;

  for (let i = 0; i < count; i++) {
    // Position circles from left to right.
    let x;
    if (count === 1) {
        x = canvasWidth / 2;
    } else {
        const jitter = (Math.random() - 0.5) * xStep * 0.15;
        x = X_PADDING + i * xStep + jitter;
    }
    
    const frequency = scaleFrequencies[Math.floor(Math.random() * scaleFrequencies.length)];
    const normalizedFreq = freqRange > 0 ? (frequency - minFreq) / freqRange : 0.5;
    
    // Higher pitch = smaller Y value (higher on screen).
    const yJitter = (Math.random() - 0.5) * 50; // Add some vertical variance
    const y = (canvasHeight - Y_PADDING) - (normalizedFreq * availableHeight) + yJitter;

    const color = PALETTE[i % PALETTE.length];

    if (i > 0) {
      const interval = RHYTHM_INTERVALS[Math.floor(Math.random() * RHYTHM_INTERVALS.length)];
      currentTime += interval;
    }
    
    // Clamp coordinates to stay within canvas bounds
    const clampedX = Math.max(CIRCLE_RADIUS, Math.min(canvasWidth - CIRCLE_RADIUS, x));
    const clampedY = Math.max(CIRCLE_RADIUS, Math.min(canvasHeight - CIRCLE_RADIUS, y));

    sequence.push({ id: i, x: clampedX, y: clampedY, color, frequency, time: currentTime });
  }

  return sequence;
};

/**
 * Calculates a musical frequency based on a Y-coordinate on the canvas.
 * This is the inverse of the positioning logic in `generateSequence`.
 * @param y The y-coordinate of the click/cursor.
 * @param canvasHeight The total height of the canvas.
 * @returns A frequency in Hz.
 */
export const calculateFrequencyFromY = (y: number, canvasHeight: number): number => {
  const availableHeight = canvasHeight - Y_PADDING * 2;

  if (availableHeight <= 0) {
      return minFreq;
  }
  
  // Clamp y to the playable area to avoid extreme frequencies
  const clampedY = Math.max(Y_PADDING, Math.min(canvasHeight - Y_PADDING, y));
  
  // Invert the formula from generateSequence:
  // y = (canvasHeight - Y_PADDING) - (normalizedFreq * availableHeight)
  // normalizedFreq = ((canvasHeight - Y_PADDING) - y) / availableHeight
  const normalizedY = ((canvasHeight - Y_PADDING) - clampedY) / availableHeight;
  
  const frequency = minFreq + freqRange * normalizedY;
  
  // Final clamp to ensure it's within the scale's bounds
  return Math.max(minFreq, Math.min(maxFreq, frequency));
};


/**
 * Calculates the player's score based on position and rhythm accuracy.
 * @param sequence - The original sequence.
 * @param playerClicks - The recorded clicks from the player.
 * @param maxPosError - The maximum distance for a position score > 0.
 * @param maxRhythmError - The maximum time difference for a rhythm score > 0.
 * @returns A Score object with position, rhythm, and total scores.
 */
export const calculateScore = (
  sequence: CircleDefinition[], 
  playerClicks: PlayerClick[],
  maxPosError: number,
  maxRhythmError: number
): Score => {
  if (playerClicks.length === 0 || sequence.length === 0) {
    return { position: 0, rhythm: 0, total: 0 };
  }

  // --- Position Score ---
  let totalPositionScore = 0;
  // Match clicks to the nearest circle in the sequence to handle out-of-order clicks gracefully.
  const unmatchedSequence = [...sequence];
  
  playerClicks.forEach(click => {
    if (unmatchedSequence.length === 0) return;

    let closestCircleIndex = -1;
    let minDistance = Infinity;

    unmatchedSequence.forEach((circle, index) => {
        const distance = Math.hypot(click.x - circle.x, click.y - circle.y);
        if (distance < minDistance) {
            minDistance = distance;
            closestCircleIndex = index;
        }
    });

    if (closestCircleIndex !== -1) {
        // Score is 100% at 0 distance, 0% at maxPosError distance, linearly interpolated.
        const positionScore = Math.max(0, 100 * (1 - minDistance / maxPosError));
        totalPositionScore += positionScore;
        unmatchedSequence.splice(closestCircleIndex, 1);
    }
  });
  const avgPositionScore = totalPositionScore / sequence.length;

  // --- Rhythm Score ---
  // Based on intervals from the first click.
  let totalRhythmScore = 0;
  if (sequence.length > 1 && playerClicks.length > 1) {
    const originalIntervals = [];
    for (let i = 1; i < sequence.length; i++) {
      originalIntervals.push(sequence[i].time - sequence[0].time);
    }

    const playerIntervals = [];
    for (let i = 1; i < playerClicks.length; i++) {
        playerIntervals.push(playerClicks[i].time - playerClicks[0].time);
    }

    const numIntervals = Math.min(originalIntervals.length, playerIntervals.length);
    for (let i = 0; i < numIntervals; i++) {
      const error = Math.abs(playerIntervals[i] - originalIntervals[i]);
      const rhythmScore = Math.max(0, 100 * (1 - error / maxRhythmError));
      totalRhythmScore += rhythmScore;
    }
     const avgRhythmScore = totalRhythmScore / (sequence.length - 1);
     const total = (avgPositionScore + avgRhythmScore) / 2;

    return {
      position: Math.round(avgPositionScore),
      rhythm: Math.round(avgRhythmScore),
      total: Math.round(total),
    };
  }

  // If only one circle, rhythm is 100% by default.
  const total = avgPositionScore;
  return {
    position: Math.round(avgPositionScore),
    rhythm: 100,
    total: Math.round(total),
  };
};