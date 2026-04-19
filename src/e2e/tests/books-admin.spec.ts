import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsUser } from './helpers';

async function fillBookForm(page: any, data: {
  title: string; author: string; isbn: string; publisher: string;
  year: string; category: string; copies: string;
}) {
  // BookFormPage inputs are in order: タイトル, 著者名, ISBN, 出版社, 出版年, カテゴリ, 蔵書数
  const inputs = page.locator('form input');
  await inputs.nth(0).fill(data.title);
  await inputs.nth(1).fill(data.author);
  await inputs.nth(2).fill(data.isbn);
  await inputs.nth(3).fill(data.publisher);
  await inputs.nth(4).fill(data.year);
  await inputs.nth(5).fill(data.category);
  await inputs.nth(6).fill(data.copies);
}

test.describe('図書管理テスト（管理者）', () => {
  test.describe.configure({ mode: 'serial' });

  test('BADM-001: 管理者が新しい図書を登録できる', async ({ page }) => {
    await loginAsAdmin(page);

    // First, clean up any existing test book from previous runs
    await page.goto('/admin/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'テスト図書E2E');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    const deleteBtn = page.locator('button:has-text("🗑️")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await expect(page.locator('text=図書の削除')).toBeVisible();
      await page.click('button:has-text("削除する")');
      await page.waitForTimeout(500);
    }

    await page.goto('/admin/books/new');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("図書登録")')).toBeVisible();

    await fillBookForm(page, {
      title: 'テスト図書E2E',
      author: 'テスト著者',
      isbn: '9780000000001',
      publisher: 'テスト出版社',
      year: '2024',
      category: 'テスト',
      copies: '2',
    });

    await page.click('button[type="submit"]');
    await expect(page.locator('text=図書を登録しました')).toBeVisible();
  });

  test('BADM-002: 管理者が図書情報を編集できる', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/books');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("図書管理")')).toBeVisible();

    // Search for テスト図書E2E
    await page.fill('input[placeholder="タイトル"]', 'テスト図書E2E');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');

    // Click edit link
    await page.locator('a[href$="/edit"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("図書編集")')).toBeVisible();

    // Change title using form input nth
    const editInputs = page.locator('form input');
    await editInputs.nth(0).fill('テスト図書E2E更新');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=図書を更新しました')).toBeVisible();
  });

  test('BADM-003: 管理者が図書を削除できる（確認ダイアログ経由）', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/books');
    await page.waitForLoadState('networkidle');

    // Search for the test book
    await page.fill('input[placeholder="タイトル"]', 'テスト図書E2E更新');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=テスト図書E2E更新')).toBeVisible();

    // Click delete button
    await page.locator('button:has-text("🗑️")').first().click();

    // Confirm dialog appears
    await expect(page.locator('text=図書の削除')).toBeVisible();
    await page.click('button:has-text("削除する")');
    await expect(page.locator('text=を削除しました')).toBeVisible();
  });

  test('BADM-004: 一般ユーザが /admin/books にアクセスすると / にリダイレクト', async ({ page }) => {
    await loginAsUser(page, 3);
    await page.goto('/admin/books');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
