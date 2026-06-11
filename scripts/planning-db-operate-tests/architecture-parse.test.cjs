const test = require('node:test');
const { assert, parseArgs, validateArchitectureDesignStatus } = require('./helpers.cjs');

test('parseArgs builds an architecture design create command with scoped authority', () => {
  const command = parseArgs([
    'architecture-design',
    'create',
    '--design',
    'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
    '--work-item',
    'EA-20260429-05',
    '--title',
    'Engine public API architecture authority',
    '--owner',
    'Architecture',
    '--status',
    'review',
    '--rationale',
    'Make the engine public API design explicit before implementation.',
    '--fowler-signal',
    'published_language',
    '--rail-ref',
    'CreateArchitectureDesign',
    '--scope',
    'component:SYS-RUNTIME-ENGINE-CORE:may_update:required',
    '--scope',
    'path:packages/@dvt/engine/**:may_update:required',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
    '--idempotency-key',
    'codex-create-engine-authority',
  ]);

  assert.equal(command.kind, 'architecture_design_create');
  assert.equal(command.designId, 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT');
  assert.equal(command.status, 'review');
  assert.equal(command.sourceContentSha256, 'e'.repeat(64));
  assert.deepEqual(command.scopes, [
    {
      subjectKind: 'component',
      subjectId: 'SYS-RUNTIME-ENGINE-CORE',
      scopeKind: 'may_update',
      required: true,
    },
    {
      subjectKind: 'path',
      subjectId: 'packages/@dvt/engine/**',
      scopeKind: 'may_update',
      required: true,
    },
  ]);
});

test('parseArgs builds architecture component and relation record commands', () => {
  const componentCommand = parseArgs([
    'architecture-component',
    'record',
    '--design',
    'DB-FIRST-ARCHITECTURE-COMPONENT-GRAPH-COMMAND-20260515',
    '--component',
    'SYS-RUNTIME-ENGINE-CORE',
    '--name',
    'Runtime engine core',
    '--kind',
    'module',
    '--layer',
    'application',
    '--owner',
    'Architecture',
    '--repo-path',
    'packages/@dvt/engine/src',
    '--public-contract',
    'WorkflowEngine public API',
    '--runtime',
    'node',
    '--criticality',
    'high',
    '--status',
    'review',
    '--parent',
    'SYS-RUNTIME',
    '--responsibility',
    'RESP-ENGINE-CORE|Own engine orchestration boundary.|Workflow lifecycle changes.|WorkflowEngineApplication',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(componentCommand.kind, 'architecture_component_record');
  assert.equal(componentCommand.designId, 'DB-FIRST-ARCHITECTURE-COMPONENT-GRAPH-COMMAND-20260515');
  assert.equal(componentCommand.componentId, 'SYS-RUNTIME-ENGINE-CORE');
  assert.equal(componentCommand.parentComponentId, 'SYS-RUNTIME');
  assert.deepEqual(componentCommand.responsibilities, [
    {
      responsibilityId: 'RESP-ENGINE-CORE',
      responsibility: 'Own engine orchestration boundary.',
      reasonToChange: 'Workflow lifecycle changes.',
      dddOwner: 'WorkflowEngineApplication',
    },
  ]);

  const relationCommand = parseArgs([
    'architecture-relation',
    'record',
    '--design',
    'DB-FIRST-ARCHITECTURE-COMPONENT-GRAPH-COMMAND-20260515',
    '--relation',
    'REL-ENGINE-USES-STATE-STORE',
    '--source',
    'SYS-RUNTIME-ENGINE-CORE',
    '--target',
    'SYS-RUNTIME-STATE-STORE-PORT',
    '--type',
    'depends_on',
    '--direction',
    'outbound',
    '--sync-async',
    'sync',
    '--failure-mode',
    'Run start fails closed when state-store is unavailable.',
    '--authorization-scope',
    'repo-local architecture operation',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(relationCommand.kind, 'architecture_relation_record');
  assert.equal(relationCommand.relationId, 'REL-ENGINE-USES-STATE-STORE');
  assert.equal(relationCommand.sourceComponentId, 'SYS-RUNTIME-ENGINE-CORE');
  assert.equal(relationCommand.targetComponentId, 'SYS-RUNTIME-STATE-STORE-PORT');
});

test('parseArgs rejects relation record statuses that the relation table cannot store', () => {
  assert.throws(
    () =>
      parseArgs([
        'architecture-relation',
        'record',
        '--design',
        'DB-FIRST-ARCHITECTURE-COMPONENT-GRAPH-COMMAND-20260515',
        '--relation',
        'REL-ENGINE-USES-STATE-STORE',
        '--source',
        'SYS-RUNTIME-ENGINE-CORE',
        '--target',
        'SYS-RUNTIME-STATE-STORE-PORT',
        '--type',
        'depends_on',
        '--direction',
        'outbound',
        '--sync-async',
        'sync',
        '--failure-mode',
        'Run start fails closed when state-store is unavailable.',
        '--authorization-scope',
        'repo-local architecture operation',
        '--status',
        'review',
        '--source-ref',
        'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
        '--source-content-sha256',
        'e'.repeat(64),
        '--actor',
        'codex',
      ]),
    /ARCH-COMPONENT-TAXONOMY-INVALID/
  );
});

test('validateArchitectureDesignStatus accepts design lifecycle statuses only', () => {
  assert.equal(validateArchitectureDesignStatus('review'), 'review');
  assert.throws(
    () => validateArchitectureDesignStatus('queued'),
    /Invalid architecture design status "queued"/
  );
});

test('parseArgs accepts DB-first feature design ids', () => {
  const command = parseArgs([
    'architecture-design',
    'create',
    '--design',
    'design-21-component-architecture-fitness-dbfirst',
    '--work-item',
    '21-component-architecture-fitness-dbfirst',
    '--title',
    'Component architecture fitness DB-first',
    '--owner',
    'Architecture / Governance',
    '--rationale',
    'Persist architecture fitness design authority before implementation.',
    '--fowler-signal',
    'evolutionary_architecture',
    '--rail-ref',
    'CreateArchitectureDesign',
    '--scope',
    'query:architecture.component_fitness_query:may_create:required',
    '--source-ref',
    'agent-prompt:21-component-architecture-fitness-dbfirst',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.designId, 'design-21-component-architecture-fitness-dbfirst');

  assert.throws(
    () =>
      parseArgs([
        'architecture-design',
        'create',
        '--design',
        'design 21 component architecture fitness dbfirst',
        '--work-item',
        '21-component-architecture-fitness-dbfirst',
        '--title',
        'Component architecture fitness DB-first',
        '--owner',
        'Architecture / Governance',
        '--rationale',
        'Persist architecture fitness design authority before implementation.',
        '--rail-ref',
        'CreateArchitectureDesign',
        '--scope',
        'query:architecture.component_fitness_query:may_create:required',
        '--source-ref',
        'agent-prompt:21-component-architecture-fitness-dbfirst',
        '--source-content-sha256',
        'e'.repeat(64),
        '--actor',
        'codex',
      ]),
    /Invalid --design/
  );
});
