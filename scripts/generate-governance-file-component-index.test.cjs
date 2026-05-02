const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  buildComponentEntries,
  buildFileEntries,
  deriveGovernanceSemantics,
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

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
  const pathHash = sha256(`dvt:file-path:v1:${filePath}`);
  const contentHash = sha256(content);
  const governanceHash = sha256(stableStringify(governancePayload));

  return {
    fileId: `F-${sha256(`dvt:file:v1:${filePath}`).slice(0, 12).toUpperCase()}`,
    pathHash,
    contentHash,
    governanceHash,
    stateFingerprint: sha256(
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
