import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './helpers';

test.describe('複合シナリオテスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('COMP-001: 貸出→返却→予約→自動貸出の完全フロー', async ({ page }) => {
    // Cleanup: ensure user002 is not at loan limit (return any accumulated auto-loans)
    await loginAsUser(page, 2);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Return any existing クリーンアーキテクチャ loan first
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        // Return ALL active loans to reset state
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

    // user001 loans クリーンアーキテクチャ (1 copy) via API
    await loginAsUser(page, 1);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Return any existing loan for クリーンアーキテクチャ first (idempotent)
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'クリーンアーキテクチャ' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
        if (loan) {
          // Already has it, return first
          await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: loan.version })
          });
        }
      }
      // Now borrow クリーンアーキテクチャ
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === 'クリーンアーキテクチャ');
      if (book && book.availableCopies > 0) {
        await fetch('http://localhost:8082/api/loans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
      }
    });

    // user002 reserves クリーンアーキテクチャ via API (cancel any existing first)
    await loginAsUser(page, 2);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Cancel any existing reservation for クリーンアーキテクチャ
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
      // Now reserve クリーンアーキテクチャ
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === 'クリーンアーキテクチャ');
      if (book) {
        await fetch('http://localhost:8082/api/reservations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
      }
    });

    // user001 returns クリーンアーキテクチャ via API (triggers auto-loan for user002)
    await loginAsUser(page, 1);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'クリーンアーキテクチャ' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
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

    // user002 should now have クリーンアーキテクチャ on dashboard (auto-loan)
    await loginAsUser(page, 2);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=クリーンアーキテクチャ')).toBeVisible();

    // Cleanup: user002 returns クリーンアーキテクチャ via API
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'クリーンアーキテクチャ' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
        if (loan) {
          await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: loan.version })
          });
        }
      }
    });

    // Also cleanup: ensure user001's クリーンアーキテクチャ is returned if still active
    await loginAsUser(page, 1);
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => l.bookTitle === 'クリーンアーキテクチャ' && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
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

  test('COMP-002: 貸出上限到達→追加拒否→返却→再貸出の完全フロー', async ({ page }) => {
    // user005 borrows 5 books via API (reliable)
    await loginAsUser(page, 5);
    const setupResult = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return { borrowed: 0, javaLoanId: null, javaVersion: 0 };

      // Return all existing loans
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

      // Get available books
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const available: any[] = (booksData.books || []).filter((b: any) => b.availableCopies > 0);

      // Borrow 5 books
      let borrowed = 0;
      let javaLoanId: number | null = null;
      let javaVersion = 0;
      for (const book of available) {
        if (borrowed >= 5) break;
        const r = await fetch('http://localhost:8082/api/loans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
        if (r.ok) {
          borrowed++;
          const loanData = await r.json();
          if (book.title === 'Java入門') {
            javaLoanId = loanData.loanId;
            javaVersion = loanData.version ?? 0;
          }
        }
      }
      return { borrowed, javaLoanId, javaVersion };
    });

    if (setupResult.borrowed < 5) {
      throw new Error(`Setup failed: only borrowed ${setupResult.borrowed} books`);
    }

    // Navigate to DevOps実践ガイド (should show loan limit button)
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'DevOps実践ガイド');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=DevOps実践ガイド');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const loanBtn6 = page.locator('button:has-text("貸し出す")');
    await expect(loanBtn6).toBeVisible({ timeout: 10000 });
    await expect(loanBtn6).toBeDisabled();
    await expect(loanBtn6).toHaveAttribute('title', /貸出上限（5冊）に達しています/);

    // Return Java入門 via API (more reliable than UI)
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      // Return any active loan to get below the limit
      const loansRes = await fetch('http://localhost:8082/api/me/loans?page=1&size=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (loansRes.ok) {
        const ld = await loansRes.json();
        const loan = (ld.loans || []).find((l: any) => (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
        if (loan) {
          await fetch(`http://localhost:8082/api/loans/${loan.loanId}/return`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: loan.version })
          });
        }
      }
    });

    // Now try to borrow DevOps実践ガイド again → should succeed
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'DevOps実践ガイド');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=DevOps実践ガイド');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const loanBtnRetry = page.locator('button:has-text("貸し出す")');
    await expect(loanBtnRetry).toBeVisible({ timeout: 10000 });
    await loanBtnRetry.click();
    await expect(page.locator('text=「DevOps実践ガイド」を貸し出しました')).toBeVisible();

    // Cleanup: return ALL of user005's active loans
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

  test('COMP-003: 管理者書籍登録→ユーザ貸出→予約→返却後自動貸出', async ({ page }) => {
    // Create a unique book title/ISBN using timestamp to avoid conflicts between runs
    const uniqueSuffix = Date.now().toString().slice(-5);
    const bookTitle = `E2E複合テスト図書${uniqueSuffix}`;
    const isbn = `97800000${uniqueSuffix}`; // 13 digits total

    // Admin registers a new book with 1 copy via UI
    await loginAsAdmin(page);
    await page.goto('/admin/books/new');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("図書登録")')).toBeVisible();

    const formInputs = page.locator('form input');
    await formInputs.nth(0).fill(bookTitle);
    await formInputs.nth(1).fill('テスト著者');
    await formInputs.nth(2).fill(isbn);
    await formInputs.nth(3).fill('テスト出版社');
    await formInputs.nth(4).fill('2024');
    await formInputs.nth(5).fill('テスト');
    await formInputs.nth(6).fill('1');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=図書を登録しました')).toBeVisible({ timeout: 10000 });

    // user001 loans the new book
    await loginAsUser(page, 1);
    await page.evaluate(async (title) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === title);
      if (book && book.availableCopies > 0) {
        await fetch('http://localhost:8082/api/loans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id })
        });
      }
    }, bookTitle);

    // user002 reserves the book via UI
    await loginAsUser(page, 2);
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', bookTitle);
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click(`text=${bookTitle}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("予約する")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("予約する")');
    await expect(page.locator(`text=「${bookTitle}」を予約しました`)).toBeVisible();
    await page.waitForTimeout(500);

    // user001 returns the book via API (triggers auto-loan for user002)
    await loginAsUser(page, 1);
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
    await page.waitForTimeout(1000);

    // user002 should have auto-loan
    await loginAsUser(page, 2);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${bookTitle}`)).toBeVisible();

    // Admin verifies in logs
    await loginAsAdmin(page);
    await page.goto('/admin/logs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("操作ログ")')).toBeVisible();
    await expect(page.locator('text=LOAN').first()).toBeVisible({ timeout: 10000 });

    // Cleanup: user002 returns the auto-loan
    await loginAsUser(page, 2);
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

  test('COMP-004: 延滞ユーザの貸出制限フロー', async ({ page }) => {
    // Borrow a book for user003 via API (reliable)
    await loginAsUser(page, 3);
    const setupResult = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      if (!token) return { success: false };
      // Return any existing active/overdue loans
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
      // Borrow DevOps実践ガイド
      const booksRes = await fetch('http://localhost:8082/api/books?size=50&page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!booksRes.ok) return { success: false };
      const booksData = await booksRes.json();
      const book = (booksData.books || []).find((b: any) => b.title === 'DevOps実践ガイド' && b.availableCopies > 0);
      if (!book) return { success: false };
      const loanRes = await fetch('http://localhost:8082/api/loans', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id })
      });
      return { success: loanRes.ok };
    });
    if (!setupResult.success) throw new Error('Setup failed: could not borrow book for user003');

    // Use H2 console API directly via page.request to set due_date to past (make overdue)
    const h2Base = 'http://localhost:8082';
    const h2JdbcUrl = encodeURIComponent('jdbc:h2:mem:librarydb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;NON_KEYWORDS=USER');

    // Step 1: Get H2 console login page to obtain jsessionid
    const initRes = await page.request.get(`${h2Base}/h2-console/login.do`);
    const initHtml = await initRes.text();
    const jsessMatch = initHtml.match(/jsessionid=([a-f0-9]+)/);
    expect(jsessMatch, 'H2 console did not return jsessionid').toBeTruthy();
    const h2Jsess = jsessMatch![1];

    // Step 2: Login to H2 console
    await page.request.post(`${h2Base}/h2-console/login.do?jsessionid=${h2Jsess}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `language=en&setting=Generic+H2+(Embedded)&name=Generic+H2+(Embedded)&driver=org.h2.Driver&url=${h2JdbcUrl}&user=sa&password=`,
    });

    // Step 3: Execute SQL to mark loan as overdue
    const overdueSql = `UPDATE loans SET due_date = '2020-01-01' WHERE returned_at IS NULL AND user_id = (SELECT id FROM users WHERE user_id = 'user003') LIMIT 1`;
    const queryRes = await page.request.post(`${h2Base}/h2-console/query.do?jsessionid=${h2Jsess}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `sql=${encodeURIComponent(overdueSql)}`,
    });
    const queryHtml = await queryRes.text();
    expect(queryHtml).toContain('Update count: 1');

    // Re-login as user003 and check dashboard shows overdue warning
    await loginAsUser(page, 3);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=延滞中の図書があります。返却してください。')).toBeVisible({ timeout: 10000 });

    // Navigate to a book with available copies and verify loan button is disabled
    await page.goto('/books');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="タイトル"]', 'Webアプリケーション開発');
    await page.click('button:has-text("検索")');
    await page.waitForLoadState('networkidle');
    await page.click('text=Webアプリケーション開発');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const loanBtn = page.locator('button:has-text("貸し出す")');
    await expect(loanBtn).toBeVisible({ timeout: 10000 });
    await expect(loanBtn).toBeDisabled();
    await expect(loanBtn).toHaveAttribute('title', /延滞中の図書があります/);

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

  test('COMP-005: 未認証・権限外アクセス制御', async ({ page }) => {
    // Navigate to login page first to establish origin context, then clear any auth
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    // Unauthenticated access to protected page → /login
    await page.goto('/dashboard');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');

    // Login as regular user and try admin page → /
    await page.fill('input[autocomplete="username"]', 'user001');
    await page.fill('input[autocomplete="current-password"]', 'password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Try admin URL
    await page.goto('/admin/logs');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');

    await page.goto('/admin/users');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
