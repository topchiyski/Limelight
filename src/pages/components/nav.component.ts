import type { Locator, Page } from '@playwright/test';

export type NavSection = 'Dashboard' | 'Users' | 'Settings';

/** Primary navigation. Composed into any Page Object that renders the app shell. */
export class NavComponent {
  readonly root: Locator;
  readonly userMenuButton: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation', { name: 'Primary' });
    this.userMenuButton = this.root.getByRole('button', { name: /account|profile|user menu/i });
    this.signOutButton = page.getByRole('menuitem', { name: /sign out|log out/i });
  }

  link(section: NavSection): Locator {
    return this.root.getByRole('link', { name: section, exact: true });
  }

  async goTo(section: NavSection): Promise<void> {
    await this.link(section).click();
  }

  async signOut(): Promise<void> {
    await this.userMenuButton.click();
    await this.signOutButton.click();
  }
}
