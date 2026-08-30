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
    '--application-port',
    'RecordFeatureMechanizationRail application command',
    '--adapter-surface',
    'pnpm planning:db:operate feature-mechanization record',
    '--authorization-scope',
    'repository-local governance writer with explicit actor and compare-and-set revision',
    '--negative-test',
    'reject missing rail metadata',
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
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-schema.test.cjs',
    '--cypress-flow',
    'N/A - repository governance CLI gate',
    '--completion-gate',
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-schema.test.cjs',
    '--completion-gate',
    'pnpm docs:feature-mechanization:implementation',
    '--completion-gate',
    'pnpm verify:prepush',
    '--unit-test',
    'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
    '--red-test',
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-schema.test.cjs',
    '--expected-failure',
    'Feature mechanization writer command is not recognized or does not persist an effective local rail.',
    '--green-test',
    'node --test scripts/planning-db-operate.test.cjs scripts/planning-db-schema.test.cjs',
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
  assert.equal(command.applicationPort, 'RecordFeatureMechanizationRail application command');
  assert.equal(command.adapterSurface, 'pnpm planning:db:operate feature-mechanization record');
  assert.equal(
    command.authorizationScope,
    'repository-local governance writer with explicit actor and compare-and-set revision'
  );
  assert.deepEqual(command.negativeTests, ['reject missing rail metadata']);
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

test('parseArgs accepts closed deprecated and retired rails without implementation refs', () => {
  const deprecatedCommand = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: [],
      extraArgs: ['--mechanization-status', 'closed', '--rail-status', 'deprecated'],
    })
  );
  const retiredCommand = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: [],
      extraArgs: ['--mechanization-status', 'closed', '--rail-status', 'retired'],
    })
  );

  assert.equal(deprecatedCommand.railStatus, 'deprecated');
  assert.equal(retiredCommand.railStatus, 'retired');
  assert.deepEqual(deprecatedCommand.implementationRefs, []);
  assert.deepEqual(retiredCommand.implementationRefs, []);
});

test('parseArgs accepts a closed feature with an active evidenced rail', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--mechanization-status', 'closed', '--rail-status', 'implemented'],
    })
  );

  assert.equal(command.mechanizationStatus, 'closed');
  assert.equal(command.railStatus, 'implemented');
  assert.equal(command.implementationRefs.length, 1);
});

test('parseArgs rejects active feature mechanization rails without implementation refs', () => {
  assert.throws(
    () => parseArgs(featureMechanizationRecordArgs({ implementationRefs: [] })),
    /requires at least one --implementation-ref/
  );
  assert.throws(
    () =>
      parseArgs(
        featureMechanizationRecordArgs({
          implementationRefs: [],
          extraArgs: ['--mechanization-status', 'closed', '--rail-status', 'implemented'],
        })
      ),
    /requires at least one --implementation-ref/
  );
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
  assert.deepEqual(planned.rail.rawRail, {
    name: 'RecordFeatureMechanizationRail',
    type: 'command',
    dddOwner: 'PlanningDbFeatureMechanizationCatalog',
    status: 'implemented',
    applicationPort: 'RecordFeatureMechanizationRail application command',
    adapterSurface: 'pnpm planning:db:operate feature-mechanization record',
    authorizationScope:
      'repository-local governance writer with explicit actor and compare-and-set revision',
    negativeTests: ['reject missing rail metadata'],
  });
  assert.deepEqual(
    validateFeatureMechanizationManifest(planned.rail.rawManifest, planned.rail.sourcePath).errors,
    []
  );
});

test('feature mechanization rail planner promotes an imported manifest as local revision zero', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: ['scripts/new-writer-helper.cjs#mergeImportedEvidence'],
    })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail: {
      rail_id: 'docs/source.md#FM-DB-FIRST-WRITER#command#recordfeaturemechanizationrail',
      revision: null,
      rail_source: 'imported',
      symbol_refs: [
        {
          path: 'scripts/existing-writer.cjs',
          name: 'recordExistingEvidence',
        },
      ],
      implementation_refs: [
        {
          path: 'scripts/existing-writer.cjs',
          name: 'recordExistingEvidence',
        },
      ],
      raw_manifest: {
        symbols: [
          {
            path: 'scripts/existing-writer.cjs',
            name: 'recordExistingEvidence',
          },
        ],
      },
    },
    operationId: 'op-feature-mechanization-promote-import',
    now: new Date('2026-06-05T18:00:00.000Z'),
  });

  assert.equal(planned.rail.revision, 0);
  assert.deepEqual(planned.rail.symbolRefs, [
    'scripts/existing-writer.cjs#recordExistingEvidence',
    'scripts/new-writer-helper.cjs#mergeImportedEvidence',
  ]);
  assert.equal(planned.rail.rawManifest.symbols.length, 2);
});

test('feature mechanization rail planner clears implementation evidence for a terminal rail', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: [],
      extraArgs: ['--mechanization-status', 'closed', '--rail-status', 'retired'],
    })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail: {
      rail_id: command.railId,
      revision: 3,
      symbol_refs: ['scripts/retired-writer.cjs#recordRetiredEvidence'],
      implementation_refs: ['scripts/retired-writer.cjs#recordRetiredEvidence'],
      raw_manifest: {
        symbols: [
          {
            path: 'scripts/retired-writer.cjs',
            name: 'recordRetiredEvidence',
          },
        ],
      },
    },
    operationId: 'op-feature-mechanization-terminal',
    now: new Date('2026-08-30T12:00:00.000Z'),
  });

  assert.deepEqual(planned.rail.symbolRefs, []);
  assert.deepEqual(planned.rail.implementationRefs, []);
  assert.deepEqual(planned.rail.rawManifest.symbols, []);
  assert.equal(planned.rail.rawRail.status, 'retired');
  assert.equal(planned.rail.rawManifest.mechanizationStatus, 'closed');
});

test('feature mechanization rail planner extends existing evidence without restoring forbidden surfaces', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: ['apps/web/src/newProjection.ts#buildNewProjection'],
      extraArgs: [
        '--allowed-surface',
        'apps/web/cypress/e2e/canvas/new-flow.cy.ts',
        '--forbidden-surface',
        'apps/web/src/retiredProjection.ts',
      ],
    })
  );
  const existingRail = {
    rail_id: command.railId,
    revision: 4,
    created_at: '2026-06-01T12:00:00.000Z',
    symbol_refs: [
      'apps/web/src/existingProjection.ts#buildExistingProjection',
      'apps/web/src/retiredProjection.ts#buildRetiredProjection',
    ],
    implementation_refs: [
      'apps/web/src/existingProjection.ts#buildExistingProjection',
      'apps/web/src/retiredProjection.ts#buildRetiredProjection',
    ],
    documentation_refs: ['docs/existing-component.md'],
    governing_sources: ['docs/existing-governance.md'],
    allowed_implementation_surfaces: [
      'apps/web/src/existingProjection.ts',
      'apps/web/src/retiredProjection.ts',
    ],
    architecture_guards: ['existing architecture guard'],
    completion_gate: {
      tests: ['existing completion gate'],
      dbQueries: ['existing DB evidence query'],
    },
    raw_rail: { purpose: 'Existing rail purpose' },
    raw_manifest: {
      recordedColumnsVisibility: {
        status: 'implemented',
        decorator: 'apps/web/src/retiredProjection.ts',
      },
      forbiddenImplementationSurfaces: ['apps/web/cypress/e2e/canvas/** legacy direct-write ban'],
      redGreenCycles: [
        {
          id: 'existing-cycle',
          patchSurfaces: ['apps/web/src/retiredProjection.ts'],
        },
      ],
      symbols: [
        {
          name: 'buildExistingProjection',
          path: 'apps/web/src/existingProjection.ts',
          unitTests: ['apps/web/src/existingProjection.test.ts'],
        },
        {
          name: 'buildRetiredProjection',
          path: 'apps/web/src/retiredProjection.ts',
        },
      ],
    },
  };

  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail,
    operationId: 'op-feature-mechanization-extend',
    now: new Date('2026-06-05T18:00:00.000Z'),
  });

  assert.equal(planned.rail.revision, 5);
  assert.equal(planned.rail.createdAt, existingRail.created_at);
  assert.deepEqual(planned.rail.rawManifest.recordedColumnsVisibility, {
    status: 'implemented',
  });
  assert.deepEqual(
    planned.rail.rawManifest.symbols.map(({ path, name }) => `${path}#${name}`),
    [
      'apps/web/src/existingProjection.ts#buildExistingProjection',
      'apps/web/src/newProjection.ts#buildNewProjection',
    ]
  );
  assert.ok(
    planned.rail.allowedImplementationSurfaces.includes('apps/web/src/existingProjection.ts')
  );
  assert.ok(planned.rail.completionGate.includes('existing completion gate'));
  assert.ok(
    planned.rail.allowedImplementationSurfaces.includes(
      'apps/web/cypress/e2e/canvas/new-flow.cy.ts'
    )
  );
  assert.equal(
    planned.rail.allowedImplementationSurfaces.includes('apps/web/src/retiredProjection.ts'),
    false
  );
  assert.equal(
    planned.rail.rawManifest.forbiddenImplementationSurfaces.includes(
      'apps/web/cypress/e2e/canvas/** legacy direct-write ban'
    ),
    false
  );
  assert.deepEqual(planned.rail.rawManifest.redGreenCycles[0].patchSurfaces, []);
});

test('feature mechanization rail planner replaces inherited implementation authority on explicit hard cut', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      implementationRefs: ['apps/api/src/currentRoute.ts#currentRoute'],
      extraArgs: ['--replace-implementation-refs', 'true'],
    })
  );
  const existingRail = {
    rail_id: command.railId,
    revision: 2,
    created_at: '2026-06-01T12:00:00.000Z',
    symbol_refs: ['apps/api/src/retiredRoute.ts#retiredRoute'],
    implementation_refs: ['apps/api/src/retiredRoute.ts#retiredRoute'],
    raw_rail: { name: command.railName, type: command.railType },
    raw_manifest: {
      symbols: [
        {
          name: 'retiredRoute',
          path: 'apps/api/src/retiredRoute.ts',
        },
      ],
    },
  };

  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail,
    operationId: 'op-feature-mechanization-hard-cut',
    now: new Date('2026-06-05T18:00:00.000Z'),
  });

  assert.deepEqual(planned.rail.symbolRefs, ['apps/api/src/currentRoute.ts#currentRoute']);
  assert.deepEqual(planned.rail.implementationRefs, ['apps/api/src/currentRoute.ts#currentRoute']);
  assert.deepEqual(
    planned.rail.rawManifest.symbols.map(({ path, name }) => `${path}#${name}`),
    ['apps/api/src/currentRoute.ts#currentRoute']
  );
  assert.equal(planned.audit.payload.replaceImplementationRefs, true);
});

test('feature mechanization hard cut has a distinct default idempotency identity', () => {
  const additive = parseArgs(featureMechanizationRecordArgs());
  const replacement = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--replace-implementation-refs', 'true'],
    })
  );

  assert.notEqual(replacement.idempotencyKey, additive.idempotencyKey);
});

test('feature mechanization rail planner replaces inherited architecture guards on explicit hard cut', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--replace-architecture-guards', 'true'],
    })
  );
  const existingRail = {
    rail_id: command.railId,
    revision: 3,
    created_at: '2026-06-01T12:00:00.000Z',
    architecture_guards: ['[object Object]', 'retired topology guard'],
    raw_rail: { name: command.railName, type: command.railType },
    raw_manifest: {
      architectureGuards: [{ name: 'legacy guard' }, 'retired topology guard'],
      symbols: [],
    },
  };

  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail,
    operationId: 'op-feature-mechanization-guard-hard-cut',
    now: new Date('2026-06-05T18:00:00.000Z'),
  });

  assert.deepEqual(planned.rail.architectureGuards, command.architectureGuards);
  assert.deepEqual(planned.rail.rawManifest.architectureGuards, command.architectureGuards);
  assert.equal(planned.audit.payload.replaceArchitectureGuards, true);
});

test('feature mechanization architecture-guard hard cut has a distinct idempotency identity', () => {
  const additive = parseArgs(featureMechanizationRecordArgs());
  const replacement = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--replace-architecture-guards', 'true'],
    })
  );

  assert.notEqual(replacement.idempotencyKey, additive.idempotencyKey);
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
