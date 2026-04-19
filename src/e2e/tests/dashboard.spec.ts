import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './helpers';

test.describe('ダッシュボード・履歴テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('DASH-001: ダッシュボードに貸出中の図書が表示される', async ({ page }) => {
    // Borrow a book fresh to ensure it appears in dashboard (newest loans first)
    await loginAsUser(page, 1);
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
    if (!bookTitle) throw new Error('Setup failed: could not borrow a book for user001');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("ダッシュボード")')).toBeVisible();
    await expect(page.locator(`text=${bookTitle}`)).toBeVisible();

    // Cleanup: return the borrowed book
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

  test('DASH-002: ダッシュボードに残り貸出可能冊数が正しく表示される', async ({ page }) => {
    // user001 might have Java入門 active from DataInitializer + possibly others
    await loginAsUser(page, 1);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=残り')).toBeVisible();
    await expect(page.locator('text=貸出可能')).toBeVisible();
    await expect(page.locator('text=/ 5 冊')).toBeVisible();
  });

  test('DASH-003: アクティビティフィードに貸出アクティビティが表示される', async ({ page }) => {
    await loginAsUser(page, 1);

    // Ensure Spring Boot実践 can be borrowed — return any existing active loan for user001
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'Spring Boot実践' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
        if (loan) {
          await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: loan.version })
          });
        }
      }
    });

    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'Spring Boot実践');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=Spring Boot実践');
    await page.waitForLoadState('networkidle');

    const loanBtn = page.locator('button:has-text("貸し出す")');
    await expect(loanBtn).toBeVisible({ timeout: 10000 });
    await expect(loanBtn).toBeEnabled();
    await loanBtn.click();
    await expect(page.locator('text=「Spring Boot実践」を貸し出しました')).toBeVisible();

    // Go to activity feed and verify the loan appears
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("アクティビティフィード")')).toBeVisible();
    await expect(page.locator('text=Spring Boot実践').first()).toBeVisible({ timeout: 10000 });

    // Cleanup: return the borrowed book
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'Spring Boot実践' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
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

  test('DASH-004: 貸出履歴ページに貸出記録が表示される', async ({ page }) => {
    // user001 has Java入門 loan from initial data
    await loginAsUser(page, 1);
    await page.goto('/me/loans');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("貸出履歴")')).toBeVisible();

    // Verify at least one loan item is visible with date info
    await expect(page.locator('text=貸出日').first()).toBeVisible({ timeout: 10000 });

    // Verify status badge is visible (貸出中 / 返却済 / 延滞中)
    const statusLabel = page.locator('text=貸出中').or(page.locator('text=返却済')).or(page.locator('text=延滞中'));
    await expect(statusLabel.first()).toBeVisible({ timeout: 5000 });
  });

  test('DASH-005: ダッシュボードに返却期限が表示される（FR-015）', async ({ page }) => {
    // Borrow a fresh book to ensure an active loan with a due date is present
    await loginAsUser(page, 1);
    const bookTitle = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!booksRes.ok) return null;
      const booksData = await booksRes.json();
      const available = (booksData.books || []).filter((b: any) => b.availableCopies > 0);
      // Try each available book (user may already have some borrowed)
      for (const book of available) {
        const loanRes = await fetch('http://localhost:8082/api/loans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
        if (loanRes.ok) return book.title;
      }
      return null;
    });
    if (!bookTitle) throw new Error('Setup failed: could not borrow a book for DASH-005');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("ダッシュボード")')).toBeVisible();
    // DashboardPage renders: 返却期限: ${formatDate(loan.dueDate)} in each loan card
    await expect(page.locator('text=返却期限:').first()).toBeVisible({ timeout: 10000 });

    // Cleanup: return the borrowed book
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

  test('DASH-006: 延滞警告バナーと「延滞中」テキストが表示される（FR-015）', async ({ page }) => {
    // Login as user003 and borrow a book, then make it overdue via H2
    await loginAsUser(page, 3);

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
          if (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') {
            await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: loan.version })
            });
          }
        }
      }

      // Borrow any available book
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!booksRes.ok) return { success: false };
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.availableCopies > 0);
      if (!book) return { success: false };

      const loanRes = await fetch('http://localhost:8082/api/loans', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id })
      });
      return { success: loanRes.ok };
    });

    if (!setupResult.success) throw new Error('Setup failed: could not borrow book for user003');

    // Use H2 console to set due_date to past (make overdue)
    const h2Base = 'http://localhost:8082';
    const h2JdbcUrl = encodeURIComponent('jdbc:h2:mem:librarydb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;NON_KEYWORDS=USER');

    const initRes = await page.request.get(`${h2Base}/h2-console/login.do`);
    const initHtml = await initRes.text();
    const jsessMatch = initHtml.match(/jsessionid=([a-f0-9]+)/);
    expect(jsessMatch, 'H2 console did not return jsessionid').toBeTruthy();
    const h2Jsess = jsessMatch![1];

    await page.request.post(`${h2Base}/h2-console/login.do?jsessionid=${h2Jsess}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `language=en&setting=Generic+H2+(Embedded)&name=Generic+H2+(Embedded)&driver=org.h2.Driver&url=${h2JdbcUrl}&user=sa&password=`,
    });

    const overdueSql = `UPDATE loans SET due_date = '2020-01-01' WHERE returned_at IS NULL AND user_id = (SELECT id FROM users WHERE user_id = 'user003') LIMIT 1`;
    const queryRes = await page.request.post(`${h2Base}/h2-console/query.do?jsessionid=${h2Jsess}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `sql=${encodeURIComponent(overdueSql)}`,
    });
    const queryHtml = await queryRes.text();
    expect(queryHtml).toContain('Update count: 1');

    // Re-login and navigate to dashboard
    await loginAsUser(page, 3);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Overdue warning banner should appear
    await expect(page.locator('text=延滞中の図書があります。返却してください。')).toBeVisible({ timeout: 10000 });
    // Individual loan card shows overdue text
    await expect(page.locator('text=延滞中').first()).toBeVisible({ timeout: 5000 });

    // Cleanup: return user003's overdue loan so subsequent tests can borrow
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        for (const loan of (ld.loans || [])) {
          if (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') {
            await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: loan.version })
            });
          }
        }
      }
    });
  });
});
