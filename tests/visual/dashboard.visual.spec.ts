import { expect, test } from '@fixtures';
import { snapshotOptions, stabilizeForSnapshot } from '@utils/visual.helper';

test.describe('Dashboard visual regression', { tag: '@visual' }, () => {
  test.beforeEach(async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.usersTable).toBeVisible();
    await stabilizeForSnapshot(page);
  });

  test('full dashboard matches baseline', async ({ page, dashboardPage }) => {
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      ...snapshotOptions(page, dashboardPage.dynamicRegions),
      fullPage: true,
    });
  });

  test('primary navigation matches baseline', async ({ page, dashboardPage }) => {
    await expect(dashboardPage.nav.root).toHaveScreenshot('primary-nav.png', snapshotOptions(page));
  });
});
