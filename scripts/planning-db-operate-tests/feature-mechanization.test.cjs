const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertFeatureMechanizationRailIdempotentReplayMatches,
  assertFeatureMechanizationReferenceAuthority,
  parseArgs,
  planFeatureMechanizationRailRecordOperation,
  planFeatureMechanizationRailRetireOperation,
  writePlannedFeatureMechanizationRailRecordOperation,
} = require('../planning-db-operate.cjs');
const { validateFeatureMechanizationManifest } = require('../check-feature-mechanization.cjs');

function featureMechanizationRecordArgs(options = {}) {
  const implementationRefs = options.implementationRefs || [
    'scripts/planning-db-operate.cjs#parseFeatureMechanizationCommand',
  ];
  const documentationRefs = options.documentationRefs || [
    'docs/architecture/command-query-rail-governance.md',
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
    'docs/architecture/components/ci-governance/component-engineering-record-component.md',
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
  for (const documentationRef of documentationRefs) {
    args.push('--documentation-ref', documentationRef);
  }

  return [...args, ...(options.extraArgs || [])];
}

const responsibilityBinding = {
  responsibilityId: 'RESP-LOCAL-DATA-READ-GENERATION',
  componentId: 'SYS-API-INFRASTRUCTURE',
  path: 'apps/api/src/infrastructure/duckdb/DuckDbGenerationStore.ts',
  symbol: 'DuckDbGenerationStore.readGeneration',
  role: 'implements',
  testPaths: ['apps/api/test/infrastructure/DuckDbGenerationStore.test.ts'],
};

function planResponsibilityRecord(command, existingRail = null) {
  return planFeatureMechanizationRailRecordOperation({
    command,
    existingRail,
    operationId: 'responsibility-binding-record',
    now: new Date('2026-10-23T00:00:00.000Z'),
  });
}

test('responsibility binding CLI distinguishes omission, replacement and explicit removal', () => {
  const omitted = parseArgs(featureMechanizationRecordArgs());
  assert.equal(Object.hasOwn(omitted, 'responsibilityBindings'), false);
  for (const bindings of [[], [responsibilityBinding]]) {
    const command = parseArgs(
      featureMechanizationRecordArgs({
        extraArgs: ['--responsibility-bindings', JSON.stringify(bindings)],
      })
    );
    assert.deepEqual(command.responsibilityBindings, bindings);
    const planned = planResponsibilityRecord(command);
    assert.deepEqual(planned.rail.rawManifest.responsibilityBindings, bindings);
    assert.deepEqual(planned.audit.payload.responsibilityBindings, bindings);
  }
});

test('responsibility binding CLI rejects malformed JSON and invalid typed bindings', () => {
  const invalidValues = [
    '{',
    'null',
    '{}',
    '[null]',
    JSON.stringify([{ ...responsibilityBinding, role: 'owns' }]),
    JSON.stringify([{ ...responsibilityBinding, testPaths: [] }]),
    JSON.stringify([{ ...responsibilityBinding, path: '../outside.ts' }]),
    JSON.stringify([{ ...responsibilityBinding, unknown: true }]),
    JSON.stringify([responsibilityBinding, { ...responsibilityBinding, role: 'delegates' }]),
  ];
  for (const value of invalidValues) {
    assert.throws(
      () =>
        parseArgs(
          featureMechanizationRecordArgs({ extraArgs: ['--responsibility-bindings', value] })
        ),
      /responsibility/i,
      value
    );
  }
});

test('responsibility binding planner validates programmatic inputs before planning a write', () => {
  const base = parseArgs(featureMechanizationRecordArgs());
  for (const responsibilityBindings of [null, {}, [{ ...responsibilityBinding, symbol: '' }]]) {
    assert.throws(
      () => planResponsibilityRecord({ ...base, responsibilityBindings }),
      /responsibility/i
    );
  }
});

test('responsibility replacement replaces one rail set while preserving unrelated manifest fields', () => {
  const originalCommand = parseArgs(featureMechanizationRecordArgs());
  const existingRail = planResponsibilityRecord(originalCommand).rail;
  existingRail.rawManifest.responsibilityBindings = [responsibilityBinding];
  existingRail.rawManifest.retainedEvidence = { note: 'independent metadata' };
  const replacement = { ...responsibilityBinding, symbol: 'DuckDbGenerationStore.readCapture' };
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: [
        '--responsibility-bindings',
        JSON.stringify([replacement]),
        '--expected-revision',
        '0',
      ],
    })
  );
  const planned = planResponsibilityRecord(command, existingRail);
  assert.deepEqual(planned.rail.rawManifest.responsibilityBindings, [replacement]);
  assert.deepEqual(planned.rail.rawManifest.retainedEvidence, { note: 'independent metadata' });
  assert.deepEqual(existingRail.rawManifest.responsibilityBindings, [responsibilityBinding]);
  assert.equal(planned.audit.previousRevision, 0);
  assert.equal(planned.audit.resultingRevision, 1);
});

test('omitted responsibility bindings preserve the current set without changing legacy audit payloads', () => {
  const command = parseArgs(featureMechanizationRecordArgs());
  const existingRail = planResponsibilityRecord(command).rail;
  existingRail.rawManifest.responsibilityBindings = [responsibilityBinding];
  const planned = planResponsibilityRecord(command, existingRail);
  assert.deepEqual(planned.rail.rawManifest.responsibilityBindings, [responsibilityBinding]);
  assert.equal(Object.hasOwn(planned.audit.payload, 'responsibilityBindings'), false);
});

test('explicit empty responsibility bindings clear inherited associations', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--responsibility-bindings', '[]', '--expected-revision', '2'],
    })
  );
  const existingRail = {
    railId: command.railId,
    revision: 2,
    rawManifest: { responsibilityBindings: [responsibilityBinding] },
  };
  const planned = planResponsibilityRecord(command, existingRail);
  assert.deepEqual(planned.rail.rawManifest.responsibilityBindings, []);
  assert.deepEqual(planned.audit.payload.responsibilityBindings, []);
});

test('responsibility replacement and removal require an explicit current rail revision', () => {
  for (const bindings of [[], [responsibilityBinding]]) {
    const command = parseArgs(
      featureMechanizationRecordArgs({
        extraArgs: ['--responsibility-bindings', JSON.stringify(bindings)],
      })
    );
    for (const revision of [0, 4, null]) {
      assert.throws(
        () => planResponsibilityRecord(command, { railId: command.railId, revision }),
        /responsibility-bindings requires --expected-revision/
      );
    }
    assert.throws(
      () =>
        planResponsibilityRecord(
          { ...command, expectedRevision: 3 },
          { railId: command.railId, revision: 4 }
        ),
      /expected revision 3, but current revision is 4/
    );
  }
});

test('forbidden binding and evidence paths fail instead of being silently pruned', () => {
  for (const path of [responsibilityBinding.path, responsibilityBinding.testPaths[0]]) {
    const command = parseArgs(
      featureMechanizationRecordArgs({ extraArgs: ['--forbidden-surface', path] })
    );
    assert.throws(
      () =>
        planResponsibilityRecord({ ...command, responsibilityBindings: [responsibilityBinding] }),
      /responsibility.*forbidden/i
    );
    assert.throws(
      () =>
        planResponsibilityRecord(command, {
          railId: command.railId,
          revision: 0,
          rawManifest: { responsibilityBindings: [responsibilityBinding] },
        }),
      /responsibility.*forbidden/i
    );
  }
});

test('retained forbidden surfaces also reject a responsibility binding replacement', () => {
  const command = parseArgs(featureMechanizationRecordArgs());
  assert.throws(
    () =>
      planResponsibilityRecord(
        { ...command, expectedRevision: 0, responsibilityBindings: [responsibilityBinding] },
        {
          railId: command.railId,
          revision: 0,
          rawManifest: { forbiddenImplementationSurfaces: ['apps/api/src/infrastructure/**'] },
        }
      ),
    /responsibility.*forbidden/i
  );
});

test('terminal rails reject explicit and retained bindings but permit an explicit clear', () => {
  for (const railStatus of ['retired', 'deprecated']) {
    const command = parseArgs(
      featureMechanizationRecordArgs({
        implementationRefs: [],
        extraArgs: ['--mechanization-status', 'closed', '--rail-status', railStatus],
      })
    );
    const existingRail = {
      railId: command.railId,
      revision: 0,
      rawManifest: { responsibilityBindings: [responsibilityBinding] },
    };
    assert.throws(
      () =>
        planResponsibilityRecord({ ...command, responsibilityBindings: [responsibilityBinding] }),
      /responsibility.*retired|responsibility.*deprecated/i
    );
    assert.throws(
      () => planResponsibilityRecord(command, existingRail),
      /responsibility.*retired|responsibility.*deprecated/i
    );
    const planned = planResponsibilityRecord(
      { ...command, expectedRevision: 0, responsibilityBindings: [] },
      existingRail
    );
    assert.deepEqual(planned.rail.rawManifest.responsibilityBindings, []);
  }
});

test('responsibility bindings participate in idempotence while omission preserves legacy replay', () => {
  const omitted = parseArgs(featureMechanizationRecordArgs());
  const cleared = parseArgs(
    featureMechanizationRecordArgs({ extraArgs: ['--responsibility-bindings', '[]'] })
  );
  const declared = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--responsibility-bindings', JSON.stringify([responsibilityBinding])],
    })
  );
  assert.notEqual(omitted.idempotencyKey, cleared.idempotencyKey);
  assert.notEqual(cleared.idempotencyKey, declared.idempotencyKey);
  const planned = planResponsibilityRecord(declared);
  const operation = {
    operation_type: declared.kind,
    actor: declared.actor,
    rail_id: declared.railId,
    expected_revision: declared.expectedRevision,
    source_content_sha256: declared.sourceContentSha256,
    payload: planned.audit.payload,
  };
  assert.doesNotThrow(() =>
    assertFeatureMechanizationRailIdempotentReplayMatches(operation, declared)
  );
  for (const changed of [cleared, omitted]) {
    assert.throws(
      () => assertFeatureMechanizationRailIdempotentReplayMatches(operation, changed),
      /FEATURE-MECHANIZATION-IDEMPOTENCY-MISMATCH/
    );
  }
});

test('rail retirement requires an explicit revisioned binding clear before deleting authority', () => {
  const command = parseArgs([
    'feature-mechanization',
    'retire',
    '--design',
    'GH-3699-ATOMIC-SOURCE-RESPONSIBILITIES',
    '--feature',
    'FM-DB-FIRST-WRITER',
    '--rail',
    'RecordFeatureMechanizationRail',
    '--type',
    'command',
    '--expected-revision',
    '0',
    '--reason',
    'Retire the reconciled rail',
    '--source-ref',
    'docs/architecture/command-query-rail-governance.md',
    '--source-content-sha256',
    'f'.repeat(64),
    '--actor',
    'codex',
  ]);
  const inputs = {
    command,
    design: { designId: command.designId, status: 'review' },
    designScopes: [{ subjectKind: 'decision', subjectId: command.railId, scopeKind: 'may_delete' }],
    operationId: 'retire-responsibility-rail',
    now: new Date('2026-10-23T00:00:00.000Z'),
  };
  assert.throws(
    () =>
      planFeatureMechanizationRailRetireOperation({
        ...inputs,
        existingRail: {
          railId: command.railId,
          revision: 0,
          rawManifest: { responsibilityBindings: [responsibilityBinding] },
        },
      }),
    /responsibility.*empty/i
  );
  const retired = planFeatureMechanizationRailRetireOperation({
    ...inputs,
    existingRail: {
      railId: command.railId,
      revision: 0,
      rawManifest: { responsibilityBindings: [] },
    },
  });
  assert.equal(retired.retirement.railId, command.railId);
});

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

test('parseArgs builds an explicit referenced feature mechanization rail command', () => {
  const authorityRef =
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-operational-integrity-reconciliation-plan-20260830.md';
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--reference-only', 'true', '--authority-ref', authorityRef],
    })
  );

  assert.equal(command.referenceOnly, true);
  assert.equal(command.authorityRef, authorityRef);
});

test('named cycle reconciliation requires a revision and explicit admitted patch surfaces', () => {
  const base = ['--red-green-cycle', 'retained-cycle'];
  const revision = ['--expected-revision', '4'];
  const patch = ['--patch-surface', 'scripts/planning-db-operate.cjs'];
  for (const extraArgs of [base, [...base, ...revision], [...base, ...patch]]) {
    assert.throws(() => parseArgs(featureMechanizationRecordArgs({ extraArgs })), /requires/);
  }
  for (const surface of ['apps/web/unowned.ts', 'docs/archive/retired.ts']) {
    assert.throws(
      () =>
        parseArgs(
          featureMechanizationRecordArgs({
            extraArgs: [...base, ...revision, '--patch-surface', surface],
          })
        ),
      /outside allowed|forbidden/
    );
  }
  assert.throws(
    () =>
      parseArgs(
        featureMechanizationRecordArgs({
          extraArgs: [
            ...base,
            ...revision,
            ...patch,
            '--forbidden-surface',
            'scripts/planning-db-operate.cjs',
          ],
        })
      ),
    /forbidden/
  );
  const command = parseArgs(
    featureMechanizationRecordArgs({ extraArgs: [...base, ...revision, ...patch] })
  );
  assert.equal(command.redGreenCycle, 'retained-cycle');
  assert.equal(command.expectedRevision, 4);
});

test('named cycle reconciliation replaces only existing evidence with audited compare-and-set', () => {
  const now = new Date('2026-09-27T12:00:00.000Z');
  const originalCommand = parseArgs(featureMechanizationRecordArgs());
  const original = planFeatureMechanizationRailRecordOperation({
    command: originalCommand,
    existingRail: null,
    operationId: 'create',
    now,
  }).rail;
  const retainedCycle = original.rawManifest.redGreenCycles[0];
  const existingRail = {
    ...original,
    revision: 4,
    rawManifest: {
      ...original.rawManifest,
      redGreenCycles: [
        retainedCycle,
        { ...retainedCycle, id: 'retained-cycle', patchSurfaces: [] },
      ],
    },
  };
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: [
        '--red-green-cycle',
        'retained-cycle',
        '--expected-revision',
        '4',
        '--patch-surface',
        'scripts/planning-db-operate.cjs',
      ],
    })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail,
    operationId: 'repair',
    now,
  });
  assert.equal(planned.rail.revision, 5);
  assert.equal(planned.rail.rawManifest.redGreenCycles.length, 2);
  assert.deepEqual(planned.rail.rawManifest.redGreenCycles[0], retainedCycle);
  assert.deepEqual(planned.rail.rawManifest.redGreenCycles[1], {
    id: 'retained-cycle',
    redTest: command.redTest,
    expectedFailure: command.expectedFailure,
    patchSurfaces: command.patchSurfaces,
    greenTest: command.greenTest,
  });
  assert.equal(planned.audit.payload.redGreenCycle, 'retained-cycle');
  assert.equal(planned.audit.expectedRevision, 4);
  assert.notEqual(command.idempotencyKey, originalCommand.idempotencyKey);
  const anotherCycleCommand = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: [
        '--red-green-cycle',
        'another-cycle',
        '--expected-revision',
        '4',
        '--patch-surface',
        'scripts/planning-db-operate.cjs',
      ],
    })
  );
  assert.notEqual(command.idempotencyKey, anotherCycleCommand.idempotencyKey);
  assert.deepEqual(
    validateFeatureMechanizationManifest(planned.rail.rawManifest, planned.rail.sourcePath).errors,
    []
  );
  assert.throws(
    () =>
      planFeatureMechanizationRailRecordOperation({
        command: { ...command, redGreenCycle: 'unknown' },
        existingRail,
        operationId: 'wrong-cycle',
        now,
      }),
    /cycle.*not found/
  );
  assert.throws(
    () =>
      planFeatureMechanizationRailRecordOperation({
        command,
        existingRail: {
          ...existingRail,
          rawManifest: {
            ...existingRail.rawManifest,
            redGreenCycles: [
              existingRail.rawManifest.redGreenCycles[1],
              existingRail.rawManifest.redGreenCycles[1],
            ],
          },
        },
        operationId: 'ambiguous',
        now,
      }),
    /not found uniquely/
  );
  assert.throws(
    () =>
      planFeatureMechanizationRailRecordOperation({
        command,
        existingRail: { ...existingRail, revision: 5 },
        operationId: 'stale',
        now,
      }),
    /expected revision 4/
  );
  assert.throws(
    () =>
      planFeatureMechanizationRailRecordOperation({
        command,
        existingRail: null,
        operationId: 'missing',
        now,
      }),
    /expected revision 4/
  );
});

test('parseArgs rejects incomplete or false feature mechanization rail references', () => {
  const authorityRef =
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-operational-integrity-reconciliation-plan-20260830.md';

  assert.throws(
    () =>
      parseArgs(
        featureMechanizationRecordArgs({
          extraArgs: ['--reference-only', 'true'],
        })
      ),
    /reference-only true requires --authority-ref/
  );
  assert.throws(
    () =>
      parseArgs(
        featureMechanizationRecordArgs({
          extraArgs: ['--authority-ref', authorityRef],
        })
      ),
    /--authority-ref requires --reference-only true/
  );
  assert.throws(
    () =>
      parseArgs(
        featureMechanizationRecordArgs({
          extraArgs: ['--reference-only', 'false'],
        })
      ),
    /reference-only must be true when declared/
  );
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
  assert.equal(Object.hasOwn(planned.audit.payload, 'referenceOnly'), false);
  assert.equal(Object.hasOwn(planned.audit.payload, 'authorityRef'), false);
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

test('feature mechanization rail planner preserves a reference without creating authority', () => {
  const authorityRef =
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-operational-integrity-reconciliation-plan-20260830.md';
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--reference-only', 'true', '--authority-ref', authorityRef],
    })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail: null,
    operationId: 'op-feature-mechanization-reference',
    now: new Date('2026-09-12T12:00:00.000Z'),
  });

  assert.equal(planned.rail.railStatus, 'referenced');
  assert.equal(planned.rail.rawRail.status, 'implemented');
  assert.equal(planned.rail.rawRail.referenceOnly, true);
  assert.equal(planned.rail.rawRail.authorityRef, authorityRef);
  assert.deepEqual(planned.rail.rawManifest.commandQueryRails, [planned.rail.rawRail]);
  assert.equal(planned.audit.payload.referenceOnly, true);
  assert.equal(planned.audit.payload.authorityRef, authorityRef);

  const updated = planFeatureMechanizationRailRecordOperation({
    command: parseArgs(featureMechanizationRecordArgs()),
    existingRail: planned.rail,
    operationId: 'op-feature-mechanization-reference-update',
    now: new Date('2026-09-12T12:01:00.000Z'),
  });

  assert.equal(updated.rail.railStatus, 'referenced');
  assert.equal(updated.rail.rawRail.referenceOnly, true);
  assert.equal(updated.rail.rawRail.authorityRef, authorityRef);
});

test('referenced feature rails require their exact active documentary authority', async () => {
  const authorityRef =
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-operational-integrity-reconciliation-plan-20260830.md';
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--reference-only', 'true', '--authority-ref', authorityRef],
    })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail: null,
    operationId: 'op-feature-mechanization-reference-authority',
    now: new Date('2026-09-12T12:00:00.000Z'),
  });
  let queryCount = 0;
  const client = {
    async query(sql, params) {
      queryCount += 1;
      assert.match(sql, /command_query_rails imported/);
      assert.deepEqual(params, [authorityRef, 'command', 'recordfeaturemechanizationrail']);
      return {
        rows:
          queryCount === 1
            ? [
                {
                  railId: 'documentary-authority',
                  sourcePath: authorityRef,
                  railType: 'command',
                  normalizedRailName: 'recordfeaturemechanizationrail',
                  railStatus: 'implemented',
                  implementationRefCount: 1,
                  rawRail: {},
                },
              ]
            : [],
      };
    },
  };

  await assertFeatureMechanizationReferenceAuthority(client, planned.rail);
  await assert.rejects(
    () => assertFeatureMechanizationReferenceAuthority(client, planned.rail),
    /FEATURE-MECHANIZATION-REFERENCE-AUTHORITY-NOT-FOUND/
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

for (const [label, extraArgs, expected] of [
  ['omitted', [], false],
  ['true', ['--replace-documentation-refs', 'true'], true],
  ['false', ['--replace-documentation-refs', 'false'], false],
]) {
  test(`parseArgs accepts ${label} documentation reference replacement`, () => {
    const command = parseArgs(featureMechanizationRecordArgs({ extraArgs }));
    assert.equal(command.replaceDocumentationRefs, expected);
  });
}

test('parseArgs rejects invalid documentation reference replacement values', () => {
  for (const value of ['yes', '0']) {
    assert.throws(
      () =>
        parseArgs(
          featureMechanizationRecordArgs({
            extraArgs: ['--replace-documentation-refs', value],
          })
        ),
      /Invalid --replace-documentation-refs.*Expected true or false/
    );
  }
});

test('documentation replacement rejects missing or empty documentary references', () => {
  for (const documentationRefs of [[], ['']]) {
    assert.throws(
      () =>
        parseArgs(
          featureMechanizationRecordArgs({
            documentationRefs,
            extraArgs: ['--replace-documentation-refs', 'true'],
          })
        ),
      /Missing required --documentation-ref/
    );
  }
});

test('explicit documentation replacement changes only documentary refs while default and false keep union', () => {
  const now = new Date('2026-10-19T18:00:00.000Z');
  const authorityRef = 'docs/architecture/command-query-rail-governance.md';
  const original = planFeatureMechanizationRailRecordOperation({
    command: parseArgs(
      featureMechanizationRecordArgs({
        extraArgs: ['--reference-only', 'true', '--authority-ref', authorityRef],
      })
    ),
    existingRail: null,
    operationId: 'create',
    now,
  }).rail;
  const existingRail = {
    ...original,
    revision: 4,
    documentationRefs: ['docs/retired-component.md', authorityRef],
    rawRail: { ...original.rawRail, purpose: 'Retained authority metadata' },
    rawManifest: {
      ...original.rawManifest,
      retainedEvidence: { source: 'docs/retained-evidence.md', accepted: true },
    },
  };
  const plan = (extraArgs) =>
    planFeatureMechanizationRailRecordOperation({
      command: parseArgs(
        featureMechanizationRecordArgs({
          documentationRefs: [authorityRef, 'docs/new-component.md', 'docs/new-component.md'],
          extraArgs: ['--expected-revision', '4', ...extraArgs],
        })
      ),
      existingRail,
      operationId: 'replace-docs',
      now,
    });
  const additive = plan([]);
  const explicitFalse = plan(['--replace-documentation-refs', 'false']);
  const replacement = plan(['--replace-documentation-refs', 'true']);

  assert.deepEqual(additive.rail.documentationRefs, [
    'docs/retired-component.md',
    authorityRef,
    'docs/new-component.md',
  ]);
  assert.deepEqual(explicitFalse, additive);
  assert.deepEqual(replacement.rail, {
    ...additive.rail,
    documentationRefs: [authorityRef, 'docs/new-component.md'],
  });
  assert.equal(replacement.rail.rawRail.referenceOnly, true);
  assert.equal(replacement.rail.rawRail.authorityRef, authorityRef);
  assert.deepEqual(replacement.rail.rawManifest.retainedEvidence, {
    source: 'docs/retained-evidence.md',
    accepted: true,
  });
  assert.equal(replacement.audit.previousRevision, 4);
  assert.equal(replacement.audit.resultingRevision, 5);
  assert.equal(replacement.audit.payload.replaceDocumentationRefs, true);
});

test('documentation replacement preserves legacy payload and replay identities unless explicitly true', () => {
  const additive = parseArgs(featureMechanizationRecordArgs());
  const explicitFalse = parseArgs(
    featureMechanizationRecordArgs({ extraArgs: ['--replace-documentation-refs', 'false'] })
  );
  const replacement = parseArgs(
    featureMechanizationRecordArgs({ extraArgs: ['--replace-documentation-refs', 'true'] })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command: additive,
    existingRail: null,
    operationId: 'legacy-operation',
    now: new Date('2026-10-19T18:00:00.000Z'),
  });
  const existingOperation = {
    operation_type: additive.kind,
    actor: additive.actor,
    rail_id: additive.railId,
    expected_revision: additive.expectedRevision,
    source_content_sha256: additive.sourceContentSha256,
    payload: planned.audit.payload,
  };

  assert.equal(Object.hasOwn(planned.audit.payload, 'replaceDocumentationRefs'), false);
  assert.equal(
    additive.idempotencyKey,
    'feature_mechanization_rail_record:codex:FM-DB-FIRST-WRITER:command:recordfeaturemechanizationrail:latest:1e071cf49444f335'
  );
  assert.equal(explicitFalse.idempotencyKey, additive.idempotencyKey);
  assert.notEqual(replacement.idempotencyKey, additive.idempotencyKey);
  assert.doesNotThrow(() =>
    assertFeatureMechanizationRailIdempotentReplayMatches(existingOperation, additive)
  );
  assert.doesNotThrow(() =>
    assertFeatureMechanizationRailIdempotentReplayMatches(existingOperation, explicitFalse)
  );
  assert.throws(
    () =>
      assertFeatureMechanizationRailIdempotentReplayMatches(existingOperation, {
        ...replacement,
        idempotencyKey: additive.idempotencyKey,
      }),
    /FEATURE-MECHANIZATION-IDEMPOTENCY-MISMATCH/
  );
});

test('documentation replacement requires an explicit revision for an existing rail', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({ extraArgs: ['--replace-documentation-refs', 'true'] })
  );
  for (const revision of [0, 4, null]) {
    assert.throws(
      () =>
        planFeatureMechanizationRailRecordOperation({
          command,
          existingRail: { railId: command.railId, revision },
          operationId: 'missing-revision',
          now: new Date('2026-10-19T18:00:00.000Z'),
        }),
      /--replace-documentation-refs requires --expected-revision for an existing rail/
    );
  }
});

test('documentation replacement rejects a stale explicit revision', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({
      extraArgs: ['--replace-documentation-refs', 'true', '--expected-revision', '3'],
    })
  );
  assert.throws(
    () =>
      planFeatureMechanizationRailRecordOperation({
        command,
        existingRail: { railId: command.railId, revision: 4 },
        operationId: 'stale-revision',
        now: new Date('2026-10-19T18:00:00.000Z'),
      }),
    /expected revision 3, but current revision is 4/
  );
});

test('documentation replacement permits a new rail without an existing revision', () => {
  const command = parseArgs(
    featureMechanizationRecordArgs({ extraArgs: ['--replace-documentation-refs', 'true'] })
  );
  const planned = planFeatureMechanizationRailRecordOperation({
    command,
    existingRail: null,
    operationId: 'create-with-explicit-docs',
    now: new Date('2026-10-19T18:00:00.000Z'),
  });

  assert.equal(planned.rail.revision, 0);
  assert.deepEqual(planned.rail.documentationRefs, command.documentationRefs);
  assert.equal(planned.audit.payload.replaceDocumentationRefs, true);
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
      extraArgs: ['--responsibility-bindings', JSON.stringify([responsibilityBinding])],
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
  const railWrite = queries.find((query) =>
    query.sql.includes('feature_mechanization_local_rails')
  );
  const auditWrite = queries.find((query) =>
    query.sql.includes('feature_mechanization_local_operations')
  );
  assert.deepEqual(JSON.parse(railWrite.params[18]).responsibilityBindings, [
    responsibilityBinding,
  ]);
  assert.deepEqual(JSON.parse(auditWrite.params[10]).responsibilityBindings, [
    responsibilityBinding,
  ]);
  assert.equal(
    queries.some((query) =>
      /insert into planning_query_store\.command_query_rails/.test(query.sql)
    ),
    false
  );
});
