import { env, STORAGE_STATE } from '@config/env';
import { expect, test as setup } from '@fixtures';

setup('authenticate as default user', async ({ page, loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login(env.USER_EMAIL, env.USER_PASSWORD);

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(dashboardPage.heading).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
