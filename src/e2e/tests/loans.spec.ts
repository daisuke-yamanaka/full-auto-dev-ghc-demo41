import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './helpers';

test.describe('貸出テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('LOAN-001: 図書を貸し出すことができる', async ({ page }) => {
    // user002 borrows Spring Boot実践
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'Spring Boot実践');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=Spring Boot実践');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=貸し出す')).toBeVisible();
    await page.click('button:has-text("貸し出す")');
    await expect(page.locator('text=「Spring Boot実践」を貸し出しました')).toBeVisible();
  });

  test('LOAN-002: ダッシュボードから返却できる', async ({ page }) => {
    // user002 returns Spring Boot実践
    await loginAsUser(page, 2);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("ダッシュボード")')).toBeVisible();
    await expect(page.locator('text=Spring Boot実践')).toBeVisible();
    await page.click('button:has-text("返却する")');
    await expect(page.locator('text=「Spring Boot実践」を返却しました')).toBeVisible();
  });

  test('LOAN-003: ダッシュボードに貸出状況と残り冊数が表示される', async ({ page }) => {
    // Borrow a fresh book to ensure it appears in dashboard
    await loginAsUser(page, 2);
    const bookTitle = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const books = (booksData.books || []).filter((b: any) => b.availableCopies > 0);
      for (const book of books) {
        const loanRes = await fetch('http://localhost:8082/api/loans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
        if (loanRes.ok) return book.title;
      }
      return null;
    });
    if (!bookTitle) throw new Error('Setup failed');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("ダッシュボード")')).toBeVisible();
    await expect(page.locator('text=貸出状況')).toBeVisible();
    await expect(page.locator('text=残り')).toBeVisible();
    await expect(page.locator(`text=${bookTitle}`)).toBeVisible();

    // Cleanup
    await page.evaluate(async (title) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === title && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
        if (loan) {
          await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: loan.version })
          });
        }
      }
    }, bookTitle);
  });

  test('LOAN-004: 貸出上限（5冊）に達すると6冊目の貸出が拒否される', async ({ page }) => {
    await loginAsUser(page, 4);
    const baseUrl = 'http://localhost:8082';

    // Clean up and setup via browser fetch (uses same origin context)
    const setupResult = await page.evaluate(async (apiBase) => {
      const token = localStorage.getItem('token');
      if (!token) return { borrowed: 0, sixthBookId: null, error: 'no token' };

      // Return all existing active loans
      const loansRes = await fetch(`${apiBase}/api/me/loans?page=1&size=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        for (const loan of (loansData.loans || [])) {
          if ((loan.status === 'ACTIVE' || loan.status === 'OVERDUE')) {
            await fetch(`${apiBase}/api/loans/${loan.loanId}/return`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: loan.version })
            });
          }
        }
      }

      // Get available books
      const booksRes = await fetch(`${apiBase}/api/books?size=50&page=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!booksRes.ok) return { borrowed: 0, sixthBookId: null, error: `books fetch ${booksRes.status}` };
      const booksData = await booksRes.json();
      const available: any[] = (booksData.books || []).filter((b: any) => b.availableCopies > 0);

      // Borrow 5 books
      let borrowed = 0;
      const borrowedIds: number[] = [];
      for (const book of available) {
        if (borrowed >= 5) break;
        const r = await fetch(`${apiBase}/api/loans`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
        if (r.ok) { borrowed++; borrowedIds.push(book.id); }
      }

      // Find a 6th book not borrowed
      const sixth = available.find((b: any) => !borrowedIds.includes(b.id) && b.availableCopies > 0);
      return { borrowed, sixthBookId: sixth?.id || null, error: null };
    }, baseUrl);

    if (!setupResult.sixthBookId || setupResult.borrowed < 5) {
      throw new Error(`Setup failed: borrowed=${setupResult.borrowed}, sixthBookId=${setupResult.sixthBookId}, error=${setupResult.error}`);
    }

    // Navigate to the 6th book's detail page
    await page.goto(`/books/${setupResult.sixthBookId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Button should be visible but disabled due to loan limit
    const loanBtn = page.locator('button:has-text("貸し出す")');
    await expect(loanBtn).toBeVisible({ timeout: 10000 });
    await expect(loanBtn).toBeDisabled();
    await expect(loanBtn).toHaveAttribute('title', /貸出上限（5冊）に達しています/);

    // Clean up: return all user004 loans
    await page.evaluate(async (apiBase) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch(`${apiBase}/api/me/loans?page=1&size=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        for (const loan of (loansData.loans || [])) {
          if ((loan.status === 'ACTIVE' || loan.status === 'OVERDUE')) {
            await fetch(`${apiBase}/api/loans/${loan.loanId}/return`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: loan.version })
            });
          }
        }
      }
    }, baseUrl);
  });

  test('LOAN-005: 延滞中ユーザは貸出が拒否される', async ({ page }) => {
    // Use user004, first borrow a book then make it overdue via page.evaluate + H2 console
    await loginAsUser(page, 4);

    // Borrow Reactモダン開発 via page.evaluate (reliable API approach)
    const setupResult = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return { success: false };

      // Return any existing active loans first
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        for (const loan of (ld.loans || [])) {
          if ((loan.status === 'ACTIVE' || loan.status === 'OVERDUE')) {
            await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: loan.version })
            });
          }
        }
      }

      // Find Reactモダン開発
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!booksRes.ok) return { success: false };
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === 'Reactモダン開発');
      if (!book) return { success: false };

      // Borrow it
      const loanRes = await fetch('http://localhost:8082/api/loans', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id })
      });
      const loanData = await loanRes.json();
      return { success: loanRes.ok, loanId: loanData.loanId || loanData.id };
    });

    if (!setupResult.success) throw new Error('Setup failed: could not borrow book');

    // Use H2 console API directly via page.request to set due_date to past (make overdue)
    const h2Base = 'http://localhost:8082';
    const h2JdbcUrl = encodeURIComponent('jdbc:h2:mem:librarydb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;NON_KEYWORDS=USER');

    // Step 1: Get H2 console login page to obtain jsessionid
    const initRes = await page.request.get(`${h2Base}/h2-console/login.do`);
    const initHtml = await initRes.text();
    const jsessMatch = initHtml.match(/jsessionid=([a-f0-9]+)/);
    expect(jsessMatch, 'H2 console did not return jsessionid').not.toBeNull();
    const h2Jsess = jsessMatch![1];

    // Step 2: Login to H2 console
    await page.request.post(`${h2Base}/h2-console/login.do?jsessionid=${h2Jsess}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `language=en&setting=Generic+H2+(Embedded)&name=Generic+H2+(Embedded)&driver=org.h2.Driver&url=${h2JdbcUrl}&user=sa&password=`,
    });

    // Step 3: Execute SQL to mark loan as overdue
    const overdueSql = `UPDATE loans SET due_date = '2020-01-01' WHERE returned_at IS NULL AND user_id = (SELECT id FROM users WHERE user_id = 'user004') LIMIT 1`;
    const queryRes = await page.request.post(`${h2Base}/h2-console/query.do?jsessionid=${h2Jsess}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `sql=${encodeURIComponent(overdueSql)}`,
    });
    const queryHtml = await queryRes.text();
    expect(queryHtml).toContain('Update count: 1');

    // Re-login as user004 and navigate to dashboard
    await loginAsUser(page, 4);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The overdue warning should appear on dashboard
    await expect(page.locator('text=延滞中の図書があります。返却してください。')).toBeVisible({ timeout: 10000 });

    // Navigate to a book with available copies (Webアプリケーション開発 has 3 copies)
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'Webアプリケーション開発');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=Webアプリケーション開発');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Button should be disabled with overdue message
    const loanBtn = page.locator('button:has-text("貸し出す")');
    await expect(loanBtn).toBeVisible({ timeout: 10000 });
    await expect(loanBtn).toBeDisabled();
    await expect(loanBtn).toHaveAttribute('title', /延滞中の図書があります/);
  });
});
