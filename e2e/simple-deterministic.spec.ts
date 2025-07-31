import { test, expect } from '@playwright/test';

test.describe('Simple Deterministic Test', () => {
  test('should enable test mode and capture console output', async ({ page }) => {
    const messages: string[] = [];
    
    // Capture all console messages
    page.on('console', msg => {
      messages.push(msg.text());
      console.log('Console:', msg.text());
    });
    
    // Go to test mode
    await page.goto('/?test=true&seed=12345');
    
    // Wait a bit for initialization
    await page.waitForTimeout(1000);
    
    // Should see test mode message
    const testModeMessage = messages.find(msg => msg.includes('🧪 E2E Test mode active'));
    expect(testModeMessage).toBeTruthy();
    
    // Check title includes TEST MODE
    const title = await page.title();
    expect(title).toContain('[TEST MODE]');
    
    console.log('All captured messages:', messages);
  });

  test('should start game in test mode', async ({ page }) => {
    const debugMessages: string[] = [];
    
    page.on('console', msg => {
      if (msg.text().includes('DEBUG:')) {
        debugMessages.push(msg.text());
        console.log('Debug:', msg.text());
      }
    });
    
    await page.goto('/?test=true&seed=12345');
    await page.click('button:has-text("Start Game")');
    
    // Wait for game to start
    await page.waitForTimeout(2000);
    
    console.log('Debug messages captured:', debugMessages.length);
    debugMessages.forEach(msg => console.log('  -', msg));
  });
});