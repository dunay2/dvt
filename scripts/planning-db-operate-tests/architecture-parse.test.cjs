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

  const approvedRelationCommand = parseArgs([
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
    'approved',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(approvedRelationCommand.status, 'approved');
});

test('parseArgs accepts architecture component lifecycle statuses supported by the table', () => {
  const command = parseArgs([
    'architecture-component',
    'record',
    '--design',
    'DB-FIRST-ARCHITECTURE-COMPONENT-GRAPH-COMMAND-20260515',
    '--component',
    'SYS-WEB-DOCS',
    '--name',
    'Web local documentation',
    '--kind',
    'module',
    '--layer',
    'ui',
    '--owner',
    'Frontend',
    '--repo-path',
    'apps/web/docs',
    '--public-contract',
    'Deprecated local documentation path',
    '--status',
    'deprecated',
    '--responsibility',
    'RESP-WEB-DOCS|Retire stale web docs authority.|Filesystem path was removed.|WebDocumentationArchive',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'architecture_component_record');
  assert.equal(command.status, 'deprecated');
});

test('parseArgs builds an architecture test evidence record command', () => {
  const command = parseArgs([
    'architecture-evidence',
    'record-test',
    '--design',
    'DB-FIRST-ARCHITECTURE-COMPONENT-GRAPH-COMMAND-20260515',
    '--test',
    'TEST-WEB-CANVAS-DRAFT-SAVE-STATUS',
    '--component',
    'SYS-WEB-CANVAS-DRAFT-SAVE-STATUS',
    '--test-path',
    'apps/web/src/app/views/canvas/canvasDraftToolbarState.test.ts',
    '--test-kind',
    'unit',
    '--coverage-level',
    'behavior',
    '--required',
    'true',
    '--validation-command',
    'pnpm --filter @dvt/web test -- canvasDraftToolbarState.test.ts',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'architecture_test_record');
  assert.equal(command.testId, 'TEST-WEB-CANVAS-DRAFT-SAVE-STATUS');
  assert.equal(command.componentId, 'SYS-WEB-CANVAS-DRAFT-SAVE-STATUS');
  assert.equal(command.testKind, 'unit');
  assert.equal(command.coverageLevel, 'behavior');
  assert.equal(command.required, true);
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
