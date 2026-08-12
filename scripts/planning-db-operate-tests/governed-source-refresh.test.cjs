const assert = require('node:assert/strict');
const test = require('node:test');

const {
  canonicalSourceContentHash,
  normalizeGovernedSourcePath,
  planGovernedSourceRefreshOperation,
  readGovernedSourceSnapshots,
} = require('../planning-db/governed-source-refresh-write-rail.cjs');
const { parseArgs } = require('../planning-db-operate.cjs');

test('parseArgs builds a bounded governed-source refresh command', () => {
  const command = parseArgs([
    'governed-source',
    'refresh',
    '--path',
    'package.json',
    '--path',
    'scripts/planning-db-export.cjs',
    '--expected-content-sha256',
    `package.json=${'a'.repeat(64)}`,
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'governed_source_content_refresh');
  assert.deepEqual(command.paths, ['package.json', 'scripts/planning-db-export.cjs']);
  assert.equal(command.expectedContentSha256ByPath['package.json'], 'a'.repeat(64));
  assert.equal(command.actor, 'codex');
  assert.match(command.idempotencyKey, /^governed_source_content_refresh:codex:/u);
});

test('governed-source paths reject ambiguous and escaping inputs', () => {
  for (const candidate of [
    '',
    '.',
    '..',
    '../package.json',
    'scripts/../package.json',
    '/package.json',
    'C:/repo/package.json',
    'scripts\\file.cjs',
    'scripts//file.cjs',
  ]) {
    assert.throws(() => normalizeGovernedSourcePath(candidate), /repository-relative|POSIX/u);
  }

  assert.equal(normalizeGovernedSourcePath('scripts/file.cjs'), 'scripts/file.cjs');
});

test('canonical governed-source hashing normalizes text line endings but preserves binary bytes', () => {
  assert.equal(
    canonicalSourceContentHash(Buffer.from('one\r\ntwo\rthree\n', 'utf8')),
    canonicalSourceContentHash(Buffer.from('one\ntwo\nthree\n', 'utf8'))
  );
  assert.notEqual(
    canonicalSourceContentHash(Buffer.from([0, 13, 10])),
    canonicalSourceContentHash(Buffer.from([0, 10]))
  );
});

test('snapshot reader accepts only clean regular tracked HEAD blobs', () => {
  const calls = [];
  const git = (args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') return Buffer.from(`${'b'.repeat(40)}\n`);
    if (args[0] === 'status') return Buffer.alloc(0);
    if (args[0] === 'ls-tree') {
      return Buffer.from(`100644 blob ${'c'.repeat(40)}\tpackage.json\0`);
    }
    if (args[0] === 'show') return Buffer.from('{\r\n  "name": "dvt"\r\n}\r\n');
    throw new Error(`Unexpected git call: ${args.join(' ')}`);
  };

  const snapshots = readGovernedSourceSnapshots({
    paths: ['package.json'],
    repoRoot: 'C:/repo',
    git,
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => false }),
    realpath: (absolutePath) => absolutePath,
  });

  assert.equal(snapshots.sourceCommitSha, 'b'.repeat(40));
  assert.equal(snapshots.sources[0].path, 'package.json');
  assert.equal(
    snapshots.sources[0].contentHash,
    canonicalSourceContentHash(Buffer.from('{\n  "name": "dvt"\n}\n'))
  );
  assert.deepEqual(calls.at(-1), ['show', `${'b'.repeat(40)}:package.json`]);
});

test('snapshot reader fails closed for dirty, missing and symlinked sources', () => {
  const baseGit = (status, tree) => (args) => {
    if (args[0] === 'rev-parse') return Buffer.from(`${'b'.repeat(40)}\n`);
    if (args[0] === 'status') return Buffer.from(status);
    if (args[0] === 'ls-tree') return Buffer.from(tree);
    if (args[0] === 'show') return Buffer.from('content\n');
    throw new Error(`Unexpected git call: ${args.join(' ')}`);
  };
  const regularFile = () => ({ isFile: () => true, isSymbolicLink: () => false });

  assert.throws(
    () =>
      readGovernedSourceSnapshots({
        paths: ['package.json'],
        repoRoot: 'C:/repo',
        git: baseGit(' M package.json\0', ''),
        lstat: regularFile,
        realpath: (absolutePath) => absolutePath,
      }),
    /unmodified/u
  );
  assert.throws(
    () =>
      readGovernedSourceSnapshots({
        paths: ['package.json'],
        repoRoot: 'C:/repo',
        git: baseGit('', ''),
        lstat: regularFile,
        realpath: (absolutePath) => absolutePath,
      }),
    /tracked regular file/u
  );
  assert.throws(
    () =>
      readGovernedSourceSnapshots({
        paths: ['package.json'],
        repoRoot: 'C:/repo',
        git: baseGit('', `120000 blob ${'c'.repeat(40)}\tpackage.json\0`),
        lstat: () => ({ isFile: () => false, isSymbolicLink: () => true }),
        realpath: (absolutePath) => absolutePath,
      }),
    /symbolic links/u
  );
});

test('refresh plan changes only effective content identity and records exact provenance', () => {
  const command = {
    kind: 'governed_source_content_refresh',
    actor: 'codex',
    paths: ['package.json'],
    expectedContentSha256ByPath: { packageJson: undefined },
    idempotencyKey: 'refresh-1',
  };
  const planned = planGovernedSourceRefreshOperation({
    command,
    sourceCommitSha: 'd'.repeat(40),
    snapshots: [{ path: 'package.json', contentHash: 'b'.repeat(64) }],
    governedRows: [
      {
        path: 'package.json',
        path_hash: 'c'.repeat(64),
        content_hash: 'a'.repeat(64),
        governance_hash: 'd'.repeat(64),
      },
    ],
    existingOverrides: [],
    operationId: 'operation-1',
    now: new Date('2026-08-12T12:00:00.000Z'),
  });

  assert.equal(planned.sources[0].previousContentHash, 'a'.repeat(64));
  assert.equal(planned.sources[0].contentHash, 'b'.repeat(64));
  assert.equal(planned.sources[0].revision, 0);
  assert.match(planned.sources[0].stateFingerprint, /^[a-f0-9]{64}$/u);
  assert.deepEqual(planned.audit.paths, ['package.json']);
  assert.equal(planned.audit.sourceCommitSha, 'd'.repeat(40));
  assert.deepEqual(planned.audit.changes, [
    {
      path: 'package.json',
      previousContentHash: 'a'.repeat(64),
      contentHash: 'b'.repeat(64),
      revision: 0,
    },
  ]);
});

test('refresh plan rejects unknown governed paths and compare-and-set mismatches', () => {
  const base = {
    command: {
      kind: 'governed_source_content_refresh',
      actor: 'codex',
      paths: ['package.json'],
      expectedContentSha256ByPath: {},
      idempotencyKey: 'refresh-1',
    },
    sourceCommitSha: 'd'.repeat(40),
    snapshots: [{ path: 'package.json', contentHash: 'b'.repeat(64) }],
    existingOverrides: [],
    operationId: 'operation-1',
    now: new Date('2026-08-12T12:00:00.000Z'),
  };

  assert.throws(
    () => planGovernedSourceRefreshOperation({ ...base, governedRows: [] }),
    /already-governed/u
  );
  assert.throws(
    () =>
      planGovernedSourceRefreshOperation({
        ...base,
        command: {
          ...base.command,
          expectedContentSha256ByPath: { 'package.json': 'e'.repeat(64) },
        },
        governedRows: [
          {
            path: 'package.json',
            path_hash: 'c'.repeat(64),
            content_hash: 'a'.repeat(64),
            governance_hash: 'd'.repeat(64),
          },
        ],
      }),
    /expected effective content/u
  );
});

test('refresh plan treats a SQL null override revision as an absent overlay', () => {
  const planned = planGovernedSourceRefreshOperation({
    command: {
      kind: 'governed_source_content_refresh',
      actor: 'codex',
      paths: ['package.json'],
      expectedContentSha256ByPath: {},
      idempotencyKey: 'refresh-null-revision',
    },
    sourceCommitSha: 'd'.repeat(40),
    snapshots: [{ path: 'package.json', contentHash: 'b'.repeat(64) }],
    governedRows: [
      {
        path: 'package.json',
        path_hash: 'c'.repeat(64),
        content_hash: 'a'.repeat(64),
        governance_hash: 'd'.repeat(64),
        override_content_hash: null,
        override_revision: null,
      },
    ],
    existingOverrides: [
      {
        path: 'package.json',
        path_hash: 'c'.repeat(64),
        content_hash: 'a'.repeat(64),
        governance_hash: 'd'.repeat(64),
        override_content_hash: null,
        override_revision: null,
      },
    ],
    operationId: 'operation-null-revision',
    now: new Date('2026-08-12T12:00:00.000Z'),
  });

  assert.equal(planned.sources[0].revision, 0);
});
