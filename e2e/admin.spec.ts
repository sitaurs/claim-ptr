import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function login(page) {
  await page.goto(`${BASE}/admin`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('button[type="submit"]')
  ]);
}

test.describe('Admin E2E smoke', () => {
  test('login and navigate dashboard sections', async ({ page }) => {
    await login(page);

    await expect(page).toHaveURL(/.*admin\/dashboard/);

    // Navigate to Users
    await page.click('a[href="/admin/users"]');
    await expect(page).toHaveURL(/.*admin\/users/);

    // Navigate to Promotions
    await page.click('a[href="/admin/promotions"]');
    await expect(page).toHaveURL(/.*admin\/promotions/);

    // Navigate to N8n Requests
    await page.click('a[href="/admin/n8n-requests"]');
    await expect(page).toHaveURL(/.*admin\/n8n-requests/);
  });
});
