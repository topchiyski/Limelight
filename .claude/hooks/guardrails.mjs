#!/usr/bin/env node
// Deterministic enforcement of Limelight's architectural rules.
//   Hook mode (Claude Code PostToolUse): reads hook JSON on stdin, checks the edited file, exit 2 = feedback to Claude.
//   CLI mode: `node .claude/hooks/guardrails.mjs --all` scans src/ and tests/ (used by `npm run lint:guardrails` + CI).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

const RULES = [
  {
    id: 'no-hard-sleep',
    applies: (f) => /\.ts$/.test(f),
    pattern: /\bwaitForTimeout\s*\(/,
    fix: 'Replace page.waitForTimeout() with a web-first assertion (expect(locator).toBeVisible()) or page.waitForResponse().',
  },
  {
    id: 'no-new-in-specs',
    applies: (f) => /\.(spec|setup)\.ts$/.test(f),
    pattern: /\bnew\s+[A-Z]\w*(Page|Component|Api|Controller|Client|Factory)\s*\(/,
    fix: 'Inject Page Objects / API controllers / factories via fixtures in src/fixtures/ and destructure them in the test signature.',
  },
  {
    id: 'specs-import-fixtures',
    applies: (f) => /\.(spec|setup)\.ts$/.test(f),
    pattern: /from\s+['"]@playwright\/test['"]/,
    fix: "Import test/expect from '@fixtures' instead of '@playwright/test'.",
  },
  {
    id: 'no-base-page',
    applies: (f) => f.includes(`src${sep}pages${sep}`),
    pattern: /\bclass\s+BasePage\b|\bextends\s+\w*Page\b/,
    fix: 'Do not inherit Page Objects. Compose reusable UI components (src/pages/components/) instead.',
  },
];

function checkFile(file) {
  const rel = relative(ROOT, file);
  if (!existsSync(file) || rel.startsWith('..') || rel.includes('node_modules')) return [];
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const violations = [];
  for (const rule of RULES.filter((r) => r.applies(file))) {
    lines.forEach((line, i) => {
      if (rule.pattern.test(line)) violations.push(`${rel}:${i + 1} [${rule.id}] ${line.trim()}\n    -> ${rule.fix}`);
    });
  }
  return violations;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function report(violations, exitCode) {
  if (violations.length === 0) return process.exit(0);
  process.stderr.write(`Limelight guardrail violations:\n${violations.join('\n')}\n`);
  process.exit(exitCode);
}

if (process.argv.includes('--all')) {
  const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'tests'))].filter((f) => f.endsWith('.ts'));
  const violations = files.flatMap(checkFile);
  if (violations.length === 0) console.log(`Guardrails OK (${files.length} files).`);
  report(violations, 1);
} else {
  let input = '';
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    const filePath = JSON.parse(input.replace(/^﻿/, '') || '{}')?.tool_input?.file_path;
    report(filePath ? checkFile(resolve(filePath)) : [], 2);
  });
}
