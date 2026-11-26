/** @ownedConcern Prove detector browser projection keeps canonical admission and hosted shards. */
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, unlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  fullWebBrowserMatrix,
  readWebBrowserMatrix,
  resolveWebBrowserMatrix,
  validateWebBrowserRows,
} from './web-browser-matrix-preflight.mjs';
import {
  projectWebBrowserMatrix,
  readCanonicalBrowserPlan,
  queryWebBrowserMatrix,
} from './web-browser-matrix-query.mjs';

function scopeOutput(values = {}) {
  return { test_scope: JSON.stringify({ web: true, root_build_sensitive: false, ...values }) };
}

function queryNativePlan(files, env = {}) {
  return spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./web-browser-matrix-query.mjs', import.meta.url)), ...files],
    {
      encoding: 'utf8',
      env: { ...process.env, ...env },
      timeout: 30_000,
    }
  );
}

async function withBrowserGitFixture(operation, verify) {
  const directory = mkdtempSync(join(tmpdir(), 'dvt-browser-rename-'));
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Browser fixture',
    GIT_AUTHOR_EMAIL: 'browser@example.test',
    GIT_COMMITTER_NAME: 'Browser fixture',
    GIT_COMMITTER_EMAIL: 'browser@example.test',
  };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR'])
    delete env[key];
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: directory,
      env,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  const before = 'apps/web/src/original.ts';
  const after = 'apps/web/src/renamed.ts';
  try {
    git('init', '--quiet');
    git('config', 'diff.renames', 'true');
    mkdirSync(dirname(join(directory, before)), { recursive: true });
    writeFileSync(join(directory, before), 'export const preserved = true;\n');
    git('add', '--all');
    const base = git('commit-tree', git('write-tree'), '-m', 'base');
    git('update-ref', 'HEAD', base);
    assert.ok(resolve(directory, before).startsWith(directory + sep));
    assert.ok(resolve(directory, after).startsWith(directory + sep));
    if (operation === 'rename') renameSync(join(directory, before), join(directory, after));
    else unlinkSync(join(directory, before));
    git('add', '--all');
    const head = git('commit-tree', git('write-tree'), '-p', base, '-m', 'head');
    git('update-ref', 'HEAD', head);
    await verify({ directory, base, head, before, after, git, env });
  } finally {
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('dvt-browser-rename-'));
    rmSync(directory, { recursive: true, force: true });
  }
}

test('full and root-sensitive discovery bypass the loader and retain all thirteen browser producers', () => {
  const query = () => {
    throw new Error('The full path must not load the planner');
  };
  assert.deepEqual(
    resolveWebBrowserMatrix(scopeOutput(), { full: true, query }),
    fullWebBrowserMatrix()
  );
  assert.deepEqual(
    resolveWebBrowserMatrix(scopeOutput({ root_build_sensitive: true }), { query }),
    fullWebBrowserMatrix()
  );
  assert.equal(fullWebBrowserMatrix().length, 13);
  assert.deepEqual(
    fullWebBrowserMatrix()
      .filter((row) => row.capability === 'controlled')
      .map((row) => row.shard),
    [1, 2, 3, 4, 5, 6]
  );
  assert.deepEqual(
    fullWebBrowserMatrix()
      .filter((row) => row.capability === 'available')
      .map((row) => row.shard),
    [1, 2, 3, 4, 5, 6]
  );
});

test('an unrelated PR does not initialize the browser query', () => {
  assert.deepEqual(
    resolveWebBrowserMatrix(scopeOutput({ web: false }), {
      query: () => {
        throw new Error('unrelated query');
      },
    }),
    []
  );
});

test('a narrow Web PR consumes one complete native browser projection', () => {
  let queries = 0;
  let facts;
  const changedFiles = ['apps/web/src/app/views/canvas/useCanvasSideDockResize.ts'];
  const expected = [{ phase: 'browser', capability: 'controlled', shard: 1 }];
  const actual = resolveWebBrowserMatrix(scopeOutput(), {
    changedFiles,
    query: (request) => {
      queries += 1;
      facts = request;
      return expected;
    },
  });
  assert.deepEqual(actual, expected);
  assert.equal(queries, 1);
  assert.equal(
    facts,
    undefined,
    'The canonical acquisition must not be replaced by scope name-only facts'
  );
});

test('canonical controlled shards retain every selected spec with a hosted denominator of six', () => {
  for (const count of [1, 7]) {
    const rows = projectWebBrowserMatrix([
      {
        capability: 'controlled',
        specPaths: Array.from(
          { length: count },
          (_, index) => `apps/web/cypress/e2e/example-${index}.cy.ts`
        ),
      },
    ]);
    assert.deepEqual(
      rows.map((row) => row.shard),
      Array.from({ length: Math.min(count, 6) }, (_, index) => index + 1)
    );
  }
  assert.deepEqual(projectWebBrowserMatrix([]), []);
  assert.throws(() => projectWebBrowserMatrix([{ capability: 'controlled', specPaths: [] }]));
});

test('available and unavailable runtime projections retain their real provider semantics', () => {
  const rows = projectWebBrowserMatrix([
    {
      capability: 'available',
      specPaths: Array.from({ length: 6 }, (_, index) => `live-${index}.cy.ts`),
    },
    { capability: 'unavailable', specPaths: ['unavailable.cy.ts'] },
  ]);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.at(-1), { phase: 'browser', capability: 'unavailable' });
  assert.throws(() =>
    projectWebBrowserMatrix([{ capability: 'available', specPaths: ['too-few.cy.ts'] }])
  );
});

test('unknown, duplicate and malformed browser admission cannot become empty success', () => {
  for (const commands of [
    null,
    {},
    [{ capability: 'unknown', specPaths: ['x'] }],
    [{ capability: 'controlled' }],
    [{ capability: 'controlled', specPaths: [7] }],
  ])
    assert.throws(() => projectWebBrowserMatrix(commands));
  assert.throws(() =>
    projectWebBrowserMatrix([
      { capability: 'controlled', specPaths: ['x'] },
      { capability: 'controlled', specPaths: ['y'] },
    ])
  );
  for (const rows of [
    null,
    [{}],
    [{ phase: 'vitest', capability: 'controlled', shard: 1 }],
    [{ phase: 'browser', capability: 'controlled', shard: 7 }],
    [{ phase: 'browser', capability: 'unavailable', shard: 1 }],
  ])
    assert.throws(() => validateWebBrowserRows(rows));
});

test('failed loader and malformed native output reject instead of removing required jobs', () => {
  for (const result of [
    { status: 1, stderr: 'loader failed' },
    { status: null, error: new Error('deadline') },
    { status: 0, stdout: '{broken' },
    { status: 0, stdout: '{}' },
  ]) {
    assert.throws(() => readWebBrowserMatrix({ execute: () => result }));
    assert.deepEqual(
      resolveWebBrowserMatrix(scopeOutput(), {
        changedFiles: ['apps/web/src/app/views/canvas/useCanvasSideDockResize.ts'],
        query: () => readWebBrowserMatrix({ execute: () => result }),
      }),
      fullWebBrowserMatrix()
    );
  }
});

test('real dependency-free canonical planning admits a source/test pair without provider setup', () => {
  const result = queryNativePlan([
    'apps/web/src/app/views/canvas/useCanvasSideDockResize.ts',
    'apps/web/src/app/views/canvas/useCanvasSideDockResize.test.tsx',
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
});

test('a real mixed unknown browser path fails canonical admission', () => {
  const result = queryNativePlan([
    'apps/web/src/app/views/canvas/useCanvasSideDockResize.ts',
    'apps/web/cypress/e2e/canvas/unadmitted-preflight-proof.cy.ts',
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), fullWebBrowserMatrix());
  assert.throws(
    () =>
      readCanonicalBrowserPlan([
        'apps/web/src/app/views/canvas/useCanvasSideDockResize.ts',
        'apps/web/cypress/e2e/canvas/unadmitted-preflight-proof.cy.ts',
      ]),
    /not admitted|declare every affected spec/u
  );
});

test('an actual Node loader failure stays visible', () => {
  const result = queryNativePlan(['apps/web/src/app/views/canvas/useCanvasSideDockResize.ts'], {
    NODE_OPTIONS: '--no-experimental-strip-types',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\.ts|TypeScript/u);
});

test('real global CSS and Web configuration retain the complete browser policy', () => {
  for (const file of ['apps/web/src/styles/theme.css', 'apps/web/vite.config.ts']) {
    const result = queryNativePlan([file]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), fullWebBrowserMatrix());
  }
});

test('explicit admitted facts do not acquire a second Git comparison', () => {
  const files = [
    'apps/web/src/app/views/canvas/useCanvasSideDockResize.ts',
    'apps/web/src/app/views/canvas/useCanvasSideDockResize.test.tsx',
  ];
  const rows = readWebBrowserMatrix({
    files,
    env: { ...process.env, GIT_BASE: 'unused-preflight-base', GIT_HEAD: 'unused-preflight-head' },
  });
  assert.deepEqual(rows, []);
});

test('module styles retain the canonical frontier and browser policy', async () => {
  const { isWebVitestImpactFrontier } = await import('../../apps/web/vitest/impact.ts');
  const { resolveWebCypressChangedPlan } = await import('../../apps/web/cypress.changed.ts');
  const files = [
    'apps/web/src/app/views/canvas/useCanvasSideDockResize.ts',
    'apps/web/src/app/views/canvas/resize.module.css',
  ];
  assert.equal(isWebVitestImpactFrontier(files), true);
  const expected = resolveWebCypressChangedPlan(files).commands;
  const actual = readCanonicalBrowserPlan(files);
  const policy = (commands) =>
    commands.map(({ capability, specPaths }) => ({ capability, specPaths }));
  assert.deepEqual(policy(actual), policy(expected));
  const absentModule = queryNativePlan(files);
  assert.equal(absentModule.status, 0, absentModule.stderr);
  assert.deepEqual(JSON.parse(absentModule.stdout), fullWebBrowserMatrix());
});

test('real rename and deletion retain removed-path browser evidence', async () => {
  const { readChangedFiles } = await import('../../apps/web/scripts/changed-suite-git.ts');
  for (const operation of ['rename', 'delete']) {
    await withBrowserGitFixture(
      operation,
      async ({ directory, base, head, before, after, git, env }) => {
        const comparison = { ...env, GIT_BASE: base, GIT_HEAD: head };
        const paths = readChangedFiles(directory, {
          env: comparison,
          gitOutput: (args) =>
            git(...args)
              .split('\0')
              .filter(Boolean),
        });
        assert.ok(
          paths.includes(before),
          'Canonical no-renames acquisition retains the removed path'
        );
        if (operation === 'rename') {
          assert.ok(paths.includes(after));
          assert.deepEqual(
            git('diff', '--name-only', '--diff-filter=ACMRD', base, head).split(/\r?\n/u),
            [after]
          );
        }
        const rows = await queryWebBrowserMatrix([], { repoRoot: directory, env: comparison });
        assert.deepEqual(rows, fullWebBrowserMatrix());
      }
    );
  }
});
