const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFingerprintBaseline,
  buildImpactReport,
  compareFingerprintBaseline,
  expandFingerprintBaseline,
  renderImpactMarkdown,
} = require('./check-governance-file-fingerprint-baseline.cjs');

const currentEntries = [
  {
    fileId: 'F-AAA111AAA111',
    path: 'apps/api/src/main.ts',
    contentHash: 'content-a',
    governanceHash: 'governance-a',
    stateFingerprint: 'state-a',
    rootUnit: 'SYS-DVT',
    domainUnit: 'SYS-RUNTIME',
    componentUnit: 'SYS-API-ROOT',
    owningUnit: 'SYS-API-ROOT',
  },
  {
    fileId: 'F-BBB222BBB222',
    path: 'packages/@dvt/engine/src/application/RecoverRunApplicationService.ts',
    contentHash: 'content-b',
    governanceHash: 'governance-b',
    stateFingerprint: 'state-b',
    rootUnit: 'SYS-DVT',
    domainUnit: 'SYS-RUNTIME',
    componentUnit: 'SYS-ENGINE-ROOT',
    owningUnit: 'SYS-ENGINE-APPLICATION',
  },
];

test('buildFingerprintBaseline projects stable fingerprint rows into deterministic shards', () => {
  const baseline = buildFingerprintBaseline(currentEntries, {
    shardDirectory: '.generated-docs/planning/status/governance-file-fingerprints',
  });

  assert.deepEqual(baseline.manifest, {
    version: 1,
    source: '.generated-docs/planning/status/system-governance-file-index.files.yaml',
    shardDirectory: '.generated-docs/planning/status/governance-file-fingerprints',
    fileCount: 2,
    shards: [
      {
        id: 'SYS-RUNTIME',
        path: '.generated-docs/planning/status/governance-file-fingerprints/SYS-RUNTIME.fingerprints.yaml',
        fileCount: 2,
        contentHash: baseline.manifest.shards[0].contentHash,
      },
    ],
  });
  assert.deepEqual(Object.keys(baseline.shards), [
    '.generated-docs/planning/status/governance-file-fingerprints/SYS-RUNTIME.fingerprints.yaml',
  ]);
  assert.deepEqual(expandFingerprintBaseline(baseline), [
    {
      fileId: 'F-AAA111AAA111',
      path: 'apps/api/src/main.ts',
      contentHash: 'content-a',
      governanceHash: 'governance-a',
      stateFingerprint: 'state-a',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-RUNTIME',
      componentUnit: 'SYS-API-ROOT',
      owningUnit: 'SYS-API-ROOT',
    },
    {
      fileId: 'F-BBB222BBB222',
      path: 'packages/@dvt/engine/src/application/RecoverRunApplicationService.ts',
      contentHash: 'content-b',
      governanceHash: 'governance-b',
      stateFingerprint: 'state-b',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-RUNTIME',
      componentUnit: 'SYS-ENGINE-ROOT',
      owningUnit: 'SYS-ENGINE-APPLICATION',
    },
  ]);
});

test('compareFingerprintBaseline reports drift with component impact', () => {
  const baseline = buildFingerprintBaseline(currentEntries);
  const nextEntries = [
    {
      ...currentEntries[0],
      contentHash: 'content-a-next',
      stateFingerprint: 'state-a-next',
    },
    {
      fileId: 'F-CCC333CCC333',
      path: 'apps/web/src/main.tsx',
      contentHash: 'content-c',
      governanceHash: 'governance-c',
      stateFingerprint: 'state-c',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-FRONTEND',
      componentUnit: 'SYS-WEB-ROOT',
      owningUnit: 'SYS-WEB-ROOT',
    },
  ];

  assert.deepEqual(compareFingerprintBaseline(baseline, nextEntries), {
    ok: false,
    changed: [
      {
        path: 'apps/api/src/main.ts',
        fileId: 'F-AAA111AAA111',
        previousStateFingerprint: 'state-a',
        currentStateFingerprint: 'state-a-next',
        contentChanged: true,
        governanceChanged: false,
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-RUNTIME',
        componentUnit: 'SYS-API-ROOT',
        owningUnit: 'SYS-API-ROOT',
      },
    ],
    missing: [
      {
        path: 'packages/@dvt/engine/src/application/RecoverRunApplicationService.ts',
        fileId: 'F-BBB222BBB222',
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-RUNTIME',
        componentUnit: 'SYS-ENGINE-ROOT',
        owningUnit: 'SYS-ENGINE-APPLICATION',
      },
    ],
    extra: [
      {
        path: 'apps/web/src/main.tsx',
        fileId: 'F-CCC333CCC333',
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-FRONTEND',
        componentUnit: 'SYS-WEB-ROOT',
        owningUnit: 'SYS-WEB-ROOT',
      },
    ],
    impactedComponents: [
      {
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-FRONTEND',
        componentUnit: 'SYS-WEB-ROOT',
        changed: 0,
        missing: 0,
        extra: 1,
      },
      {
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-RUNTIME',
        componentUnit: 'SYS-API-ROOT',
        changed: 1,
        missing: 0,
        extra: 0,
      },
      {
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-RUNTIME',
        componentUnit: 'SYS-ENGINE-ROOT',
        changed: 0,
        missing: 1,
        extra: 0,
      },
    ],
  });
});

test('expandFingerprintBaseline rejects duplicate paths across shards', () => {
  assert.throws(
    () =>
      expandFingerprintBaseline({
        manifest: {
          version: 1,
          fileCount: 2,
          shards: [
            { id: 'SYS-API', path: 'SYS-API.fingerprints.yaml', fileCount: 1 },
            { id: 'SYS-WEB', path: 'SYS-WEB.fingerprints.yaml', fileCount: 1 },
          ],
        },
        shards: {
          'SYS-API.fingerprints.yaml': {
            fileCount: 1,
            files: [{ path: 'apps/shared.ts', fileId: 'F-ONE' }],
          },
          'SYS-WEB.fingerprints.yaml': {
            fileCount: 1,
            files: [{ path: 'apps/shared.ts', fileId: 'F-TWO' }],
          },
        },
      }),
    /Duplicate file path in governance fingerprint shards: apps\/shared\.ts/
  );
});

test('buildImpactReport renders reviewable fingerprint drift by component', () => {
  const baseline = buildFingerprintBaseline(currentEntries);
  const report = compareFingerprintBaseline(baseline, [
    {
      ...currentEntries[0],
      contentHash: 'content-a-next',
      stateFingerprint: 'state-a-next',
    },
    {
      ...currentEntries[1],
      governanceHash: 'governance-b-next',
      stateFingerprint: 'state-b-next',
    },
  ]);

  const impactReport = buildImpactReport(report);

  assert.deepEqual(impactReport, {
    version: 1,
    totalChanges: 2,
    totals: {
      content: 1,
      governance: 1,
      both: 0,
      added: 0,
      removed: 0,
    },
    components: [
      {
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-RUNTIME',
        componentUnit: 'SYS-API-ROOT',
        ownerFlags: ['api'],
        changes: [
          {
            changeType: 'content',
            path: 'apps/api/src/main.ts',
            fileId: 'F-AAA111AAA111',
            owningUnit: 'SYS-API-ROOT',
          },
        ],
      },
      {
        rootUnit: 'SYS-DVT',
        domainUnit: 'SYS-RUNTIME',
        componentUnit: 'SYS-ENGINE-ROOT',
        ownerFlags: ['engine'],
        changes: [
          {
            changeType: 'governance',
            path: 'packages/@dvt/engine/src/application/RecoverRunApplicationService.ts',
            fileId: 'F-BBB222BBB222',
            owningUnit: 'SYS-ENGINE-APPLICATION',
          },
        ],
      },
    ],
  });

  assert.match(renderImpactMarkdown(impactReport), /## Totals/);
  assert.match(renderImpactMarkdown(impactReport), /\| `content`\s+\|\s+1 \|/);
  assert.match(renderImpactMarkdown(impactReport), /apps\/api\/src\/main\.ts/);
  assert.match(renderImpactMarkdown(impactReport), /`SYS-ENGINE-ROOT`/);
});
