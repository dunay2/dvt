const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFingerprintBaseline,
  buildImpactReport,
  compareFingerprintBaseline,
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

test('buildFingerprintBaseline projects stable fingerprint rows from current file index', () => {
  assert.deepEqual(buildFingerprintBaseline(currentEntries), {
    version: 1,
    source: 'docs/planning/status/system-governance-file-index.files.yaml',
    fileCount: 2,
    files: [
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
    ],
  });
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
