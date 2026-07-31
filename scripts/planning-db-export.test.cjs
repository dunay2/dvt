const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  PlanningDbExportRunner,
  canonicalArtifactPaths,
  canonicalStateArtifactPath,
} = require('./planning-db-export.cjs');
const { restoreArchitectureComponentStatusOverrides } = require('./planning-db-import.cjs');

function createCanonicalStateFixture(repoRoot) {
  const runner = new PlanningDbExportRunner({
    fs,
    os,
    path,
    repoRoot,
    schemaName: 'planning_query_store',
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
  const architectureComponentStatusOverride = {
    componentId: 'SYS-WEB-EXAMPLE',
    status: 'deprecated',
  };
  const client = {
    async query(sql) {
      if (String(sql).includes('architecture.component')) {
        return { rows: [architectureComponentStatusOverride] };
      }
      if (String(sql).includes('operation.operation_id as "operationId"')) {
        return { rows: [operation] };
      }
      if (String(sql).includes('feature_mechanization_local_rails')) {
        return { rows: [rail] };
      }
      return { rows: [] };
    },
  };

  return { architectureComponentStatusOverride, client, operation, rail, runner };
}

test('planning DB export accepts canonical-state options only', () => {
  const runner = new PlanningDbExportRunner();

  assert.deepEqual(runner.parseArgs(['--check', '--output-root', 'tmp/export']), {
    check: true,
    outputRoot: path.resolve(__dirname, '..', 'tmp/export'),
  });
  assert.throws(() => runner.parseArgs(['--lane', 'E']), /Unknown planning DB export option/);
  assert.deepEqual(canonicalArtifactPaths, [canonicalStateArtifactPath]);
});

test('planning DB export reads current architecture state and operated feature rails', async () => {
  const runner = new PlanningDbExportRunner();
  const capturedSql = [];
  const client = {
    async query(sql) {
      capturedSql.push(String(sql));
      return { rows: [] };
    },
  };

  await runner.readCanonicalStateRows(client);

  assert.match(capturedSql[0], /feature_mechanization_local_rails/u);
  assert.match(capturedSql[0], /feature_mechanization_local_operations/u);
  assert.match(capturedSql[0], /source_path not like 'tools\/planning-db\/migrations\/%'/u);
  assert.match(capturedSql[1], /feature_mechanization_local_operations/u);
  assert.match(capturedSql[2], /from architecture\.component/u);
  assert.match(capturedSql[2], /where status = 'deprecated'/u);
  assert.doesNotMatch(capturedSql[2], /architecture\.design_operations/u);
});

test('planning DB component status overrides round-trip without operation history', async () => {
  const restoredComponents = new Map();
  const client = {
    async query(sql, params = []) {
      const statement = String(sql);
      if (statement.includes('update architecture.component')) {
        const overrides = JSON.parse(params[0]);
        for (const override of overrides) {
          restoredComponents.set(override.componentId, override.status);
        }
        return { rowCount: overrides.length };
      }
      if (statement.includes('from architecture.component')) {
        return {
          rows: [...restoredComponents].map(([componentId, status]) => ({
            componentId,
            status,
          })),
        };
      }
      return { rows: [] };
    },
  };
  const override = { componentId: 'SYS-WEB-EXAMPLE', status: 'deprecated' };

  await restoreArchitectureComponentStatusOverrides(client, [override]);
  const snapshot = await new PlanningDbExportRunner().readCanonicalStateRows(client);

  assert.deepEqual(snapshot.architectureComponentStatusOverrides, [override]);
});

test('planning DB export writes deterministic current architecture state', async () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-db-canonical-state-'));
  const { architectureComponentStatusOverride, client, operation, rail, runner } =
    createCanonicalStateFixture('C:/repo');

  try {
    const result = await runner.exportPlanningDerivedSurfaces({ client, outputRoot });
    const snapshot = JSON.parse(
      fs.readFileSync(path.join(outputRoot, canonicalStateArtifactPath), 'utf8')
    );

    assert.equal(snapshot.schemaVersion, 1);
    assert.deepEqual(snapshot.architectureComponentStatusOverrides, [
      architectureComponentStatusOverride,
    ]);
    assert.deepEqual(snapshot.featureMechanizationRails, [rail]);
    assert.deepEqual(snapshot.featureMechanizationRailOperations, [operation]);
    assert.deepEqual(result.canonicalArtifactPaths, [canonicalStateArtifactPath]);
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
