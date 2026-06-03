import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

/**
 * Owned concern: keep TypeScript baseUrl retirement executable while routing
 * remaining paths aliases to their owning package, runtime, or web boundaries.
 */
test('tracked active tsconfig files do not reintroduce compilerOptions.baseUrl', () => {
  const repoRoot = resolve(import.meta.dirname, '../..');
  const trackedTsconfigFiles = execFileSync('git', ['ls-files', '*tsconfig*.json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean);

  assert.ok(trackedTsconfigFiles.length > 0, 'expected tracked tsconfig inventory');

  const baseUrlOwners = trackedTsconfigFiles.filter((filePath) => {
    const parsed = JSON.parse(readFileSync(resolve(repoRoot, filePath), 'utf8'));
    return Object.hasOwn(parsed.compilerOptions ?? {}, 'baseUrl');
  });

  assert.deepEqual(baseUrlOwners, []);
});

test('tsconfig baseUrl policy docs preserve API, invariants, transitions, and scenarios', () => {
  const repoRoot = resolve(import.meta.dirname, '../..');
  const componentDocPath = resolve(
    repoRoot,
    'docs/architecture/components/ci-governance/tsconfig-baseurl-policy-component.md'
  );
  const userStoriesPath = resolve(
    repoRoot,
    'docs/architecture/components/ci-governance/tsconfig-baseurl-policy-user-stories.md'
  );
  const componentDoc = readFileSync(componentDocPath, 'utf8');
  const userStories = readFileSync(userStoriesPath, 'utf8');

  for (const section of ['## Public API', '## Invariants', '## Transitions', '## Consumers']) {
    assert.match(componentDoc, new RegExp(section));
  }

  assert.match(componentDoc, /```mermaid/);
  assert.match(componentDoc, /compilerOptions\.baseUrl/);
  assert.match(componentDoc, /`paths`/);
  assert.match(componentDoc, /`git ls-files \*tsconfig\*\.json`/);
  assert.match(userStories, /US-CFG-TS-001/);
  assert.match(userStories, /US-CFG-TS-005/);
});
