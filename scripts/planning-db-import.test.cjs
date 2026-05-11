const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDocsDispositionSnapshot,
  buildGovernanceFileSnapshot,
  buildPlanningContentSnapshot,
  buildPrReadinessSnapshot,
  buildRepositoryCommandSnapshot,
  clearGovernanceSnapshotTables,
  governanceImportDeleteTables,
  importContent,
  normalizeText,
  parseArgs,
  runPlanningImport,
} = require('./planning-db-import.cjs');
const { governanceGeneratedPath } = require('./governance-generated-paths.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');

test('planning content snapshot preserves real lane task content and hashes', () => {
  const snapshot = buildPlanningContentSnapshot();

  assert.equal(snapshot.lanes.length, 5);
  assert.ok(snapshot.tasks.length > 100);
  assert.match(snapshot.sources[0].contentSha256, /^[a-f0-9]{64}$/);

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

test('governance file snapshot preserves every file entry declared by the index', () => {
  const snapshot = buildGovernanceFileSnapshot();

  assert.equal(snapshot.files.length, snapshot.index.fileCount);
  assert.ok(snapshot.fileShards.length > 0);

  const packageJson = snapshot.files.find((file) => file.path === 'package.json');
  assert.ok(packageJson);
  assert.match(packageJson.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(typeof packageJson.isDrift, 'boolean');
});

test('governance snapshot preserves component, fingerprint, coverage, and remediation content', () => {
  const snapshot = buildGovernanceFileSnapshot();

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

test('governance snapshot builds DB import sources from in-memory generator projections', () => {
  const snapshot = buildGovernanceFileSnapshot();
  const generatedSources = snapshot.sources.filter((source) =>
    source.sourcePath.startsWith('.generated-docs/')
  );
  const artifactBackedTypes = new Set([
    'governance_coverage_report',
    'governance_remediation_queue',
  ]);
  const inMemorySources = generatedSources.filter(
    (source) => !artifactBackedTypes.has(source.sourceType)
  );

  assert.ok(generatedSources.length > 0);
  assert.equal(
    inMemorySources.every((source) => source.metadata?.sourceMode === 'in-memory-generator'),
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

test('governance snapshot imports DB-backed coverage and remediation generated artifacts', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const coveragePath = governanceGeneratedPath('system-governance-coverage-report.coverage.yaml');
  const remediationPath = governanceGeneratedPath('system-governance-remediation-queue.queue.yaml');
  const originals = new Map(
    [coveragePath, remediationPath].map((filePath) => [
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

  fs.mkdirSync(path.dirname(coveragePath), { recursive: true });
  fs.writeFileSync(coveragePath, coverageRaw, 'utf8');
  fs.writeFileSync(remediationPath, remediationRaw, 'utf8');

  try {
    const snapshot = buildGovernanceFileSnapshot();
    const coverageSource = snapshot.sources.find(
      (source) => source.sourceType === 'governance_coverage_report'
    );
    const remediationSource = snapshot.sources.find(
      (source) => source.sourceType === 'governance_remediation_queue'
    );

    assert.ok(snapshot.coverageRows.some((row) => row.name === 'fixture-role'));
    assert.ok(snapshot.remediationTasks.some((task) => task.taskId === 'GRQ-FIXTURE'));
    assert.equal(coverageSource.metadata.sourceMode, 'generated-artifact');
    assert.equal(remediationSource.metadata.sourceMode, 'generated-artifact');
    assert.equal(coverageSource.rawSourceText, coverageRaw);
    assert.equal(remediationSource.rawSourceText, remediationRaw);
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
  assert.equal(governanceImportDeleteTables.at(-1), 'governance_sources');
});

test('governance snapshot does not use stale generated YAML as structured import input', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const fileIndexPath = governanceGeneratedPath('system-governance-file-index.files.yaml');
  const original = fs.existsSync(fileIndexPath) ? fs.readFileSync(fileIndexPath, 'utf8') : null;
  const staleRaw = 'fileCount: 999999\nshards: []\n';

  fs.mkdirSync(path.dirname(fileIndexPath), { recursive: true });
  fs.writeFileSync(fileIndexPath, staleRaw, 'utf8');

  try {
    const snapshot = buildGovernanceFileSnapshot();
    const source = snapshot.sources.find((entry) => entry.sourceType === 'governance_file_index');

    assert.ok(source);
    assert.notEqual(snapshot.index.fileCount, 999999);
    assert.equal(snapshot.files.length, snapshot.index.fileCount);
    assert.equal(source.rawSource.fileCount, snapshot.index.fileCount);
    assert.equal(source.rawSourceText, staleRaw);
  } finally {
    if (original === null) {
      fs.unlinkSync(fileIndexPath);
    } else {
      fs.writeFileSync(fileIndexPath, original, 'utf8');
    }
  }
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
            'SHA-256 GAP-1 MVP-E1-A RESIDUAL-A RISK-B LEGACY-DRIFT INV-SCOPE-03',
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
  assert.equal(classifications.get('ARC-2'), 'arc_level');
  assert.equal(classifications.get('ED-20260510-example'), 'evidence_id');
  assert.equal(classifications.get('R-20260510-EXAMPLE'), 'risk_id');
  assert.equal(classifications.get('US-1'), 'user_story');
  assert.equal(classifications.get('F04-W4'), 'historical_gap');
  assert.equal(classifications.get('SYS-DOCS'), 'governance_unit_reference');
  assert.equal(classifications.get('CMD-RET'), 'command_reference');
  assert.equal(classifications.get('PS-Q08'), 'plan_store_matrix_reference');
  assert.equal(classifications.get('SHA-256'), 'algorithm_reference');
  assert.equal(classifications.get('GAP-1'), 'historical_planning_reference');
  assert.equal(classifications.get('MVP-E1-A'), 'historical_planning_reference');
  assert.equal(classifications.get('RESIDUAL-A'), 'historical_planning_reference');
  assert.equal(classifications.get('RISK-B'), 'historical_planning_reference');
  assert.equal(classifications.get('LEGACY-DRIFT'), 'historical_planning_reference');
  assert.equal(classifications.get('INV-SCOPE-03'), 'historical_planning_reference');

  assert.deepEqual(snapshot.actions.map((action) => action.actionKind).sort(), [
    'draft_active_doc',
    'pending_marker_hotspot',
    'unknown_task_like_id',
  ]);
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

test('importContent serializes destructive read-model replacement with an advisory lock', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql: String(sql).trim(), params });
      return { rows: [] };
    },
  };

  await importContent({ client, silent: true });

  const beginIndexes = queries
    .map((query, index) => (query.sql === 'begin' ? index : -1))
    .filter((index) => index >= 0);
  const importBeginIndex = beginIndexes.at(-1);
  const lockQuery = queries[importBeginIndex + 1];

  assert.ok(importBeginIndex > 0);
  assert.match(lockQuery.sql, /pg_advisory_xact_lock/);
  assert.deepEqual(lockQuery.params, ['dvt:planning-query-store', 'import-content-v1']);
});
