# Limelight

Playwright + TypeScript 7 test framework: UI E2E (POM), REST API, hybrid API+UI, visual regression. npm, Node 24, Zod 4, Faker 10.

## Commands
- Verify after every edit: `npm run verify` (typecheck + guardrails scan)
- One file: `npx playwright test <path> --project=<api|e2e-chromium|visual-chromium>`
- One test: `npx playwright test -g "<title>" --project=<project>`
- Discover without running (no app needed): `npm run test:list`
- Visual baselines: `npm run test:visual:update` — only when the user asks; baselines are OS-specific.

## Architecture
- IMPORTANT: Specs import `test`/`expect` from `@fixtures` and receive Page Objects, API controllers and factories as fixtures. New POM/controller → register it in `src/fixtures/*.fixture.ts`.
- Page Objects expose `readonly` locators + domain actions; `expect()` stays in specs. Shared UI → component class in `src/pages/components/`, composed (no `BasePage`).
- Wait with web-first assertions or `waitForResponse`, never `waitForTimeout`.
- Env: read via `env` from `@config/env` (Zod-validated), not `process.env`. New variable → add to `EnvSchema` + `.env.example`.
- Test data: `userFactory.build({ ...overrides })`; seed with the `seedUser` fixture (auto-deleted on teardown).
- Data-mutating tests carry `{ tag: '@mutates' }` (excluded on `TEST_ENV=prod`).
<!-- 2026-11-03: Rules above are also enforced by .claude/hooks/guardrails.mjs (PostToolUse + CI). Prune a line here only if the agent keeps complying without it after a model upgrade (3 runs with/without). -->

## Gotchas
- API paths are relative (`'users'`, not `'/users'`); `API_URL` always ends in `/`.
<!-- 2026-11-03: A leading slash makes Playwright resolve against the host root, silently dropping the /api prefix. LimelightApi strips it defensively. Prune when: API_URL is guaranteed to be host-only. -->
- With `exactOptionalPropertyTypes`, pass optional Playwright options via conditional spread: `...(x && { key: x })`, not `key: undefined`.
- `tsc` is TypeScript 7 (native): no `baseUrl`; `paths` are relative to tsconfig.json.

## Done means
`npm run verify` passes and `npm run test:list` still discovers all projects. Live runs need a reachable `BASE_URL` — say so instead of claiming tests passed.
