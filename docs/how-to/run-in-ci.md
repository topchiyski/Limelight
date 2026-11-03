# Run Limelight in CI (GitHub Actions)

The workflow lives in `.github/workflows/limelight-ci.yml`. It runs in three stages:

```text
static-checks ──▶ test (4 parallel shards) ──▶ merge-reports
typecheck +       each shard: blob report       one HTML report artifact
guardrails
```

## 1. Configure repository variables and secrets

In GitHub, go to **Settings → Secrets and variables → Actions**.

**Variables** tab (not sensitive):

| Name | Example |
|---|---|
| `BASE_URL` | `https://staging.example.com` |
| `API_URL` | `https://staging.example.com/api/` *(optional)* |

**Secrets** tab:

| Name | Notes |
|---|---|
| `USER_EMAIL` | Dedicated CI test account |
| `USER_PASSWORD` | |
| `API_TOKEN` | Optional; leave unset if your API doesn't need one |

## 2. Trigger a run

| Trigger | `TEST_ENV` used |
|---|---|
| Push to `main` | `staging` |
| Pull request | `staging` |
| **Actions → Limelight CI → Run workflow** | Your choice: `dev`, `staging` or `prod` |

Running with `prod` automatically skips every `@mutates` test.

## 3. Read the results

1. Open the workflow run.
2. Failures are annotated inline on the run summary (by the `github` reporter).
3. Under **Artifacts**, download `limelight-html-report-<attempt>` and unzip it.
4. View it locally:

   ```bash
   npx playwright show-report path/to/unzipped-folder
   ```

In CI, tests retry twice. Traces are captured on the first retry, so flaky failures always come with a trace.

## 4. Change the number of shards

Edit both matrix values in the `test` job so they agree:

```yaml
matrix:
  shardIndex: [1, 2, 3, 4, 5, 6]
  shardTotal: [6]
```

Each shard also runs the `setup` project (it logs in once per shard), which is expected.

## 5. Visual baselines in CI

CI runs on `ubuntu-latest`, so it compares against baselines in `tests/visual/__screenshots__/linux/`. Those files must be committed. Generate them in the Playwright Docker image ([tutorial 3](../tutorials/03-visual-regression.md#step-4-generate-baselines-on-linux)), not on Windows or macOS.

## Running elsewhere

The same commands work in any CI system:

```bash
npm ci
npx playwright install --with-deps chromium
npm run verify
CI=true npx playwright test --shard=1/4
```

Setting `CI=true` switches on CI behaviour: blob reporter, 2 retries, 2 workers, and `test.only` forbidden.
