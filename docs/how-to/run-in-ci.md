# Run Limelight in CI (GitHub Actions)

Limelight ships with three pieces of GitHub automation:

| File | Purpose |
|---|---|
| `.github/workflows/limelight-ci.yml` | Main pipeline: checks, sharded tests, reporting, GitHub Pages |
| `.github/workflows/update-visual-baselines.yml` | One-click regeneration of Linux visual baselines |
| `.github/dependabot.yml` | Weekly dependency and action updates |

## How the pipeline works

```text
Typecheck & guardrails ──▶ Tests (4 shards, Playwright container) ──▶ Report ──▶ Publish (main only)
 typecheck                  one environment per TEST_ENV               merge shards     GitHub Pages
 guardrails                 blob report per shard                      job summary
 actionlint                                                            PR comment
 resolve image + env                                                   HTML artifact
```

- **Same container everywhere.** Tests run in `mcr.microsoft.com/playwright:v<version>-noble`. The version is read from `package-lock.json`, so the image always matches the installed Playwright. It's the same image used to create visual baselines, so screenshots compare pixel for pixel.
- **Safe when unconfigured.** If `BASE_URL` or the credentials are missing, the test jobs skip with a warning instead of failing. That covers fresh forks, fork PRs and Dependabot PRs, which have no access to secrets.

## When it runs

| Trigger | `TEST_ENV` | Report published to Pages? |
|---|---|---|
| Push to `main` | `staging` | ✅ |
| Nightly, 03:00 UTC | `staging` | ✅ |
| Pull request | `staging` | No; results go to a PR comment instead |
| Manual: **Actions → Limelight CI → Run workflow** | your choice | ✅ when run on `main` |

The manual run has three inputs:

| Input | Options |
|---|---|
| `test_env` | `dev`, `staging`, `prod` (prod skips all `@mutates` tests) |
| `project` | `all`, `api`, `e2e-chromium`, `visual-chromium` |
| `grep` | Optional regex for test titles or tags, e.g. `@api` or `checkout` |

Pushing new commits to a PR cancels that PR's in-progress run. Runs on `main` are never cancelled.

## One-time setup

### 1. Add variables and secrets

Go to **Settings → Secrets and variables → Actions**.

| Kind | Name | Required | Example |
|---|---|---|---|
| Variable | `BASE_URL` | yes | `https://staging.example.com` |
| Variable | `API_URL` | no | `https://staging.example.com/api/` |
| Secret | `USER_EMAIL` | yes | dedicated CI test user |
| Secret | `USER_PASSWORD` | yes | |
| Secret | `API_TOKEN` | no | |

**Different values per environment:** the test job runs inside a GitHub *Environment* named after `TEST_ENV`, so `dev`, `staging` and `prod` are created automatically on first use. Under **Settings → Environments → staging** (or another), add variables and secrets with the same names. Values defined on an environment override repository-level ones.

> To protect production, open **Settings → Environments → prod** and add **Required reviewers**. Manual `prod` runs then wait for approval.

### 2. Enable GitHub Pages

Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

After the next successful `main` run, the latest report is live at **https://topchiyski.github.io/Limelight/** (also linked from the README badge and the run summary).

> The repo is public, so this report is too. Anyone can view its screenshots, videos and traces. If the app under test shows sensitive data, delete the `publish` job and the "Upload Pages artifact" step.

### 3. Allow the baseline workflow to push

Go to **Settings → Actions → General → Workflow permissions** and select **Read and write permissions**. Only `update-visual-baselines.yml` uses it, and the workflow explicitly requests `contents: write`.

### 4. (Optional) Require CI before merging

Go to **Settings → Rules → Rulesets → New branch ruleset**, target `main`, and enable **Require status checks to pass** with these checks:
- `Typecheck & guardrails`
- `Report`

## Reading results

| Where | What you get |
|---|---|
| **Run summary page** | Pass/fail/flaky/skipped counts, a table of failing tests with file:line and first error line, and the Pages link |
| **PR conversation** | The same summary as one comment that's updated on every push, not duplicated |
| **Files changed tab** | Inline annotations on the failing test lines |
| **Artifacts** | `limelight-html-report-<attempt>`: download, unzip, run `npx playwright show-report <folder>` |
| **GitHub Pages** | The latest `main`/nightly report, browsable with traces |

CI retries failed tests twice and captures a trace on the first retry, so every flaky failure comes with a trace.

## Updating visual baselines

Baselines must be produced on Linux in the CI image. Use the workflow instead of your own machine:

1. Push your branch with the UI change.
2. Go to **Actions → Update visual baselines → Run workflow**, select **your branch** under "Use workflow from", and pick the environment.
3. The workflow regenerates changed snapshots and commits them to your branch as `github-actions[bot]`. It refuses to run on `main`, so baseline changes always go through review.
4. Review the PNG diffs in the PR. Then re-run CI: pushes made by the workflow's own token don't trigger new runs. Use **Re-run all jobs**, or push any commit.

## Dependabot

Every Monday Dependabot opens grouped PRs:
- **`@playwright/test` on its own.** The CI image follows automatically. If rendering changed, run *Update visual baselines* on that PR's branch.
- **Other npm dev dependencies**, grouped together.
- **GitHub Actions versions**, grouped together.

Dependabot PRs can't read your Actions secrets, so their test jobs skip, while typecheck and guardrails still run. To run the full suite on them, add the same secrets under **Settings → Secrets and variables → Dependabot**.

## Changing the shard count

Edit both values in the `test` job matrix so they agree:

```yaml
matrix:
  shardIndex: [1, 2, 3, 4, 5, 6]
  shardTotal: [6]
```

Each shard also runs the `setup` project (one login per shard), which is expected.

## Running in another CI system

```bash
npm ci
npx playwright install --with-deps chromium   # or use the mcr.microsoft.com/playwright image
npm run verify
CI=true npx playwright test --shard=1/4
npx playwright merge-reports --reporter html,json ./all-blob-reports   # after collecting every shard's blob-report/
node .github/scripts/report-summary.mjs results.json                    # optional Markdown summary
```

Setting `CI=true` switches on CI behaviour: blob reporter, 2 retries, 2 workers, and `test.only` forbidden. Run the merge step with `PLAYWRIGHT_JSON_OUTPUT_NAME=results.json` so the JSON lands where the summary script expects it.
