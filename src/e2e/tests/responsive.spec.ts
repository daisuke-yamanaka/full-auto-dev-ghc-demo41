import { test, expect } from '@playwright/test';

test.describe('レスポンシブデザインテスト（FR-030）', () => {
  test.describe.configure({ mode: 'serial' });

  test('RESP-001: モバイルビューポート（375x667）でログインページが表示・操作できる', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login form elements are visible and accessible
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Can actually fill and submit the form
    await page.fill('input[autocomplete="username"]', 'user001');
    await page.fill('input[autocomplete="current-password"]', 'password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('RESP-002: モバイルビューポート（375x667）でハンバーガーメニューが表示される', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[autocomplete="username"]', 'user001');
    await page.fill('input[autocomplete="current-password"]', 'password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Hamburger menu button is visible on mobile
    await expect(page.locator('button[aria-label="メニュー"]')).toBeVisible({ timeout: 10000 });

    // Clicking the hamburger menu opens the drawer
    await page.click('button[aria-label="メニュー"]');
    await page.waitForTimeout(500);
    // After clicking hamburger, navigation items should appear (ナビゲーション link/text)
    await expect(page.locator('text=図書を探す').first()).toBeVisible({ timeout: 5000 });
  });

  test('RESP-003: タブレットビューポート（768x1024）で図書一覧が表示される', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[autocomplete="username"]', 'user001');
    await page.fill('input[autocomplete="current-password"]', 'password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("図書を探す")')).toBeVisible();
    // Book list items are visible
    await expect(page.locator('text=Java入門')).toBeVisible({ timeout: 10000 });
  });

  test('RESP-004: PCビューポート（1280x720）で図書一覧が表示される', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[autocomplete="username"]', 'user001');
    await page.fill('input[autocomplete="current-password"]', 'password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("図書を探す")')).toBeVisible();
    // Book list items are visible on PC
    await expect(page.locator('text=Java入門')).toBeVisible({ timeout: 10000 });
    // Hamburger menu is also visible on PC
    await expect(page.locator('button[aria-label="メニュー"]')).toBeVisible();
  });
});
