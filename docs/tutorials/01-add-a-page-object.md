# Tutorial 1: Add a Page Object

**You will build:** a `SettingsPage` Page Object, register it as a fixture, and write an E2E spec that uses it.
**You will learn:** Limelight's POM rules: composition over inheritance, `readonly` locators, fixture injection, and keeping assertions in specs.
**Time:** about 20 minutes. **Prerequisite:** [Getting started](../getting-started.md) completed.

The examples assume your app has a `/settings` page with a "Display name" field and a "Save" button. Adjust the locators to fit your app.

## How it fits together

```text
tests/e2e/settings.spec.ts
      │  destructures { settingsPage }
      ▼
src/fixtures/page.fixture.ts      ← the ONLY place `new SettingsPage()` appears
      │
      ▼
src/pages/settings.page.ts ──composes──▶ src/pages/components/nav.component.ts
```

## Step 1: Create the Page Object

Create `src/pages/settings.page.ts`:

```ts
import type { Locator, Page } from '@playwright/test';
import { NavComponent } from '@pages/components/nav.component';

export class SettingsPage {
  static readonly path = '/settings';

  readonly nav: NavComponent;
  readonly heading: Locator;
  readonly displayNameInput: Locator;
  readonly saveButton: Locator;
  readonly savedMessage: Locator;

  constructor(private readonly page: Page) {
    this.nav = new NavComponent(page);
    this.heading = page.getByRole('heading', { level: 1, name: /settings/i });
    this.displayNameInput = page.getByLabel(/display name/i);
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.savedMessage = page.getByRole('status').filter({ hasText: /saved/i });
  }

  async goto(): Promise<void> {
    await this.page.goto(SettingsPage.path);
  }

  async updateDisplayName(name: string): Promise<void> {
    await this.displayNameInput.fill(name);
    await this.saveButton.click();
  }
}
```

Why it looks like this:

| Choice | Reason |
|---|---|
| No `extends BasePage` | Playwright locators already auto-wait. A base class of `click`/`fill` wrappers only adds indirection. Shared UI like the nav bar is **composed** in instead. |
| `readonly` locators built in the constructor | Locators are lazy, so creating them finds nothing yet. Specs can assert on them directly, as in `expect(settingsPage.heading)`. |
| Methods are user intents | `updateDisplayName(name)` describes what a user does. Avoid methods like `clickSave()` that wrap a single call. |
| No `expect()` inside | Page Objects *do* things; specs *check* things. That keeps failures pointing at the spec line that matters. |
| `getByRole` / `getByLabel` first | They match what users and assistive tech see, and survive CSS refactors. Use `getByTestId` when no accessible name exists. |

## Step 2: Register the fixture

Open `src/fixtures/page.fixture.ts` and add the page in three places:

```ts
import { DashboardPage } from '@pages/dashboard.page';
import { LoginPage } from '@pages/login.page';
import { SettingsPage } from '@pages/settings.page';            // 1. import

export interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  settingsPage: SettingsPage;                                    // 2. type
}

export const test = base.extend<PageFixtures>({
  // ...existing fixtures...
  settingsPage: async ({ page }, use) => {                       // 3. factory
    await use(new SettingsPage(page));
  },
});
```

You don't need to touch `src/fixtures/index.ts`. It merges `page.fixture.ts` automatically, so `settingsPage` is now available in every spec.

## Step 3: Write the spec

Create `tests/e2e/settings.spec.ts`:

```ts
import { expect, test } from '@fixtures';

test.describe('Settings', { tag: '@e2e' }, () => {
  test('is reachable from primary navigation', async ({ page, dashboardPage, settingsPage }) => {
    await dashboardPage.goto();

    await dashboardPage.nav.goTo('Settings');

    await expect(page).toHaveURL(/\/settings/);
    await expect(settingsPage.heading).toBeVisible();
  });

  test('saving a display name shows a confirmation', { tag: '@mutates' }, async ({ settingsPage, userFactory }) => {
    const { firstName } = userFactory.build();
    await settingsPage.goto();

    await settingsPage.updateDisplayName(firstName);

    await expect(settingsPage.savedMessage).toBeVisible();
    await expect(settingsPage.displayNameInput).toHaveValue(firstName);
  });
});
```

Notes:
- **Import from `@fixtures`**, never `@playwright/test`. The guardrails reject the latter in specs.
- **Arrange / act / assert** are separated by blank lines, so each test reads top to bottom.
- **`@mutates`** marks the second test as changing data, so it won't run against prod. It edits the *shared* logged-in user. If other tests depend on the display name, seed a dedicated user instead (see [tutorial 2](02-add-an-api-resource.md)).
- **Test data comes from the `userFactory` fixture**, not from hardcoded strings.

## Step 4: Verify and run

```bash
npm run verify
npx playwright test tests/e2e/settings.spec.ts --project=e2e-chromium
```

`--project=e2e-chromium` runs the `setup` dependency first, so you are already logged in.

## What the guardrails catch

Try these mistakes in your spec, then run `npm run lint:guardrails`:

| Mistake | Guardrail message |
|---|---|
| `const settings = new SettingsPage(page);` | `[no-new-in-specs]`: inject via fixtures |
| `await page.waitForTimeout(1000);` | `[no-hard-sleep]`: use a web-first assertion |
| `import { test } from '@playwright/test';` | `[specs-import-fixtures]` |
| `class SettingsPage extends BasePage` | `[no-base-page]`: compose components instead |

If you use Claude Code in this repo, the same check runs automatically after every file edit.

## Recap

1. Page Object: `readonly` locators and intent methods, with shared UI composed in.
2. Fixture: one line of construction in `page.fixture.ts`.
3. Spec: import from `@fixtures`, destructure the page, and assert in the spec.

**Next:** [Tutorial 2: Add an API resource](02-add-an-api-resource.md)
