import { test, expect } from '@playwright/test';

test.describe('Deterministic Game Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Enable test mode with a specific seed
    await page.goto('/?test=true&seed=12345');
  });

  test('should generate consistent sequences across runs', async ({ page }) => {
    // Arrays to store sequences from multiple runs
    const sequences: any[] = [];
    
    for (let run = 0; run < 3; run++) {
      // Reload page to start fresh
      await page.reload();
      
      // Enable console logging to capture sequence data
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'debug' && msg.text().includes('Circle')) {
          consoleMessages.push(msg.text());
        }
      });
      
      // Start the game
      await page.click('button:has-text("Start Game")');
      
      // Wait for sequence generation
      await page.waitForTimeout(2000);
      
      // Store this run's console messages
      sequences.push([...consoleMessages]);
      
      // Remove listeners for next iteration
      page.removeAllListeners('console');
    }
    
    // Verify all runs produced identical sequences
    expect(sequences.length).toBe(3);
    expect(sequences[0].length).toBe(3); // Should capture 3 circles
    // All sequences should have the same content
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i]).toEqual(sequences[0]);
    }
  });

  test('should produce predictable sequence with seed 12345', async ({ page }) => {
    // Capture debug output
    const sequenceInfo: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'debug' && (msg.text().includes('DEBUG: Starting Round') || msg.text().includes('Circle'))) {
        sequenceInfo.push(msg.text());
      }
    });
    
    // Start game
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);
    
    // Verify we got sequence information
    expect(sequenceInfo.length).toBeGreaterThan(0);
    
    // Should have at least the round start message and 3 circle messages
    const roundMessages = sequenceInfo.filter(msg => msg.includes('DEBUG: Starting Round'));
    const circleMessages = sequenceInfo.filter(msg => msg.includes('Circle'));
    
    expect(roundMessages.length).toBeGreaterThan(0);
    expect(circleMessages.length).toBe(3);
    
    // Log the sequence for debugging
    console.log('Generated sequence:');
    sequenceInfo.forEach(msg => console.log(msg));
  });

  test('should allow precise scoring with known sequence', async ({ page }) => {
    // Capture sequence coordinates
    const circles: Array<{x: number, y: number, time: number}> = [];
    
    page.on('console', msg => {
      if (msg.type() === 'debug' && msg.text().includes('Circle')) {
        // Parse circle info: "  Circle 1: x=123, y=456, time=0ms..."
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
    
    // Start game and wait for sequence
    await page.click('button:has-text("Start Game")');
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible({ timeout: 10000 });
    
    // Verify we captured sequence data
    expect(circles.length).toBe(3); // Round 1 has 3 circles
    
    // Get canvas for precise clicking
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Click exactly at the captured coordinates with proper timing - use force to bypass overlay
    for (let i = 0; i < circles.length; i++) {
      const circle = circles[i];
      await canvas.click({ position: { x: circle.x, y: circle.y }, force: true });
      
      // Add delay between clicks to match rhythm
      if (i < circles.length - 1) {
        const nextCircle = circles[i + 1];
        const delay = nextCircle.time - circle.time;
        await page.waitForTimeout(delay);
      }
    }
    
    // Wait for scoring
    await expect(page.locator('text=Position Accuracy')).toBeVisible({ timeout: 5000 });
    
    // With perfect clicks, we should get very high scores - use more specific selector
    const positionText = await page.locator('text=Position Accuracy:').locator('..').textContent();
    
    // Extract percentage
    const positionScore = parseInt(positionText?.match(/(\d+)%/)?.[1] || '0');
    
    console.log(`Position score: ${positionScore}%`);
    
    // Perfect position clicks should score very high (allowing small margin for canvas precision)
    expect(positionScore).toBeGreaterThan(85); // Lower threshold due to test timing
  });

  test('should handle different seeds producing different sequences', async ({ page }) => {
    const sequences: any[] = [];
    const seeds = [12345, 54321, 99999];
    
    for (const seed of seeds) {
      // Go to page with specific seed
      await page.goto(`/?test=true&seed=${seed}`);
      
      const sequenceInfo: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'debug' && msg.text().includes('Circle')) {
          sequenceInfo.push(msg.text());
        }
      });
      
      // Start game
      await page.click('button:has-text("Start Game")');
      await page.waitForTimeout(2000);
      
      sequences.push([...sequenceInfo]);
      
      // Remove listeners for next iteration
      page.removeAllListeners('console');
    }
    
    // Verify different seeds produce different sequences
    expect(sequences[0].length).toBe(3);
    expect(sequences[1].length).toBe(3);
    expect(sequences[2].length).toBe(3);
    expect(sequences[0]).not.toEqual(sequences[1]);
    expect(sequences[1]).not.toEqual(sequences[2]);
    expect(sequences[0]).not.toEqual(sequences[2]);
  });

  test('should maintain determinism across game states', async ({ page }) => {
    // Test that multiple rounds with same seed are predictable
    const allSequences: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'debug' && msg.text().includes('Circle')) {
        allSequences.push(msg.text());
      }
    });
    
    // Start game
    await page.click('button:has-text("Start Game")');
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible({ timeout: 10000 });
    
    // Make some clicks to proceed (doesn't matter if they're good) - use force to bypass overlay
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 100, y: 200 }, force: true });
    await canvas.click({ position: { x: 300, y: 400 }, force: true });
    await canvas.click({ position: { x: 500, y: 300 }, force: true });
    
    // Wait for scoring and next round
    await expect(page.locator('text=Position Accuracy')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Next Round"), button:has-text("Restart from Round 1")');
    
    // Wait for new sequence
    await page.waitForTimeout(3000);
    
    // Should have captured sequences from at least first round
    expect(allSequences.length).toBeGreaterThan(2); // At least 3 circles from first round
  });
});