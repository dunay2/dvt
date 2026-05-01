const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildComponentEntries,
  buildFileEntries,
} = require('./generate-governance-file-component-index.cjs');

const units = [
  {
    id: 'SYS-DVT',
    name: 'DVT system',
    level: 'system',
    status: 'review',
    governance: ['docs/root.md'],
  },
  {
    id: 'SYS-RUNTIME',
    name: 'Runtime domain',
    parent: 'SYS-DVT',
    level: 'domain',
    status: 'coverage-required',
    governance: ['docs/runtime.md'],
  },
  {
    id: 'SYS-API-ROOT',
    name: 'API root',
    parent: 'SYS-RUNTIME',
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
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-RUNTIME',
      componentUnit: 'SYS-API-ROOT',
      unitPath: ['SYS-DVT', 'SYS-RUNTIME', 'SYS-API-ROOT'],
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
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-DVT',
      componentUnit: 'SYS-PLANSTORE-LEGACY',
      unitPath: ['SYS-DVT', 'SYS-PLANSTORE-LEGACY'],
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
      rootUnit: entry.rootUnit,
      domainUnit: entry.domainUnit,
      unitPath: entry.unitPath,
      unitReferences: entry.unitReferences,
      fileCount: entry.fileCount,
      status: entry.status,
      isLegacy: entry.isLegacy,
    })),
    [
      {
        id: 'SYS-API-ROOT',
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-RUNTIME',
        unitPath: ['SYS-DVT', 'SYS-RUNTIME', 'SYS-API-ROOT'],
        unitReferences: [
          {
            id: 'SYS-DVT',
            name: 'DVT system',
            level: 'system',
            status: 'review',
            governance: ['docs/root.md'],
          },
          {
            id: 'SYS-RUNTIME',
            name: 'Runtime domain',
            level: 'domain',
            status: 'coverage-required',
            governance: ['docs/runtime.md'],
          },
          {
            id: 'SYS-API-ROOT',
            name: 'API root',
            level: 'component',
            status: 'coverage-required',
            governance: ['docs/api.md'],
          },
        ],
        fileCount: 1,
        status: 'coverage-required',
        isLegacy: false,
      },
      {
        id: 'SYS-PLANSTORE-LEGACY',
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-DVT',
        unitPath: ['SYS-DVT', 'SYS-PLANSTORE-LEGACY'],
        unitReferences: [
          {
            id: 'SYS-DVT',
            name: 'DVT system',
            level: 'system',
            status: 'review',
            governance: ['docs/root.md'],
          },
          {
            id: 'SYS-PLANSTORE-LEGACY',
            name: 'Legacy plan-store',
            level: 'component',
            status: 'legacy',
            governance: ['docs/planstore.md'],
          },
        ],
        fileCount: 1,
        status: 'legacy',
        isLegacy: true,
      },
    ]
  );
});
