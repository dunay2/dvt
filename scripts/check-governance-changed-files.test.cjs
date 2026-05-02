const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseNameStatus,
  readNameStatusDiff,
  resolveBaseRef,
  validateChangedFiles,
} = require('./check-governance-changed-files.cjs');

const baseBaseline = {
  files: [
    {
      path: 'apps/api/src/app.ts',
      fileId: 'F-API',
      stateFingerprint: 'base-api',
    },
    {
      path: 'apps/web/src/legacy.ts',
      fileId: 'F-LEGACY',
      stateFingerprint: 'base-legacy',
    },
    {
      path: 'packages/@dvt/engine/src/old.ts',
      fileId: 'F-OLD',
      stateFingerprint: 'base-old',
    },
  ],
};

const currentFileIndex = {
  files: [
    {
      path: 'apps/api/src/app.ts',
      fileId: 'F-API',
      stateFingerprint: 'current-api',
      owningUnit: 'SYS-API-ROOT',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-RUNTIME',
      componentUnit: 'SYS-API-ROOT',
      unitStatus: 'canonical',
      dddOwner: 'AS',
      cqRails: 'CMD',
      isDrift: false,
      isLegacy: false,
    },
    {
      path: 'apps/web/src/new.ts',
      fileId: 'F-NEW',
      stateFingerprint: 'current-new',
      owningUnit: 'SYS-WEB-ROOT',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-FRONTEND',
      componentUnit: 'SYS-WEB-ROOT',
      unitStatus: 'canonical',
      dddOwner: 'ADP',
      cqRails: 'QRY',
      isDrift: false,
      isLegacy: false,
    },
    {
      path: 'apps/web/src/legacy.ts',
      fileId: 'F-LEGACY',
      stateFingerprint: 'current-legacy',
      owningUnit: 'SYS-WEB-LEGACY',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-FRONTEND',
      componentUnit: 'SYS-WEB-LEGACY',
      unitStatus: 'legacy',
      dddOwner: 'ADP',
      cqRails: 'QRY',
      isDrift: false,
      isLegacy: true,
    },
  ],
};

const currentBaseline = {
  files: currentFileIndex.files.map((entry) => ({
    path: entry.path,
    fileId: entry.fileId,
    stateFingerprint: entry.stateFingerprint,
  })),
};

test('parseNameStatus understands modified, added, deleted and renamed rows', () => {
  assert.deepEqual(
    parseNameStatus(
      [
        'M\tapps/api/src/app.ts',
        'A\tapps/web/src/new.ts',
        'D\tpackages/@dvt/engine/src/old.ts',
        'R100\told/path.ts\tnew/path.ts',
      ].join('\n')
    ),
    [
      { status: 'M', path: 'apps/api/src/app.ts' },
      { status: 'A', path: 'apps/web/src/new.ts' },
      { status: 'D', path: 'packages/@dvt/engine/src/old.ts' },
      {
        status: 'R',
        path: 'new/path.ts',
        oldPath: 'old/path.ts',
        score: '100',
      },
    ]
  );
});

test('resolveBaseRef falls back when origin/main is unavailable', () => {
  const calls = [];
  const result = resolveBaseRef(['origin/main', 'upstream/main', 'main'], (args) => {
    calls.push(args);
    if (args.includes('origin/main^{commit}')) {
      throw new Error('missing ref');
    }
    return 'upstream/main\n';
  });

  assert.equal(result, 'upstream/main');
  assert.deepEqual(calls, [
    ['rev-parse', '--verify', 'origin/main^{commit}'],
    ['rev-parse', '--verify', 'upstream/main^{commit}'],
  ]);
});

test('readNameStatusDiff scans only the committed revision range by default', () => {
  const calls = [];
  const result = readNameStatusDiff('origin/main', 'HEAD', (args) => {
    calls.push(args);
    return 'M\tapps/api/src/app.ts\n';
  });

  assert.deepEqual(result, [{ status: 'M', path: 'apps/api/src/app.ts' }]);
  assert.deepEqual(calls, [['diff', '--name-status', '--find-renames', 'origin/main...HEAD']]);
});

test('validateChangedFiles accepts governed added, modified, deleted and renamed files', () => {
  const result = validateChangedFiles({
    changes: [
      { status: 'M', path: 'apps/api/src/app.ts' },
      { status: 'A', path: 'apps/web/src/new.ts' },
      { status: 'D', path: 'packages/@dvt/engine/src/old.ts' },
      {
        status: 'R',
        oldPath: 'packages/@dvt/engine/src/old.ts',
        path: 'apps/web/src/new.ts',
      },
    ],
    baseBaseline,
    currentBaseline,
    currentFileIndex,
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.summary, {
    added: 1,
    modified: 1,
    deleted: 1,
    renamed: 1,
    skipped: 0,
  });
});

test('validateChangedFiles rejects modified files when the accepted fingerprint did not change', () => {
  const result = validateChangedFiles({
    changes: [{ status: 'M', path: 'apps/api/src/app.ts' }],
    baseBaseline,
    currentBaseline: {
      files: [{ path: 'apps/api/src/app.ts', fileId: 'F-API', stateFingerprint: 'base-api' }],
    },
    currentFileIndex,
  });

  assert.match(result.errors.join('\n'), /apps\/api\/src\/app\.ts/);
  assert.match(result.errors.join('\n'), /modified but its accepted fingerprint did not change/);
});

test('validateChangedFiles accepts normalized governance generated artifacts when their own fingerprint is stable', () => {
  const generatedPaths = [
    'docs/planning/status/system-governance-file-fingerprint-baseline.yaml',
    'docs/planning/status/system-governance-file-index.files.yaml',
  ];
  const generatedIndexEntries = generatedPaths.map((pathName, index) => ({
    path: pathName,
    fileId: `F-GENERATED-${index}`,
    stateFingerprint: 'stable-generated-fingerprint',
    owningUnit: 'SYS-DOCS-GOVERNANCE-ROOT',
    rootUnit: 'SYS-DVT',
    domainUnit: 'SYS-DVT',
    componentUnit: 'SYS-DOCS-GOVERNANCE-ROOT',
    unitStatus: 'canonical',
    dddOwner: 'DOCS',
    cqRails: 'DOCS',
    isDrift: false,
    isLegacy: false,
  }));
  const generatedBaselineEntries = generatedIndexEntries.map((entry) => ({
    path: entry.path,
    fileId: entry.fileId,
    stateFingerprint: entry.stateFingerprint,
  }));

  const result = validateChangedFiles({
    changes: generatedPaths.map((pathName) => ({ status: 'M', path: pathName })),
    baseBaseline: { files: generatedBaselineEntries },
    currentBaseline: { files: generatedBaselineEntries },
    currentFileIndex: { files: generatedIndexEntries },
  });

  assert.deepEqual(result.errors, []);
});

test('validateChangedFiles rejects active legacy or drift files without prior cleanup', () => {
  const result = validateChangedFiles({
    changes: [{ status: 'M', path: 'apps/web/src/legacy.ts' }],
    baseBaseline,
    currentBaseline,
    currentFileIndex,
  });

  assert.match(result.errors.join('\n'), /apps\/web\/src\/legacy\.ts/);
  assert.match(result.errors.join('\n'), /legacy\/drift governance unit/);
});

test('validateChangedFiles rejects deleted files still listed as active', () => {
  const result = validateChangedFiles({
    changes: [{ status: 'D', path: 'apps/web/src/legacy.ts' }],
    baseBaseline,
    currentBaseline,
    currentFileIndex,
  });

  assert.match(result.errors.join('\n'), /apps\/web\/src\/legacy\.ts/);
  assert.match(result.errors.join('\n'), /deleted but is still present/);
});
