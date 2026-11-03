import { test as base } from '@playwright/test';
import { DashboardPage } from '@pages/dashboard.page';
import { LoginPage } from '@pages/login.page';

export interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});
