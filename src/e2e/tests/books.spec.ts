import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './helpers';

test.describe('図書一覧・詳細テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('BOOK-001: 図書一覧ページに10件以上の図書が表示される', async ({ page }) => {
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("図書を探す")')).toBeVisible();
    // Should have at least 10 books from initial data
    const countText = await page.locator('div').filter({ hasText: /^全 \d+ 件$/ }).first().textContent();
    const match = countText?.match(/全 (\d+) 件/);
    const count = match ? parseInt(match[1]) : 0;
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('BOOK-002: タイトルで図書を検索できる（部分一致）', async ({ page }) => {
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'Java');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Java入門')).toBeVisible();
  });

  test('BOOK-003: カテゴリで図書を絞り込める', async ({ page }) => {
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.selectOption('select', 'プログラミング');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    // Should find programming books
    await expect(page.locator('text=Java入門')).toBeVisible();
  });

  test('BOOK-004: 存在しないタイトルで検索すると「該当する図書が見つかりませんでした」が表示される', async ({ page }) => {
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'この図書は絶対に存在しない12345xyz');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=該当する図書が見つかりませんでした')).toBeVisible();
  });

  test('BOOK-005: 図書詳細ページにタイトル・著者・ISBN等が表示される', async ({ page }) => {
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    // Click on Java入門
    await page.fill('input[placeholder="タイトル"]', 'Java入門');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=Java入門');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("Java入門")')).toBeVisible();
    await expect(page.locator('text=山田太郎')).toBeVisible();
    await expect(page.locator('text=9784123456789')).toBeVisible();
    await expect(page.locator('text=プログラミング')).toBeVisible();
    await expect(page.locator('text=3冊')).toBeVisible();
  });

  test('BOOK-006: 存在しない図書IDにアクセスすると「図書が見つかりませんでした」が表示される', async ({ page }) => {
    await loginAsUser(page, 2);
    await page.goto('/books/999999');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=図書が見つかりませんでした')).toBeVisible();
  });

  test('BOOK-007: 図書一覧で貸出可能冊数が表示される', async ({ page }) => {
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    // Java入門 has 3 copies, 1 loaned → 2 available
    // At least some books should show 貸出可能
    await expect(page.locator('text=貸出可能').first()).toBeVisible();
  });
});
