import { CircleDefinition } from '../types';
import { generateSequence } from './gameLogic';
import { enableDeterministicMode, isTestMode } from './seededRandom';

/**
 * Generate a deterministic sequence for testing
 * Uses the existing generateSequence function but with seeded randomness
 */
export function generateDeterministicSequence(
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  seed: number = 12345
): CircleDefinition[] {
  // Temporarily enable deterministic mode if not already enabled
  const wasTestMode = isTestMode();
  if (!wasTestMode) {
    enableDeterministicMode(seed);
  }
  
  // Generate sequence using existing logic (now deterministic)
  const sequence = generateSequence(count, canvasWidth, canvasHeight);
  
  // Log sequence for debugging
  console.log(`🧪 Generated deterministic sequence (seed: ${seed}):`);
  sequence.forEach((circle, index) => {
    console.log(`  Circle ${index + 1}: x=${Math.round(circle.x)}, y=${Math.round(circle.y)}, time=${circle.time}ms, freq=${Math.round(circle.frequency)}Hz`);
  });
  
  return sequence;
}

/**
 * Predefined test sequences for consistent testing
 * These are pre-calculated with specific seeds for predictable testing
 */
export const TEST_SEQUENCES = {
  // Round 1 (3 circles) with seed 12345
  ROUND_1_SEED_12345: {
    seed: 12345,
    count: 3,
    expectedSequence: [
      // These would be filled in after running the generator once
      // For now, we'll calculate them dynamically
    ]
  },
  
  // Round 2 (4 circles) with seed 54321  
  ROUND_2_SEED_54321: {
    seed: 54321,
    count: 4,
    expectedSequence: []
  }
};

/**
 * Get a known test sequence by name
 */
export function getTestSequence(
  sequenceName: keyof typeof TEST_SEQUENCES,
  canvasWidth: number = 1920,
  canvasHeight: number = 1080
): CircleDefinition[] {
  const testData = TEST_SEQUENCES[sequenceName];
  return generateDeterministicSequence(testData.count, canvasWidth, canvasHeight, testData.seed);
}

/**
 * Verify that two sequences are identical (for testing determinism)
 */
export function sequencesMatch(seq1: CircleDefinition[], seq2: CircleDefinition[]): boolean {
  if (seq1.length !== seq2.length) return false;
  
  return seq1.every((circle1, index) => {
    const circle2 = seq2[index];
    return (
      Math.abs(circle1.x - circle2.x) < 0.001 &&
      Math.abs(circle1.y - circle2.y) < 0.001 &&
      circle1.time === circle2.time &&
      Math.abs(circle1.frequency - circle2.frequency) < 0.001 &&
      circle1.color === circle2.color
    );
  });
}