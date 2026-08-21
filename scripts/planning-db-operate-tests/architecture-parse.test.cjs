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
    '--scope',
    'command:SaveWorkspaceFileContent:must_prove:required',
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
    {
      subjectKind: 'command',
      subjectId: 'SaveWorkspaceFileContent',
      scopeKind: 'must_prove',
      required: true,
    },
  ]);
});

test('parseArgs builds an audited architecture design transition command', () => {
  const command = parseArgs([
    'architecture-design',
    'transition',
    '--design',
    'R1-1D-API-GOVERNANCE-LIFECYCLE-CLOSEOUT-20260810',
    '--from-status',
    'review',
    '--to-status',
    'approved',
    '--reason',
    'The governed implementation and validation evidence are complete.',
    '--source-ref',
    'docs/architecture/components/api/index.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
    '--idempotency-key',
    'approve-r1-1d-api-governance-closeout',
  ]);

  assert.equal(command.kind, 'architecture_design_transition');
  assert.equal(command.designId, 'R1-1D-API-GOVERNANCE-LIFECYCLE-CLOSEOUT-20260810');
  assert.equal(command.fromStatus, 'review');
  assert.equal(command.toStatus, 'approved');
  assert.equal(command.sourceContentSha256, 'e'.repeat(64));
});

test('parseArgs rejects skipped and terminal architecture design transitions', () => {
  const transitionArgs = (fromStatus, toStatus) => [
    'architecture-design',
    'transition',
    '--design',
    'R1-1D-API-GOVERNANCE-LIFECYCLE-CLOSEOUT-20260810',
    '--from-status',
    fromStatus,
    '--to-status',
    toStatus,
    '--reason',
    'Exercise the explicit architecture design lifecycle.',
    '--source-ref',
    'docs/architecture/components/api/index.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ];

  assert.throws(
    () => parseArgs(transitionArgs('review', 'implemented')),
    /ARCH-DESIGN-TRANSITION-INVALID/
  );
  assert.throws(
    () => parseArgs(transitionArgs('superseded', 'review')),
    /ARCH-DESIGN-TRANSITION-INVALID/
  );
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

test('parseArgs builds architecture contract and port record commands', () => {
  const contractCommand = parseArgs([
    'architecture-contract',
    'record',
    '--design',
    'PLANNING-DB-ARCHITECTURE-IO-RAILS-20260615',
    '--contract',
    'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
    '--kind',
    'type',
    '--owner-component',
    'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
    '--contract-ref',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts#GraphNodeCardViewModel',
    '--compatibility',
    'internal',
    '--status',
    'implemented',
    '--validation-command',
    'pnpm --filter @dvt/web test -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(contractCommand.kind, 'architecture_contract_record');
  assert.equal(contractCommand.contractKind, 'type');
  assert.equal(contractCommand.ownerComponentId, 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL');
  assert.equal(contractCommand.compatibility, 'internal');

  const portCommand = parseArgs([
    'architecture-port',
    'record',
    '--design',
    'PLANNING-DB-ARCHITECTURE-IO-RAILS-20260615',
    '--port',
    'PORT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL-QUERY',
    '--component',
    'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
    '--name',
    'RenderGraphNodeCard',
    '--kind',
    'query',
    '--direction',
    'inbound',
    '--output-contract',
    'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
    '--negative-test',
    'graphNodeCardReadModel.architecture.test.ts rejects React component imports',
    '--negative-test',
    'graphNodeCardReadModel.test.ts covers missing node labels',
    '--status',
    'implemented',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(portCommand.kind, 'architecture_port_record');
  assert.equal(portCommand.portKind, 'query');
  assert.equal(portCommand.direction, 'inbound');
  assert.equal(portCommand.outputContractId, 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL');
  assert.equal(portCommand.negativeTests.length, 2);
});

test('parseArgs builds an architecture storage I/O record command', () => {
  const command = parseArgs([
    'architecture-storage-io',
    'record',
    '--design',
    'DOC1-6-STORAGE-IO-RETIREMENT-20260810',
    '--storage-io',
    'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE-WRITE-1',
    '--component',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE',
    '--expected-storage-object',
    'docs/planning/status/generated-db-surface-inventory.md',
    '--storage-object',
    '.generated-docs/planning/status/db-surface-inventory.md',
    '--direction',
    'writes',
    '--access-pattern',
    'projection',
    '--contract',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE-SURFACE',
    '--source-ref',
    'github:pull/2294#discussion_r3750870115',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'architecture_storage_io_record');
  assert.equal(
    command.storageIoId,
    'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE-WRITE-1'
  );
  assert.equal(
    command.expectedStorageObject,
    'docs/planning/status/generated-db-surface-inventory.md'
  );
  assert.equal(command.storageObject, '.generated-docs/planning/status/db-surface-inventory.md');
  assert.equal(command.direction, 'writes');
  assert.equal(command.accessPattern, 'projection');
});

test('parseArgs rejects invalid architecture storage I/O vocabulary', () => {
  const baseArgs = [
    'architecture-storage-io',
    'record',
    '--design',
    'DOC1-6-STORAGE-IO-RETIREMENT-20260810',
    '--storage-io',
    'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE-WRITE-1',
    '--component',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE',
    '--expected-storage-object',
    'docs/planning/status/generated-db-surface-inventory.md',
    '--storage-object',
    '.generated-docs/planning/status/db-surface-inventory.md',
    '--direction',
    'writes',
    '--access-pattern',
    'projection',
    '--source-ref',
    'github:pull/2294#discussion_r3750870115',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ];
  const replaceOption = (name, value) => {
    const args = [...baseArgs];
    args[args.indexOf(name) + 1] = value;
    return args;
  };

  assert.throws(
    () => parseArgs(replaceOption('--storage-io', 'PORT-NOT-STORAGE')),
    /ARCH-STORAGE-IO-ID-INVALID/
  );
  assert.throws(
    () => parseArgs(replaceOption('--direction', 'publishes')),
    /ARCH-STORAGE-IO-DIRECTION-INVALID/
  );
  assert.throws(
    () => parseArgs(replaceOption('--access-pattern', 'append_only')),
    /ARCH-STORAGE-IO-ACCESS-PATTERN-INVALID/
  );
});

test('parseArgs rejects architecture ports without contract or negative tests', () => {
  const basePortArgs = [
    'architecture-port',
    'record',
    '--design',
    'PLANNING-DB-ARCHITECTURE-IO-RAILS-20260615',
    '--port',
    'PORT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL-QUERY',
    '--component',
    'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
    '--name',
    'RenderGraphNodeCard',
    '--kind',
    'query',
    '--direction',
    'inbound',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ];

  assert.throws(() => parseArgs(basePortArgs), /ARCH-PORT-CONTRACT-MISSING/);
  assert.throws(
    () =>
      parseArgs([
        ...basePortArgs,
        '--output-contract',
        'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
      ]),
    /ARCH-PORT-NEGATIVE-TESTS-MISSING/
  );
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

test('parseArgs builds scoped retirement commands for stale architecture evidence', () => {
  const shared = [
    '--design',
    'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-V5-20260811',
    '--reason',
    'Independent QA proved the current authority points to a retired source.',
    '--source-ref',
    'scripts/planning-db-operate.cjs',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ];
  const testCommand = parseArgs([
    'architecture-evidence',
    'retire-test',
    '--test',
    'TEST-SYS-API-TESTS-INFRASTRUCTURE-3',
    '--component',
    'SYS-API-TESTS-INFRASTRUCTURE',
    ...shared,
  ]);
  const executionCommand = parseArgs([
    'architecture-evidence',
    'retire-execution',
    '--evidence',
    'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL',
    ...shared,
  ]);

  assert.equal(testCommand.kind, 'architecture_test_retire');
  assert.equal(testCommand.testId, 'TEST-SYS-API-TESTS-INFRASTRUCTURE-3');
  assert.equal(testCommand.componentId, 'SYS-API-TESTS-INFRASTRUCTURE');
  assert.equal(executionCommand.kind, 'architecture_evidence_retire');
  assert.equal(executionCommand.evidenceId, 'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL');
  assert.match(executionCommand.reason, /Independent QA/);

  const secondTestCommand = parseArgs([
    'architecture-evidence',
    'retire-test',
    '--test',
    'TEST-SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION-11',
    '--component',
    'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION',
    ...shared,
  ]);
  const firstAdmissionTestCommand = parseArgs([
    'architecture-evidence',
    'retire-test',
    '--test',
    'TEST-SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION-10',
    '--component',
    'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION',
    ...shared,
  ]);
  assert.notEqual(firstAdmissionTestCommand.idempotencyKey, secondTestCommand.idempotencyKey);
});

test('parseArgs builds a scoped architecture responsibility retirement command', () => {
  const command = parseArgs([
    'architecture-component',
    'retire-responsibility',
    '--design',
    'API-H2-5-ARCHITECTURE-RESPONSIBILITY-RETIREMENT-20260814',
    '--component',
    'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES',
    '--responsibility',
    'RESP-DBT-RUN-CONTEXT-FILE-ADAPTER',
    '--reason',
    'The artifact-backed writer replaced the file-only responsibility.',
    '--source-ref',
    'scripts/planning-db-operate.cjs',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'architecture_component_responsibility_retire');
  assert.equal(command.componentId, 'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES');
  assert.equal(command.responsibilityId, 'RESP-DBT-RUN-CONTEXT-FILE-ADAPTER');
  assert.match(command.reason, /artifact-backed/);
});

test('parseArgs builds an audited feature rail retirement command', () => {
  const command = parseArgs([
    'feature-mechanization',
    'retire',
    '--design',
    'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-V5-20260811',
    '--feature',
    'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE',
    '--rail',
    'ImportPlanningGovernanceQueryStore',
    '--type',
    'command',
    '--expected-revision',
    '1',
    '--reason',
    'ADR-0063 owns the same intent under ImportPlanningGovernanceQueryStore.',
    '--source-ref',
    'scripts/planning-db-import.cjs',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'feature_mechanization_rail_retire');
  assert.equal(
    command.railId,
    'local#API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE#command#importplanninggovernancequerystore'
  );
  assert.equal(command.expectedRevision, 1);
});

test('parseArgs builds an architecture observability evidence record command', () => {
  const command = parseArgs([
    'architecture-evidence',
    'record-observability',
    '--design',
    'DB-FIRST-ARCHITECTURE-COMPONENT-GRAPH-COMMAND-20260515',
    '--observability',
    'OBS-API-OPS-ROUTES-HEALTH-LOG',
    '--component',
    'SYS-API-OPS-ROUTES',
    '--signal-name',
    'GET /health request log',
    '--signal-kind',
    'log',
    '--status',
    'implemented',
    '--required',
    'true',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'architecture_observability_record');
  assert.equal(command.observabilityId, 'OBS-API-OPS-ROUTES-HEALTH-LOG');
  assert.equal(command.componentId, 'SYS-API-OPS-ROUTES');
  assert.equal(command.signalKind, 'log');
  assert.equal(command.status, 'implemented');
  assert.equal(command.required, true);
});

test('parseArgs builds a fresh architecture execution evidence command', () => {
  const command = parseArgs([
    'architecture-evidence',
    'record-execution',
    '--design',
    'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-20260811',
    '--evidence',
    'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL',
    '--subject-kind',
    'test',
    '--subject',
    'TEST-API-H2-4-DOCUMENT-LIFECYCLE-DISPOSITION',
    '--evidence-kind',
    'test',
    '--origin',
    'local_execution',
    '--result',
    'pass',
    '--source-ref',
    'node --test scripts/planning-db-schema.test.cjs',
    '--source-path',
    'scripts/planning-db-schema.test.cjs',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'architecture_evidence_record');
  assert.equal(command.evidenceId, 'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL');
  assert.equal(command.subjectKind, 'test');
  assert.equal(command.evidenceOrigin, 'local_execution');
  assert.equal(command.resultState, 'pass');
  assert.equal(command.sourcePath, 'scripts/planning-db-schema.test.cjs');
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
