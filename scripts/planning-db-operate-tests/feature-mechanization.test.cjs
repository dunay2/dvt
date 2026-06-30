const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  planFeatureMechanizationRailRecordOperation,
  writePlannedFeatureMechanizationRailRecordOperation,
} = require('../planning-db-operate.cjs');
const { validateFeatureMechanizationManifest } = require('../check-feature-mechanization.cjs');

function featureMechanizationRecordArgs(options = {}) {
  const implementationRefs = options.implementationRefs || [
    'scripts/planning-db-operate.cjs#parseFeatureMechanizationCommand',
  ];
  const args = [
    'feature-mechanization',
    'record',
    '--feature',
    'FM-DB-FIRST-WRITER',
    '--rail',
    'RecordFeatureMechanizationRail',
    '--type',
    'command',
    '--ddd-owner',
    'PlanningDbFeatureMechanizationCatalog',
    '--mechanization-status',
    'implemented',
    '--rail-status',
    'implemented',
    '--implementation-plan',
    'docs/planning/proposals/mandatory/governance-and-docs/feature-mechanization-db-first-read-model-plan-20260605.md',
    '--component-guide',
    'docs/architecture/command-query-rail-governance.md',
    '--user-story',
    'docs/architecture/components/ci-governance/component-engineering-record-user-stories.md',
    '--documentation-ref',
    'docs/architecture/command-query-rail-governance.md',
    '--governing-source',
    'docs/architecture/command-query-rail-governance.md',
    '--governing-source',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    '--allowed-surface',
    'scripts/planning-db-operate.cjs',
    '--allowed-surface',
    'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
    '--forbidden-surface',
    'docs/archive/**',
    '--domain-object',
    'FeatureMechanizationLocalRail',
    '--fowler-signal',
    'DB local rail declarations remove Markdown as the only write path.',
    '--architecture-guard',
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-migrate.test.cjs',
    '--cypress-flow',
    'N/A - repository governance CLI gate',
    '--completion-gate',
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-migrate.test.cjs',
    '--completion-gate',
    'pnpm docs:feature-mechanization:implementation',
    '--completion-gate',
    'pnpm verify:prepush',
    '--unit-test',
    'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
    '--red-test',
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-migrate.test.cjs',
    '--expected-failure',
    'Feature mechanization writer command is not recognized or does not persist an effective local rail.',
    '--green-test',
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-migrate.test.cjs',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/feature-mechanization-db-first-read-model-plan-20260605.md',
    '--source-content-sha256',
    'f'.repeat(64),
    '--actor',
    'codex',
  ];

  for (const implementationRef of implementationRefs) {
    args.push('--implementation-ref', implementationRef);
  }

  return [...args, ...(options.extraArgs || [])];
}

test('parseArgs builds a feature mechanization rail record command', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: [
        '--expected-revision',
        '0',
        '--idempotency-key',
        'codex-feature-mechanization-record',
      ],
    })
  );

  assert.equal(command.kind, 'feature_mechanization_rail_record');
  assert.equal(command.featureId, 'FM-DB-FIRST-WRITER');
  assert.equal(command.railName, 'RecordFeatureMechanizationRail');
  assert.equal(command.normalizedRailName, 'recordfeaturemechanizationrail');
  assert.equal(command.railType, 'command');
  assert.equal(command.dddOwner, 'PlanningDbFeatureMechanizationCatalog');
  assert.deepEqual(command.implementationRefs, [
    'scripts/planning-db-operate.cjs#parseFeatureMechanizationCommand',
  ]);
  assert.deepEqual(command.documentationRefs, [
    'docs/architecture/command-query-rail-governance.md',
  ]);
  assert.equal(
    command.implementationPlan,
    'docs/planning/proposals/mandatory/governance-and-docs/feature-mechanization-db-first-read-model-plan-20260605.md'
  );
  assert.deepEqual(command.componentGuides, ['docs/architecture/command-query-rail-governance.md']);
  assert.deepEqual(command.forbiddenImplementationSurfaces, ['docs/archive/**']);
  assert.equal(command.expectedRevision, 0);
});

test('parseArgs accepts deprecated and retired feature mechanization rail statuses', () => {
  const deprecatedCommand = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--rail-status', 'deprecated'],
    })
  );
  const retiredCommand = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--rail-status', 'retired'],
    })
  );

  assert.equal(deprecatedCommand.railStatus, 'deprecated');
  assert.equal(retiredCommand.railStatus, 'retired');
});

test('feature mechanization rail planner emits a local rail and audit row', () => {
  const now = new Date('2026-06-05T18:00:00.000Z');
  const command = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: [
        'scripts/planning-db-operate.cjs#planFeatureMechanizationRailRecordOperation',
      ],
    })
  );

  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail: null,
    operationId: 'op-feature-mechanization-record',
    now,
  });

  assert.equal(
    planned.rail.railId,
    'local#FM-DB-FIRST-WRITER#command#recordfeaturemechanizationrail'
  );
  assert.equal(planned.rail.revision, 0);
  assert.equal(planned.rail.createdBy, 'codex');
  assert.deepEqual(planned.rail.symbolRefs, planned.rail.implementationRefs);
  assert.equal(planned.audit.operationType, 'feature_mechanization_rail_record');
  assert.equal(planned.audit.railId, planned.rail.railId);
  assert.equal(planned.audit.resultingRevision, 0);
  assert.deepEqual(
    validateFeatureMechanizationManifest(planned.rail.rawManifest, planned.rail.sourcePath).errors,
    []
  );
});

test('feature mechanization rail writer stores local rails without mutating imports', async () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: [
        'scripts/planning-db-operate.cjs#writePlannedFeatureMechanizationRailRecordOperation',
      ],
    })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail: null,
    operationId: 'op-feature-mechanization-record',
    now: new Date('2026-06-05T18:00:00.000Z'),
  });
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };

  await writePlannedFeatureMechanizationRailRecordOperation(client, planned);

  assert.ok(queries.some((query) => query.sql.includes('feature_mechanization_local_rails')));
  assert.ok(queries.some((query) => query.sql.includes('feature_mechanization_local_operations')));
  assert.equal(
    queries.some((query) =>
      /insert into planning_query_store\.command_query_rails/.test(query.sql)
    ),
    false
  );
});
