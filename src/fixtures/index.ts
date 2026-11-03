import { mergeTests } from '@playwright/test';
import { test as apiTest } from '@fixtures/api.fixture';
import { test as pageTest } from '@fixtures/page.fixture';

/** The single entry point for specs: `import { test, expect } from '@fixtures';` */
export const test = mergeTests(pageTest, apiTest);
export { expect } from '@playwright/test';

export type { ApiFixtures, ApiWorkerFixtures } from '@fixtures/api.fixture';
export type { PageFixtures } from '@fixtures/page.fixture';
