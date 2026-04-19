import { Page } from '@playwright/test';

export async function loginAs(page: Page, loginId: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[autocomplete="username"]', loginId);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

export async function loginAsAdmin(page: Page) {
  return loginAs(page, 'admin', 'admin123');
}

export async function loginAsUser(page: Page, userNum: number = 1) {
  return loginAs(page, `user00${userNum}`, `password${userNum}`);
}

export async function clearAuthAndGoToLogin(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
  await page.goto('/login');
  await page.waitForURL('/login');
}

/**
 * Set overdue state via H2 console for a user
 * JDBC URL: jdbc:h2:mem:librarydb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;NON_KEYWORDS=USER
 */
export async function makeUserOverdueViaH2(page: Page, userId: string) {
  await page.goto('http://localhost:8080/h2-console');
  await page.waitForLoadState('networkidle');

  // Fill in H2 connection details
  const jdbcInput = page.locator('input[name="url"], #url, input[value*="h2"]').first();
  if (await jdbcInput.count() > 0) {
    await jdbcInput.fill('jdbc:h2:mem:librarydb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;NON_KEYWORDS=USER');
  }
  const userInput = page.locator('input[name="user"], #user').first();
  if (await userInput.count() > 0) {
    await userInput.fill('sa');
  }
  const pwInput = page.locator('input[name="password"], input[type="password"]').first();
  if (await pwInput.count() > 0) {
    await pwInput.fill('');
  }

  const connectBtn = page.locator('input[type="submit"][value="Connect"], button:has-text("Connect")').first();
  if (await connectBtn.count() > 0) {
    await connectBtn.click();
    await page.waitForLoadState('networkidle');
  }

  // Execute SQL
  const sqlArea = page.locator('textarea#sql, #sqlText, textarea').first();
  if (await sqlArea.count() > 0) {
    const sql = `UPDATE loans SET due_date = '2020-01-01' WHERE id = (SELECT id FROM loans WHERE returned_at IS NULL AND user_id = (SELECT id FROM users WHERE user_id = '${userId}') LIMIT 1)`;
    await sqlArea.fill(sql);
    const runBtn = page.locator('input[type="submit"][value="Run"], button:has-text("Run")').first();
    if (await runBtn.count() > 0) {
      await runBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }
}
