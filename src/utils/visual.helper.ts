import type { Locator, Page } from '@playwright/test';

/** Selectors that are dynamic on every page of the app (clocks, relative dates, live badges). */
const GLOBAL_DYNAMIC_SELECTORS = ['time', '[data-dynamic]', '[data-testid="timestamp"]'] as const;

/** Magenta makes masked regions obvious when reviewing diffs. */
export const MASK_COLOR = '#FF00FF';

const STABILIZING_CSS = `
  *, *::before, *::after { caret-color: transparent !important; }
  ::-webkit-scrollbar { display: none !important; }
  html { scrollbar-width: none !important; }
`;

/** Global dynamic regions plus page-specific ones (e.g. `dashboardPage.dynamicRegions`). */
export function dynamicMasks(page: Page, extra: readonly Locator[] = []): Locator[] {
  return [...GLOBAL_DYNAMIC_SELECTORS.map((selector) => page.locator(selector)), ...extra];
}

/** Waits for web fonts and hides scrollbars/carets. Call after the page's key content is visible. */
export async function stabilizeForSnapshot(page: Page): Promise<void> {
  await page.addStyleTag({ content: STABILIZING_CSS });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/** Standard `toHaveScreenshot` options with masking applied. */
export function snapshotOptions(page: Page, extraMasks: readonly Locator[] = []) {
  return {
    mask: dynamicMasks(page, extraMasks),
    maskColor: MASK_COLOR,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  } as const;
}
