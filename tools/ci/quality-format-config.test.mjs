import { readFileSync } from 'node:fs';
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

test('pre-commit formatting covers web app sources and shell markup', () => {
  const appSourceCommands = commandsForLintStagedPattern('apps/**/*.{ts,tsx}');
  assert.match(appSourceCommands, /eslint --fix/);
  assert.match(appSourceCommands, /prettier --write/);

  const appShellCommands = commandsForLintStagedPattern('apps/**/*.{html,css}');
  assert.match(appShellCommands, /prettier --write/);
});
