import { test, expect } from '@playwright/test';

test.describe('Memorhythm Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the game homepage', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle('Memorhythm');
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Memorhythm');
    
    // Check description
    await expect(page.locator('text=Test your memory and sense of rhythm.')).toBeVisible();
    
    // Check start button
    await expect(page.locator('button:has-text("Start Game")')).toBeVisible();
  });

  test('should start game and show playback phase', async ({ page }) => {
    // Click start game
    await page.click('button:has-text("Start Game")');
    
    // Should show round 1 (it's displayed as a number in the HUD)
    await expect(page.locator('text=Round')).toBeVisible();
    await expect(page.locator('div:has-text("1")').last()).toBeVisible();
    
    // Should show mute button (it's a button with SVG icon, not text)
    await expect(page.locator('button[aria-label*="Mute"]')).toBeVisible();
    
    // Should show "Watch Carefully..." initially
    await expect(page.locator('h2:has-text("Watch Carefully...")')).toBeVisible();
  });

  test('should transition from playback to player turn', async ({ page }) => {
    // Start the game
    await page.click('button:has-text("Start Game")');
    
    // Wait for playback to complete and player turn to begin
    // This should happen within a few seconds based on the game logic
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible({ timeout: 10000 });
    
    // Should show clicks remaining
    await expect(page.locator('text=Clicks Left')).toBeVisible();
  });

  test('should handle mute functionality', async ({ page }) => {
    // Start the game
    await page.click('button:has-text("Start Game")');
    
    // Click mute button (using aria-label since it's an icon button)
    const muteButton = page.locator('button[aria-label*="Mute"]');
    await expect(muteButton).toBeVisible();
    await muteButton.click();
    
    // Button should still be visible but might have changed aria-label
    await expect(page.locator('button[aria-label*="mute"]')).toBeVisible();
  });

  test('should show game canvas', async ({ page }) => {
    // Start the game
    await page.click('button:has-text("Start Game")');
    
    // Wait for canvas to be ready
    await page.waitForTimeout(1000);
    
    // Check that canvas element exists (it's rendered by Vue component)
    // The exact selector may need adjustment based on how GameCanvas renders
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should complete a full game flow', async ({ page }) => {
    // Enable console logging to capture debug info
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('DEBUG:')) {
        consoleMessages.push(msg.text());
      }
    });

    // Start the game
    await page.click('button:has-text("Start Game")');
    
    // Wait for player turn
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible({ timeout: 10000 });
    
    // Get canvas element for clicking
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Click on canvas multiple times (simulating player input)
    // Note: These are random clicks since we don't have deterministic sequences yet
    await canvas.click({ position: { x: 100, y: 200 } });
    await page.waitForTimeout(500);
    await canvas.click({ position: { x: 300, y: 400 } });
    await page.waitForTimeout(500);
    await canvas.click({ position: { x: 500, y: 300 } });
    
    // Wait for scoring phase
    await expect(page.locator('text=Position Accuracy')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Rhythm Accuracy')).toBeVisible();
    await expect(page.locator('text=Total Score')).toBeVisible();
    
    // Should show next round button or restart
    await expect(page.locator('button:has-text("Next Round"), button:has-text("Restart from Round 1")')).toBeVisible();
  });
});