const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');

const {
  PlanningDbExportRunner,
  canonicalArtifactPaths,
  canonicalStateArtifactPath,
  governanceUnitManifestPath,
  governanceUnitNavigationPath,
  planStoreNavigationPath,
} = require('./planning-db-export.cjs');
const { architectureStateTableNames } = require('./planning-db-architecture-state.cjs');

function emptyArchitectureState() {
  return Object.fromEntries(architectureStateTableNames.map((tableName) => [tableName, []]));
}

function createCanonicalStateFixture(repoRoot) {
  const runner = new PlanningDbExportRunner({
    fs,
    os,
    path,
    repoRoot,
    schemaName: 'planning_query_store',
    readArchitectureState: async () => architectureState,
  });
  const rail = {
    railId: 'local#MVP#query#readcomponent',
    featureId: 'MVP',
    mechanizationStatus: 'implemented',
    railName: 'ReadComponent',
    normalizedRailName: 'readcomponent',
    railType: 'query',
    dddOwner: 'ArchitectureCatalog',
    railStatus: 'implemented',
    symbolRefs: ['scripts/planning-db-export.cjs#PlanningDbExportRunner'],
    implementationRefs: ['scripts/planning-db-export.cjs#PlanningDbExportRunner'],
    documentationRefs: [],
    governingSources: ['docs/architecture/command-query-rail-governance.md'],
    allowedImplementationSurfaces: ['scripts/planning-db-export.cjs'],
    architectureGuards: ['node --test scripts/planning-db-export.test.cjs'],
    completionGate: ['pnpm verify:prepush'],
    sourcePath: 'scripts/planning-db-export.cjs',
    sourceContentSha256: 'a'.repeat(64),
    rawRail: { name: 'ReadComponent', type: 'query' },
    rawManifest: { featureId: 'MVP' },
    revision: 1,
    createdBy: 'codex',
    createdAt: '2026-07-31T10:00:00.000Z',
  };
  const operation = {
    operationId: 'feature-mechanization:test-operation',
    idempotencyKey: 'feature-mechanization-test-operation',
    operationType: 'feature_mechanization_rail_record',
    actor: 'codex',
    railId: rail.railId,
    sourcePath: rail.sourcePath,
    sourceContentSha256: rail.sourceContentSha256,
    expectedRevision: null,
    previousRevision: null,
    resultingRevision: 1,
    payload: { railName: rail.railName },
    createdAt: '2026-07-31T10:00:00.000Z',
  };
  const architectureState = emptyArchitectureState();
  architectureState.design = [
    {
      design_id: 'TEST-GOVERNANCE-PROJECTION',
      created_at: '2026-08-09T08:00:00.000Z',
      updated_at: '2026-08-10T12:00:00.000Z',
    },
  ];
  architectureState.component = [
    {
      component_id: 'SYS-WEB-EXAMPLE',
      status: 'deprecated',
    },
  ];
  const componentDefinition = {
    componentId: 'SYS-API-DOCS',
    sourcePath: 'docs/architecture/components/api/index.md',
    sourceContentSha256: 'b'.repeat(64),
    revision: 1,
    name: 'API local documentation',
    level: 'component',
    parentComponentId: 'SYS-API-ROOT',
    rootUnit: 'SYS-DVT',
    domainUnit: 'SYS-API',
    status: 'superseded',
    childrenRequired: false,
    ownedConcern: 'Retired API-local documentation ownership.',
    dddOwner: 'INFRA',
    cqRails: 'none - API local documentation',
    createdBy: 'codex',
    createdAt: '2026-08-10T20:00:00.000Z',
  };
  const componentOperation = {
    operationId: 'component-revise:test-operation',
    idempotencyKey: 'component-revise-test-operation',
    operationType: 'component_revise',
    actor: 'codex',
    componentId: componentDefinition.componentId,
    sourcePath: componentDefinition.sourcePath,
    sourceContentSha256: componentDefinition.sourceContentSha256,
    expectedRevision: 0,
    previousRevision: 0,
    resultingRevision: 1,
    payload: { status: 'superseded' },
    createdAt: componentDefinition.createdAt,
  };
  const dbGovernanceSurface = {
    surfaceName: 'Governance component definition',
    canonicalSource: 'DB-authored component definitions',
    writeRail: 'pnpm planning:db:operate component create|revise|reparent',
    writeRailKind: 'db_command',
    readQueryRail: 'pnpm planning:db:query component-tree|component-metadata',
    projection: 'Explicit canonical export',
    validation: 'pnpm planning:db:current-schema:check',
    authorityMode: 'database',
  };
  const effectiveComponentDefinitions = [
    {
      componentId: 'SYS-DVT',
      name: 'DVT system',
      parentComponentId: null,
      level: 'system',
      status: 'review',
      owns: [],
      childrenRequired: true,
      dddOwner: 'system',
      cqRails: 'none - root governance unit',
      rawUnit: {
        id: 'SYS-DVT',
        name: 'DVT system',
        level: 'system',
        status: 'review',
        owns: [],
        childrenRequired: true,
        dddOwner: 'system',
        cqRails: 'none - root governance unit',
      },
    },
    {
      componentId: 'SYS-PLANSTORE',
      name: 'Plan store',
      parentComponentId: 'SYS-DVT',
      level: 'domain',
      status: 'review',
      owns: [],
      childrenRequired: true,
      dddOwner: 'PORT',
      cqRails: 'PS-Q03',
      rawUnit: {
        id: 'SYS-PLANSTORE',
        name: 'Plan store',
        parent: 'SYS-DVT',
        level: 'domain',
        status: 'review',
        owns: [],
        childrenRequired: true,
        dddOwner: 'PORT',
        cqRails: 'PS-Q03',
      },
    },
    {
      componentId: 'SYS-API-DOCS',
      name: 'API local documentation',
      parentComponentId: 'SYS-DVT',
      level: 'component',
      status: 'superseded',
      ownedConcern: 'Retired API-local documentation ownership.',
      owns: [],
      childrenRequired: false,
      dddOwner: 'INFRA',
      cqRails: 'none - API local documentation',
      rawUnit: {
        id: 'SYS-API-DOCS',
        name: 'API local documentation',
        parent: 'SYS-DVT',
        level: 'component',
        status: 'superseded',
        ownedConcern: 'Retired API-local documentation ownership.',
        owns: [],
        childrenRequired: false,
        dddOwner: 'INFRA',
        cqRails: 'none - API local documentation',
      },
    },
  ];
  const client = {
    async query(sql) {
      const text = String(sql);
      if (text.includes('governance_unit_query definition')) {
        return { rows: effectiveComponentDefinitions };
      }
      if (text.includes('feature_mechanization_local_operations operation')) {
        return { rows: [operation] };
      }
      if (text.includes('feature_mechanization_local_rails rail')) {
        return { rows: [rail] };
      }
      if (text.includes('governance_component_local_definitions definition')) {
        return { rows: [componentDefinition] };
      }
      if (text.includes('governance_component_local_operations operation')) {
        return { rows: [componentOperation] };
      }
      if (text.includes('db_governance_surfaces surface')) {
        return { rows: [dbGovernanceSurface] };
      }
      return { rows: [] };
    },
  };

  return {
    architectureState,
    client,
    componentDefinition,
    componentOperation,
    dbGovernanceSurface,
    effectiveComponentDefinitions,
    operation,
    rail,
    runner,
  };
}

test('planning DB export accepts canonical-state options only', () => {
  const runner = new PlanningDbExportRunner();

  assert.deepEqual(runner.parseArgs(['--check', '--output-root', 'tmp/export']), {
    check: true,
    outputRoot: path.resolve(__dirname, '..', 'tmp/export'),
  });
  assert.throws(() => runner.parseArgs(['--lane', 'E']), /Unknown planning DB export option/);
  assert.deepEqual(canonicalArtifactPaths, [
    canonicalStateArtifactPath,
    'tools/planning-db/state/db-governance-surfaces.json',
    governanceUnitManifestPath,
    governanceUnitNavigationPath,
    planStoreNavigationPath,
  ]);
});

test('planning DB export compares governance YAML by structured meaning', () => {
  const runner = new PlanningDbExportRunner();
  const compact = `---\nversion: 1\nrootUnit: SYS-DVT\nunits:\n  - id: SYS-DVT\n    name: DVT system\n    level: system\n    status: review\n`;
  const formatted = `---\nversion: 1\nrootUnit: SYS-DVT\nunits:\n  - id: SYS-DVT\n    name: DVT system\n    level: system\n    status: review\n\n`;

  assert.equal(
    runner.normalizeArtifactForComparison(governanceUnitManifestPath, compact),
    runner.normalizeArtifactForComparison(governanceUnitManifestPath, formatted)
  );
});

test('planning DB export reads current architecture state and every current feature rail', async () => {
  const capturedSql = [];
  let architectureReads = 0;
  const runner = new PlanningDbExportRunner({
    schemaName: 'planning_query_store',
    readArchitectureState: async () => {
      architectureReads += 1;
      return emptyArchitectureState();
    },
  });
  const client = {
    async query(sql) {
      capturedSql.push(String(sql));
      return { rows: [] };
    },
  };

  await runner.readCanonicalStateRows(client);

  assert.ok(capturedSql.some((sql) => /feature_mechanization_local_rails/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /feature_mechanization_local_operations/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /governance_component_local_definitions/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /governance_component_local_ownership_patterns/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /governance_component_local_semantic_items/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /governance_component_local_operations/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /db_governance_surfaces/u.test(sql)));
  assert.ok(capturedSql.some((sql) => /governance_unit_query/u.test(sql)));
  assert.equal(architectureReads, 1);
});

test('planning DB export writes deterministic current architecture state', async () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-db-canonical-state-'));
  const {
    architectureState,
    client,
    componentDefinition,
    componentOperation,
    dbGovernanceSurface,
    operation,
    rail,
    runner,
  } = createCanonicalStateFixture('C:/repo');

  try {
    const result = await runner.exportPlanningDerivedSurfaces({ client, outputRoot });
    const snapshot = JSON.parse(
      fs.readFileSync(path.join(outputRoot, canonicalStateArtifactPath), 'utf8')
    );

    assert.equal(snapshot.schemaVersion, 1);
    assert.deepEqual(snapshot.architectureState, architectureState);
    assert.deepEqual(snapshot.featureMechanizationRails, [rail]);
    assert.deepEqual(snapshot.featureMechanizationRailOperations, [operation]);
    assert.deepEqual(snapshot.governanceComponentDefinitions, [componentDefinition]);
    assert.deepEqual(snapshot.governanceComponentOperations, [componentOperation]);
    assert.deepEqual(snapshot.governanceComponentOwnershipPatterns, []);
    assert.deepEqual(snapshot.governanceComponentSemanticItems, []);
    assert.deepEqual(
      JSON.parse(
        fs.readFileSync(
          path.join(outputRoot, 'tools/planning-db/state/db-governance-surfaces.json'),
          'utf8'
        )
      ),
      { schemaVersion: 1, surfaces: [dbGovernanceSurface] }
    );
    assert.deepEqual(result.canonicalArtifactPaths, canonicalArtifactPaths);
    const manifest = yaml.load(
      fs.readFileSync(path.join(outputRoot, governanceUnitManifestPath), 'utf8')
    );
    assert.equal(manifest.version, 1);
    assert.equal(manifest.rootUnit, 'SYS-DVT');
    assert.deepEqual(
      manifest.units.find((unit) => unit.id === 'SYS-API-DOCS'),
      {
        id: 'SYS-API-DOCS',
        name: 'API local documentation',
        parent: 'SYS-DVT',
        level: 'component',
        status: 'superseded',
        ownedConcern: 'Retired API-local documentation ownership.',
        owns: [],
        childrenRequired: false,
        dddOwner: 'INFRA',
        cqRails: 'none - API local documentation',
      }
    );
    const unitNavigation = fs.readFileSync(
      path.join(outputRoot, governanceUnitNavigationPath),
      'utf8'
    );
    assert.match(unitNavigation, /Generated from Planning DB authority/u);
    assert.match(unitNavigation, /last_reviewed: 2026-08-10/u);
    assert.match(
      unitNavigation,
      /pnpm planning:db:query units --parent-unit SYS-DVT --no-refresh/u
    );
    assert.doesNotMatch(unitNavigation, /pnpm planning:db:query component-tree --no-refresh/u);
    assert.doesNotMatch(unitNavigation, /repository tracked files:\s*\d+/iu);
    const planStoreNavigation = fs.readFileSync(
      path.join(outputRoot, planStoreNavigationPath),
      'utf8'
    );
    assert.match(planStoreNavigation, /`SYS-PLANSTORE` — Plan store \(`review`\)/u);
    assert.match(planStoreNavigation, /last_reviewed: 2026-08-10/u);
    assert.match(
      planStoreNavigation,
      /pnpm planning:db:query units --component SYS-PLANSTORE --no-refresh/u
    );
    assert.match(
      planStoreNavigation,
      /pnpm planning:db:query component-tree --parent-unit SYS-PLANSTORE --no-refresh/u
    );
    assert.match(
      planStoreNavigation,
      /pnpm planning:db:query files --domain SYS-PLANSTORE --limit 1000 --no-refresh/u
    );
    assert.doesNotMatch(
      planStoreNavigation,
      /planning:db:query (?:component-tree|component-metadata|files) --component SYS-PLANSTORE/u
    );
    assert.doesNotMatch(planStoreNavigation, /StoredPlanExecutabilityValidator/u);
    assert.doesNotMatch(planStoreNavigation, /Repository tracked files/iu);
    assert.equal(
      fs.existsSync(path.join(outputRoot, 'docs', 'planning', 'state', 'agent-lane-e.yaml')),
      false
    );
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test('planning DB export check rejects canonical architecture-state drift', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-db-export-check-'));
  const { client, runner } = createCanonicalStateFixture(repoRoot);
  const canonicalPath = path.join(repoRoot, canonicalStateArtifactPath);

  try {
    fs.mkdirSync(path.dirname(canonicalPath), { recursive: true });
    fs.writeFileSync(
      canonicalPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          featureMechanizationRails: [],
          featureMechanizationRailOperations: [],
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    await assert.rejects(
      runner.exportPlanningDerivedSurfaces({ check: true, client }),
      /canonical-state\.json/
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
