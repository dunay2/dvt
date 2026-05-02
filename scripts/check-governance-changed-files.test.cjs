const test = require('node:test');
const assert = require('node:assert/strict');

const { parseNameStatus, validateChangedFiles } = require('./check-governance-changed-files.cjs');

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
