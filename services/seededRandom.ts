/**
 * Seeded random number generator for deterministic testing
 * Uses a simple Linear Congruential Generator (LCG) algorithm
 */
export class SeededRandom {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed;
  }
  
  /**
   * Generate next random number between 0 and 1 (exclusive of 1)
   */
  next(): number {
    // LCG formula: (a * seed + c) % m
    // Using common LCG parameters
    this.seed = (this.seed * 1664525 + 1013904223) % (Math.pow(2, 32));
    return this.seed / Math.pow(2, 32);
  }
  
  /**
   * Reset the generator to its initial seed
   */
  reset(newSeed?: number): void {
    this.seed = newSeed ?? 12345;
  }
}

// Global seeded random instance for test mode
let globalSeededRandom: SeededRandom | null = null;

/**
 * Initialize global seeded random with a specific seed
 */
export function initSeededRandom(seed: number = 12345): void {
  globalSeededRandom = new SeededRandom(seed);
}

/**
 * Get seeded random value, fallback to Math.random() if not in test mode
 */
export function getSeededRandom(): number {
  return globalSeededRandom ? globalSeededRandom.next() : Math.random();
}

/**
 * Check if we're in deterministic test mode
 */
export function isTestMode(): boolean {
  return globalSeededRandom !== null;
}

/**
 * Override Math.random globally for test mode
 */
export function enableDeterministicMode(seed: number = 12345): void {
  initSeededRandom(seed);
  
  // Override Math.random globally
  const originalRandom = Math.random;
  Math.random = getSeededRandom;
  
  // Store original for potential restoration
  (window as any).__originalMathRandom = originalRandom;
  
  console.log(`🧪 Deterministic mode enabled with seed: ${seed}`);
}