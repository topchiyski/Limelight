# Limelight

Production-grade Playwright + TypeScript test automation: **UI E2E** (Page Object Model), **REST API**, **hybrid API+UI**, and **visual regression** in one fixture-driven framework.

## Quick start

```bash
npm ci
npm run browsers:install
cp .env.example .env          # set BASE_URL, USER_EMAIL, USER_PASSWORD
npm run verify                # typecheck + architectural guardrails
npm test                      # setup -> api, e2e, visual
```

New to Limelight? Follow **[Getting started](docs/getting-started.md)**, then the [tutorials](docs/README.md#tutorials-learn-by-building).

## Documentation

| Guide | Purpose |
|---|---|
| [Getting started](docs/getting-started.md) | Fresh clone to a green run, with troubleshooting |
| [Run Limelight in CI](docs/how-to/run-in-ci.md) | GitHub Actions variables, secrets, shards, reports |
| [Debug a failing test](docs/how-to/debug-failing-tests.md) | UI mode, traces, API errors, flaky tests |
| [Tutorial 1: Add a Page Object](docs/tutorials/01-add-a-page-object.md) | POM, fixture and E2E spec |
| [Tutorial 2: Add an API resource](docs/tutorials/02-add-an-api-resource.md) | Controller, factory, seeding fixture and API spec |
| [Tutorial 3: Visual regression](docs/tutorials/03-visual-regression.md) | Masked snapshots and Linux baselines |

## Architecture

```text
spec ──uses──▶ @fixtures (test.extend / mergeTests)
                 ├─ page.fixture.ts ─▶ LoginPage, DashboardPage ─composes─▶ NavComponent
                 └─ api.fixture.ts  ─▶ apiRequest (worker) ─▶ LimelightApi ─▶ UsersApi
                                       userFactory, seedUser (auto-cleanup)
config/env.ts (Zod) ─▶ playwright.config.ts + fixtures
```

| Layer | Location | Responsibility |
|---|---|---|
| Config | `src/config/env.ts` | Loads `.env.<TEST_ENV>` then `.env`, validates with Zod, fails fast with readable errors |
| API client | `src/api/client/limelightApi.ts` | `test.step` per call, status guard, Zod response validation, typed results |
| Controllers | `src/api/controllers/*.api.ts` | Resource CRUD + schemas (types derive from schemas) |
| Factories | `src/data/factories/*.factory.ts` | Faker builders with the override pattern |
| Pages | `src/pages/` | `readonly` locators + intent methods; components via composition |
| Fixtures | `src/fixtures/` | The only place Page Objects/controllers are instantiated |
| Visual utils | `src/utils/visual.helper.ts` | Dynamic-region masking, font/scrollbar stabilisation |

### Design rules (enforced)

1. No `BasePage` inheritance. Compose components.
2. No `waitForTimeout`. Use web-first assertions and network waits.
3. Specs never use `new` for POMs or clients. Everything comes from `@fixtures`.
4. `expect()` lives in specs. Page Objects expose locators and actions.
5. Strict TS: `strict`, `exactOptionalPropertyTypes`, `noUnused*`, `noUncheckedIndexedAccess`.

Rules 1–3 and the `@fixtures` import are checked by `.claude/hooks/guardrails.mjs`. It runs as `npm run lint:guardrails` in CI and as a Claude Code PostToolUse hook.

## Projects & commands

| Command | What runs |
|---|---|
| `npm test` | All projects. `setup` logs in once and writes `.auth/user.json` |
| `npm run test:api` | `tests/api`: pure HTTP, no browser |
| `npm run test:e2e` | `tests/e2e`: hybrid journeys (depends on `setup`) |
| `npm run test:visual` | `tests/visual`: `toHaveScreenshot` with masking |
| `npm run test:visual:update` | Re-baseline snapshots |
| `npm run test:list` | List tests without running them (no app required) |
| `npm run report` | Open the last HTML report |
| `npx playwright test --grep @api` | Filter by tag (`@api`, `@e2e`, `@visual`, `@mutates`) |

## Environments

`TEST_ENV` = `local | dev | staging | prod` selects `.env.<TEST_ENV>`. Real environment variables override files.

- `API_URL` defaults to `${BASE_URL}/api/`. API paths in controllers are relative (`users`, not `/users`).
- **`prod` is read-only:** tests tagged `@mutates` are excluded via `grepInvert`, and `UsersApi` refuses writes.

## Adapting to your application

The reference tests target a conventional app: `/login` with labelled Email/Password fields, `/dashboard` with an `h1`, a "Primary" nav landmark, and a users table plus search box. The API is `GET/POST /users` and `GET/PATCH/DELETE /users/:id`. To point Limelight at a real system:

1. Update locators in `src/pages/*` (prefer `getByRole` / `getByLabel`).
2. Align Zod schemas in `src/api/controllers/users.api.ts` with your OpenAPI contract.
3. Run `npm run test:visual:update` on the CI OS to create baselines (stored per platform under `tests/visual/__screenshots__/`).

## CI

`.github/workflows/limelight-ci.yml` runs in three stages:

1. Static checks: typecheck and guardrails.
2. Tests in 4 parallel shards, each producing a blob report.
3. A merge job that combines the shard reports into a single HTML report artifact.

Configure the repository variables `BASE_URL` and `API_URL`, and the secrets `USER_EMAIL`, `USER_PASSWORD` and `API_TOKEN`.

## Working with Claude Code

`CLAUDE.md` is deliberately short. Area-specific conventions live in `.claude/rules/` and load only when matching files are touched. Hard rules are enforced deterministically in `.claude/settings.json`: a deny list for `.env*` and `.auth/` reads, plus the guardrails hook. When you add a rule to `CLAUDE.md`, also add an HTML comment recording the trigger and when the rule can be pruned.

## Contact

Questions about Limelight? Reach out on [LinkedIn](https://www.linkedin.com/in/stoyan-topchiyski/).

## License

[MIT](LICENSE) © 2026 Stoyan Topchiyski
