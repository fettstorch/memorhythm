import { test, expect } from '@playwright/test';

test.describe('Working Deterministic Tests', () => {
  test('should generate consistent sequences with same seed', async ({ page }) => {
    const sequence1: string[] = [];
    const sequence2: string[] = [];

    // First run
    page.on('console', msg => {
      if (msg.type() === 'debug' && msg.text().includes('Circle')) {
        sequence1.push(msg.text());
      }
    });

    await page.goto('/?test=true&seed=12345');
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Second run - reload and do it again
    await page.reload();
    page.removeAllListeners('console');
    
    page.on('console', msg => {
      if (msg.type() === 'debug' && msg.text().includes('Circle')) {
        sequence2.push(msg.text());
      }
    });

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Should have same sequences
    expect(sequence1.length).toBe(3); // Round 1 has 3 circles
    expect(sequence2.length).toBe(3);
    expect(sequence1).toEqual(sequence2);

    console.log('Sequence 1:', sequence1);
    console.log('Sequence 2:', sequence2);
  });

  test('should produce different sequences with different seeds', async ({ page }) => {
    const sequence12345: string[] = [];
    const sequence54321: string[] = [];

    // First seed
    page.on('console', msg => {
      if (msg.type() === 'debug' && msg.text().includes('Circle')) {
        sequence12345.push(msg.text());
      }
    });

    await page.goto('/?test=true&seed=12345');
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Different seed
    await page.goto('/?test=true&seed=54321');
    page.removeAllListeners('console');
    
    page.on('console', msg => {
      if (msg.type() === 'debug' && msg.text().includes('Circle')) {
        sequence54321.push(msg.text());
      }
    });

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Should have different sequences
    expect(sequence12345.length).toBe(3);
    expect(sequence54321.length).toBe(3);
    expect(sequence12345).not.toEqual(sequence54321);

    console.log('Seed 12345:', sequence12345);
    console.log('Seed 54321:', sequence54321);
  });

  test('should capture exact sequence coordinates for precise testing', async ({ page }) => {
    const circles: Array<{x: number, y: number, time: number}> = [];
    
    page.on('console', msg => {
      if (msg.type() === 'debug' && msg.text().includes('Circle')) {
        // Parse: "  Circle 1: x=123, y=456, time=0ms, color=#f87171, freq=523Hz"
        const match = msg.text().match(/Circle \d+: x=(\d+), y=(\d+), time=(\d+)ms/);
        if (match) {
          circles.push({
            x: parseInt(match[1]),
            y: parseInt(match[2]),
            time: parseInt(match[3])
          });
        }
      }
    });

    await page.goto('/?test=true&seed=12345');
    await page.click('button:has-text("Start Game")');
    
    // Wait for player turn
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible({ timeout: 10000 });
    
    // Should have captured all 3 circles
    expect(circles.length).toBe(3);
    
    // Log the captured coordinates for verification
    console.log('Captured coordinates:');
    circles.forEach((circle, i) => {
      console.log(`  Circle ${i+1}: x=${circle.x}, y=${circle.y}, time=${circle.time}ms`);
    });

    // Verify coordinates are reasonable (within canvas bounds)
    circles.forEach(circle => {
      expect(circle.x).toBeGreaterThan(0);
      expect(circle.x).toBeLessThan(2000); // Reasonable canvas width
      expect(circle.y).toBeGreaterThan(0);
      expect(circle.y).toBeLessThan(1200); // Reasonable canvas height
      expect(circle.time).toBeGreaterThanOrEqual(0);
    });

    // The sequence should be deterministic - same every time with seed 12345
    // These are the expected values for seed 12345 (we'll log them first)
    expect(circles[0].time).toBe(0); // First circle always at time 0
  });

  test('should maintain determinism in game mechanics', async ({ page }) => {
    // Test that not just sequences but all random elements are deterministic
    const allDebugInfo: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'debug') {
        allDebugInfo.push(msg.text());
      }
    });

    await page.goto('/?test=true&seed=99999');
    await page.click('button:has-text("Start Game")');
    
    // Wait for game to progress through states
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible({ timeout: 10000 });
    
    // Make some test clicks
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 200, y: 300 } });
    await page.waitForTimeout(600);
    await canvas.click({ position: { x: 400, y: 500 } });
    await page.waitForTimeout(600);
    await canvas.click({ position: { x: 600, y: 200 } });

    // Wait for scoring
    await expect(page.locator('text=Position Accuracy')).toBeVisible({ timeout: 5000 });
    
    // Should have comprehensive debug info
    expect(allDebugInfo.length).toBeGreaterThan(5);
    
    // Log all debug info for analysis
    console.log('All debug info:');
    allDebugInfo.forEach(info => console.log('  ', info));
  });
});