---
paths:
  - "src/pages/**/*.ts"
---

# Page Object conventions
- Locator priority: `getByRole` > `getByLabel` > `getByTestId` (`data-testid`) > CSS. Use XPath only when no other option works.
- Declare locators as `readonly` fields assigned in the constructor; parameterised lookups are methods returning `Locator` (e.g. `userRow(email)`).
- Methods are user intents (`login`, `searchUsers`) returning `Promise<void>` or a `Locator`, not wrappers around `click`/`fill`.
- Expose run-to-run dynamic content via a `dynamicRegions` getter so visual specs can mask it.
- `static readonly path` holds the route; `goto()` uses it (relative to `baseURL`).
