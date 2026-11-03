# Debug a failing test

Pick the tool that matches what you need to see.

| I want to… | Command |
|---|---|
| Watch tests run and re-run one with a click | `npx playwright test --ui` |
| Step through one test line by line | `npx playwright test <file> -g "<title>" --debug` |
| See the browser while tests run | `npx playwright test <file> --headed` |
| Record a full trace locally | `npx playwright test <file> --trace on` |
| Open the last report | `npm run report` |
| Find a reliable locator | `npx playwright codegen --load-storage=.auth/user.json <BASE_URL>` |

Always narrow the run to one project: `--project=api`, `--project=e2e-chromium` or `--project=visual-chromium`.

## UI failures

1. **Re-run with a trace**:

   ```bash
   npx playwright test tests/e2e/user-journey.spec.ts --project=e2e-chromium --trace on
   npm run report
   ```

   In the report, open the failed test, then **Trace**. The trace shows a DOM snapshot before and after every action, along with network calls and console output.

2. **Read the locator error.** `waiting for getByRole('table', { name: /users/i })` means the locator matched nothing. Common causes:
   - The element's accessible name differs. Check the trace's DOM snapshot, or run codegen.
   - The page didn't finish its previous step. Look for a missing `await`.
   - A `strict mode violation` means the locator matched several elements. Narrow it with `.filter({ hasText })` or by scoping to a parent locator.

3. **Don't add sleeps.** `page.waitForTimeout()` is blocked by the guardrails. Instead, wait for the state you actually need:

   ```ts
   await expect(dashboardPage.usersTable).toBeVisible();
   await page.waitForResponse((r) => r.url().includes('/users') && r.ok());
   ```

## API failures

Every API error is a `LimelightApiError` that includes the method, URL, status and response body:

```text
LimelightApiError: POST https://staging.example.com/api/users -> 422: unexpected status
{ "error": "email already taken" }
```

| Message | Meaning | Next step |
|---|---|---|
| `unexpected status` | Status not in `expectedStatus` (default: any 2xx) | Read the body; check auth, payload and URL |
| `response failed schema validation` | The body doesn't match the Zod schema. Each issue is listed with its path | Fix the schema if the API is right; report a bug if the API is wrong |
| The URL is missing `/api` | A request path starts with `/` | Use relative paths (`'users'`), which the client also enforces |

API calls appear as named steps in the report (`GET users/42`), so you can see exactly which call failed.

## Auth/setup failures

If `setup` fails, every UI test is skipped. To debug it on its own:

```bash
npx playwright test --project=setup --headed
```

Delete `.auth/user.json` to force a fresh login. It is regenerated on every run that includes UI projects.

## Flaky tests

Reproduce the flakiness by repeating the test:

```bash
npx playwright test <file> -g "<title>" --repeat-each=20 --workers=4
```

Common sources of flakiness and their fixes:
- **Shared data**: seed per test with `seedUser()` instead of relying on existing records.
- **Assertions on values that change**: assert on the record you seeded, not on list counts.
- **Missing waits**: check for actions taken before the UI is ready, and add a web-first assertion before them.
