import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsUser } from './helpers';

test.describe('ユーザ管理テスト（管理者）', () => {
  test.describe.configure({ mode: 'serial' });

  const testUserId = `e2etest_${Date.now()}`.slice(0, 20);

  test('USR-001: 管理者がユーザを新規作成できる', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("ユーザ管理")')).toBeVisible();

    // Click create button
    await page.click('button:has-text("+ ユーザ追加")');

    // Dialog opens
    await expect(page.locator('h3:has-text("ユーザ登録")')).toBeVisible();

    await page.fill('input[placeholder="ユーザID"]', testUserId);
    await page.fill('input[placeholder="メールアドレス"]', `${testUserId}@test.com`);
    await page.fill('input[placeholder="名前"]', 'E2Eテストユーザ');
    await page.fill('input[placeholder="パスワード（8文字以上）"]', 'testpassword1');

    await page.click('button:has-text("登録")');
    await expect(page.locator('text=ユーザを登録しました')).toBeVisible();
  });

  test('USR-002: 管理者がユーザ情報を編集できる', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Find the test user row and click edit
    const row = page.locator('tr').filter({ hasText: testUserId });
    await row.locator('button[title="編集"]').click();

    // Edit dialog opens
    await expect(page.locator('h3:has-text("ユーザ編集")')).toBeVisible();

    // Update name
    await page.fill('input[placeholder="名前"]', 'E2Eテストユーザ更新');
    await page.click('button:has-text("更新")');
    await expect(page.locator('text=ユーザを更新しました')).toBeVisible();
  });

  test('USR-004: 管理者がユーザのパスワードを再設定できる', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Find the test user row and click reset password
    const row = page.locator('tr').filter({ hasText: testUserId });
    await row.locator('button[title="PW再設定"]').click();

    // Reset password dialog opens
    await expect(page.locator('h3:has-text("パスワード再設定")')).toBeVisible();

    await page.fill('input[placeholder="新しいパスワード（8文字以上）"]', 'newpassword1');
    await page.click('button:has-text("設定する")');
    await expect(page.locator('text=パスワードを再設定しました')).toBeVisible();
  });

  test('USR-003: 管理者がユーザを削除できる（確認ダイアログ経由）', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Find the test user row and click delete
    const row = page.locator('tr').filter({ hasText: testUserId });
    await row.locator('button[title="削除"]').click();

    // Confirm dialog
    await expect(page.locator('text=ユーザ削除')).toBeVisible();
    await page.click('button:has-text("削除する")');
    await expect(page.locator('text=ユーザを削除しました')).toBeVisible();
  });

  test('USR-005: 一般ユーザが /admin/users にアクセスすると / にリダイレクト', async ({ page }) => {
    await loginAsUser(page, 1);
    await page.goto('/admin/users');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});

test.describe('ページネーションテスト（FR-027）', () => {
  test('USRP-001: ユーザが21人以上いるとユーザ一覧にページネーションが表示される', async ({ page }) => {
    await loginAsAdmin(page);

    // Create 15 additional users to exceed page size of 20 (6 initial + 15 = 21)
    const createdUsers: Array<{ id: number; version: number }> = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      const users: Array<{ id: number; version: number }> = [];
      for (let i = 0; i < 15; i++) {
        const suffix = `${Date.now()}${i}`.slice(-8);
        const res = await fetch('http://localhost:8082/api/admin/users', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: `pg${suffix}`,
            email: `pg${suffix}@test.com`,
            name: `ページテスト${i}`,
            password: 'testpassword1',
            role: 'USER',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          users.push({ id: data.id, version: data.version ?? 0 });
        }
      }
      return users;
    });
    expect(createdUsers.length).toBeGreaterThan(0);

    // Navigate to admin users page
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("ユーザ管理")')).toBeVisible();

    // Pagination controls should be visible (more than 20 users)
    await expect(page.locator('button:has-text("次へ")')).toBeVisible({ timeout: 10000 });

    // Click next page and verify previous button becomes enabled
    await page.click('button:has-text("次へ")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("前へ")')).toBeVisible();

    // Cleanup: delete created test users
    await page.evaluate(async (users: Array<{ id: number; version: number }>) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      for (const user of users) {
        await fetch(`http://localhost:8082/api/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: user.version }),
        });
      }
    }, createdUsers);
  });
});
