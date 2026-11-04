/** Owned concern: explicitly correct a legacy source classification through the existing revision command. */
const test = require('node:test');
const {
  assert,
  parseArgs,
  planComponentReviseOperation,
  assertComponentIdempotentReplayMatches,
} = require('./helpers.cjs');

const baseArgs = [
  'component',
  'revise',
  '--design',
  'COMPONENT-CLASSIFICATION-TEST',
  '--component',
  'SYS-TEST-PROJECTION',
  '--expected-revision',
  '7',
  '--owned-concern',
  'Project admitted semantics to target SQL.',
  '--source-ref',
  'https://github.com/dunay2/dvt/issues/3747',
  '--source-content-sha256',
  'a'.repeat(64),
  '--actor',
  'test',
];

function fixture(classification = true) {
  const command = parseArgs([
    ...baseArgs,
    ...(classification ? ['--component-level', 'component'] : []),
  ]);
  return {
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      { subject_kind: 'component', subject_id: command.componentId, scope_kind: 'may_update' },
    ],
    existingComponent: {
      component_id: command.componentId,
      name: 'Target projection',
      level: 'source',
      parent_id: 'SYS-TEST-ADAPTERS',
      root_unit: 'SYS-TEST',
      domain_unit: 'SYS-TEST',
      revision: 7,
      status: 'review',
      owns: ['packages/projection/**'],
      excludes: ['packages/projection/README.md'],
      owned_concern: 'Project admitted semantics to target SQL.',
      ddd_owner: 'Projection',
      cq_rails: 'PreviewPlan',
      responsibilities: ['Validate and lower target SQL.'],
      public_api: ['project'],
      non_goals: ['Execute SQL.'],
    },
    parentUnit: { unit_id: 'SYS-TEST-ADAPTERS', level: 'component' },
    latestOperation: null,
    operationId: 'classification-test',
    now: new Date('2026-11-04T00:00:00Z'),
  };
}

test('explicit classification preserves identity, ownership and semantic metadata with an audited revision', () => {
  const input = fixture();
  assert.equal(input.command.componentLevel, 'component');
  const planned = planComponentReviseOperation(input);
  assert.equal(planned.definition.level, 'component');
  assert.equal(planned.definition.componentId, input.existingComponent.component_id);
  assert.equal(planned.definition.revision, 8);
  assert.deepEqual(planned.definition.owns, input.existingComponent.owns);
  assert.deepEqual(planned.definition.excludes, input.existingComponent.excludes);
  assert.deepEqual(planned.definition.responsibilities, input.existingComponent.responsibilities);
  assert.deepEqual(planned.definition.publicApi, input.existingComponent.public_api);
  assert.equal(planned.audit.payload.componentLevel, 'component');
});

test('omitting classification preserves legacy level and payload identity', () => {
  const input = fixture(false);
  const planned = planComponentReviseOperation(input);
  assert.equal(Object.hasOwn(input.command, 'componentLevel'), false);
  assert.equal(planned.definition.level, 'source');
  assert.equal(Object.hasOwn(planned.audit.payload, 'componentLevel'), false);
});

test('classification-only revision is a supported explicit change', () => {
  const args = baseArgs.filter((_, i) => i !== 8 && i !== 9);
  const command = parseArgs([...args, '--component-level', 'component']);
  assert.equal(command.componentLevel, 'component');
});

for (const level of ['source', 'module', 'domain', 'system']) {
  test('classification rejects unsupported target level ' + level, () => {
    assert.throws(() => parseArgs([...baseArgs, '--component-level', level]), /component-level/u);
  });
}

for (const level of ['component', 'module', 'domain', 'system']) {
  test('classification rejects non-source origin ' + level, () => {
    const input = fixture();
    input.existingComponent.level = level;
    assert.throws(() => planComponentReviseOperation(input), /source/u);
  });
}

test('classification requires explicit current revision and admitted scope', () => {
  const input = fixture();
  assert.throws(
    () =>
      planComponentReviseOperation({
        ...input,
        command: { ...input.command, expectedRevision: null },
      }),
    /explicit.*revision/u
  );
  assert.throws(
    () =>
      planComponentReviseOperation({
        ...input,
        command: { ...input.command, expectedRevision: 6 },
      }),
    /expected revision/u
  );
  assert.throws(() => planComponentReviseOperation({ ...input, designScopes: [] }), /SCOPE/u);
});

for (const parent of [
  null,
  { unit_id: 'SYS-TEST-ADAPTERS', level: 'source' },
  { unit_id: 'SYS-OTHER', level: 'component' },
]) {
  test(
    'classification rejects missing, incompatible or foreign parent ' + JSON.stringify(parent),
    () => {
      assert.throws(
        () => planComponentReviseOperation({ ...fixture(), parentUnit: parent }),
        /parent/u
      );
    }
  );
}

test('classification replay is exact and cannot be replayed as an implicit legacy revision', () => {
  const input = fixture();
  const planned = planComponentReviseOperation(input);
  const stored = {
    operation_type: input.command.kind,
    actor: input.command.actor,
    component_id: input.command.componentId,
    expected_revision: 7,
    payload: { ...planned.audit.payload, resultingDefinition: planned.definition },
  };
  assert.doesNotThrow(() => assertComponentIdempotentReplayMatches(stored, input.command));
  assert.throws(
    () =>
      assertComponentIdempotentReplayMatches(stored, {
        ...input.command,
        componentLevel: undefined,
      }),
    /different/u
  );
});
