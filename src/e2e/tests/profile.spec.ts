import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers';

test.describe('プロフィールテスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('PROF-001: プロフィールの名前を更新できる', async ({ page }) => {
    await loginAsUser(page, 5);
    await page.goto('/me/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("プロフィール")')).toBeVisible();

    // Update name
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('ユーザ5更新');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=プロフィールを更新しました')).toBeVisible();

    // Revert
    await nameInput.fill('ユーザ5');
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
  });

  test('PROF-002: パスワードを変更できる', async ({ page }) => {
    await loginAsUser(page, 5);
    await page.goto('/me/password');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("パスワード変更")')).toBeVisible();

    // Fill password form
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill('password5');
    await inputs.nth(1).fill('password5new1');
    await inputs.nth(2).fill('password5new1');
    await page.click('button:has-text("変更する")');
    await expect(page.locator('text=パスワードを変更しました')).toBeVisible();

    // Revert password
    await page.goto('/me/password');
    await page.waitForLoadState('networkidle');
    const inputs2 = page.locator('input[type="password"]');
    await inputs2.nth(0).fill('password5new1');
    await inputs2.nth(1).fill('password5');
    await inputs2.nth(2).fill('password5');
    await page.click('button:has-text("変更する")');
    await page.waitForTimeout(500);
  });

  test('PROF-003: 誤った現在のパスワードではエラーが表示される', async ({ page }) => {
    await loginAsUser(page, 5);
    await page.goto('/me/password');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill('wrongpassword123');
    await inputs.nth(1).fill('newpassword123');
    await inputs.nth(2).fill('newpassword123');
    await page.click('button:has-text("変更する")');

    // Backend throws BadCredentialsException → 401 with "ユーザIDまたはパスワードが正しくありません"
    await expect(page.locator('text=ユーザIDまたはパスワードが正しくありません')).toBeVisible();
  });

  test('PROF-004: フォントサイズ設定を変更できる', async ({ page }) => {
    await loginAsUser(page, 5);
    await page.goto('/me/profile');
    await page.waitForLoadState('networkidle');

    // Select 大 (LARGE) font size
    await page.locator('input[type="radio"][value="LARGE"]').click();
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=プロフィールを更新しました')).toBeVisible();

    // Revert to NORMAL
    await page.locator('input[type="radio"][value="NORMAL"]').click();
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
  });
});
