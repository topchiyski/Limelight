import type { Locator, Page } from '@playwright/test';
import { NavComponent } from '@pages/components/nav.component';

export class DashboardPage {
  static readonly path = '/dashboard';

  readonly nav: NavComponent;
  readonly heading: Locator;
  readonly userSearch: Locator;
  readonly usersTable: Locator;
  readonly userRows: Locator;
  readonly lastUpdated: Locator;
  readonly avatar: Locator;

  constructor(private readonly page: Page) {
    this.nav = new NavComponent(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.userSearch = page.getByRole('searchbox', { name: /search users/i });
    this.usersTable = page.getByRole('table', { name: /users/i });
    this.userRows = this.usersTable.getByRole('row').filter({ has: page.getByRole('cell') });
    this.lastUpdated = page.getByTestId('last-updated');
    this.avatar = page.getByTestId('user-avatar');
  }

  /** Content that legitimately differs between runs; masked in visual snapshots. */
  get dynamicRegions(): Locator[] {
    return [this.lastUpdated, this.avatar, this.userRows];
  }

  async goto(): Promise<void> {
    await this.page.goto(DashboardPage.path);
  }

  async searchUsers(term: string): Promise<void> {
    await this.userSearch.fill(term);
    await this.userSearch.press('Enter');
  }

  userRow(email: string): Locator {
    return this.userRows.filter({ hasText: email });
  }
}
