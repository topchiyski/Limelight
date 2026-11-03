# Limelight documentation

Start with **Getting started**, then follow the tutorials in order. Each tutorial builds on the one before.

## How-to guides (task-focused)

| Guide | Use it when you want to… |
|---|---|
| [Getting started](getting-started.md) | Go from a fresh clone to a green test run |
| [Run Limelight in CI](how-to/run-in-ci.md) | Configure GitHub Actions, secrets, shards and reports |
| [Debug a failing test](how-to/debug-failing-tests.md) | Find out *why* a test failed: UI mode, traces, API errors |

## Tutorials (learn by building)

| # | Tutorial | You will build |
|---|---|---|
| 1 | [Add a Page Object](tutorials/01-add-a-page-object.md) | `SettingsPage`, its fixture and an E2E spec |
| 2 | [Add an API resource](tutorials/02-add-an-api-resource.md) | `ProjectsApi` controller, factory, seeding fixture and API spec |
| 3 | [Visual regression testing](tutorials/03-visual-regression.md) | A masked snapshot test and Linux baselines |

## Reference

- [Project README](../README.md): architecture overview and command list
- [CLAUDE.md](../CLAUDE.md): the conventions Claude Code follows in this repo
- [Playwright docs](https://playwright.dev/docs/intro)

Questions? Reach out on [LinkedIn](https://www.linkedin.com/in/stoyan-topchiyski/).
