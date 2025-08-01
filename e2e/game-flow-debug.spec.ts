import { test, expect } from '@playwright/test';

test.describe('Game Flow Debug', () => {
  test('should handle failed game flow correctly without auto-restart', async ({ page }) => {
    // Enable test mode to avoid leaderboard submissions and get predictable sequences
    await page.goto('/?test=true&seed=12345');
    
    // Wait for page to load
    await expect(page.locator('h1:has-text("Memorhythm")')).toBeVisible();
    
    // Should be on start screen
    await expect(page.locator('button:has-text("Start Game")')).toBeVisible();
    console.log('✓ Start screen loaded');
    
    // Start the game
    await page.click('button:has-text("Start Game")');
    console.log('✓ Clicked Start Game');
    
    // Wait for playback phase
    await expect(page.locator('h2:has-text("Watch Carefully")')).toBeVisible();
    console.log('✓ Playback phase started');
    
    // Wait for player turn
    await expect(page.locator('h2:has-text("Your Turn")')).toBeVisible({ timeout: 10000 });
    console.log('✓ Player turn started');
    
    // Make deliberately bad clicks to fail the round - avoid top-left corner (mute button)
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 300, y: 300 } }); // Center area, far from targets
    await page.waitForTimeout(500);
    await canvas.click({ position: { x: 400, y: 400 } }); // Center area, far from targets  
    await page.waitForTimeout(500);
    await canvas.click({ position: { x: 500, y: 500 } }); // Center area, far from targets
    console.log('✓ Made 3 bad clicks');
    
    // Wait for scoring phase
    await expect(page.locator('h2:has-text("Try Again")')).toBeVisible({ timeout: 5000 });
    console.log('✓ Scoring phase shows "Try Again" (failed)');
    
    // Should show "Restart from Round 1" button
    await expect(page.locator('button:has-text("Restart from Round 1")')).toBeVisible();
    console.log('✓ Shows "Restart from Round 1" button');
    
    // CRITICAL: Should NOT auto-redirect - should stay on scoring screen indefinitely
    await page.waitForTimeout(5000); // Wait 5 seconds
    
    // Should STILL be showing the scoring screen with the button
    await expect(page.locator('h2:has-text("Try Again")')).toBeVisible();
    await expect(page.locator('button:has-text("Restart from Round 1")')).toBeVisible();
    console.log('✅ SUCCESS: Scoring screen stayed visible after 5 seconds - no auto-redirect');
    
    // Test manual restart by clicking the button
    await page.click('button:has-text("Restart from Round 1")');
    console.log('✓ Clicked "Restart from Round 1" button');
    
    // Should return to start screen after manual click
    await expect(page.locator('h1:has-text("Memorhythm")')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('button:has-text("Start Game")')).toBeVisible();
    console.log('✅ SUCCESS: Returned to start screen after manual button click');
  });
});