/** @ownedConcern Project admitted browser producers inside the existing CI scope detector. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function fullWebBrowserMatrix() {
  return ['controlled', 'available', 'unavailable'].flatMap((capability) =>
    capability === 'unavailable'
      ? [{ phase: 'browser', capability }]
      : Array.from({ length: 6 }, (_, index) => ({
          phase: 'browser',
          capability,
          shard: index + 1,
        }))
  );
}

export function validateWebBrowserRows(rows) {
  assert.ok(Array.isArray(rows), 'Browser preflight requires an array of producers');
  const identities = new Set();
  for (const row of rows) {
    assert.ok(row && typeof row === 'object', 'Browser producer must be an object');
    assert.equal(row.phase, 'browser');
    assert.ok(['controlled', 'available', 'unavailable'].includes(row.capability));
    const sharded = row.capability !== 'unavailable';
    assert.deepEqual(
      Object.keys(row).sort(),
      sharded ? ['capability', 'phase', 'shard'] : ['capability', 'phase']
    );
    if (sharded) assert.ok(Number.isSafeInteger(row.shard) && row.shard >= 1 && row.shard <= 6);
    const identity = JSON.stringify([row.capability, row.shard]);
    assert.equal(identities.has(identity), false, 'Duplicate browser producer');
    identities.add(identity);
  }
  return rows;
}

export function readWebBrowserMatrix({
  files = [],
  execute = spawnSync,
  env = process.env,
  cwd = process.cwd(),
} = {}) {
  const query = fileURLToPath(new URL('./web-browser-matrix-query.mjs', import.meta.url));
  const result = execute(process.execPath, [query, ...files], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 5_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr || String(result.error || 'Browser planner failed'));
  return validateWebBrowserRows(JSON.parse(result.stdout));
}

export function resolveWebBrowserMatrix(
  scope,
  { full = false, changedFiles, query = readWebBrowserMatrix } = {}
) {
  const testScope = JSON.parse(scope.test_scope);
  assert.equal(typeof testScope.web, 'boolean');
  assert.equal(typeof testScope.root_build_sensitive, 'boolean');
  if (full || testScope.root_build_sensitive) return fullWebBrowserMatrix();
  if (!testScope.web) return [];
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) return fullWebBrowserMatrix();
  try {
    return validateWebBrowserRows(query());
  } catch (error) {
    console.error('[web-browser-preflight] Retaining the full browser matrix:', String(error));
    return fullWebBrowserMatrix();
  }
}
