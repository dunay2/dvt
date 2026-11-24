import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, matchesGlob } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const fixChangedScript = readFileSync('scripts/fix-changed.cjs', 'utf8');

function commandsForLintStagedPattern(pattern) {
  const commands = packageJson['lint-staged']?.[pattern];
  assert.ok(commands, `lint-staged must define ${pattern}`);
  return Array.isArray(commands) ? commands.join('\n') : String(commands);
}

test('changed-file formatter covers web shell markup as a governed source format', () => {
  assert.match(fixChangedScript, /html\|css/);
});

test('pre-commit formats TypeScript tooling through the existing hook', () => {
  assert.match(commandsForLintStagedPattern('tools/**/*.ts'), /prettier --write/);
});

test('pre-commit formatting covers web app sources and shell markup', () => {
  const appSourceCommands = commandsForLintStagedPattern('apps/**/*.{ts,tsx}');
  assert.match(appSourceCommands, /eslint --fix/);
  assert.match(appSourceCommands, /prettier --write/);

  const appShellCommands = commandsForLintStagedPattern('apps/**/*.{html,css}');
  assert.match(appShellCommands, /prettier --write/);
});

test('tracked infrastructure source files reach the pre-commit formatter', () => {
  const sources = execFileSync('git', ['ls-files', '-z', '--', 'infra'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => /\.(?:ts|tsx|cjs|mjs)$/u.test(file));
  assert.ok(sources.length > 0, 'Expected real infrastructure source files.');
  for (const source of sources) {
    const formattingTasks = Object.entries(packageJson['lint-staged']).filter(
      ([pattern, commands]) => {
        const candidate = pattern.includes('/') ? source : basename(source);
        return matchesGlob(candidate, pattern) && String(commands).includes('prettier --write');
      }
    );
    assert.ok(formattingTasks.length > 0, `No pre-commit formatting task covers ${source}`);
  }
});
