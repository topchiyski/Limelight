#!/usr/bin/env node
// Turns a Playwright JSON report into Markdown for the job summary and the PR comment.
// Usage: RUN_URL=<url> node .github/scripts/report-summary.mjs results.json > summary.md
import { readFileSync } from 'node:fs';

const MAX_FAILURES = 20;
const reportPath = process.argv[2] ?? 'results.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = 0 } = report.stats ?? {};

const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
const firstLine = (text) => stripAnsi(text ?? '').split('\n').find((line) => line.trim()) ?? '';
const escapeCell = (text) => text.replace(/\|/g, '\\|').slice(0, 200);

// Root suites are files (already shown in the Location column), so their titles are skipped.
function* walk(suite, titles, isFileSuite) {
  const path = isFileSuite || !suite.title ? titles : [...titles, suite.title];
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) yield { spec, test, titles: [...path, spec.title] };
  }
  for (const child of suite.suites ?? []) yield* walk(child, path, false);
}

const problems = [];
for (const suite of report.suites ?? []) {
  for (const { spec, test, titles } of walk(suite, [], true)) {
    if (test.status !== 'unexpected' && test.status !== 'flaky') continue;
    const lastError = [...(test.results ?? [])].reverse().find((r) => r.error)?.error?.message;
    problems.push({
      status: test.status,
      where: `[${test.projectName}] ${spec.file}:${spec.line}`,
      title: titles.join(' › '),
      error: firstLine(lastError),
    });
  }
}

const verdict = unexpected > 0 ? '❌ Failed' : flaky > 0 ? '⚠️ Passed with flaky tests' : '✅ Passed';
const lines = [
  `## 🎭 Limelight test results: ${verdict}`,
  '',
  '| ✅ Passed | ❌ Failed | ⚠️ Flaky | ⏭️ Skipped | ⏱️ Duration |',
  '|---:|---:|---:|---:|---:|',
  `| ${expected} | ${unexpected} | ${flaky} | ${skipped} | ${(duration / 1000).toFixed(1)}s |`,
];

if (problems.length > 0) {
  lines.push('', '| | Test | Location | First error line |', '|---|---|---|---|');
  for (const p of problems.slice(0, MAX_FAILURES)) {
    const icon = p.status === 'flaky' ? '⚠️' : '❌';
    lines.push(`| ${icon} | ${escapeCell(p.title)} | \`${escapeCell(p.where)}\` | ${escapeCell(p.error)} |`);
  }
  if (problems.length > MAX_FAILURES) lines.push('', `…and ${problems.length - MAX_FAILURES} more.`);
}

if (process.env.RUN_URL) {
  lines.push('', `📦 [Run details & HTML report artifact](${process.env.RUN_URL})`);
}

process.stdout.write(`${lines.join('\n')}\n`);
