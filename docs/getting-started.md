# Getting started

This guide takes you from a fresh copy of the repo to a passing test run against your application. Allow about 20 minutes, plus time to adapt locators to your app.

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 22+ | Node 24 recommended (the version CI uses). Check with `node -v`. |
| npm | Ships with Node. |
| An app to test | Reachable over HTTP, with a login page and a dedicated **test user** account. |
| Docker *(optional)* | Only needed to generate visual baselines locally (see [tutorial 3](tutorials/03-visual-regression.md)). |

> Use a dedicated test account. Tests tagged `@mutates` create and delete data with it.

## 1. Install dependencies

```bash
npm ci
```

`npm ci` installs the exact versions pinned in `package-lock.json`. Use `npm install` only when you intend to change dependencies.

## 2. Install the browser

```bash
npm run browsers:install
```

This downloads Chromium plus the OS libraries it needs. Re-run it after upgrading `@playwright/test`.

## 3. Configure your environment

Copy the template:

```bash
cp .env.example .env              # macOS / Linux / Git Bash
Copy-Item .env.example .env       # PowerShell
```

Then edit `.env`:

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `TEST_ENV` | no | `local` | `local`, `dev`, `staging` or `prod`. Selects `.env.<TEST_ENV>`. Default `local`. |
| `BASE_URL` | **yes** | `http://localhost:3000` | Root URL of the web app. |
| `API_URL` | no | `http://localhost:3000/api/` | REST API root. Defaults to `${BASE_URL}/api/`. |
| `USER_EMAIL` | **yes** | `qa.user@example.test` | Test user that `tests/setup/auth.setup.ts` logs in with. |
| `USER_PASSWORD` | **yes** | | Password for that user. |
| `API_TOKEN` | no | | Sent as `Authorization: Bearer <token>` on every API call. |

`.env` is git-ignored. Never commit real credentials.

### Multiple environments

Put shared defaults in `.env` and environment-specific overrides in `.env.<name>`, for example `.env.staging`:

```dotenv
BASE_URL=https://staging.example.com
USER_PASSWORD=staging-password
```

Select the environment per run:

```bash
TEST_ENV=staging npm test                       # bash
$env:TEST_ENV='staging'; npm test               # PowerShell (persists for the session;
Remove-Item Env:TEST_ENV                        #   clear it afterwards)
```

Precedence is: real environment variables, then `.env.<TEST_ENV>`, then `.env`.

> `TEST_ENV=prod` is read-only. All `@mutates` tests are excluded, and API controllers refuse to write.

## 4. Verify the toolchain

```bash
npm run verify
```

This runs the TypeScript typecheck and the architectural guardrails scan. Expected output ends with `Guardrails OK (N files).`

Next, confirm Playwright can load your configuration. This doesn't need the app to be running:

```bash
npm run test:list
```

You should see tests listed under four projects (`setup`, `api`, `e2e-chromium` and `visual-chromium`) and a `Total:` line. If you get `Invalid Limelight environment`, fix the variables the error names in `.env`.

## 5. Adapt the reference tests to your app

The bundled tests describe a *conventional* application. Expect to adjust them before your first green run:

| Assumption | Where to change it |
|---|---|
| Login at `/login` with fields labelled "Email" and "Password" and a "Sign in"/"Log in" button | `src/pages/login.page.ts` |
| After login, the URL contains `/dashboard` and the page has an `h1` | `tests/setup/auth.setup.ts`, `src/pages/dashboard.page.ts` |
| A `<nav aria-label="Primary">` with links "Dashboard", "Users", "Settings" | `src/pages/components/nav.component.ts` |
| A users table with a search box on the dashboard | `src/pages/dashboard.page.ts` |
| REST endpoints `GET/POST /users` and `GET/PATCH/DELETE /users/:id` | `src/api/controllers/users.api.ts` (paths and Zod schemas) |

To find good locators quickly, record them against your app:

```bash
npx playwright codegen http://localhost:3000
```

Prefer the `getByRole` / `getByLabel` suggestions codegen offers. [Tutorial 1](tutorials/01-add-a-page-object.md) walks through building a Page Object properly.

## 6. Run the suites

Run them one at a time the first time, in this order:

```bash
npx playwright test --project=setup   # logs in, writes .auth/user.json
npm run test:api                      # REST contract tests (no browser)
npm run test:e2e                      # hybrid API + UI journeys
npm run test:visual                   # screenshot comparisons
```

- **Setup** must pass first. Every UI project depends on it and reuses the saved session.
- **API** failures show a `LimelightApiError` with the method, URL, status and response body. See [Debug a failing test](how-to/debug-failing-tests.md#api-failures).
- **Visual** tests fail on the first run because no baseline exists yet. Playwright writes one, and the next run compares against it. Baselines should be generated on Linux; [tutorial 3](tutorials/03-visual-regression.md) explains why and how.

Once each project passes on its own, run everything with `npm test`.

## 7. Read the report

```bash
npm run report
```

The HTML report shows each test's steps. Every API call appears as its own step, for example `POST users`. Failed tests include a screenshot, a video and, when you run with `--trace on`, a full trace.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid Limelight environment … ✖ Invalid URL → at BASE_URL` | Missing or malformed variable | Fix `.env` / `.env.<TEST_ENV>` |
| `Executable doesn't exist at …chromium…` | Browser not installed | `npm run browsers:install` |
| Setup times out on `toHaveURL(/\/dashboard/)` | Wrong credentials, or your app redirects elsewhere after login | Check the credentials; update `auth.setup.ts` and the login locators |
| `LimelightApiError … -> 401` | API needs a token | Set `API_TOKEN` |
| `LimelightApiError … -> 404` on every call | `API_URL` points at the wrong root | Set `API_URL` explicitly (e.g. `https://host/api/v1/`) |
| `response failed schema validation` | Your API's response shape differs from the reference schema | Align the Zod schema in the controller |
| `@mutates` tests are missing | `TEST_ENV=prod` | Expected; use a non-prod environment |
| Visual diffs only on your machine | Baselines were generated on another OS | Generate baselines on Linux ([tutorial 3](tutorials/03-visual-regression.md)) |

## Next steps

- [Tutorial 1: Add a Page Object](tutorials/01-add-a-page-object.md)
- [Run Limelight in CI](how-to/run-in-ci.md)
