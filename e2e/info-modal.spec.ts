import { test, expect } from '@playwright/test';

test.describe('Info Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show info button immediately on page load', async ({ page }) => {
    // Info button should be visible before starting the game
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await expect(infoButton).toBeVisible();
    
    // Mute button should not be visible yet (only appears after game starts)
    const muteButton = page.locator('button[aria-label*="Mute"]');
    await expect(muteButton).not.toBeVisible();
  });

  test('should open info modal when info button is clicked', async ({ page }) => {
    // Click the info button
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await infoButton.click();
    
    // Modal should be visible
    await expect(page.locator('text=How to Play Memorhythm')).toBeVisible();
    
    // Check that modal content is present
    await expect(page.locator('text=Game Flow')).toBeVisible();
    await expect(page.locator('text=Scoring Requirements')).toBeVisible();
    await expect(page.locator('text=Tips for Success')).toBeVisible();
    
    // Check specific game rules content
    await expect(page.locator('text=Watch Carefully:')).toBeVisible();
    await expect(page.locator('text=Your Turn:')).toBeVisible();
    await expect(page.locator('text=Position Accuracy: Must be ≥30% to pass')).toBeVisible();
    await expect(page.locator('text=Rhythm Accuracy: Must be ≥30% to pass')).toBeVisible();
    await expect(page.locator('text=Total Score: Must be ≥50% to complete the level')).toBeVisible();
  });

  test('should close info modal when X button is clicked', async ({ page }) => {
    // Open modal
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await infoButton.click();
    await expect(page.locator('text=How to Play Memorhythm')).toBeVisible();
    
    // Click X button to close
    const closeButton = page.locator('button[aria-label="Close info modal"]');
    await closeButton.click();
    
    // Modal should be hidden
    await expect(page.locator('text=How to Play Memorhythm')).not.toBeVisible();
  });

  test('should close info modal when "Got it!" button is clicked', async ({ page }) => {
    // Open modal
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await infoButton.click();
    await expect(page.locator('text=How to Play Memorhythm')).toBeVisible();
    
    // Click "Got it!" button to close
    const gotItButton = page.locator('button:has-text("Got it!")');
    await gotItButton.click();
    
    // Modal should be hidden
    await expect(page.locator('text=How to Play Memorhythm')).not.toBeVisible();
  });

  test('should close info modal when clicking outside the modal', async ({ page }) => {
    // Open modal
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await infoButton.click();
    await expect(page.locator('text=How to Play Memorhythm')).toBeVisible();
    
    // Click on the backdrop (outside the modal content)
    // Click on the modal backdrop but not on the modal content itself
    await page.locator('.absolute.inset-0.bg-black.bg-opacity-50').click({ position: { x: 50, y: 50 } });
    
    // Modal should be hidden
    await expect(page.locator('text=How to Play Memorhythm')).not.toBeVisible();
  });

  test('should close info modal when Escape key is pressed', async ({ page }) => {
    // Open modal
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await infoButton.click();
    await expect(page.locator('text=How to Play Memorhythm')).toBeVisible();
    
    // Press Escape key
    await page.keyboard.press('Escape');
    
    // Modal should be hidden
    await expect(page.locator('text=How to Play Memorhythm')).not.toBeVisible();
  });

  test('should show both info and mute buttons after game starts', async ({ page }) => {
    // Start the game
    await page.click('button:has-text("Start Game")');
    
    // Wait for the game to start and music setup to complete
    await expect(page.locator('h2:has-text("Watch Carefully...")')).toBeVisible();
    
    // Both buttons should now be visible
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    const muteButton = page.locator('button[aria-label*="Mute"]');
    
    await expect(infoButton).toBeVisible();
    await expect(muteButton).toBeVisible();
    
    // Info modal should still work after game starts
    await infoButton.click();
    await expect(page.locator('text=How to Play Memorhythm')).toBeVisible();
    
    // Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=How to Play Memorhythm')).not.toBeVisible();
  });

  test('should maintain game state while info modal is open', async ({ page }) => {
    // Start the game
    await page.click('button:has-text("Start Game")');
    await expect(page.locator('h2:has-text("Watch Carefully...")')).toBeVisible();
    
    // Wait for player turn
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible({ timeout: 10000 });
    
    // Open info modal during player turn
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await infoButton.click();
    await expect(page.locator('text=How to Play Memorhythm')).toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Game should still be in player turn state
    await expect(page.locator('h2:has-text("Your Turn!")')).toBeVisible();
    await expect(page.locator('text=Clicks Left')).toBeVisible();
  });

  test('should have proper modal styling and responsiveness', async ({ page }) => {
    // Open modal
    const infoButton = page.locator('button[aria-label="Game rules and information"]');
    await infoButton.click();
    
    // Check modal structure and styling classes
    const modal = page.locator('.absolute.inset-0.bg-black.bg-opacity-50');
    await expect(modal).toBeVisible();
    
    const modalContent = page.locator('.bg-gray-800.bg-opacity-95.backdrop-blur-sm.rounded-2xl');
    await expect(modalContent).toBeVisible();
    
    // Check that modal is scrollable if needed
    await expect(modalContent).toHaveCSS('overflow-y', 'auto');
    
    // Check that modal has proper max height (should be computed from 90vh)
    const maxHeight = await modalContent.evaluate(el => 
      window.getComputedStyle(el).getPropertyValue('max-height')
    );
    // The value should be a pixel value computed from 90vh (e.g., "648px")
    expect(maxHeight).toMatch(/^\d+px$/);
  });
});