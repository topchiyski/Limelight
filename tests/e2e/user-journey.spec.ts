import { expect, test } from '@fixtures';

// Hybrid: arrange via API (fast, deterministic), act + assert via UI, clean up via fixture teardown.
test.describe('User journey', { tag: '@e2e' }, () => {
  test('a user seeded via API is listed in the dashboard', { tag: '@mutates' }, async ({ seedUser, dashboardPage }) => {
    const user = await seedUser({ role: 'member' });

    await dashboardPage.goto();
    await dashboardPage.searchUsers(user.email);

    const row = dashboardPage.userRow(user.email);
    await expect(row).toBeVisible();
    await expect(row).toContainText(`${user.firstName} ${user.lastName}`);
    await expect(row).toContainText(/member/i);
  });

  test('a user deleted via API disappears from the dashboard', { tag: '@mutates' }, async ({ seedUser, usersApi, dashboardPage }) => {
    const user = await seedUser();
    await dashboardPage.goto();
    await dashboardPage.searchUsers(user.email);
    await expect(dashboardPage.userRow(user.email)).toBeVisible();

    await usersApi.delete(user.id);
    await dashboardPage.goto();
    await dashboardPage.searchUsers(user.email);

    await expect(dashboardPage.userRow(user.email)).toHaveCount(0);
  });

  test('primary navigation reaches the Users section', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.nav.root).toBeVisible();

    await dashboardPage.nav.goTo('Users');

    await expect(page).toHaveURL(/\/users/);
    await expect(dashboardPage.nav.link('Users')).toHaveAttribute('aria-current', 'page');
  });
});
