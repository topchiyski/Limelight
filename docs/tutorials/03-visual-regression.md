# Tutorial 3: Visual regression testing

**You will build:** a stable, masked screenshot test, plus committed Linux baselines.
**You will learn:** why visual tests flake, how Limelight stabilises them, and how to create, review and update baselines.
**Time:** about 30 minutes. **Prerequisites:** [Tutorial 1](01-add-a-page-object.md); Docker for step 4.

## How visual tests work

`expect(page).toHaveScreenshot('name.png')` captures a screenshot and compares it pixel by pixel with a stored **baseline**. If more than 1% of pixels differ (`maxDiffPixelRatio: 0.01` in `playwright.config.ts`), the test fails, and the report shows Expected, Actual and Diff images.

Screenshots are only comparable when everything around them is fixed. The `visual-chromium` project pins:

| Setting | Value | Why |
|---|---|---|
| Viewport | 1440×900, `deviceScaleFactor: 1` | Identical layout and pixel density |
| `timezoneId` / `locale` | `UTC` / `en-US` | Dates and number formats don't vary by machine |
| `colorScheme` | `light` | Unaffected by OS dark mode |
| Animations / caret | disabled / hidden | No mid-transition frames |

Baselines are stored per OS:

```text
tests/visual/__screenshots__/{platform}/{projectName}/{testFile}/{name}.png
e.g. tests/visual/__screenshots__/linux/visual-chromium/dashboard.visual.spec.ts/dashboard-full.png
```

Fonts render differently on Windows, macOS and Linux, so a Windows baseline never matches in CI. **CI runs on Linux, so the Linux baselines are the ones that matter.**

## Step 1: Identify dynamic content

Anything that changes between runs causes false failures: timestamps, avatars, live counters, and lists of seeded data. Limelight masks them in two layers.

**Global selectors** in `src/utils/visual.helper.ts` are masked on every page:

```ts
const GLOBAL_DYNAMIC_SELECTORS = ['time', '[data-dynamic]', '[data-testid="timestamp"]'] as const;
```

> If you control the app, adding `data-dynamic` to volatile elements is the cleanest way to mask them.

**Page-specific regions** come from a `dynamicRegions` getter on the Page Object, as in `DashboardPage`:

```ts
get dynamicRegions(): Locator[] {
  return [this.lastUpdated, this.avatar, this.userRows];
}
```

Add the same getter to your `SettingsPage` from tutorial 1, listing whatever changes on that page.

## Step 2: Write the visual spec

Create `tests/visual/settings.visual.spec.ts`:

```ts
import { expect, test } from '@fixtures';
import { snapshotOptions, stabilizeForSnapshot } from '@utils/visual.helper';

test.describe('Settings visual regression', { tag: '@visual' }, () => {
  test('settings page matches baseline', async ({ page, settingsPage }) => {
    await settingsPage.goto();
    await expect(settingsPage.heading).toBeVisible();          // 1. wait for real content
    await stabilizeForSnapshot(page);                          // 2. fonts loaded, scrollbars hidden

    await expect(page).toHaveScreenshot('settings.png', {      // 3. compare with masks
      ...snapshotOptions(page, settingsPage.dynamicRegions),
      fullPage: true,
    });
  });

  test('save button matches baseline', async ({ page, settingsPage }) => {
    await settingsPage.goto();
    await expect(settingsPage.saveButton).toBeVisible();

    await expect(settingsPage.saveButton).toHaveScreenshot('save-button.png', snapshotOptions(page));
  });
});
```

The order matters:
1. **Assert key content is visible first.** `toHaveScreenshot` retries until two consecutive screenshots match, but it can't know your data has loaded.
2. **Stabilise.** This waits for `document.fonts.ready` and hides scrollbars and the caret.
3. **Compare** with masks applied. Masked areas are painted magenta (`#FF00FF`) so they're obvious in diffs.

**Element screenshots** like the save button are more robust than full-page ones, because unrelated changes elsewhere on the page don't break them. Use full-page shots for a few key layouts and element shots for components.

## Step 3: Do a first local run (optional)

```bash
npx playwright test tests/visual/settings.visual.spec.ts --project=visual-chromium
```

The first run fails with *"A snapshot doesn't exist … writing actual"*. Playwright saves a baseline for **your** OS, and the next run passes locally. That's useful for checking your masks, but **don't commit Windows or macOS baselines**. Generate the real ones on Linux in the next step.

## Step 4: Generate baselines on Linux

Use the official Playwright Docker image. Its version must match your installed one, which you can check with `npx playwright --version`. The examples use `1.64.1`.

**PowerShell:**

```powershell
docker run --rm -it `
  -v "${PWD}:/work" -v /work/node_modules -w /work `
  -e BASE_URL=http://host.docker.internal:3000 `
  mcr.microsoft.com/playwright:v1.64.1-noble `
  bash -c "npm ci && npx playwright test --project=visual-chromium --update-snapshots"
```

**bash / macOS / Linux:**

```bash
docker run --rm -it \
  -v "$PWD:/work" -v /work/node_modules -w /work \
  -e BASE_URL=http://host.docker.internal:3000 \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -c "npm ci && npx playwright test --project=visual-chromium --update-snapshots"
```

What the flags do:
- `-v /work/node_modules` gives the container its own `node_modules`, so your host install is left untouched.
- `host.docker.internal` lets the container reach an app running on your machine. Drop the `-e BASE_URL=…` line if `BASE_URL` in `.env` already points to a deployed environment.
- Other settings, including credentials, are read from your mounted `.env`.

The new files appear under `tests/visual/__screenshots__/linux/`.

## Step 5: Review and commit

1. Open each new PNG and check it shows the expected UI, with magenta boxes over the dynamic areas.
2. Commit the Linux baselines:

   ```bash
   git add tests/visual/__screenshots__/linux
   git commit -m "test(visual): add settings page baselines"
   ```

Reviewers see the images in the pull request diff. GitHub's image diff (swipe/onion skin) makes changes easy to check.

## Step 6: Handle a failure

When a visual test fails, run `npm run report` (or download the CI report artifact) and open the test. The **Diff** view highlights changed pixels in red, and the slider compares Expected with Actual.

Decide which kind of failure it is:

| Situation | Action |
|---|---|
| A real, unintended UI regression | File a bug; keep the baseline |
| An intentional UI change | Re-run step 4 to update baselines, then commit them in the same PR as the UI change |
| Dynamic content not masked | Add it to `dynamicRegions` or mark it `data-dynamic` |
| Tiny anti-aliasing noise on one element | Raise the tolerance for that assertion only, e.g. `{ ...snapshotOptions(page), maxDiffPixels: 50 }`. Don't loosen the global threshold. |

## Recap

1. Pin the environment (handled by the `visual-chromium` project).
2. Mask dynamic content globally (`data-dynamic`) or per page (`dynamicRegions`).
3. Wait for real content, call `stabilizeForSnapshot`, then call `toHaveScreenshot`.
4. Generate and commit **Linux** baselines in Docker; review them like code.

**Back to:** [Documentation index](../README.md)
