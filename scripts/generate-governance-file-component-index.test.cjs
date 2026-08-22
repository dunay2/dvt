const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256HexUtf8 } = require('@dvt/crypto');
const {
  buildComponentEntries,
  buildComponentFileMapManifest,
  buildFileIndexManifest,
  buildFileEntries,
  deriveGovernanceSemantics,
  expandComponentFileMapFromManifest,
  expandFileIndexFromManifest,
  filterExistingRepositoryFiles,
  normalizeGeneratedIndexBytesForHash,
  normalizeTextBytesForHash,
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
    id: 'SYS-REPO-METADATA-ROOT',
    name: 'Repository metadata root',
    parent: 'SYS-DVT',
    level: 'component',
    status: 'canonical',
    owns: ['package.json'],
    childrenRequired: true,
    dddOwner: 'INFRA',
    cqRails: 'none - repository metadata',
    governance: ['package.json'],
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

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function expectedFingerprints(filePath, content, governancePayload) {
  const pathHash = sha256HexUtf8(`dvt:file-path:v1:${filePath}`);
  const contentHash = sha256HexUtf8(content);
  const governanceHash = sha256HexUtf8(stableStringify(governancePayload));

  return {
    fileId: `F-${sha256HexUtf8(`dvt:file:v1:${filePath}`).slice(0, 12).toUpperCase()}`,
    pathHash,
    contentHash,
    governanceHash,
    stateFingerprint: sha256HexUtf8(
      stableStringify({
        contentHash,
        governanceHash,
        pathHash,
      })
    ),
  };
}

test('buildFileEntries adds unit status and drift legacy booleans per file', () => {
  const fileContents = new Map([
    ['apps/api/src/main.ts', 'export const main = true;\n'],
    ['apps/api/src/legacy/store.ts', 'export const legacy = true;\n'],
    ['package.json', '{"name":"dvt"}\n'],
  ]);
  const entries = buildFileEntries(
    ['apps/api/src/main.ts', 'apps/api/src/legacy/store.ts', 'package.json'],
    units,
    {
      readFileBytes: (filePath) => Buffer.from(fileContents.get(filePath), 'utf8'),
    }
  );

  const mainGovernancePayload = {
    componentUnit: 'SYS-API-ROOT',
    cqRails: 'API commands and queries',
    dddOwner: 'AS',
    domainUnit: 'SYS-RUNTIME',
    governance: ['docs/api.md'],
    isDrift: false,
    isLegacy: false,
    ownerLevel: 'component',
    owningUnit: 'SYS-API-ROOT',
    rootUnit: 'SYS-DVT',
    unitPath: ['SYS-DVT', 'SYS-RUNTIME', 'SYS-API-ROOT'],
    unitStatus: 'coverage-required',
    governanceState: 'coverage-required',
    canonicalRole: 'none',
    evidenceState: 'coverage-required',
  };
  const canonicalGovernancePayload = {
    componentUnit: 'SYS-REPO-METADATA-ROOT',
    cqRails: 'none - repository metadata',
    dddOwner: 'INFRA',
    domainUnit: 'SYS-DVT',
    governance: ['package.json'],
    isDrift: false,
    isLegacy: false,
    ownerLevel: 'component',
    owningUnit: 'SYS-REPO-METADATA-ROOT',
    rootUnit: 'SYS-DVT',
    unitPath: ['SYS-DVT', 'SYS-REPO-METADATA-ROOT'],
    unitStatus: 'canonical',
    governanceState: 'governed',
    canonicalRole: 'implementation-owner',
    evidenceState: 'classification-only',
  };
  const legacyGovernancePayload = {
    componentUnit: 'SYS-PLANSTORE-LEGACY',
    cqRails: 'PS-Q04',
    dddOwner: 'ADP',
    domainUnit: 'SYS-DVT',
    governance: ['docs/planstore.md'],
    isDrift: false,
    isLegacy: true,
    ownerLevel: 'component',
    owningUnit: 'SYS-PLANSTORE-LEGACY',
    rootUnit: 'SYS-DVT',
    unitPath: ['SYS-DVT', 'SYS-PLANSTORE-LEGACY'],
    unitStatus: 'legacy',
    governanceState: 'legacy',
    canonicalRole: 'none',
    evidenceState: 'remediation-required',
  };

  assert.deepEqual(entries, [
    {
      ...expectedFingerprints(
        'apps/api/src/main.ts',
        'export const main = true;\n',
        mainGovernancePayload
      ),
      path: 'apps/api/src/main.ts',
      owningUnit: 'SYS-API-ROOT',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-RUNTIME',
      componentUnit: 'SYS-API-ROOT',
      unitPath: ['SYS-DVT', 'SYS-RUNTIME', 'SYS-API-ROOT'],
      ownerLevel: 'component',
      unitStatus: 'coverage-required',
      governanceState: 'coverage-required',
      canonicalRole: 'none',
      evidenceState: 'coverage-required',
      isDrift: false,
      isLegacy: false,
      dddOwner: 'AS',
      cqRails: 'API commands and queries',
      governance: ['docs/api.md'],
    },
    {
      ...expectedFingerprints(
        'apps/api/src/legacy/store.ts',
        'export const legacy = true;\n',
        legacyGovernancePayload
      ),
      path: 'apps/api/src/legacy/store.ts',
      owningUnit: 'SYS-PLANSTORE-LEGACY',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-DVT',
      componentUnit: 'SYS-PLANSTORE-LEGACY',
      unitPath: ['SYS-DVT', 'SYS-PLANSTORE-LEGACY'],
      ownerLevel: 'component',
      unitStatus: 'legacy',
      governanceState: 'legacy',
      canonicalRole: 'none',
      evidenceState: 'remediation-required',
      isDrift: false,
      isLegacy: true,
      dddOwner: 'ADP',
      cqRails: 'PS-Q04',
      governance: ['docs/planstore.md'],
    },
    {
      ...expectedFingerprints('package.json', '{"name":"dvt"}\n', canonicalGovernancePayload),
      path: 'package.json',
      owningUnit: 'SYS-REPO-METADATA-ROOT',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-DVT',
      componentUnit: 'SYS-REPO-METADATA-ROOT',
      unitPath: ['SYS-DVT', 'SYS-REPO-METADATA-ROOT'],
      ownerLevel: 'component',
      unitStatus: 'canonical',
      governanceState: 'governed',
      canonicalRole: 'implementation-owner',
      evidenceState: 'classification-only',
      isDrift: false,
      isLegacy: false,
      dddOwner: 'INFRA',
      cqRails: 'none - repository metadata',
      governance: ['package.json'],
    },
  ]);
});

test('buildFileEntries assigns nested component files to the leaf component', () => {
  const nestedUnits = [
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
      id: 'SYS-RUNTIME-ENGINE-CORE',
      name: 'Runtime engine core',
      parent: 'SYS-RUNTIME',
      level: 'component',
      status: 'coverage-required',
      owns: [],
      childrenRequired: true,
      dddOwner: 'AS',
      cqRails: 'RT-C01',
      governance: ['docs/engine.md'],
    },
    {
      id: 'SYS-RUNTIME-ENGINE-APPLICATION',
      name: 'Runtime engine application layer',
      parent: 'SYS-RUNTIME-ENGINE-CORE',
      level: 'component',
      status: 'coverage-required',
      owns: ['packages/@dvt/engine/src/application/**'],
      childrenRequired: false,
      dddOwner: 'AS',
      cqRails: 'RT-C01',
      governance: ['docs/engine-application.md'],
    },
  ];

  const entries = buildFileEntries(
    ['packages/@dvt/engine/src/application/StartRunApplicationService.ts'],
    nestedUnits,
    {
      readFileBytes: () => Buffer.from('export const service = true;\n', 'utf8'),
    }
  );

  assert.equal(entries[0].owningUnit, 'SYS-RUNTIME-ENGINE-APPLICATION');
  assert.equal(entries[0].componentUnit, 'SYS-RUNTIME-ENGINE-APPLICATION');
  assert.deepEqual(entries[0].unitPath, [
    'SYS-DVT',
    'SYS-RUNTIME',
    'SYS-RUNTIME-ENGINE-CORE',
    'SYS-RUNTIME-ENGINE-APPLICATION',
  ]);
});

test('buildFileEntries consumes a supplied owner matcher', () => {
  const apiRoot = units.find((unit) => unit.id === 'SYS-API-ROOT');
  const calls = [];
  const entries = buildFileEntries(['virtual/generated.ts'], units, {
    ownerMatcher: (filePath) => {
      calls.push(filePath);
      return [apiRoot];
    },
    readFileBytes: () => Buffer.from('export const generated = true;\n', 'utf8'),
  });

  assert.deepEqual(calls, ['virtual/generated.ts']);
  assert.equal(entries[0].owningUnit, 'SYS-API-ROOT');
  assert.deepEqual(entries[0].unitPath, ['SYS-DVT', 'SYS-RUNTIME', 'SYS-API-ROOT']);
});

test('filterExistingRepositoryFiles drops tracked files deleted from the worktree', () => {
  assert.deepEqual(
    filterExistingRepositoryFiles(['package.json', 'scripts/removed-once.cjs'], {
      fileExists: (filePath) => filePath === 'package.json',
    }),
    ['package.json']
  );
});

test('buildComponentEntries counts owned files per component', () => {
  const fileContents = new Map([
    ['apps/api/src/main.ts', 'export const main = true;\n'],
    ['apps/api/src/legacy/store.ts', 'export const legacy = true;\n'],
    ['package.json', '{"name":"dvt"}\n'],
  ]);
  const fileEntries = buildFileEntries(
    ['apps/api/src/main.ts', 'apps/api/src/legacy/store.ts', 'package.json'],
    units,
    {
      readFileBytes: (filePath) => Buffer.from(fileContents.get(filePath), 'utf8'),
    }
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
      governanceState: entry.governanceState,
      canonicalRole: entry.canonicalRole,
      evidenceState: entry.evidenceState,
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
        governanceState: 'coverage-required',
        canonicalRole: 'none',
        evidenceState: 'coverage-required',
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
        governanceState: 'legacy',
        canonicalRole: 'none',
        evidenceState: 'remediation-required',
        isLegacy: true,
      },
      {
        id: 'SYS-REPO-METADATA-ROOT',
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-DVT',
        unitPath: ['SYS-DVT', 'SYS-REPO-METADATA-ROOT'],
        unitReferences: [
          {
            id: 'SYS-DVT',
            name: 'DVT system',
            level: 'system',
            status: 'review',
            governance: ['docs/root.md'],
          },
          {
            id: 'SYS-REPO-METADATA-ROOT',
            name: 'Repository metadata root',
            level: 'component',
            status: 'canonical',
            governance: ['package.json'],
          },
        ],
        fileCount: 1,
        status: 'canonical',
        governanceState: 'governed',
        canonicalRole: 'implementation-owner',
        evidenceState: 'classification-only',
        isLegacy: false,
      },
    ]
  );
});

test('buildComponentEntries preserves component semantics in unit references for DB import', () => {
  const semanticUnits = units.map((unit) =>
    unit.id === 'SYS-REPO-METADATA-ROOT'
      ? {
          ...unit,
          ownedConcern: 'Repository metadata and workspace configuration ownership.',
          publicApi: ['package.json', 'pnpm workspace scripts'],
          invariants: ['Repository metadata remains governed through explicit root files.'],
          transitions: ['Workspace metadata changes update repository governance state.'],
          consumers: ['CI scope detection', 'planning database imports'],
        }
      : unit
  );
  const fileEntries = buildFileEntries(['package.json'], semanticUnits, {
    readFileBytes: () => Buffer.from('{"name":"dvt"}\n', 'utf8'),
  });
  const components = buildComponentEntries(semanticUnits, fileEntries);

  const repoComponent = components.find((entry) => entry.id === 'SYS-REPO-METADATA-ROOT');
  const repoReference = repoComponent.unitReferences.find(
    (reference) => reference.id === 'SYS-REPO-METADATA-ROOT'
  );

  assert.equal(
    repoComponent.ownedConcern,
    'Repository metadata and workspace configuration ownership.'
  );
  assert.deepEqual(repoComponent.publicApi, ['package.json', 'pnpm workspace scripts']);
  assert.equal(
    repoReference.ownedConcern,
    'Repository metadata and workspace configuration ownership.'
  );
  assert.deepEqual(repoReference.publicApi, ['package.json', 'pnpm workspace scripts']);
  assert.deepEqual(repoReference.invariants, [
    'Repository metadata remains governed through explicit root files.',
  ]);
  assert.deepEqual(repoReference.transitions, [
    'Workspace metadata changes update repository governance state.',
  ]);
  assert.deepEqual(repoReference.consumers, ['CI scope detection', 'planning database imports']);
});

test('buildFileIndexManifest splits file rows into deterministic unit shards', () => {
  const fileEntries = [
    {
      path: 'apps/api/src/main.ts',
      fileId: 'F-API',
      unitPath: ['SYS-DVT', 'SYS-API', 'SYS-API-ROOT'],
    },
    {
      path: 'apps/web/src/main.tsx',
      fileId: 'F-WEB',
      unitPath: ['SYS-DVT', 'SYS-WEB', 'SYS-WEB-ROOT'],
    },
    {
      path: 'package.json',
      fileId: 'F-REPO',
      unitPath: ['SYS-DVT', 'SYS-REPO-METADATA', 'SYS-REPO-METADATA-ROOT'],
    },
  ];

  const output = buildFileIndexManifest(fileEntries, {
    shardDirectory: 'docs/planning/status/governance-files',
  });

  assert.deepEqual(output.manifest, {
    version: 1,
    generatedFrom: 'git ls-files plus untracked non-ignored local files',
    unitManifest: 'docs/planning/status/system-governance-unit-index.units.yaml',
    shardDirectory: 'docs/planning/status/governance-files',
    fileCount: 3,
    shards: [
      {
        id: 'SYS-API',
        path: 'docs/planning/status/governance-files/SYS-API.files.yaml',
        fileCount: 1,
        contentHash: output.manifest.shards[0].contentHash,
      },
      {
        id: 'SYS-REPO-METADATA',
        path: 'docs/planning/status/governance-files/SYS-REPO-METADATA.files.yaml',
        fileCount: 1,
        contentHash: output.manifest.shards[1].contentHash,
      },
      {
        id: 'SYS-WEB',
        path: 'docs/planning/status/governance-files/SYS-WEB.files.yaml',
        fileCount: 1,
        contentHash: output.manifest.shards[2].contentHash,
      },
    ],
  });
  assert.deepEqual(Object.keys(output.shards), [
    'docs/planning/status/governance-files/SYS-API.files.yaml',
    'docs/planning/status/governance-files/SYS-REPO-METADATA.files.yaml',
    'docs/planning/status/governance-files/SYS-WEB.files.yaml',
  ]);
  assert.deepEqual(
    expandFileIndexFromManifest(output.manifest, output.shards).map((entry) => entry.path),
    ['apps/api/src/main.ts', 'package.json', 'apps/web/src/main.tsx']
  );
});

test('buildComponentFileMapManifest creates deterministic component shards with drift counts', () => {
  const componentEntries = [
    {
      id: 'SYS-API-ROOT',
      rootUnit: 'SYS-RUNTIME',
      domainUnit: 'SYS-RUNTIME',
      status: 'coverage-required',
      governanceState: 'coverage-required',
      dddOwner: 'AS',
      cqRails: 'API-C01',
      fileCount: 2,
      childrenRequired: true,
    },
    {
      id: 'SYS-API-OPS-HEALTH',
      rootUnit: 'SYS-RUNTIME',
      domainUnit: 'SYS-RUNTIME',
      status: 'canonical',
      governanceState: 'governed',
      dddOwner: 'AS',
      cqRails: 'API-Q02',
      fileCount: 1,
      childrenRequired: false,
    },
    {
      id: 'SYS-WEB-ROOT',
      rootUnit: 'SYS-WEB',
      domainUnit: 'SYS-WEB',
      status: 'canonical',
      governanceState: 'governed',
      dddOwner: 'PRES',
      cqRails: 'WEB-Q01',
      fileCount: 1,
      childrenRequired: false,
    },
  ];
  const fileEntries = [
    {
      path: 'apps/api/src/app.ts',
      fileId: 'F-API-APP',
      componentUnit: 'SYS-API-ROOT',
      owningUnit: 'SYS-API-ROOT',
      unitStatus: 'coverage-required',
      governanceState: 'coverage-required',
      isDrift: false,
      isLegacy: false,
    },
    {
      path: 'apps/api/src/legacy.ts',
      fileId: 'F-API-LEGACY',
      componentUnit: 'SYS-API-ROOT',
      owningUnit: 'SYS-API-ROOT',
      unitStatus: 'drift',
      governanceState: 'drift',
      isDrift: true,
      isLegacy: false,
    },
    {
      path: 'apps/api/src/entrypoints/http/health.ts',
      fileId: 'F-API-HEALTH',
      componentUnit: 'SYS-API-OPS-ROUTES',
      owningUnit: 'SYS-API-OPS-HEALTH',
      unitStatus: 'canonical',
      governanceState: 'governed',
      isDrift: false,
      isLegacy: false,
    },
    {
      path: 'apps/web/src/App.tsx',
      fileId: 'F-WEB-APP',
      componentUnit: 'SYS-WEB-ROOT',
      owningUnit: 'SYS-WEB-ROOT',
      unitStatus: 'canonical',
      governanceState: 'governed',
      isDrift: false,
      isLegacy: false,
    },
  ];

  const output = buildComponentFileMapManifest(componentEntries, fileEntries, {
    shardDirectory: 'docs/planning/status/governance-components',
  });

  assert.deepEqual(output.manifest, {
    version: 1,
    generatedFrom: [
      '.generated-docs/planning/status/system-governance-file-index.files.yaml',
      '.generated-docs/planning/status/system-governance-component-index.components.yaml',
    ],
    shardDirectory: 'docs/planning/status/governance-components',
    componentCount: 3,
    fileCount: 4,
    components: [
      {
        id: 'SYS-API-OPS-HEALTH',
        path: 'docs/planning/status/governance-components/SYS-API-OPS-HEALTH.component-files.yaml',
        fileCount: 1,
        driftFileCount: 0,
        legacyFileCount: 0,
        contentHash: output.manifest.components[0].contentHash,
      },
      {
        id: 'SYS-API-ROOT',
        path: 'docs/planning/status/governance-components/SYS-API-ROOT.component-files.yaml',
        fileCount: 2,
        driftFileCount: 1,
        legacyFileCount: 0,
        contentHash: output.manifest.components[1].contentHash,
      },
      {
        id: 'SYS-WEB-ROOT',
        path: 'docs/planning/status/governance-components/SYS-WEB-ROOT.component-files.yaml',
        fileCount: 1,
        driftFileCount: 0,
        legacyFileCount: 0,
        contentHash: output.manifest.components[2].contentHash,
      },
    ],
  });
  assert.deepEqual(Object.keys(output.shards), [
    'docs/planning/status/governance-components/SYS-API-OPS-HEALTH.component-files.yaml',
    'docs/planning/status/governance-components/SYS-API-ROOT.component-files.yaml',
    'docs/planning/status/governance-components/SYS-WEB-ROOT.component-files.yaml',
  ]);
  assert.deepEqual(
    expandComponentFileMapFromManifest(output.manifest, output.shards).flatMap(
      (component) => component.files
    ),
    [
      {
        path: 'apps/api/src/entrypoints/http/health.ts',
        fileId: 'F-API-HEALTH',
        owningUnit: 'SYS-API-OPS-HEALTH',
        unitStatus: 'canonical',
        governanceState: 'governed',
        isDrift: false,
        isLegacy: false,
      },
      {
        path: 'apps/api/src/app.ts',
        fileId: 'F-API-APP',
        owningUnit: 'SYS-API-ROOT',
        unitStatus: 'coverage-required',
        governanceState: 'coverage-required',
        isDrift: false,
        isLegacy: false,
      },
      {
        path: 'apps/api/src/legacy.ts',
        fileId: 'F-API-LEGACY',
        owningUnit: 'SYS-API-ROOT',
        unitStatus: 'drift',
        governanceState: 'drift',
        isDrift: true,
        isLegacy: false,
      },
      {
        path: 'apps/web/src/App.tsx',
        fileId: 'F-WEB-APP',
        owningUnit: 'SYS-WEB-ROOT',
        unitStatus: 'canonical',
        governanceState: 'governed',
        isDrift: false,
        isLegacy: false,
      },
    ]
  );
});

test('expandComponentFileMapFromManifest rejects duplicate component shards', () => {
  assert.throws(
    () =>
      expandComponentFileMapFromManifest(
        {
          version: 1,
          componentCount: 2,
          fileCount: 0,
          components: [
            { id: 'SYS-API-ROOT', path: 'api-one.yaml', fileCount: 0 },
            { id: 'SYS-API-ROOT', path: 'api-two.yaml', fileCount: 0 },
          ],
        },
        {
          'api-one.yaml': { componentUnit: 'SYS-API-ROOT', fileCount: 0, files: [] },
          'api-two.yaml': { componentUnit: 'SYS-API-ROOT', fileCount: 0, files: [] },
        }
      ),
    /Duplicate component shard in governance component file map: SYS-API-ROOT/
  );
});

test('expandComponentFileMapFromManifest rejects file rows in the wrong component shard', () => {
  assert.throws(
    () =>
      expandComponentFileMapFromManifest(
        {
          version: 1,
          componentCount: 1,
          fileCount: 1,
          components: [{ id: 'SYS-API-ROOT', path: 'api.yaml', fileCount: 1 }],
        },
        {
          'api.yaml': {
            componentUnit: 'SYS-API-ROOT',
            fileCount: 1,
            files: [{ path: 'apps/web/src/App.tsx', componentUnit: 'SYS-WEB-ROOT' }],
          },
        }
      ),
    /File apps\/web\/src\/App\.tsx is in component shard SYS-API-ROOT but belongs to SYS-WEB-ROOT/
  );
});

test('expandFileIndexFromManifest rejects duplicate paths across shards', () => {
  assert.throws(
    () =>
      expandFileIndexFromManifest(
        {
          version: 1,
          fileCount: 2,
          shards: [
            { id: 'SYS-API', path: 'SYS-API.files.yaml', fileCount: 1, contentHash: 'a' },
            { id: 'SYS-WEB', path: 'SYS-WEB.files.yaml', fileCount: 1, contentHash: 'b' },
          ],
        },
        {
          'SYS-API.files.yaml': {
            files: [{ path: 'apps/shared.ts', fileId: 'F-ONE' }],
          },
          'SYS-WEB.files.yaml': {
            files: [{ path: 'apps/shared.ts', fileId: 'F-TWO' }],
          },
        }
      ),
    /Duplicate file path in governance shards: apps\/shared\.ts/
  );
});

test('expandFileIndexFromManifest rejects missing tracked paths', () => {
  assert.throws(
    () =>
      expandFileIndexFromManifest(
        {
          version: 1,
          fileCount: 1,
          shards: [{ id: 'SYS-API', path: 'SYS-API.files.yaml', fileCount: 1, contentHash: 'a' }],
        },
        {
          'SYS-API.files.yaml': {
            files: [{ path: 'apps/api/src/main.ts', fileId: 'F-API' }],
          },
        },
        {
          expectedPaths: ['apps/api/src/main.ts', 'apps/api/src/missing.ts'],
        }
      ),
    /Missing file path from governance shards: apps\/api\/src\/missing\.ts/
  );
});

test('normalizeGeneratedIndexBytesForHash removes recursive fingerprint values', () => {
  const first = Buffer.from(
    [
      'files:',
      '  - fileId: F-ABCDEF123456',
      '    contentHash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '    stateFingerprint: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      '    path: docs/planning/status/system-governance-file-index.files.yaml',
      '',
    ].join('\n'),
    'utf8'
  );
  const second = Buffer.from(
    [
      'files:',
      '  - fileId: F-ABCDEF123456',
      '    contentHash: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      '    stateFingerprint: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      '    path: docs/planning/status/system-governance-file-index.files.yaml',
      '',
    ].join('\n'),
    'utf8'
  );

  assert.equal(
    normalizeGeneratedIndexBytesForHash(first).toString('utf8'),
    normalizeGeneratedIndexBytesForHash(second).toString('utf8')
  );
});

test('deriveGovernanceSemantics preserves superseded as retired governance state', () => {
  assert.deepEqual(deriveGovernanceSemantics('superseded', 'component'), {
    governanceState: 'superseded',
    canonicalRole: 'none',
    evidenceState: 'retired',
  });
});

test('normalizeTextBytesForHash canonicalizes text line endings', () => {
  assert.equal(
    normalizeTextBytesForHash(Buffer.from('a\r\nb\rc\n', 'utf8')).toString('utf8'),
    'a\nb\nc\n'
  );
});
