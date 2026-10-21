/** @ownedConcern Verify the explicit process-start creation policy on real isolated processes. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertRepositoryCommandCatalogCoverage,
  buildRepositoryCommandCatalog,
  classifyScriptFilePath,
} from './repository-command-catalog.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const preload = path.join(root, 'scripts/local-data-private-creation.cjs');
const api = JSON.parse(readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));

// Keep mask changes in a one-shot process, outside the Node test worker.
const launchWithMask = `
  process.umask(Number.parseInt(process.argv[1], 8));
  const child = require('node:child_process').spawnSync(process.execPath, process.argv.slice(2), {
    stdio: 'inherit', timeout: 9000, killSignal: 'SIGKILL'
  });
  if (child.error) throw child.error;
  if (child.signal || child.status === null) throw new Error('Creation probe terminated');
  process.exitCode = child.status;
`;

function isolated(initialMask, source, args = []) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=commonjs',
      '-e',
      launchWithMask,
      initialMask,
      '--require',
      preload,
      '--input-type=commonjs',
      '-e',
      source,
      ...args,
    ],
    { encoding: 'utf8', timeout: 10000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

for (const initial of ['0000', '0002', '0022', '0077', '0777']) {
  test(
    `startup with inherited ${initial} creates private files and directories`,
    {
      skip: process.platform === 'win32',
    },
    () => {
      const sandbox = mkdtempSync(path.join(tmpdir(), 'dvt-start-private-'));
      try {
        isolated(
          initial,
          `
        const fs = require('node:fs');
        fs.writeFileSync(process.argv[1] + '/new', 'fixture');
        fs.mkdirSync(process.argv[1] + '/directory');
      `,
          [sandbox]
        );
        assert.equal(statSync(path.join(sandbox, 'new')).mode & 0o7777, 0o600);
        assert.equal(statSync(path.join(sandbox, 'directory')).mode & 0o7777, 0o700);
      } finally {
        rmSync(sandbox, { recursive: true, force: true });
      }
    }
  );
}

test(
  'startup neither chmods nor replaces an existing file',
  {
    skip: process.platform === 'win32',
  },
  () => {
    const sandbox = mkdtempSync(path.join(tmpdir(), 'dvt-start-existing-'));
    const filename = path.join(sandbox, 'existing');
    try {
      writeFileSync(filename, 'retain');
      const before = statSync(filename);
      isolated('0022', 'process.stdout.write("started");');
      const after = statSync(filename);
      assert.equal(after.mode, before.mode);
      assert.equal(after.ino, before.ino);
      assert.equal(readFileSync(filename, 'utf8'), 'retain');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
);

test(
  'the child inherits the policy without another preload',
  {
    skip: process.platform === 'win32',
  },
  () => {
    const sandbox = mkdtempSync(path.join(tmpdir(), 'dvt-start-child-'));
    try {
      isolated(
        '0022',
        `
      const { spawnSync } = require('node:child_process');
      const child = spawnSync(process.execPath, ['-e',
        'require("node:fs").writeFileSync(process.argv[1], "child")', process.argv[1]]);
      if (child.error || child.status !== 0) process.exit(1);
    `,
        [path.join(sandbox, 'child')]
      );
      assert.equal(statSync(path.join(sandbox, 'child')).mode & 0o7777, 0o600);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
);

test(
  'worker threads inherit private creation without mutating the shared process mask',
  {
    skip: process.platform === 'win32',
  },
  () => {
    const sandbox = mkdtempSync(path.join(tmpdir(), 'dvt-start-worker-'));
    try {
      isolated(
        '0022',
        `
      const { Worker } = require('node:worker_threads');
      const worker = new Worker(
        'require("node:fs").writeFileSync(require("node:worker_threads").workerData, "worker")',
        { eval: true, workerData: process.argv[1], execArgv: ['--require', process.argv[2]] }
      );
      worker.on('error', () => { process.exitCode = 1; });
      worker.on('exit', code => { if (code !== 0) process.exitCode = 1; });
    `,
        [path.join(sandbox, 'worker'), preload]
      );
      assert.equal(statSync(path.join(sandbox, 'worker')).mode & 0o7777, 0o600);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
);

test(
  'the launcher does not mutate its parent test process',
  {
    skip: process.platform === 'win32',
  },
  () => {
    const sandbox = mkdtempSync(path.join(tmpdir(), 'dvt-start-parent-'));
    try {
      writeFileSync(path.join(sandbox, 'before'), 'fixture');
      isolated('0022', 'process.stdout.write("started");');
      writeFileSync(path.join(sandbox, 'after'), 'fixture');
      assert.equal(
        statSync(path.join(sandbox, 'after')).mode,
        statSync(path.join(sandbox, 'before')).mode
      );
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
);

test('the normal start remains unchanged and LOCAL remains an explicit entrypoint', () => {
  assert.equal(api.scripts.start, 'node dist/server.js');
  assert.equal(
    api.scripts['start:local'],
    'node --require ../../scripts/local-data-private-creation.cjs dist/server.js'
  );
  assert.equal(api.dependencies['@duckdb/node-api'], '1.5.6-r.1');
  assert.equal(api.scripts['test:ci'], 'pnpm test:unit && pnpm test:integration:ci');
  assert.match(
    api.scripts['test:unit'],
    /^node --require .*local-data-private-creation\.cjs .*vitest\.mjs run --config vitest\.config\.ts$/u
  );
  assert.match(
    api.scripts['test:integration:ci'],
    /vitest\.mjs run --config vitest\.integration\.config\.ts$/u
  );
});

test('the preload has no read/reset umask, filesystem repairs, configuration, or product imports', () => {
  const source = readFileSync(preload, 'utf8');
  assert.match(source, /if \(process\.platform !== 'win32' && isMainThread\)/u);
  assert.match(source, /process\.umask\(0o077\)/u);
  assert.doesNotMatch(
    source,
    /process\.umask\(\s*\)|chmod|unlink|rmSync|process\.env\.|@duckdb|@dvt/u
  );
});

test('only the explicit LOCAL bootstrap receives runtime capability classification', () => {
  const admitted = 'scripts/local-data-private-creation.cjs';
  const classification = classifyScriptFilePath(admitted);
  assert.equal(classification.domain, 'runtime-capability');
  assert.equal(classification.sensitivity, 'capability');
  assert.equal(classification.changedFileValidationRelevant, true);
  assert.doesNotThrow(() =>
    assertRepositoryCommandCatalogCoverage(buildRepositoryCommandCatalog({}, [admitted]))
  );
  for (const unknown of [
    'scripts/local-data-private-creation-copy.cjs',
    'scripts/local-data-private-creation.js',
    'scripts/unclassified-bootstrap.cjs',
  ]) {
    assert.equal(classifyScriptFilePath(unknown).domain, 'unknown');
    assert.throws(() =>
      assertRepositoryCommandCatalogCoverage(buildRepositoryCommandCatalog({}, [unknown]))
    );
  }
});
