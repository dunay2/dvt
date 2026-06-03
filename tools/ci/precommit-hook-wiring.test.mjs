import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readPackageJson() {
  return JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
}

function readPreCommitHook() {
  return readFileSync(path.join(repoRoot, '.husky', 'pre-commit'), 'utf8');
}

test('pre-commit hook wiring avoids pnpm commit lifecycle duplication', () => {
  const packageJson = readPackageJson();
  const preCommitHook = readPreCommitHook();

  assert.equal(
    Object.hasOwn(packageJson.scripts, 'precommit'),
    false,
    'Do not define a root "precommit" script: pnpm commit runs it as a lifecycle script before the Git hook.'
  );
  assert.equal(packageJson.scripts['hooks:precommit'], 'lint-staged && pnpm precommit:determinism');
  assert.match(preCommitHook, /pnpm run hooks:precommit/);
  assert.doesNotMatch(preCommitHook, /pnpm run precommit(?:\s|$)/);
});
