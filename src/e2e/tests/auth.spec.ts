import { test, expect } from '@playwright/test';
import { loginAs, loginAsAdmin, loginAsUser, clearAuthAndGoToLogin } from './helpers';

test.describe('認証テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('AUTH-001: ユーザIDでログインできる', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[autocomplete="username"]', 'user001');
    await page.fill('input[autocomplete="current-password"]', 'password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h2:has-text("アクティビティフィード")')).toBeVisible();
  });

  test('AUTH-002: メールアドレスでログインできる', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[autocomplete="username"]', 'user002@example.com');
    await page.fill('input[autocomplete="current-password"]', 'password2');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h2:has-text("アクティビティフィード")')).toBeVisible();
  });

  test('AUTH-003: 誤った認証情報でログインが失敗する', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[autocomplete="username"]', 'user001');
    await page.fill('input[autocomplete="current-password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=ユーザIDまたはパスワードが正しくありません')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('AUTH-004: ログアウトで /login にリダイレクトされる', async ({ page }) => {
    await loginAsUser(page, 1);
    await expect(page).toHaveURL('/');
    // Click the logout button in Header
    await page.click('button:has-text("ログアウト")');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('AUTH-005: ログアウト後にダッシュボードへアクセスすると /login にリダイレクト', async ({ page }) => {
    await loginAsUser(page, 1);
    await page.click('button:has-text("ログアウト")');
    await page.waitForURL('/login');
    // Try navigating to /dashboard after logout
    await page.goto('/dashboard');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('AUTH-006: 未認証で /dashboard にアクセスすると /login にリダイレクト', async ({ page }) => {
    // Navigate to base URL first, then clear auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    await page.goto('/dashboard');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('AUTH-007: 一般ユーザが /admin/users にアクセスすると / にリダイレクト', async ({ page }) => {
    await loginAsUser(page, 1);
    await page.goto('/admin/users');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
