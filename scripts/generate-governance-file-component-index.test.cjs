const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildComponentEntries,
  buildFileEntries,
} = require('./generate-governance-file-component-index.cjs');

const units = [
  {
    id: 'SYS-DVT',
    level: 'system',
    status: 'review',
  },
  {
    id: 'SYS-API-ROOT',
    name: 'API root',
    parent: 'SYS-DVT',
    level: 'component',
    status: 'coverage-required',
    owns: ['apps/api/**'],
    excludes: ['apps/api/src/legacy/**'],
    childrenRequired: true,
    dddOwner: 'AS',
    cqRails: 'API commands and queries',
    governance: ['docs/api.md'],
  },
  {
    id: 'SYS-PLANSTORE-LEGACY',
    name: 'Legacy plan-store',
    parent: 'SYS-DVT',
    level: 'component',
    status: 'legacy',
    owns: ['apps/api/src/legacy/**'],
    childrenRequired: true,
    dddOwner: 'ADP',
    cqRails: 'PS-Q04',
    governance: ['docs/planstore.md'],
  },
];

test('buildFileEntries adds unit status and drift legacy booleans per file', () => {
  const entries = buildFileEntries(['apps/api/src/main.ts', 'apps/api/src/legacy/store.ts'], units);

  assert.deepEqual(entries, [
    {
      path: 'apps/api/src/main.ts',
      owningUnit: 'SYS-API-ROOT',
      ownerLevel: 'component',
      unitStatus: 'coverage-required',
      isDrift: false,
      isLegacy: false,
      dddOwner: 'AS',
      cqRails: 'API commands and queries',
      governance: ['docs/api.md'],
    },
    {
      path: 'apps/api/src/legacy/store.ts',
      owningUnit: 'SYS-PLANSTORE-LEGACY',
      ownerLevel: 'component',
      unitStatus: 'legacy',
      isDrift: false,
      isLegacy: true,
      dddOwner: 'ADP',
      cqRails: 'PS-Q04',
      governance: ['docs/planstore.md'],
    },
  ]);
});

test('buildComponentEntries counts owned files per component', () => {
  const fileEntries = buildFileEntries(
    ['apps/api/src/main.ts', 'apps/api/src/legacy/store.ts'],
    units
  );
  const components = buildComponentEntries(units, fileEntries);

  assert.deepEqual(
    components.map((entry) => ({
      id: entry.id,
      fileCount: entry.fileCount,
      status: entry.status,
      isLegacy: entry.isLegacy,
    })),
    [
      {
        id: 'SYS-API-ROOT',
        fileCount: 1,
        status: 'coverage-required',
        isLegacy: false,
      },
      {
        id: 'SYS-PLANSTORE-LEGACY',
        fileCount: 1,
        status: 'legacy',
        isLegacy: true,
      },
    ]
  );
});
