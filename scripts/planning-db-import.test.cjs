const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDocsDispositionSnapshot,
  buildGovernanceAuxiliarySourceExpectedState,
  buildGovernanceFileSnapshot,
  buildGovernanceGeneratedInputs,
  buildPlanningContentSnapshot,
  buildPrReadinessSnapshot,
  buildRiskDebtSnapshot,
  buildCommandQueryRailSnapshot,
  buildFrontendComponentReflectionSnapshot,
  buildFrontendMechanicalTruthSnapshot,
  buildRepositoryCommandSnapshot,
  clearGovernanceSnapshotTables,
  governanceImportDeleteTables,
  importContent,
  insertDocsDispositionSnapshot,
  insertFrontendComponentReflectionSnapshot,
  insertFrontendMechanicalTruthSnapshot,
  insertGovernanceSnapshot,
  insertKnowledgeSnapshot,
  insertRepositoryCommandSnapshot,
  listChangedFiles,
  mergePlanningTaskIds,
  normalizeText,
  parseArgs,
  readLocalPlanningTaskIds,
  runPlanningImport,
  sha256,
} = require('./planning-db-import.cjs');
const { governanceGeneratedPath } = require('./governance-generated-paths.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');

function generatedSourceFixture(sourcePath, parsed, rawSourceText = JSON.stringify(parsed)) {
  return {
    sourcePath,
    parsed,
    raw: rawSourceText,
    rawSourceText,
    contentSha256: sha256(rawSourceText),
    sourceBytes: Buffer.byteLength(rawSourceText, 'utf8'),
    sourceMode: 'in-memory-generator',
  };
}

function minimalGovernanceGeneratedInputs(overrides = {}) {
  return {
    indexSource: generatedSourceFixture(
      '.generated-docs/planning/status/system-governance-file-index.files.yaml',
      overrides.index || { version: 1, fileCount: 0, shards: [] },
      overrides.indexRawSourceText
    ),
    componentIndexSource: generatedSourceFixture(
      '.generated-docs/planning/status/system-governance-component-index.components.yaml',
      overrides.componentIndex || { version: 1, componentCount: 0, components: [] }
    ),
    componentFileMapSource: generatedSourceFixture(
      '.generated-docs/planning/status/system-governance-component-file-map.components.yaml',
      overrides.componentFileMap || {
        version: 1,
        componentCount: 0,
        fileCount: 0,
        components: [],
      }
    ),
    fingerprintBaselineSource: generatedSourceFixture(
      '.generated-docs/planning/status/system-governance-file-fingerprint-baseline.yaml',
      overrides.fingerprintBaseline || { version: 1, fileCount: 0, shards: [] }
    ),
    coverageReportSource: generatedSourceFixture(
      '.generated-docs/planning/status/system-governance-coverage-report.coverage.yaml',
      overrides.coverageReport || { totals: { files: 0 }, findings: [] }
    ),
    remediationQueueSource: generatedSourceFixture(
      '.generated-docs/planning/status/system-governance-remediation-queue.queue.yaml',
      overrides.remediationQueue || { totals: { tasks: 0, p0: 0, p1: 0, p2: 0, p3: 0 }, tasks: [] }
    ),
    fingerprintBaselineShardPayloads: overrides.fingerprintBaselineShardPayloads || {},
    fileShardSources: overrides.fileShardSources || new Map(),
    componentShardSources: overrides.componentShardSources || new Map(),
  };
}

test('command/query rail import behavior lives in a focused catalog component', () => {
  const commandQueryRailCatalogComponent = require('./planning-db/command-query-rail-catalog.cjs');
  const commandQueryRailDocumentationComponent = require('./planning-db/command-query-rail-documentation.cjs');
  const commandQueryRailReferenceIndexComponent = require('./planning-db/command-query-rail-reference-index.cjs');
  const commandQueryRailSharedComponent = require('./planning-db/command-query-rail-shared.cjs');

  assert.equal(
    commandQueryRailCatalogComponent.buildCommandQueryRailSnapshot,
    buildCommandQueryRailSnapshot
  );
  assert.equal(typeof commandQueryRailCatalogComponent.buildManifestRailRows, 'function');
  assert.equal(typeof commandQueryRailSharedComponent.normalizeRailName, 'function');
  assert.equal(typeof commandQueryRailDocumentationComponent.extractDocumentedRailRows, 'function');
  assert.equal(
    typeof commandQueryRailReferenceIndexComponent.attachCommandQueryRailRefs,
    'function'
  );
});

test('frontend mechanical truth import behavior lives in a focused inventory component', () => {
  const frontendMechanicalTruthComponent = require('./planning-db/frontend-mechanical-truth-inventory.cjs');

  assert.equal(
    frontendMechanicalTruthComponent.buildFrontendMechanicalTruthSnapshot,
    buildFrontendMechanicalTruthSnapshot
  );
});

test('frontend component reflection import behavior lives in a focused inventory component', () => {
  const frontendComponentReflectionComponent = require('./planning-db/frontend-component-inventory.cjs');

  assert.equal(
    frontendComponentReflectionComponent.buildFrontendComponentReflectionSnapshot,
    buildFrontendComponentReflectionSnapshot
  );
});

const governanceFileSnapshotFixture = (() => {
  let snapshot;
  let generatedInputs;

  function readGeneratedInputs() {
    if (!generatedInputs) {
      generatedInputs = buildGovernanceGeneratedInputs();
    }

    return generatedInputs;
  }

  function readSnapshot() {
    if (!snapshot) {
      snapshot = buildGovernanceFileSnapshot({ generatedInputs: readGeneratedInputs() });
    }

    return snapshot;
  }

  readSnapshot.generatedInputs = readGeneratedInputs;

  return readSnapshot;
})();

test('planning content snapshot preserves real lane task content and hashes', () => {
  const snapshot = buildPlanningContentSnapshot();

  assert.deepEqual(snapshot.lanes.map((lane) => lane.laneId).sort(), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(
    snapshot.sources.every((source) => /^[a-f0-9]{64}$/.test(source.contentSha256)),
    true
  );

  const mvpA1 = snapshot.tasks.find((task) => task.laneId === 'A' && task.taskId === 'MVP-A1');
  assert.ok(mvpA1);
  assert.equal(mvpA1.status, 'done');
  assert.equal(mvpA1.priority, 'P0');
  assert.match(mvpA1.objective, /inventory the current backend MVP contractual surface/);
  assert.ok(
    mvpA1.evidenceRefs.includes(
      'docs/evidence/critical/ED-20260331-mvp-a1-backend-contractual-inventory.md'
    )
  );
});

test('planning DB import parses stale-aware scoped import flags', () => {
  assert.deepEqual(
    parseArgs([
      '--',
      '--if-stale',
      '--planning-only',
      '--database-url',
      'postgres://example/planning',
    ]),
    {
      databaseUrl: 'postgres://example/planning',
      help: false,
      ifStale: true,
      includeGovernance: false,
      includePlanning: true,
    }
  );

  assert.throws(() => parseArgs(['--planning-only', '--governance-only']), /mutually exclusive/);
});

test('planning DB import falls back to direct tree diff for shallow merge refs', () => {
  const calls = [];
  const changedFiles = listChangedFiles('origin/main', 'merge-sha', (args) => {
    calls.push(args);
    if (calls.length === 1) {
      const error = new Error('Command failed: git diff --name-only origin/main...merge-sha');
      error.stderr = Buffer.from('fatal: origin/main...merge-sha: no merge base\n');
      throw error;
    }

    return [
      'docs/planning/proposals/mandatory/runtime-and-contracts/example.md',
      'scripts/planning-db-import.cjs',
    ].join('\n');
  });

  assert.deepEqual(changedFiles, [
    'docs/planning/proposals/mandatory/runtime-and-contracts/example.md',
    'scripts/planning-db-import.cjs',
  ]);
  assert.deepEqual(calls, [
    ['diff', '--name-only', 'origin/main...merge-sha'],
    ['diff', '--name-only', 'origin/main', 'merge-sha'],
  ]);
});

test('command/query rail snapshot indexes feature manifests for DB-first gap and duplicate queries', () => {
  const docs = [
    {
      path: 'docs/planning/proposals/mandatory/example.md',
      content: [
        '```feature-mechanization',
        'version: 1',
        'featureId: EXAMPLE-FEATURE',
        'mechanizationStatus: implemented',
        'commandQueryRails:',
        '  - name: ListWidgets',
        '    type: query',
        '    dddOwner: WidgetReadModel',
        '  - name: CreateWidget',
        '    type: command',
        '    dddOwner: WidgetAggregate',
        '    status: missing-backend-rail',
        'symbols:',
        '  - name: listWidgets',
        '    path: apps/api/src/widgets/listWidgets.ts',
        '    dddOwner: WidgetReadModel',
        '    cqRails: [ListWidgets]',
        '    unitTests:',
        '      - apps/api/test/widgets/listWidgets.test.ts',
        '```',
      ].join('\n'),
    },
    {
      path: 'docs/planning/proposals/mandatory/duplicate.md',
      content: [
        '```feature-mechanization',
        'version: 1',
        'featureId: DUPLICATE-FEATURE',
        'mechanizationStatus: closed',
        'commandQueryRails:',
        '  - name: ListWidgets',
        '    type: query',
        '    dddOwner: WidgetReadModel',
        'symbols: []',
        '```',
      ].join('\n'),
    },
  ];

  const snapshot = buildCommandQueryRailSnapshot({ docs });

  assert.equal(snapshot.rails.length, 3);
  const listWidgets = snapshot.rails.find(
    (rail) => rail.featureId === 'EXAMPLE-FEATURE' && rail.railName === 'ListWidgets'
  );
  assert.deepEqual(listWidgets.symbolRefs, [
    {
      name: 'listWidgets',
      path: 'apps/api/src/widgets/listWidgets.ts',
      dddOwner: 'WidgetReadModel',
      unitTests: ['apps/api/test/widgets/listWidgets.test.ts'],
    },
  ]);
  assert.equal(listWidgets.railType, 'query');
  assert.equal(listWidgets.railStatus, 'declared');
  assert.equal(listWidgets.sourcePath, 'docs/planning/proposals/mandatory/example.md');

  const createWidget = snapshot.rails.find((rail) => rail.railName === 'CreateWidget');
  assert.equal(createWidget.isGap, true);
  assert.equal(createWidget.implementationRefCount, 0);

  const duplicateRows = snapshot.rails.filter((rail) => rail.railName === 'ListWidgets');
  assert.equal(duplicateRows.length, 2);
});

test('command/query rail snapshot joins documented rails with source implementation refs', () => {
  const docs = [
    {
      path: 'docs/planning/proposals/mandatory/widgets.md',
      content: [
        '```feature-mechanization',
        'version: 1',
        'featureId: WIDGET-FEATURE',
        'mechanizationStatus: implemented',
        'commandQueryRails:',
        '  - name: ListWidgets',
        '    type: query',
        '    dddOwner: WidgetReadModel',
        'symbols: []',
        '```',
      ].join('\n'),
    },
  ];
  const referenceDocuments = [
    {
      path: 'docs/architecture/components/widgets/widget-rail-catalog.md',
      content: [
        '| Rail | Type | Status | Owner |',
        '| --- | --- | --- | --- |',
        '| `ListWidgets` | query | implemented | WidgetReadModel |',
        '| `ArchiveWidget` | command | planned | WidgetAggregate |',
      ].join('\n'),
    },
  ];
  const sourceFiles = [
    {
      path: 'apps/api/src/widgets/listWidgetsQuery.ts',
      content: [
        'export interface ListWidgetsQueryPort {',
        '  listWidgets(): Promise<readonly string[]>;',
        '}',
      ].join('\n'),
    },
  ];

  const snapshot = buildCommandQueryRailSnapshot({ docs, referenceDocuments, sourceFiles });

  const listWidgets = snapshot.rails.find(
    (rail) => rail.featureId === 'WIDGET-FEATURE' && rail.railName === 'ListWidgets'
  );
  assert.equal(listWidgets.isGap, false);
  assert.equal(listWidgets.implementationRefCount, 1);
  assert.deepEqual(listWidgets.implementationRefs, [
    {
      name: 'ListWidgets',
      path: 'apps/api/src/widgets/listWidgetsQuery.ts',
      sourceKind: 'source_code',
    },
  ]);
  assert.deepEqual(listWidgets.documentationRefs, [
    {
      name: 'ListWidgets',
      path: 'docs/architecture/components/widgets/widget-rail-catalog.md',
      sourceKind: 'documentation',
    },
  ]);

  const archiveWidget = snapshot.rails.find(
    (rail) =>
      rail.featureId === 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG' &&
      rail.railName === 'ArchiveWidget'
  );
  assert.ok(archiveWidget);
  assert.equal(archiveWidget.railType, 'command');
  assert.equal(archiveWidget.railStatus, 'planned');
  assert.equal(archiveWidget.dddOwner, 'WidgetAggregate');
  assert.equal(archiveWidget.isGap, true);
  assert.equal(archiveWidget.implementationRefCount, 0);
  assert.equal(archiveWidget.documentationRefs.length, 1);
});

test('planning DB import skips all selected scopes when stale-aware checks are fresh', async () => {
  const calls = [];
  const logs = [];

  const result = await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
      includePlanning: true,
      includeGovernance: true,
    },
    {
      checkPlanningDatabase: async () => ({ ok: true }),
      checkGovernanceDatabase: async () => ({ ok: true }),
      checkGovernanceAuxiliaryProjections: async () => ({ ok: true }),
      importContent: async (options) => {
        calls.push(options);
        return { lanes: 99 };
      },
      logger: { log: (message) => logs.push(message) },
    }
  );

  assert.deepEqual(calls, []);
  assert.deepEqual(result.importedScopes, []);
  assert.deepEqual(result.skippedScopes, ['planning', 'governance']);
  assert.match(logs.join('\n'), /skipped fresh scopes: planning, governance/);
});

test('planning DB import only imports stale selected scopes', async () => {
  const calls = [];

  const result = await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
      includePlanning: true,
      includeGovernance: true,
    },
    {
      checkPlanningDatabase: async () => ({ ok: true }),
      checkGovernanceDatabase: async () => ({ ok: false, sections: {} }),
      importContent: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2 };
      },
      logger: { log() {} },
    }
  );

  assert.deepEqual(calls, [
    {
      databaseUrl: 'postgres://example/planning',
      includePlanning: false,
      includeGovernance: true,
    },
  ]);
  assert.deepEqual(result.importedScopes, ['governance']);
  assert.deepEqual(result.skippedScopes, ['planning']);
});

test('planning DB import can silence importContent output for query-time refreshes', async () => {
  const calls = [];

  await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      includePlanning: false,
      includeGovernance: true,
      silent: true,
    },
    {
      importContent: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2 };
      },
      logger: { log() {} },
    }
  );

  assert.deepEqual(calls, [
    {
      databaseUrl: 'postgres://example/planning',
      includePlanning: false,
      includeGovernance: true,
      silent: true,
    },
  ]);
});

test('planning DB import reimports governance when auxiliary projections are stale', async () => {
  const calls = [];

  const result = await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
      includePlanning: true,
      includeGovernance: true,
    },
    {
      checkPlanningDatabase: async () => ({ ok: true }),
      checkGovernanceDatabase: async () => ({ ok: true }),
      checkGovernanceAuxiliaryProjections: async () => ({
        ok: false,
        sections: {
          repositoryCommands: {
            missing: ['script:planning:db:query'],
            unexpected: [],
            stale: [],
          },
        },
      }),
      importContent: async (options) => {
        calls.push(options);
        return { repositoryCommands: 3, docsDispositionActions: 2 };
      },
      logger: { log() {} },
    }
  );

  assert.deepEqual(calls, [
    {
      databaseUrl: 'postgres://example/planning',
      includePlanning: false,
      includeGovernance: true,
    },
  ]);
  assert.deepEqual(result.importedScopes, ['governance']);
  assert.deepEqual(result.skippedScopes, ['planning']);
});

test('planning DB import skips governance through source freshness before rebuilding auxiliary projections', async () => {
  const calls = [];

  const result = await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
      includePlanning: false,
      includeGovernance: true,
    },
    {
      checkGovernanceDatabase: async () => ({ ok: true }),
      checkGovernanceAuxiliarySourceFreshness: async () => ({ ok: true }),
      checkGovernanceAuxiliaryProjections: async () => {
        throw new Error('full auxiliary projection check should not run for fresh sources');
      },
      importContent: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2 };
      },
      logger: { log() {} },
    }
  );

  assert.deepEqual(calls, []);
  assert.deepEqual(result.importedScopes, []);
  assert.deepEqual(result.skippedScopes, ['governance']);
});

test('planning DB import reimports governance when auxiliary source freshness is stale', async () => {
  const calls = [];
  let auxiliaryProjectionChecks = 0;

  const result = await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
      includePlanning: false,
      includeGovernance: true,
    },
    {
      checkGovernanceDatabase: async () => ({ ok: true }),
      checkGovernanceAuxiliarySourceFreshness: async () => ({ ok: false }),
      checkGovernanceAuxiliaryProjections: async () => {
        auxiliaryProjectionChecks += 1;
        return { ok: true };
      },
      importContent: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2 };
      },
      logger: { log() {} },
    }
  );

  assert.deepEqual(calls, [
    {
      databaseUrl: 'postgres://example/planning',
      includePlanning: false,
      includeGovernance: true,
    },
  ]);
  assert.deepEqual(result.importedScopes, ['governance']);
  assert.deepEqual(result.skippedScopes, []);
  assert.equal(auxiliaryProjectionChecks, 0);
});

test('planning DB import skips governance through core source freshness before full DB checks', async () => {
  const calls = [];

  const result = await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
      includePlanning: false,
      includeGovernance: true,
    },
    {
      checkGovernanceSourceFreshness: async () => ({ ok: true }),
      checkGovernanceDatabase: async () => {
        throw new Error('full governance DB check should not run for fresh core sources');
      },
      checkGovernanceAuxiliarySourceFreshness: async () => ({ ok: true }),
      importContent: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2 };
      },
      logger: { log() {} },
    }
  );

  assert.deepEqual(calls, []);
  assert.deepEqual(result.importedScopes, []);
  assert.deepEqual(result.skippedScopes, ['governance']);
});

test('planning DB import reimports governance when core source freshness is stale', async () => {
  const calls = [];
  let fullGovernanceChecks = 0;

  const result = await runPlanningImport(
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
      includePlanning: false,
      includeGovernance: true,
    },
    {
      checkGovernanceSourceFreshness: async () => ({ ok: false }),
      checkGovernanceDatabase: async () => {
        fullGovernanceChecks += 1;
        return { ok: true };
      },
      checkGovernanceAuxiliarySourceFreshness: async () => ({ ok: true }),
      importContent: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2 };
      },
      logger: { log() {} },
    }
  );

  assert.deepEqual(calls, [
    {
      databaseUrl: 'postgres://example/planning',
      includePlanning: false,
      includeGovernance: true,
    },
  ]);
  assert.deepEqual(result.importedScopes, ['governance']);
  assert.deepEqual(result.skippedScopes, []);
  assert.equal(fullGovernanceChecks, 0);
});

test('governance auxiliary source state hashes only knowledge-surface documents without full projection', async () => {
  const proposalRaw = [
    '---',
    'title: Knowledge source',
    'status: Active',
    '---',
    '',
    '# Knowledge source',
    '',
  ].join('\n');
  const guideRaw = [
    '---',
    'title: Guide source',
    'status: Active',
    '---',
    '',
    '# Guide source',
    '',
  ].join('\n');

  const state = await buildGovernanceAuxiliarySourceExpectedState({
    planningSnapshot: { sources: [] },
    repositoryCommandSnapshot: { commands: [] },
    prReadinessSnapshot: {
      readiness: {
        readinessId: 'pr-readiness:fixture',
        sourcePath: '.arc-policy.yaml',
        sourceContentSha256: 'fixture-policy-hash',
        effectiveArcLevel: 'ARC-0',
        blocking: false,
      },
    },
    commandQueryRailSnapshot: { rails: [] },
    markdownDocuments: [],
    knowledgeDocuments: [
      { sourcePath: 'docs/planning/proposals/example.md', raw: proposalRaw },
      { sourcePath: 'docs/guides/example.md', raw: guideRaw },
    ],
    riskDocuments: [],
  });

  assert.deepEqual(state.knowledgeDocuments, [
    {
      sourcePath: 'docs/planning/proposals/example.md',
      sourceContentSha256: sha256(proposalRaw),
    },
  ]);
});

test('planning content snapshot normalizes dependencies and evidence refs for DB reads', () => {
  const snapshot = buildPlanningContentSnapshot();
  const dependency = snapshot.dependencies.find(
    (row) => row.taskId === 'F-28-C' && row.dependencyTaskId === 'F-28-B'
  );
  const evidenceRef = snapshot.evidenceRefs.find(
    (row) => row.taskId === 'MVP-A1' && /ED-20260331-mvp-a1/.test(row.evidenceRef)
  );

  assert.ok(dependency);
  assert.equal(dependency.sourceKind, 'planning_task');
  assert.ok(Number.isInteger(dependency.dependencyOrder));
  assert.ok(evidenceRef);
  assert.equal(evidenceRef.sourceKind, 'planning_task');
  assert.ok(Number.isInteger(evidenceRef.evidenceOrder));
});

test('governance file snapshot consumes supplied generated inputs', () => {
  const sentinelRawSourceText = 'fixture raw source text';
  const snapshot = buildGovernanceFileSnapshot({
    generatedInputs: minimalGovernanceGeneratedInputs({
      indexRawSourceText: sentinelRawSourceText,
    }),
    riskDocuments: [],
  });
  const fileIndexSource = snapshot.sources.find(
    (source) => source.sourceType === 'governance_file_index'
  );

  assert.ok(fileIndexSource);
  assert.equal(fileIndexSource.rawSourceText, sentinelRawSourceText);
});

test('governance file snapshot preserves every file entry declared by the index', () => {
  const snapshot = governanceFileSnapshotFixture();

  assert.equal(snapshot.files.length, snapshot.index.fileCount);
  assert.ok(snapshot.fileShards.length > 0);

  const packageJson = snapshot.files.find((file) => file.path === 'package.json');
  assert.ok(packageJson);
  assert.match(packageJson.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(typeof packageJson.isDrift, 'boolean');
});

test('governance snapshot preserves component, fingerprint, coverage, and remediation content', () => {
  const snapshot = governanceFileSnapshotFixture();

  assert.equal(snapshot.components.length, snapshot.componentIndex.componentCount);
  assert.equal(snapshot.componentFileShards.length, snapshot.componentFileMap.componentCount);
  assert.equal(snapshot.componentFiles.length, snapshot.componentFileMap.fileCount);
  assert.ok(snapshot.fingerprintBaseline.shards.length > 0);
  assert.ok(
    snapshot.fingerprintBaseline.shards.every((shard) =>
      shard.path.includes('/governance-file-fingerprints/')
    )
  );
  assert.equal(snapshot.fingerprints.length, snapshot.fingerprintBaseline.fileCount);
  assert.equal(snapshot.coverageRows.length > 0, true);
  assert.equal(snapshot.remediationTasks.length, snapshot.remediationQueue.totals.tasks);

  const priorityCounts = new Map();
  for (const task of snapshot.remediationTasks) {
    priorityCounts.set(task.priority, (priorityCounts.get(task.priority) ?? 0) + 1);
    assert.equal(task.fileCount, task.files.length);
  }
  assert.equal(priorityCounts.get('P0') ?? 0, snapshot.remediationQueue.totals.p0);
  assert.equal(priorityCounts.get('P1') ?? 0, snapshot.remediationQueue.totals.p1);
  assert.equal(priorityCounts.get('P2') ?? 0, snapshot.remediationQueue.totals.p2);
  assert.equal(priorityCounts.get('P3') ?? 0, snapshot.remediationQueue.totals.p3);

  const cqRailGap = snapshot.remediationTasks.find((task) => task.taskType === 'cq-rail-gap');
  assert.ok(cqRailGap);
  assert.match(cqRailGap.taskId, /^GRQ-CQ_RAIL_GAP-/);
  assert.ok(cqRailGap.expectedValidation.includes('pnpm docs:governance:remediation-queue:check'));
});

test('risk debt snapshot turns risk-register records into DB work items with ownership metadata', () => {
  const raw = [
    '---',
    'id: R-20260514-EXAMPLE-DEBT',
    'title: Example planning debt remains visible',
    'status: Open',
    'owners:',
    '  - Planning',
    'severity: High',
    'probability: Medium',
    '---',
    'summary: Example debt body.',
    '',
  ].join('\n');

  const snapshot = buildRiskDebtSnapshot({
    riskDocuments: [
      {
        sourcePath: 'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
        raw,
      },
    ],
    governanceFiles: [
      {
        path: 'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
        componentUnit: 'SYS-PLANNING-DB',
        rootUnit: 'SYS-PLANNING',
        domainUnit: 'SYS-PLANNING-GOVERNANCE',
        dddOwner: 'Planning / Governance',
        cqRails: 'QueryRiskDebt',
      },
    ],
  });

  assert.equal(snapshot.riskDebtItems.length, 1);
  assert.deepEqual(snapshot.riskDebtItems[0], {
    riskId: 'R-20260514-EXAMPLE-DEBT',
    sourcePath: 'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
    title: 'Example planning debt remains visible',
    status: 'Open',
    owners: ['Planning'],
    severity: 'High',
    probability: 'Medium',
    priority: 'P1',
    componentUnit: 'SYS-PLANNING-DB',
    rootUnit: 'SYS-PLANNING',
    domainUnit: 'SYS-PLANNING-GOVERNANCE',
    dddOwner: 'Planning / Governance',
    cqRails: 'QueryRiskDebt',
    sourceContentSha256: snapshot.riskDebtItems[0].sourceContentSha256,
    rawFrontmatter: {
      id: 'R-20260514-EXAMPLE-DEBT',
      title: 'Example planning debt remains visible',
      status: 'Open',
      owners: ['Planning'],
      severity: 'High',
      probability: 'Medium',
    },
    rawDebt: {
      sourcePath: 'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
      sourceBytes: Buffer.byteLength(raw, 'utf8'),
    },
  });
  assert.match(snapshot.riskDebtItems[0].sourceContentSha256, /^[a-f0-9]{64}$/);
});

test('governance snapshot builds DB import sources from in-memory generator projections', () => {
  const snapshot = governanceFileSnapshotFixture();
  const generatedSources = snapshot.sources.filter((source) =>
    source.sourcePath.startsWith('.generated-docs/')
  );

  assert.ok(generatedSources.length > 0);
  assert.equal(
    generatedSources.every((source) => source.metadata?.sourceMode === 'in-memory-generator'),
    true
  );
  assert.equal(
    generatedSources.some((source) => source.sourceType === 'governance_coverage_report'),
    true
  );
  assert.equal(
    generatedSources.some((source) => source.sourceType === 'governance_remediation_queue'),
    true
  );
  assert.equal(
    generatedSources.some((source) => source.sourceType === 'governance_file_shard'),
    true
  );
  assert.equal(
    generatedSources.some((source) => source.sourceType === 'governance_component_shard'),
    true
  );
  assert.ok(generatedSources.every((source) => source.rawSource));
  assert.ok(generatedSources.every((source) => typeof source.rawSourceText === 'string'));
});

test('governance snapshot imports generated projections without trusting stale generated artifacts', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const coveragePath = governanceGeneratedPath('system-governance-coverage-report.coverage.yaml');
  const remediationPath = governanceGeneratedPath('system-governance-remediation-queue.queue.yaml');
  const fileIndexPath = governanceGeneratedPath('system-governance-file-index.files.yaml');
  const originals = new Map(
    [coveragePath, remediationPath, fileIndexPath].map((filePath) => [
      filePath,
      fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null,
    ])
  );
  const coverageRaw = [
    'totals:',
    '  files: 7',
    '  governedFiles: 7',
    '  ungovernedFiles: 0',
    '  driftFiles: 0',
    '  legacyFiles: 0',
    'ciPosture:',
    '  blockingStatus: fixture',
    'byCanonicalRole:',
    '  - name: fixture-role',
    '    count: 7',
    'componentCoverage: []',
    'governanceDocuments: []',
    'findings: []',
    '',
  ].join('\n');
  const remediationRaw = [
    'totals:',
    '  tasks: 1',
    '  p0: 0',
    '  p1: 1',
    '  p2: 0',
    '  p3: 0',
    '  driftFiles: 0',
    '  componentsRequiringSubdivision: 1',
    'byType: []',
    'byPriority: []',
    'tasks:',
    '  - id: GRQ-FIXTURE',
    '    type: component-subdivision',
    '    priority: P1',
    '    componentUnit: SYS-FIXTURE',
    '    rootUnit: SYS',
    '    domainUnit: Docs',
    '    dddOwner: Docs',
    '    cqRails: none',
    '    blocking: no',
    '    reason: Fixture generated artifact',
    '    fileCount: 0',
    '    documentCount: 0',
    '    files: []',
    '    documents: []',
    '    expectedValidation: []',
    '',
  ].join('\n');
  const staleRaw = 'fileCount: 999999\nshards: []\n';

  fs.mkdirSync(path.dirname(coveragePath), { recursive: true });
  fs.writeFileSync(coveragePath, coverageRaw, 'utf8');
  fs.writeFileSync(remediationPath, remediationRaw, 'utf8');
  fs.writeFileSync(fileIndexPath, staleRaw, 'utf8');

  try {
    const baselineInputs = governanceFileSnapshotFixture.generatedInputs();
    const snapshot = buildGovernanceFileSnapshot({
      generatedInputs: buildGovernanceGeneratedInputs({
        fileComponentOutputs: baselineInputs.fileComponentOutputs,
        documentOutputs: baselineInputs.documentOutputs,
      }),
    });
    const fileIndexSource = snapshot.sources.find(
      (source) => source.sourceType === 'governance_file_index'
    );
    const coverageSource = snapshot.sources.find(
      (source) => source.sourceType === 'governance_coverage_report'
    );
    const remediationSource = snapshot.sources.find(
      (source) => source.sourceType === 'governance_remediation_queue'
    );

    assert.equal(
      snapshot.coverageRows.some((row) => row.name === 'fixture-role'),
      false
    );
    assert.equal(
      snapshot.remediationTasks.some((task) => task.taskId === 'GRQ-FIXTURE'),
      false
    );
    assert.equal(coverageSource.metadata.sourceMode, 'in-memory-generator');
    assert.equal(remediationSource.metadata.sourceMode, 'in-memory-generator');
    assert.notEqual(coverageSource.rawSourceText, coverageRaw);
    assert.notEqual(remediationSource.rawSourceText, remediationRaw);
    assert.equal(coverageSource.rawSource.totals.files, snapshot.index.fileCount);
    assert.equal(remediationSource.rawSource.totals.tasks, snapshot.remediationTasks.length);
    assert.ok(fileIndexSource);
    assert.notEqual(snapshot.index.fileCount, 999999);
    assert.equal(snapshot.files.length, snapshot.index.fileCount);
    assert.equal(fileIndexSource.rawSource.fileCount, snapshot.index.fileCount);
    assert.equal(fileIndexSource.rawSourceText, staleRaw);
  } finally {
    for (const [filePath, original] of originals) {
      if (original === null) {
        fs.unlinkSync(filePath);
      } else {
        fs.writeFileSync(filePath, original, 'utf8');
      }
    }
  }
});

test('governance import clears every repopulated governance table before insert', async () => {
  const queries = [];

  await clearGovernanceSnapshotTables({
    query: async (sql) => {
      queries.push(sql);
    },
  });

  assert.deepEqual(
    queries,
    governanceImportDeleteTables.map((tableName) => `delete from ${schemaName}.${tableName}`)
  );
  assert.ok(governanceImportDeleteTables.includes('governance_coverage'));
  assert.ok(governanceImportDeleteTables.includes('governance_remediation'));
  assert.ok(governanceImportDeleteTables.includes('frontend_components'));
  assert.ok(governanceImportDeleteTables.includes('frontend_component_files'));
  assert.ok(governanceImportDeleteTables.includes('frontend_mechanical_truth_surfaces'));
  assert.ok(governanceImportDeleteTables.includes('risk_debt_items'));
  assert.equal(governanceImportDeleteTables.at(-1), 'governance_sources');
});

test('frontend mechanical truth import reloads surface rows with JSONB metadata', async () => {
  const queries = [];

  await insertFrontendMechanicalTruthSnapshot(
    {
      query: async (sql, params = []) => {
        queries.push({ sql, params });
      },
    },
    {
      surfaces: [
        {
          surfaceId: 'web.runs.list',
          surfaceKind: 'route',
          routePath: '/runs',
          screenState: 'operational-product',
          frontendOwner: 'Runs workbench',
          registeredPlugins: ['monitoring'],
          consumedEndpoints: ['/runs'],
          zustandStores: ['useExecutionStore'],
          tanstackQueries: ['useScopedRunSummariesQuery'],
          visibleNoBackendAffordances: ['dense run table'],
          capabilityGaps: ['cancel run'],
          evidenceRefs: ['runs native smoke'],
          sourcePath: 'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
          sourceContentSha256: 'source-a',
          rawSurface: { surfaceId: 'web.runs.list' },
        },
      ],
    }
  );

  assert.equal(queries[0].sql, `delete from ${schemaName}.frontend_mechanical_truth_surfaces`);
  const insertQuery = queries.find((query) =>
    query.sql.includes(`insert into ${schemaName}.frontend_mechanical_truth_surfaces`)
  );
  assert.ok(insertQuery);
  assert.match(insertQuery.sql, /registered_plugins/);
  assert.match(insertQuery.sql, /consumed_endpoints/);
  assert.deepEqual(insertQuery.params.slice(0, 5), [
    'web.runs.list',
    'route',
    '/runs',
    'operational-product',
    'Runs workbench',
  ]);
  assert.equal(insertQuery.params[5], JSON.stringify(['monitoring']));
});

test('frontend component reflection import reloads normalized component rows', async () => {
  const queries = [];

  await insertFrontendComponentReflectionSnapshot(
    {
      query: async (sql, params = []) => {
        queries.push({ sql, params });
      },
    },
    {
      components: [
        {
          componentId: 'web.component.canvas.CanvasToolbar',
          componentName: 'CanvasToolbar',
          componentKind: 'route-toolbar',
          componentStatus: 'current',
          reuseDecision: 'extract',
          frontendOwner: 'Canvas workbench',
          responsibility: 'Render canvas commands.',
          packageName: '@dvt/web',
          routeScope: '/canvas',
          pluginScope: 'dbt',
          capabilityGaps: ['server-readable readiness'],
          evidenceRefs: ['CanvasToolbar.test.tsx'],
          sourcePath: 'docs/architecture/components/web/frontend-component-inventory.md',
          sourceContentSha256: 'source-b',
          rawComponent: { componentId: 'web.component.canvas.CanvasToolbar' },
        },
      ],
      surfaceLinks: [
        {
          componentId: 'web.component.canvas.CanvasToolbar',
          surfaceId: 'web.canvas.graph',
          routePath: '/canvas',
          placementKind: 'route-toolbar',
          placementOrder: 20,
          rawLink: { placementKind: 'route-toolbar' },
        },
      ],
      files: [
        {
          componentId: 'web.component.canvas.CanvasToolbar',
          filePath: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
          fileRole: 'component',
          exportedSymbol: 'CanvasToolbar',
          rawFile: { fileRole: 'component' },
        },
      ],
      rails: [
        {
          componentId: 'web.component.canvas.CanvasToolbar',
          railName: 'PreviewExecutablePlan',
          railKind: 'command',
          railStatus: 'implemented-api',
          rawRail: { railName: 'PreviewExecutablePlan' },
        },
      ],
      evidence: [
        {
          evidenceId: 'web.component.canvas.CanvasToolbar.unit',
          componentId: 'web.component.canvas.CanvasToolbar',
          evidenceKind: 'unit-test',
          evidenceRef: 'apps/web/src/app/views/canvas/CanvasToolbar.test.tsx',
          evidenceStatus: 'accepted',
          rawEvidence: { evidenceKind: 'unit-test' },
        },
      ],
    }
  );

  assert.deepEqual(
    queries.slice(0, 5).map((query) => query.sql),
    [
      `delete from ${schemaName}.frontend_component_evidence`,
      `delete from ${schemaName}.frontend_component_cq_rails`,
      `delete from ${schemaName}.frontend_component_files`,
      `delete from ${schemaName}.frontend_surface_component_links`,
      `delete from ${schemaName}.frontend_components`,
    ]
  );
  const componentInsert = queries.find((query) =>
    query.sql.includes(`insert into ${schemaName}.frontend_components`)
  );
  const linkInsert = queries.find((query) =>
    query.sql.includes(`insert into ${schemaName}.frontend_surface_component_links`)
  );
  const railInsert = queries.find((query) =>
    query.sql.includes(`insert into ${schemaName}.frontend_component_cq_rails`)
  );

  assert.ok(componentInsert);
  assert.ok(linkInsert);
  assert.ok(railInsert);
  assert.deepEqual(componentInsert.params.slice(0, 6), [
    'web.component.canvas.CanvasToolbar',
    'CanvasToolbar',
    'route-toolbar',
    'current',
    'extract',
    'Canvas workbench',
  ]);
  assert.equal(componentInsert.params[10], JSON.stringify(['server-readable readiness']));
  assert.deepEqual(linkInsert.params.slice(0, 5), [
    'web.component.canvas.CanvasToolbar',
    'web.canvas.graph',
    '/canvas',
    'route-toolbar',
    20,
  ]);
  assert.deepEqual(railInsert.params.slice(0, 4), [
    'web.component.canvas.CanvasToolbar',
    'PreviewExecutablePlan',
    'command',
    'implemented-api',
  ]);
});

test('governance import batches heavy file table inserts', async () => {
  const queries = [];
  const baseFile = {
    path: 'docs/example-a.md',
    fileId: 'F-A',
    shardId: 'SYS-DOCS',
    sourcePath: 'docs/planning/status/governance-files/SYS-DOCS.files.yaml',
    pathHash: 'path-a',
    contentHash: 'content-a',
    governanceHash: 'governance-a',
    stateFingerprint: 'state-a',
    owningUnit: 'SYS-DOCS-GOVERNANCE-ROOT',
    rootUnit: 'SYS-DVT',
    domainUnit: 'SYS-DOCS-GOVERNANCE',
    componentUnit: 'SYS-DOCS-GOVERNANCE-ROOT',
    ownerLevel: 'component',
    unitStatus: 'canonical',
    governanceState: 'governed',
    canonicalRole: 'implementation-owner',
    evidenceState: 'classification-only',
    isDrift: false,
    isLegacy: false,
    dddOwner: 'Docs',
    cqRails: 'ValidateCiScopeOptimizationContract',
    governanceRefs: ['docs/index.md'],
    sourceContentSha256: 'source-a',
    rawFile: { path: 'docs/example-a.md' },
  };

  await insertGovernanceSnapshot(
    {
      query: async (sql, params = []) => {
        queries.push({ sql, params });
      },
    },
    {
      sources: [],
      fileShards: [],
      files: [
        baseFile,
        {
          ...baseFile,
          path: 'docs/example-b.md',
          fileId: 'F-B',
          pathHash: 'path-b',
          contentHash: 'content-b',
          governanceHash: 'governance-b',
          stateFingerprint: 'state-b',
          sourceContentSha256: 'source-b',
          rawFile: { path: 'docs/example-b.md' },
        },
      ],
      components: [],
      componentFileShards: [],
      componentFiles: [],
      fingerprints: [],
      coverageRows: [],
      remediationTasks: [],
      riskDebtItems: [],
    }
  );

  const fileInsertQueries = queries.filter((query) =>
    query.sql.includes(`insert into ${schemaName}.governance_files`)
  );

  assert.equal(fileInsertQueries.length, 1);
  assert.match(fileInsertQueries[0].sql, /\),\s*\(/);
  assert.deepEqual(
    fileInsertQueries[0].params.filter((value) => value === 'F-A' || value === 'F-B'),
    ['F-A', 'F-B']
  );
  assert.deepEqual(
    fileInsertQueries[0].params.filter(
      (value) => value === 'docs/example-a.md' || value === 'docs/example-b.md'
    ),
    ['docs/example-a.md', 'docs/example-b.md']
  );
});

test('docs disposition import batches document inserts', async () => {
  const queries = [];
  const baseDocument = {
    documentPath: 'docs/example-a.md',
    title: 'Example A',
    status: 'Review',
    planningType: 'guide',
    owner: 'Docs',
    isActive: true,
    isArchive: false,
    pendingMarkerCount: 0,
    taskLikeReferenceCount: 0,
    sourceContentSha256: 'source-a',
    rawFrontmatter: { title: 'Example A' },
    rawDocument: { documentPath: 'docs/example-a.md' },
  };

  await insertDocsDispositionSnapshot(
    {
      query: async (sql, params = []) => {
        queries.push({ sql, params });
      },
    },
    {
      documents: [
        baseDocument,
        {
          ...baseDocument,
          documentPath: 'docs/example-b.md',
          title: 'Example B',
          sourceContentSha256: 'source-b',
          rawFrontmatter: { title: 'Example B' },
          rawDocument: { documentPath: 'docs/example-b.md' },
        },
      ],
      markers: [],
      references: [],
      actions: [],
    }
  );

  const documentInsertQueries = queries.filter((query) =>
    query.sql.includes(`insert into ${schemaName}.doc_disposition_documents`)
  );

  assert.equal(documentInsertQueries.length, 1);
  assert.match(documentInsertQueries[0].sql, /\),\s*\(/);
  assert.deepEqual(
    documentInsertQueries[0].params.filter(
      (value) => value === 'docs/example-a.md' || value === 'docs/example-b.md'
    ),
    ['docs/example-a.md', 'docs/example-b.md']
  );
  assert.deepEqual(
    documentInsertQueries[0].params.filter(
      (value) => value === 'Example A' || value === 'Example B'
    ),
    ['Example A', 'Example B']
  );
});

test('knowledge import batches documents and preserves link conflict handling', async () => {
  const queries = [];
  const baseDocument = {
    documentId: 'DOC-A',
    documentPath: 'docs/example-a.md',
    documentType: 'planning',
    title: 'Example A',
    status: 'Review',
    planningType: 'proposal',
    owner: 'Docs',
    mandatory: true,
    sourceContentSha256: 'source-a',
    rawFrontmatter: { title: 'Example A' },
  };

  await insertKnowledgeSnapshot(
    {
      query: async (sql, params = []) => {
        queries.push({ sql, params });
      },
    },
    {
      documents: [
        baseDocument,
        {
          ...baseDocument,
          documentId: 'DOC-B',
          documentPath: 'docs/example-b.md',
          title: 'Example B',
          sourceContentSha256: 'source-b',
          rawFrontmatter: { title: 'Example B' },
        },
      ],
      sections: [],
      proposals: [],
      documentLinks: [
        {
          fromDocumentId: 'DOC-A',
          toDocumentId: 'DOC-B',
          relationType: 'references',
        },
        {
          fromDocumentId: 'DOC-B',
          toDocumentId: 'DOC-A',
          relationType: 'references',
        },
      ],
      actions: [],
      actionLinks: [],
    }
  );

  const documentInsertQueries = queries.filter((query) =>
    query.sql.includes(`insert into ${schemaName}.knowledge_documents`)
  );
  const linkInsertQueries = queries.filter((query) =>
    query.sql.includes(`insert into ${schemaName}.knowledge_document_links`)
  );

  assert.equal(documentInsertQueries.length, 1);
  assert.match(documentInsertQueries[0].sql, /\),\s*\(/);
  assert.deepEqual(
    documentInsertQueries[0].params.filter((value) => value === 'DOC-A' || value === 'DOC-B'),
    ['DOC-A', 'DOC-B']
  );
  assert.equal(linkInsertQueries.length, 1);
  assert.match(linkInsertQueries[0].sql, /\),\s*\(/);
  assert.match(linkInsertQueries[0].sql, /on conflict do nothing/);
  assert.deepEqual(linkInsertQueries[0].params, [
    'DOC-A',
    'DOC-B',
    'references',
    'DOC-B',
    'DOC-A',
    'references',
  ]);
});

test('repository command import batches command inserts', async () => {
  const queries = [];
  const baseCommand = {
    commandId: 'command-a',
    commandType: 'script',
    commandName: 'test:a',
    commandPath: 'package.json#scripts.test:a',
    commandText: 'node scripts/a.cjs',
    domain: 'ci',
    sensitivity: 'safe',
    runtimeFanout: 'low',
    changedFileValidationRelevant: true,
    referencedFiles: ['scripts/a.cjs'],
    sourcePath: 'package.json',
    sourceContentSha256: 'source-a',
    rawCommand: { name: 'test:a' },
  };

  await insertRepositoryCommandSnapshot(
    {
      query: async (sql, params = []) => {
        queries.push({ sql, params });
      },
    },
    {
      commands: [
        baseCommand,
        {
          ...baseCommand,
          commandId: 'command-b',
          commandName: 'test:b',
          commandPath: 'package.json#scripts.test:b',
          commandText: 'node scripts/b.cjs',
          referencedFiles: ['scripts/b.cjs'],
          sourceContentSha256: 'source-b',
          rawCommand: { name: 'test:b' },
        },
      ],
    }
  );

  const commandInsertQueries = queries.filter((query) =>
    query.sql.includes(`insert into ${schemaName}.repository_commands`)
  );

  assert.equal(commandInsertQueries.length, 1);
  assert.match(commandInsertQueries[0].sql, /\),\s*\(/);
  assert.deepEqual(
    commandInsertQueries[0].params.filter(
      (value) => value === 'command-a' || value === 'command-b'
    ),
    ['command-a', 'command-b']
  );
  assert.deepEqual(
    commandInsertQueries[0].params.filter((value) => value === 'test:a' || value === 'test:b'),
    ['test:a', 'test:b']
  );
});

test('repository command snapshot imports package scripts and command files for DB queries', async () => {
  const snapshot = await buildRepositoryCommandSnapshot();

  assert.ok(snapshot.commands.length > 0);
  assert.ok(snapshot.commands.some((command) => command.commandId === 'package:planning:db:query'));
  assert.ok(
    snapshot.commands.some((command) => command.commandId === 'file:scripts/planning-db-query.cjs')
  );

  const planningQuery = snapshot.commands.find(
    (command) => command.commandId === 'package:planning:db:query'
  );
  assert.equal(planningQuery.commandType, 'package_script');
  assert.equal(planningQuery.domain, 'planning-db');
  assert.equal(planningQuery.sensitivity, 'planning-query-store');
  assert.deepEqual(planningQuery.referencedFiles, ['scripts/planning-db-query.cjs']);
});

test('PR readiness snapshot blocks ARC-triggered adapter changes without evidence and risk updates', () => {
  const snapshot = buildPrReadinessSnapshot({
    baseRef: 'origin/main',
    headRef: 'HEAD',
    changedFiles: ['packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts'],
  });

  assert.equal(snapshot.readiness.readinessId, 'current');
  assert.equal(snapshot.readiness.effectiveArcLevel, 'ARC-2');
  assert.equal(snapshot.readiness.isArc, true);
  assert.equal(snapshot.readiness.blocking, true);
  assert.equal(snapshot.readiness.requirements.evidenceDoc, true);
  assert.equal(snapshot.readiness.requirements.riskUpdate, true);
  assert.deepEqual(snapshot.readiness.evidenceDocs, []);
  assert.deepEqual(snapshot.readiness.riskUpdates, []);
  assert.deepEqual(snapshot.readiness.missingRequirements, ['evidenceDoc', 'riskUpdate']);
  assert.equal(snapshot.readiness.triggerHits[0].triggerName, 'adapters');
});

test('PR readiness snapshot clears ARC evidence and risk blockers from changed docs', () => {
  const snapshot = buildPrReadinessSnapshot({
    baseRef: 'origin/main',
    headRef: 'HEAD',
    changedFiles: [
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts',
      'docs/evidence/ED-20260510-pr-readiness.md',
      'docs/risk-register/quality/R-20260510-PR-READINESS.yaml',
    ],
  });

  assert.equal(snapshot.readiness.effectiveArcLevel, 'ARC-2');
  assert.equal(snapshot.readiness.blocking, false);
  assert.deepEqual(snapshot.readiness.evidenceDocs, ['docs/evidence/ED-20260510-pr-readiness.md']);
  assert.deepEqual(snapshot.readiness.riskUpdates, [
    'docs/risk-register/quality/R-20260510-PR-READINESS.yaml',
  ]);
  assert.deepEqual(snapshot.readiness.missingRequirements, []);
});

test('docs disposition snapshot classifies active-doc cleanup actions and task-like references', () => {
  const snapshot = buildDocsDispositionSnapshot({
    pendingHotspotThreshold: 2,
    planningTaskIds: ['AR-A6', 'F-28', 'S08'],
    documents: [
      {
        sourcePath: 'docs/planning/closeouts/example.md',
        raw: [
          '---',
          'title: Example closeout',
          'status: Draft',
          'planning_type: closeout',
          'owner: Docs',
          '---',
          [
            'AR-A6 F-28 S08 WEB-123 ADR-0055 ARC-2 ED-20260510-example',
            'R-20260510-EXAMPLE US-1 F04-W4 SYS-DOCS CMD-RET PS-Q08',
            'SHA-256 GAP-1 MVP-E1-A RESIDUAL-A RISK-B LEGACY-DRIFT INV-SCOPE-03 AR-C2-INV-1',
            'ADR-0041A ADR-G5 ADR-XXXX ADR-012 ED-20260308 W3-1 P0-13',
            'REF-1 REF-19 SSE-KMS SSE-S3 AES-GCM CVE-2023-30547',
            'AC-3 AU-11 CM-7 YYYY-MM-DD UTF-8 USD-EUR Q1-Q5',
            'GPT-5 SUB-SKILL GOV-S3 GOV-S3-PLANNING-STATE-QUERY-STORE',
            'CDG-W3-1 RFC-8785 HMAC-SHA256 RSA-3072 ECDSA-384',
            'ISOL-DIRECT-001 AR-D7-US1 ED-YYYYMMDD AR-C AR-D TASK-1',
            'EWC-1 CODE-FILES-1 DL-01 AUTO-FAIL TEST-MODE CE-001 EA-20260429-01',
          ].join(' '),
          'pending follow-up remains open',
          'TODO: resolve this item',
        ].join('\n'),
      },
    ],
  });

  assert.equal(snapshot.documents.length, 1);
  assert.equal(snapshot.documents[0].documentPath, 'docs/planning/closeouts/example.md');
  assert.equal(snapshot.documents[0].status, 'Draft');
  assert.equal(snapshot.documents[0].pendingMarkerCount, 3);

  assert.deepEqual(snapshot.markers.map((marker) => marker.markerKind).sort(), [
    'follow-up',
    'pending',
    'todo',
  ]);

  const classifications = new Map(
    snapshot.references.map((reference) => [reference.referenceText, reference.classification])
  );
  assert.equal(classifications.get('AR-A6'), 'registered_planning_task');
  assert.equal(classifications.get('F-28'), 'registered_planning_task');
  assert.equal(classifications.get('S08'), 'registered_planning_task');
  assert.equal(classifications.get('WEB-123'), 'unknown_task_like_id');
  assert.equal(classifications.get('ADR-0055'), 'adr_id');
  assert.equal(classifications.get('ADR-0041A'), 'adr_id');
  assert.equal(classifications.get('ADR-G5'), 'adr_id');
  assert.equal(classifications.get('ADR-XXXX'), 'adr_template_id');
  assert.equal(classifications.get('ADR-012'), 'adr_id');
  assert.equal(classifications.get('ARC-2'), 'arc_level');
  assert.equal(classifications.get('ED-20260510-example'), 'evidence_id');
  assert.equal(classifications.get('ED-20260308'), 'evidence_id');
  assert.equal(classifications.get('R-20260510-EXAMPLE'), 'risk_id');
  assert.equal(classifications.get('US-1'), 'user_story');
  assert.equal(classifications.get('F04-W4'), 'historical_gap');
  assert.equal(classifications.get('W3-1'), 'historical_gap');
  assert.equal(classifications.get('P0-13'), 'priority_work_item_marker');
  assert.equal(classifications.get('SYS-DOCS'), 'governance_unit_reference');
  assert.equal(classifications.get('CMD-RET'), 'command_reference');
  assert.equal(classifications.get('PS-Q08'), 'plan_store_matrix_reference');
  assert.equal(classifications.get('SHA-256'), 'algorithm_reference');
  assert.equal(classifications.get('REF-1'), 'document_reference');
  assert.equal(classifications.get('REF-19'), 'document_reference');
  assert.equal(classifications.get('SSE-KMS'), 'security_algorithm_reference');
  assert.equal(classifications.get('SSE-S3'), 'security_algorithm_reference');
  assert.equal(classifications.get('AES-GCM'), 'security_algorithm_reference');
  assert.equal(classifications.get('CVE-2023-30547'), 'security_advisory_reference');
  assert.equal(classifications.get('AC-3'), 'security_control_reference');
  assert.equal(classifications.get('AU-11'), 'security_control_reference');
  assert.equal(classifications.get('CM-7'), 'security_control_reference');
  assert.equal(classifications.get('YYYY-MM-DD'), 'date_placeholder');
  assert.equal(classifications.get('UTF-8'), 'encoding_reference');
  assert.equal(classifications.get('USD-EUR'), 'currency_pair_reference');
  assert.equal(classifications.get('Q1-Q5'), 'range_reference');
  assert.equal(classifications.get('GPT-5'), 'model_reference');
  assert.equal(classifications.get('SUB-SKILL'), 'skill_reference');
  assert.equal(classifications.get('GOV-S3'), 'governance_workstream_reference');
  assert.equal(
    classifications.get('GOV-S3-PLANNING-STATE-QUERY-STORE'),
    'governance_workstream_reference'
  );
  assert.equal(classifications.get('CDG-W3-1'), 'governance_workstream_reference');
  assert.equal(classifications.get('RFC-8785'), 'standards_reference');
  assert.equal(classifications.get('HMAC-SHA256'), 'security_algorithm_reference');
  assert.equal(classifications.get('RSA-3072'), 'security_algorithm_reference');
  assert.equal(classifications.get('ECDSA-384'), 'security_algorithm_reference');
  assert.equal(classifications.get('ISOL-DIRECT-001'), 'security_test_reference');
  assert.equal(classifications.get('AR-D7-US1'), 'user_story');
  assert.equal(classifications.get('ED-YYYYMMDD'), 'evidence_template_id');
  assert.equal(classifications.get('AR-C'), 'architecture_review_stream_reference');
  assert.equal(classifications.get('AR-D'), 'architecture_review_stream_reference');
  assert.equal(classifications.get('TASK-1'), 'example_task_reference');
  assert.equal(classifications.get('EWC-1'), 'user_story');
  assert.equal(classifications.get('CODE-FILES-1'), 'user_story');
  assert.equal(classifications.get('DL-01'), 'diagram_reference');
  assert.equal(classifications.get('AUTO-FAIL'), 'policy_state_reference');
  assert.equal(classifications.get('TEST-MODE'), 'policy_state_reference');
  assert.equal(classifications.get('CE-001'), 'review_finding_reference');
  assert.equal(classifications.get('EA-20260429-01'), 'review_finding_reference');
  assert.equal(classifications.get('GAP-1'), 'historical_planning_reference');
  assert.equal(classifications.get('MVP-E1-A'), 'historical_planning_reference');
  assert.equal(classifications.get('RESIDUAL-A'), 'historical_planning_reference');
  assert.equal(classifications.get('RISK-B'), 'historical_planning_reference');
  assert.equal(classifications.get('LEGACY-DRIFT'), 'historical_planning_reference');
  assert.equal(classifications.get('INV-SCOPE-03'), 'historical_planning_reference');
  assert.equal(classifications.get('AR-C2-INV-1'), 'review_invariant_reference');

  assert.deepEqual(snapshot.actions.map((action) => action.actionKind).sort(), [
    'draft_active_doc',
    'pending_marker_hotspot',
    'unknown_task_like_id',
  ]);
});

test('docs disposition snapshot treats closed feature mechanization ids as registered links', () => {
  const snapshot = buildDocsDispositionSnapshot({
    planningTaskIds: [],
    featureMechanizationIds: ['VERIFY-PREPUSH-SCOPE-ROUTER-20260511'],
    documents: [
      {
        sourcePath:
          'docs/planning/proposals/mandatory/governance-and-docs/verify-prepush-scope-router-plan-20260511.md',
        raw: [
          '---',
          'title: Verify Prepush Scope Router Plan',
          'status: Review',
          'planning_type: mandatory-proposal',
          '---',
          '> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.',
          '```feature-mechanization',
          'version: 1',
          'featureId: VERIFY-PREPUSH-SCOPE-ROUTER-20260511',
          'mechanizationStatus: closed',
          'noHumanDecisionsRemaining: true',
          'redGreenCycles:',
          '  - id: PREPUSH-ROUTER-WEB-SOURCE',
          '    redTest: scripts/verify-prepush.test.cjs',
          '    greenTest: node --test scripts/verify-prepush.test.cjs',
          '```',
        ].join('\n'),
      },
    ],
  });

  const featureReference = snapshot.references.find(
    (reference) => reference.referenceText === 'VERIFY-PREPUSH-SCOPE-ROUTER-20260511'
  );

  assert.ok(featureReference);
  assert.equal(featureReference.classification, 'registered_feature_mechanization');
  assert.equal(featureReference.registeredPlanningTask, false);

  const cycleReference = snapshot.references.find(
    (reference) => reference.referenceText === 'PREPUSH-ROUTER-WEB-SOURCE'
  );
  assert.ok(cycleReference);
  assert.equal(cycleReference.classification, 'feature_mechanization_cycle');
  assert.equal(cycleReference.registeredPlanningTask, false);

  const skillReference = snapshot.references.find(
    (reference) => reference.referenceText === 'SUB-SKILL'
  );
  assert.ok(skillReference);
  assert.equal(skillReference.classification, 'skill_reference');
  assert.equal(skillReference.registeredPlanningTask, false);

  assert.deepEqual(snapshot.actions, []);
});

test('docs disposition snapshot does not split lane-prefixed planning task ids into suffix references', () => {
  const snapshot = buildDocsDispositionSnapshot({
    planningTaskIds: [
      'C-REV-RUNTIME-CANON',
      'D-DOCS-DISPOSITION-QUEUE-1',
      'D-REV-CI-RETENTION-CANON',
      'E-PROP-DISP-1',
      'F-MAND-WORKBENCH-UX',
    ],
    documents: [
      {
        sourcePath: 'docs/planning/status/current-work.md',
        raw: [
          '---',
          'title: Current work',
          'status: Active',
          'planning_type: status',
          '---',
          '`E-PROP-DISP-1`, `F-MAND-WORKBENCH-UX`, and',
          '`D-REV-CI-RETENTION-CANON` are Planning DB tasks.',
          '`C-REV-RUNTIME-CANON` and `D-DOCS-DISPOSITION-QUEUE-1` are tasks too.',
        ].join('\n'),
      },
    ],
  });

  const classifications = new Map(
    snapshot.references.map((reference) => [reference.referenceText, reference.classification])
  );

  assert.equal(classifications.get('E-PROP-DISP-1'), 'registered_planning_task');
  assert.equal(classifications.get('F-MAND-WORKBENCH-UX'), 'registered_planning_task');
  assert.equal(classifications.get('D-REV-CI-RETENTION-CANON'), 'registered_planning_task');
  assert.equal(classifications.get('C-REV-RUNTIME-CANON'), 'registered_planning_task');
  assert.equal(classifications.get('D-DOCS-DISPOSITION-QUEUE-1'), 'registered_planning_task');
  assert.equal(classifications.has('PROP-DISP-1'), false);
  assert.equal(classifications.has('MAND-WORKBENCH-UX'), false);
  assert.equal(classifications.has('REV-CI-RETENTION-CANON'), false);
  assert.equal(classifications.has('REV-RUNTIME-CANON'), false);
  assert.equal(classifications.has('DOCS-DISPOSITION-QUEUE-1'), false);
  assert.deepEqual(snapshot.actions, []);
});

test('docs disposition snapshot keeps planning task references case-insensitive', () => {
  const snapshot = buildDocsDispositionSnapshot({
    planningTaskIds: ['AR-A6', 'F-MAND-WORKBENCH-UX'],
    documents: [
      {
        sourcePath: 'docs/planning/status/current-work.md',
        raw: [
          '---',
          'title: Current work',
          'status: Active',
          'planning_type: status',
          '---',
          'Mixed-case task mentions: ar-a6 and f-mand-workbench-ux.',
        ].join('\n'),
      },
    ],
  });

  const classifications = new Map(
    snapshot.references.map((reference) => [reference.referenceText, reference.classification])
  );

  assert.equal(classifications.get('ar-a6'), 'registered_planning_task');
  assert.equal(classifications.get('f-mand-workbench-ux'), 'registered_planning_task');
  assert.deepEqual(snapshot.actions, []);
});

test('docs disposition snapshot classifies story, QA, and historical work-item ids as non-task references', () => {
  const snapshot = buildDocsDispositionSnapshot({
    planningTaskIds: [],
    documents: [
      {
        sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/story-catalog.md',
        raw: [
          '---',
          'title: Story catalog',
          'status: Active',
          'planning_type: mandatory-proposal',
          '---',
          'WAPO-1 WEB-AUTH-1 WEB-GAP-1 WEB-PROJECT-1 WEB-SCOPE-1',
          'E2-ARCH-01 EPIC-E2-01 QA-MWA2-01 QA-RS-4 QA-EP-11 TF-C2-B-QA-01',
          'AR-C11 AR-C10-A AR-D-PLAN-POINTER-A AR-A-READSIDE-CONTRACTS',
          'CI-AUDIT EA-20260429 PKR-1 PR-1 INT-W0 MW-D1-B2 RC-G1-D-A TF-A2-A',
        ].join('\n'),
      },
    ],
  });

  const classifications = new Map(
    snapshot.references.map((reference) => [reference.referenceText, reference.classification])
  );

  assert.equal(classifications.get('WAPO-1'), 'user_story');
  assert.equal(classifications.get('WEB-AUTH-1'), 'user_story');
  assert.equal(classifications.get('WEB-GAP-1'), 'user_story');
  assert.equal(classifications.get('WEB-PROJECT-1'), 'user_story');
  assert.equal(classifications.get('WEB-SCOPE-1'), 'user_story');
  assert.equal(classifications.get('E2-ARCH-01'), 'user_story');
  assert.equal(classifications.get('EPIC-E2-01'), 'epic_reference');
  assert.equal(classifications.get('QA-MWA2-01'), 'review_finding_reference');
  assert.equal(classifications.get('QA-RS-4'), 'review_finding_reference');
  assert.equal(classifications.get('QA-EP-11'), 'review_finding_reference');
  assert.equal(classifications.get('TF-C2-B-QA-01'), 'review_finding_reference');
  assert.equal(classifications.get('AR-C11'), 'review_finding_reference');
  assert.equal(classifications.get('AR-C10-A'), 'review_finding_reference');
  assert.equal(classifications.get('AR-D-PLAN-POINTER-A'), 'review_finding_reference');
  assert.equal(classifications.get('AR-A-READSIDE-CONTRACTS'), 'review_finding_reference');
  assert.equal(classifications.get('CI-AUDIT'), 'governance_workstream_reference');
  assert.equal(classifications.get('EA-20260429'), 'review_finding_reference');
  assert.equal(classifications.get('PKR-1'), 'historical_planning_reference');
  assert.equal(classifications.get('PR-1'), 'historical_planning_reference');
  assert.equal(classifications.get('INT-W0'), 'historical_planning_reference');
  assert.equal(classifications.get('MW-D1-B2'), 'historical_planning_reference');
  assert.equal(classifications.get('RC-G1-D-A'), 'historical_planning_reference');
  assert.equal(classifications.get('TF-A2-A'), 'historical_planning_reference');
  assert.deepEqual(snapshot.actions, []);
});

test('docs disposition snapshot parses UTF-8 BOM frontmatter before missing-status checks', () => {
  const snapshot = buildDocsDispositionSnapshot({
    planningTaskIds: [],
    documents: [
      {
        sourcePath: 'docs/guides/bom-frontmatter.md',
        raw: [
          '\ufeff---',
          'title: BOM frontmatter',
          'status: Active',
          'owner: Docs',
          '---',
          '',
          '# BOM frontmatter',
        ].join('\n'),
      },
    ],
  });

  assert.equal(snapshot.documents[0].status, 'Active');
  assert.deepEqual(snapshot.actions, []);
});

test('docs disposition snapshot classifies priority markers and date placeholders as non-task references', () => {
  const snapshot = buildDocsDispositionSnapshot({
    planningTaskIds: [],
    documents: [
      {
        sourcePath:
          'docs/planning/reviews/architecture-and-governance/20260422-dvt-plus-principal-architect-action-plan.md',
        raw: [
          '---',
          'title: Principal architect action plan',
          'status: Review',
          'planning_type: review',
          '---',
          '| Priority | Target date |',
          '| P0-1 | YYYY-MM-DD |',
          '| P1-2 | YYYY-MM-DD |',
        ].join('\n'),
      },
    ],
  });

  const classifications = new Map(
    snapshot.references.map((reference) => [reference.referenceText, reference.classification])
  );

  assert.equal(classifications.get('P0-1'), 'priority_work_item_marker');
  assert.equal(classifications.get('P1-2'), 'priority_work_item_marker');
  assert.equal(classifications.get('YYYY-MM-DD'), 'date_placeholder');
  assert.deepEqual(snapshot.actions, []);
});

test('docs disposition snapshot keeps archived documents visible without active cleanup actions', () => {
  const snapshot = buildDocsDispositionSnapshot({
    planningTaskIds: [],
    documents: [
      {
        sourcePath: 'docs/archive/old-program.md',
        raw: [
          '---',
          'title: Archived program',
          'status: Superseded',
          '---',
          'WEB-999 pending TODO',
        ].join('\n'),
      },
      {
        sourcePath: 'docs/planning/archive/gaps/README.md',
        raw: [
          '---',
          'title: Archived planning gaps',
          'status: Superseded',
          '---',
          'WEB-998 pending TODO',
        ].join('\n'),
      },
      {
        sourcePath: 'docs/planning/proposals/superseded/runtime/example.md',
        raw: [
          '---',
          'title: Superseded proposal',
          'status: Superseded',
          '---',
          'WEB-997 pending TODO',
        ].join('\n'),
      },
    ],
  });

  assert.equal(snapshot.documents.length, 3);
  assert.equal(snapshot.documents[0].isArchive, true);
  assert.equal(snapshot.documents[0].isActive, false);
  assert.equal(snapshot.documents[1].isArchive, true);
  assert.equal(snapshot.documents[1].isActive, false);
  assert.equal(snapshot.documents[2].isArchive, true);
  assert.equal(snapshot.documents[2].isActive, false);
  assert.equal(snapshot.references[0].classification, 'unknown_task_like_id');
  assert.deepEqual(snapshot.actions, []);
});

test('normalizeText keeps structured lane fields queryable without dropping content', () => {
  assert.equal(normalizeText(undefined), '');
  assert.equal(normalizeText(['one', 'two']), 'one\ntwo');
  assert.equal(normalizeText({ a: 1 }), '{"a":1}');
});

test('planning governance import includes DB-local task ids in knowledge task linking', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(String(sql).trim());
      return {
        rows: [{ task_id: 'E-PROP-DISP-1' }, { taskId: 'GOV-PROP-DISP-1' }],
      };
    },
  };

  assert.deepEqual(mergePlanningTaskIds(['F-30', 'E-PROP-DISP-1'], ['E-PROP-DISP-1', '']), [
    'F-30',
    'E-PROP-DISP-1',
  ]);
  assert.deepEqual(await readLocalPlanningTaskIds(client), ['E-PROP-DISP-1', 'GOV-PROP-DISP-1']);
  assert.match(queries[0], /planning_task_local_definitions/);
  assert.match(queries[0], /planning_task_local_tombstones/);
});

test('importContent serializes destructive read-model replacement with an advisory lock', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql: String(sql).trim(), params });
      return { rows: [] };
    },
  };

  await importContent({
    client,
    includeGovernance: false,
    includePlanning: false,
    silent: true,
  });

  const beginIndexes = queries
    .map((query, index) => (query.sql === 'begin' ? index : -1))
    .filter((index) => index >= 0);
  const importBeginIndex = beginIndexes.at(-1);
  const lockQuery = queries[importBeginIndex + 1];

  assert.ok(importBeginIndex > 0);
  assert.match(lockQuery.sql, /pg_advisory_xact_lock/);
  assert.deepEqual(lockQuery.params, ['dvt:planning-query-store', 'import-content-v1']);
});
