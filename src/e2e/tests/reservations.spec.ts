import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers';

test.describe('予約テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('RES-003: 予約がない場合に「現在予約中の図書はありません」が表示される', async ({ page }) => {
    await loginAsUser(page, 5);
    // Cancel any existing reservations for clean state
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const resRes = await fetch('http://localhost:8082/api/me/reservations?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRes.ok) {
        const rd = await resRes.json();
        for (const r of (rd.reservations || [])) {
          await fetch(`http://localhost:8082/api/reservations/${r.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: r.version })
          });
        }
      }
    });
    await page.goto('/me/reservations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("予約一覧")')).toBeVisible();
    await expect(page.locator('text=現在予約中の図書はありません')).toBeVisible();
  });

  test('RES-001: 全冊貸出中の図書を予約できる', async ({ page }) => {
    // Use page.evaluate to reliably loan クリーンアーキテクチャ as user001
    await loginAsUser(page, 1);
    const loanResult = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return { success: false };
      // Return any existing loan for クリーンアーキテクチャ (idempotent)
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === 'クリーンアーキテクチャ');
      if (!book) return { success: false, reason: 'book not found' };
      if (book.availableCopies > 0) {
        const r = await fetch('http://localhost:8082/api/loans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
        return { success: r.ok, bookId: book.id };
      }
      // Already fully loaned (e.g., already borrowed by user001)
      return { success: true, bookId: book.id };
    });

    if (!loanResult.success) {
      throw new Error(`Setup failed: ${JSON.stringify(loanResult)}`);
    }

    // Now login as user005 and reserve it
    await loginAsUser(page, 5);
    // Cancel any existing reservation first
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const resRes = await fetch('http://localhost:8082/api/me/reservations?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRes.ok) {
        const rd = await resRes.json();
        for (const r of (rd.reservations || [])) {
          if (r.bookTitle === 'クリーンアーキテクチャ') {
            await fetch(`http://localhost:8082/api/reservations/${r.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: r.version })
            });
          }
        }
      }
    });

    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'クリーンアーキテクチャ');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=クリーンアーキテクチャ');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page.locator('text=全冊貸出中')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("予約する")')).toBeVisible();
    await page.click('button:has-text("予約する")');
    await expect(page.locator('text=「クリーンアーキテクチャ」を予約しました')).toBeVisible();
  });

  test('RES-002: 予約一覧から予約をキャンセルできる', async ({ page }) => {
    await loginAsUser(page, 5);
    await page.goto('/me/reservations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=クリーンアーキテクチャ')).toBeVisible();
    // Click cancel button (opens confirm dialog)
    await page.click('button:has-text("キャンセル")');
    // Confirm the cancellation in dialog
    await page.click('button:has-text("キャンセルする")');
    await expect(page.locator('text=「クリーンアーキテクチャ」の予約をキャンセルしました')).toBeVisible();
  });

  test('RES-004: 返却時に予約者に自動貸出される', async ({ page }) => {
    // Setup: user001 loans マイクロサービス設計 (1 copy) via API
    await loginAsUser(page, 1);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === 'マイクロサービス設計');
      if (!book) return;
      if (book.availableCopies > 0) {
        await fetch('http://localhost:8082/api/loans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
      }
    });

    // user002 reserves マイクロサービス設計 via API
    await loginAsUser(page, 2);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Cancel any existing reservation first
      const resRes = await fetch('http://localhost:8082/api/me/reservations?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRes.ok) {
        const rd = await resRes.json();
        for (const r of (rd.reservations || [])) {
          if (r.bookTitle === 'マイクロサービス設計') {
            await fetch(`http://localhost:8082/api/reservations/${r.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: r.version })
            });
          }
        }
      }
      // Now reserve マイクロサービス設計
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === 'マイクロサービス設計');
      if (!book) return;
      await fetch('http://localhost:8082/api/reservations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id })
      });
    });

    // user001 returns マイクロサービス設計 via API
    await loginAsUser(page, 1);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'マイクロサービス設計' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
        if (loan) {
          await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: loan.version })
          });
        }
      }
    });
    await page.waitForTimeout(1000);

    // Verify user002 now has マイクロサービス設計 on their dashboard
    await loginAsUser(page, 2);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=マイクロサービス設計')).toBeVisible();

    // Cleanup: user002 returns マイクロサービス設計 auto-loan
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'マイクロサービス設計' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
        if (loan) {
          await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: loan.version })
          });
        }
      }
    });
  });
});
