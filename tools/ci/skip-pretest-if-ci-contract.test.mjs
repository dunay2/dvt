import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function runHelper(extraEnv = {}) {
  return spawnSync('node', ['scripts/skip-pretest-if-ci.cjs'], {
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

test('skip-pretest-if-ci stays fail-closed outside CI or Turbo', () => {
  const result = runHelper({
    DVT_CI: '',
    TURBO_HASH: '',
  });

  assert.equal(result.status, 1);
});

test('skip-pretest-if-ci skips under explicit CI env', () => {
  const result = runHelper({
    DVT_CI: '1',
    TURBO_HASH: '',
  });

  assert.equal(result.status, 0);
});

test('skip-pretest-if-ci also skips under Turbo orchestration env', () => {
  const result = runHelper({
    DVT_CI: '',
    TURBO_HASH: 'turbo-task-hash',
  });

  assert.equal(result.status, 0);
});
