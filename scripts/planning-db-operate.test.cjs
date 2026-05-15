const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertArchitectureDesignIdempotentReplayMatches,
  assertDocsResolutionIdempotentReplayMatches,
  assertIdempotentReplayMatches,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  buildAuditRows,
  buildDocsResolutionAuditRows,
  materializeDocsResolutionCommand,
  parseArgs,
  planArchitectureDesignCreateOperation,
  planArchitectureComponentRecordOperation,
  planArchitectureRelationRecordOperation,
  planComponentCreateOperation,
  planDocsResolutionOperation,
  planTaskDefinitionOperation,
  planTaskLocalOperation,
  validateArchitectureDesignStatus,
  validateComponentStatus,
  validateTaskStatus,
} = require('./planning-db-operate.cjs');

const importedTask = {
  laneId: 'A',
  taskId: 'GOV-S3',
  sourcePath: 'docs/planning/state/agent-lane-a.yaml',
  sourceContentSha256: 'a'.repeat(64),
  status: 'in_progress',
  progressPct: 25,
  statusReason: 'Imported from lane file',
  evidenceRefs: [
    'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md',
  ],
};

test('parseArgs builds a task update command with actor, revision, and evidence', () => {
  const command = parseArgs([
    'task',
    'update',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--status',
    'review',
    '--progress',
    '80',
    '--reason',
    'DB-first local operation in review',
    '--evidence',
    'docs/evidence/ED-20260507-gov-s3-local-db.md',
    '--expected-revision',
    '2',
    '--idempotency-key',
    'codex-gov-s3-review',
  ]);

  assert.equal(command.kind, 'task_update');
  assert.equal(command.laneId, 'A');
  assert.equal(command.taskId, 'GOV-S3');
  assert.equal(command.actor, 'codex');
  assert.equal(command.status, 'review');
  assert.equal(command.progressPct, 80);
  assert.equal(command.expectedRevision, 2);
  assert.deepEqual(command.evidenceRefs, ['docs/evidence/ED-20260507-gov-s3-local-db.md']);
});

test('parseArgs rejects missing actor and invalid task status', () => {
  assert.throws(
    () => parseArgs(['task', 'claim', '--lane', 'A', '--task', 'GOV-S3']),
    /Missing required --actor/
  );

  assert.throws(
    () =>
      parseArgs([
        'task',
        'update',
        '--lane',
        'A',
        '--task',
        'GOV-S3',
        '--actor',
        'codex',
        '--status',
        'almost-done',
      ]),
    /Invalid planning task status "almost-done"/
  );
});

test('parseArgs builds task create and delete commands for DB-owned task structure', () => {
  const createCommand = parseArgs([
    'task',
    'create',
    '--lane',
    'E',
    '--task',
    'F-29-E2E',
    '--actor',
    'codex',
    '--priority',
    'P0',
    '--objective',
    'Prove the next E2E route through the planning DB command rail.',
    '--dependency',
    'F-28-C',
    '--target',
    'apps/web/cypress/e2e/canvas',
    '--complexity',
    'M',
    '--effort-points',
    '3',
    '--evidence',
    'aider/tasks/07-f-29-e2e.md',
  ]);

  assert.equal(createCommand.kind, 'task_create');
  assert.equal(createCommand.laneId, 'E');
  assert.equal(createCommand.taskId, 'F-29-E2E');
  assert.equal(createCommand.status, 'queued');
  assert.equal(createCommand.priority, 'P0');
  assert.equal(
    createCommand.objective,
    'Prove the next E2E route through the planning DB command rail.'
  );
  assert.equal(createCommand.effortPoints, 3);
  assert.deepEqual(createCommand.evidenceRefs, ['aider/tasks/07-f-29-e2e.md']);

  const deleteCommand = parseArgs([
    'task',
    'delete',
    '--lane',
    'E',
    '--task',
    'F-29-E2E',
    '--actor',
    'codex',
    '--reason',
    'Superseded by F-30.',
    '--expected-revision',
    '0',
  ]);

  assert.equal(deleteCommand.kind, 'task_delete');
  assert.equal(deleteCommand.statusReason, 'Superseded by F-30.');
  assert.equal(deleteCommand.expectedRevision, 0);
});

test('parseArgs builds docs disposition and task gap resolution commands', () => {
  const docsCommand = parseArgs([
    'docs-disposition',
    'resolve',
    '--kind',
    'unknown_task_like_id',
    '--path',
    'docs/planning/status/example.md',
    '--reference',
    'WEB-123',
    '--actor',
    'codex',
    '--resolution',
    'ignored',
    '--reason',
    'Historical reference, not an active planning task.',
  ]);

  assert.equal(docsCommand.kind, 'docs_disposition_resolve');
  assert.equal(docsCommand.resolutionScope, 'docs_disposition');
  assert.equal(docsCommand.issueKind, 'unknown_task_like_id');
  assert.equal(docsCommand.documentPath, 'docs/planning/status/example.md');
  assert.equal(docsCommand.referenceText, 'WEB-123');
  assert.equal(docsCommand.actor, 'codex');
  assert.equal(docsCommand.resolutionStatus, 'ignored');
  assert.match(docsCommand.idempotencyKey, /^docs_disposition_resolve:codex:/);

  const taskGapCommand = parseArgs([
    'task-gap',
    'resolve',
    '--kind',
    'done_or_review_without_evidence',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--reason',
    'Evidence is linked through the closeout trace.',
    '--target-lane',
    'A',
    '--target-task',
    'GOV-S3',
  ]);

  assert.equal(taskGapCommand.kind, 'task_gap_resolve');
  assert.equal(taskGapCommand.resolutionScope, 'task_gap');
  assert.equal(taskGapCommand.issueKind, 'done_or_review_without_evidence');
  assert.equal(taskGapCommand.laneId, 'A');
  assert.equal(taskGapCommand.taskId, 'GOV-S3');
  assert.equal(taskGapCommand.resolutionStatus, 'resolved');
  assert.equal(taskGapCommand.targetLaneId, 'A');
  assert.equal(taskGapCommand.targetTaskId, 'GOV-S3');
});

test('parseArgs builds a component create command with semantic metadata', () => {
  const command = parseArgs([
    'component',
    'create',
    '--component',
    'SYS-RUNTIME-ENGINE-ADMISSION',
    '--name',
    'Runtime engine admission policy',
    '--parent',
    'SYS-RUNTIME-ENGINE-CORE',
    '--status',
    'review',
    '--owned-concern',
    'Owns admission policy boundaries before runtime execution.',
    '--owns',
    'packages/@dvt/engine/src/admission/**',
    '--excludes',
    'packages/@dvt/engine/src/admission/README.md',
    '--ddd-owner',
    'AS',
    '--cq-rails',
    'CreateGovernanceComponent',
    '--responsibility',
    'Accept or reject runtime admission requests.',
    '--non-goal',
    'Persist run events.',
    '--reason-to-change',
    'Admission policy changes.',
    '--public-api',
    'CreateGovernanceComponent',
    '--invariant',
    'Every accepted admission decision has a governance rail.',
    '--transition',
    'review -> canonical after exact ownership validation passes',
    '--consumer',
    'component_engineering.component_tree_query',
    '--governance',
    'docs/planning/proposals/mandatory/governance-and-docs/create-governance-component-command-rail-design-20260514.md',
    '--fowler-signal',
    'coverage refinement',
    '--actor',
    'codex',
    '--expected-revision',
    '0',
    '--idempotency-key',
    'codex-component-create-admission',
  ]);

  assert.equal(command.kind, 'component_create');
  assert.equal(command.componentId, 'SYS-RUNTIME-ENGINE-ADMISSION');
  assert.equal(command.parentComponentId, 'SYS-RUNTIME-ENGINE-CORE');
  assert.equal(command.status, 'review');
  assert.equal(command.expectedRevision, 0);
  assert.deepEqual(command.owns, ['packages/@dvt/engine/src/admission/**']);
  assert.deepEqual(command.excludes, ['packages/@dvt/engine/src/admission/README.md']);
  assert.deepEqual(command.publicApi, ['CreateGovernanceComponent']);
  assert.deepEqual(command.invariants, [
    'Every accepted admission decision has a governance rail.',
  ]);
});

test('component create planner emits a DB definition and audit row', () => {
  const now = new Date('2026-05-14T09:00:00.000Z');
  const command = parseArgs([
    'component',
    'create',
    '--component',
    'SYS-RUNTIME-ENGINE-ADMISSION',
    '--name',
    'Runtime engine admission policy',
    '--parent',
    'SYS-RUNTIME-ENGINE-CORE',
    '--status',
    'review',
    '--owned-concern',
    'Owns admission policy boundaries before runtime execution.',
    '--owns',
    'packages/@dvt/engine/src/admission/**',
    '--ddd-owner',
    'AS',
    '--cq-rails',
    'CreateGovernanceComponent',
    '--public-api',
    'CreateGovernanceComponent',
    '--invariant',
    'Every accepted admission decision has a governance rail.',
    '--transition',
    'review -> canonical after exact ownership validation passes',
    '--consumer',
    'component_engineering.component_tree_query',
    '--governance',
    'docs/planning/proposals/mandatory/governance-and-docs/create-governance-component-command-rail-design-20260514.md',
    '--actor',
    'codex',
  ]);

  const planned = planComponentCreateOperation({
    command,
    parentUnit: {
      unit_id: 'SYS-RUNTIME-ENGINE-CORE',
      name: 'Runtime engine core',
      level: 'component',
      root_unit: 'SYS-DVT',
      domain_unit: 'SYS-RUNTIME',
      source_paths: ['docs/planning/status/system-governance-unit-index.units.yaml'],
      source_content_sha256_values: ['b'.repeat(64)],
    },
    existingComponent: null,
    operationId: 'op-component-create',
    now,
  });

  assert.equal(planned.definition.componentId, 'SYS-RUNTIME-ENGINE-ADMISSION');
  assert.equal(planned.definition.parentComponentId, 'SYS-RUNTIME-ENGINE-CORE');
  assert.equal(planned.definition.rootUnit, 'SYS-DVT');
  assert.equal(planned.definition.domainUnit, 'SYS-RUNTIME');
  assert.equal(planned.definition.revision, 0);
  assert.equal(planned.definition.createdBy, 'codex');
  assert.equal(planned.definition.rawUnit.level, 'component');
  assert.equal(planned.definition.rawUnit.ownedConcern, command.ownedConcern);
  assert.deepEqual(planned.definition.rawUnit.publicApi, ['CreateGovernanceComponent']);
  assert.equal(planned.audit.operationType, 'component_create');
  assert.equal(planned.audit.componentId, 'SYS-RUNTIME-ENGINE-ADMISSION');
});

test('component create planner rejects duplicate, missing parent, and weak semantics', () => {
  const command = parseArgs([
    'component',
    'create',
    '--component',
    'SYS-RUNTIME-ENGINE-ADMISSION',
    '--name',
    'Runtime engine admission policy',
    '--parent',
    'SYS-RUNTIME-ENGINE-CORE',
    '--status',
    'review',
    '--owned-concern',
    'Owns admission policy boundaries before runtime execution.',
    '--children-required',
    'true',
    '--ddd-owner',
    'AS',
    '--cq-rails',
    'CreateGovernanceComponent',
    '--public-api',
    'CreateGovernanceComponent',
    '--invariant',
    'Every accepted admission decision has a governance rail.',
    '--transition',
    'review -> canonical after exact ownership validation passes',
    '--consumer',
    'component_engineering.component_tree_query',
    '--actor',
    'codex',
  ]);

  assert.throws(
    () =>
      planComponentCreateOperation({
        command,
        parentUnit: null,
        existingComponent: null,
        operationId: 'op-missing-parent',
        now: new Date('2026-05-14T09:00:00.000Z'),
      }),
    /Parent governance unit SYS-RUNTIME-ENGINE-CORE was not imported/
  );

  assert.throws(
    () =>
      planComponentCreateOperation({
        command,
        parentUnit: { unit_id: 'SYS-RUNTIME-ENGINE-CORE', level: 'component' },
        existingComponent: { component_id: 'SYS-RUNTIME-ENGINE-ADMISSION' },
        operationId: 'op-duplicate',
        now: new Date('2026-05-14T09:00:00.000Z'),
      }),
    /Governance component SYS-RUNTIME-ENGINE-ADMISSION already exists/
  );

  assert.throws(
    () =>
      parseArgs([
        'component',
        'create',
        '--component',
        'SYS-RUNTIME-ENGINE-ADMISSION',
        '--name',
        'Runtime engine admission policy',
        '--parent',
        'SYS-RUNTIME-ENGINE-CORE',
        '--status',
        'canonical',
        '--owned-concern',
        'Owns admission policy boundaries before runtime execution.',
        '--children-required',
        'true',
        '--ddd-owner',
        'AS',
        '--cq-rails',
        'none',
        '--actor',
        'codex',
      ]),
    /cq-rails "none" requires a rationale/
  );
});

test('validateComponentStatus accepts governance unit statuses only', () => {
  assert.equal(validateComponentStatus('coverage-required'), 'coverage-required');
  assert.throws(
    () => validateComponentStatus('in_progress'),
    /Invalid governance component status "in_progress"/
  );
});

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

test('planArchitectureDesignCreateOperation emits design scope and audit rows', () => {
  const now = new Date('2026-05-15T10:00:00.000Z');
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
    '--rationale',
    'Make the engine public API design explicit before implementation.',
    '--fowler-signal',
    'published_language',
    '--rail-ref',
    'CreateArchitectureDesign',
    '--scope',
    'component:SYS-RUNTIME-ENGINE-CORE:may_update:required',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  const planned = planArchitectureDesignCreateOperation({
    command,
    existingDesign: null,
    operationId: 'op-architecture-design-create',
    now,
  });

  assert.equal(planned.design.designId, 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT');
  assert.equal(planned.design.status, 'proposed');
  assert.equal(planned.design.approvedAt, null);
  assert.equal(planned.scopes.length, 1);
  assert.equal(planned.scopes[0].subjectKind, 'component');
  assert.equal(planned.audit.operationType, 'architecture_design_create');
  assert.equal(planned.audit.designId, 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT');
  assert.equal(planned.audit.sourceContentSha256, 'e'.repeat(64));
  assert.deepEqual(planned.audit.payload.scopes, command.scopes);
});

test('architecture component record planner emits component, responsibility, and audit rows', () => {
  const now = new Date('2026-05-15T12:00:00.000Z');
  const command = parseArgs([
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
    '--responsibility',
    'RESP-ENGINE-CORE|Own engine orchestration boundary.|Workflow lifecycle changes.|WorkflowEngineApplication',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  const planned = planArchitectureComponentRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'component',
        subject_id: 'SYS-RUNTIME-ENGINE-CORE',
        scope_kind: 'may_create',
      },
    ],
    existingComponent: null,
    parentComponent: null,
    operationId: 'op-architecture-component-record',
    now,
  });

  assert.equal(planned.component.componentId, 'SYS-RUNTIME-ENGINE-CORE');
  assert.equal(planned.component.status, 'review');
  assert.equal(planned.responsibilities.length, 1);
  assert.equal(planned.responsibilities[0].responsibilityId, 'RESP-ENGINE-CORE');
  assert.equal(planned.audit.operationType, 'architecture_component_record');
  assert.equal(planned.audit.designId, command.designId);
  assert.equal(planned.audit.sourceContentSha256, 'e'.repeat(64));
});

test('architecture relation record planner requires design scope and existing endpoints', () => {
  const now = new Date('2026-05-15T12:00:00.000Z');
  const command = parseArgs([
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

  assert.throws(
    () =>
      planArchitectureRelationRecordOperation({
        command,
        design: { design_id: command.designId, status: 'review' },
        designScopes: [
          {
            subject_kind: 'relation',
            subject_id: 'REL-ENGINE-USES-STATE-STORE',
            scope_kind: 'may_create',
          },
          {
            subject_kind: 'component',
            subject_id: 'SYS-RUNTIME-ENGINE-CORE',
            scope_kind: 'may_reference',
          },
          {
            subject_kind: 'component',
            subject_id: 'SYS-RUNTIME-STATE-STORE-PORT',
            scope_kind: 'may_reference',
          },
        ],
        sourceComponent: { component_id: 'SYS-RUNTIME-ENGINE-CORE' },
        targetComponent: null,
        existingRelation: null,
        operationId: 'op-architecture-relation-record',
        now,
      }),
    /ARCH-RELATION-ENDPOINT-MISSING/
  );

  const planned = planArchitectureRelationRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'relation',
        subject_id: 'REL-ENGINE-USES-STATE-STORE',
        scope_kind: 'may_create',
      },
      {
        subject_kind: 'component',
        subject_id: 'SYS-RUNTIME-ENGINE-CORE',
        scope_kind: 'may_reference',
      },
      {
        subject_kind: 'component',
        subject_id: 'SYS-RUNTIME-STATE-STORE-PORT',
        scope_kind: 'may_reference',
      },
    ],
    sourceComponent: { component_id: 'SYS-RUNTIME-ENGINE-CORE' },
    targetComponent: { component_id: 'SYS-RUNTIME-STATE-STORE-PORT' },
    existingRelation: null,
    operationId: 'op-architecture-relation-record',
    now,
  });

  assert.equal(planned.relation.relationId, 'REL-ENGINE-USES-STATE-STORE');
  assert.equal(planned.relation.relationType, 'depends_on');
  assert.equal(planned.audit.operationType, 'architecture_relation_record');
});

test('architecture scoped operation idempotency rejects stale source-hash replays', () => {
  const command = parseArgs([
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
    '--responsibility',
    'RESP-ENGINE-CORE|Own engine orchestration boundary.|Workflow lifecycle changes.|WorkflowEngineApplication',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
    '--idempotency-key',
    'record-component',
  ]);

  assert.throws(
    () =>
      assertArchitectureScopedOperationIdempotentReplayMatches(
        {
          operation_type: 'architecture_component_record',
          actor: 'codex',
          design_id: command.designId,
          source_ref:
            'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
          source_content_sha256: 'f'.repeat(64),
          payload: { ...command, idempotencyKey: undefined },
        },
        command
      ),
    /ARCH-OPERATION-IDEMPOTENCY-MISMATCH/
  );
});

test('architecture design create rejects duplicates, weak scope, and approval bypass', () => {
  assert.throws(
    () =>
      parseArgs([
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
        'approved',
        '--rationale',
        'Invalid direct approval.',
        '--rail-ref',
        'CreateArchitectureDesign',
        '--scope',
        'component:SYS-RUNTIME-ENGINE-CORE:may_update:required',
        '--source-ref',
        'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
        '--source-content-sha256',
        'e'.repeat(64),
        '--actor',
        'codex',
      ]),
    /CreateArchitectureDesign starts in proposed or review/
  );

  assert.throws(
    () =>
      parseArgs([
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
        '--rationale',
        'Missing scope.',
        '--rail-ref',
        'CreateArchitectureDesign',
        '--source-ref',
        'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
        '--source-content-sha256',
        'e'.repeat(64),
        '--actor',
        'codex',
      ]),
    /CreateArchitectureDesign requires at least one --scope/
  );

  assert.throws(
    () =>
      parseArgs([
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
        '--rationale',
        'Implicit rail authority.',
        '--rail-ref',
        'none',
        '--scope',
        'component:SYS-RUNTIME-ENGINE-CORE:may_update:required',
        '--source-ref',
        'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
        '--source-content-sha256',
        'e'.repeat(64),
        '--actor',
        'codex',
      ]),
    /requires an explicit governing command or query rail reference/
  );

  assert.throws(
    () =>
      planArchitectureDesignCreateOperation({
        command: parseArgs([
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
          '--rationale',
          'Make the engine public API design explicit before implementation.',
          '--rail-ref',
          'CreateArchitectureDesign',
          '--scope',
          'component:SYS-RUNTIME-ENGINE-CORE:may_update:required',
          '--source-ref',
          'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
          '--source-content-sha256',
          'e'.repeat(64),
          '--actor',
          'codex',
        ]),
        existingDesign: { design_id: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT' },
        operationId: 'op-duplicate-design',
        now: new Date('2026-05-15T10:00:00.000Z'),
      }),
    /Architecture design ENGINE-ARCHITECTURE-AUTHORITY-PILOT already exists/
  );
});

test('architecture design idempotency rejects stale source-hash replays', () => {
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
    '--rationale',
    'Make the engine public API design explicit before implementation.',
    '--rail-ref',
    'CreateArchitectureDesign',
    '--scope',
    'component:SYS-RUNTIME-ENGINE-CORE:may_update:required',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
    '--idempotency-key',
    'create-design',
  ]);

  assert.throws(
    () =>
      assertArchitectureDesignIdempotentReplayMatches(
        {
          operation_type: 'architecture_design_create',
          actor: 'codex',
          design_id: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
          source_ref:
            'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
          source_content_sha256: 'f'.repeat(64),
          payload: {
            designId: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
            workItemId: 'EA-20260429-05',
            title: 'Engine public API architecture authority',
            owner: 'Architecture',
            status: 'proposed',
            rationale: 'Make the engine public API design explicit before implementation.',
            fowlerSignal: 'none',
            railRef: 'CreateArchitectureDesign',
            scopes: command.scopes,
          },
        },
        command
      ),
    /already completed for source hash/
  );
});

test('validateArchitectureDesignStatus accepts design lifecycle statuses only', () => {
  assert.equal(validateArchitectureDesignStatus('review'), 'review');
  assert.throws(
    () => validateArchitectureDesignStatus('queued'),
    /Invalid architecture design status "queued"/
  );
});

test('materializeDocsResolutionCommand derives source-aware default idempotency keys', () => {
  const command = parseArgs([
    'docs-disposition',
    'resolve',
    '--kind',
    'unknown_task_like_id',
    '--path',
    'docs/planning/status/example.md',
    '--reference',
    'WEB-123',
    '--actor',
    'codex',
    '--resolution',
    'ignored',
    '--reason',
    'Historical reference, not an active planning task.',
  ]);

  const first = materializeDocsResolutionCommand(command, {
    action_kind: 'unknown_task_like_id',
    document_path: 'docs/planning/status/example.md',
    reference_text: 'WEB-123',
    source_content_sha256: 'c'.repeat(64),
  });
  const second = materializeDocsResolutionCommand(command, {
    action_kind: 'unknown_task_like_id',
    document_path: 'docs/planning/status/example.md',
    reference_text: 'WEB-123',
    source_content_sha256: 'd'.repeat(64),
  });

  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.sourceContentSha256, 'c'.repeat(64));
  assert.equal(second.sourceContentSha256, 'd'.repeat(64));
});

test('assertDocsResolutionIdempotentReplayMatches rejects stale source-hash replays', () => {
  assert.throws(
    () =>
      assertDocsResolutionIdempotentReplayMatches(
        {
          operation_type: 'docs_disposition_resolve',
          actor: 'codex',
          resolution_scope: 'docs_disposition',
          issue_kind: 'unknown_task_like_id',
          document_path: 'docs/planning/status/example.md',
          reference_text: 'WEB-123',
          lane_id: null,
          task_id: null,
          resolution_status: 'ignored',
          source_content_sha256: 'c'.repeat(64),
          payload: {
            resolutionScope: 'docs_disposition',
            issueKind: 'unknown_task_like_id',
            documentPath: 'docs/planning/status/example.md',
            referenceText: 'WEB-123',
            laneId: null,
            taskId: null,
            resolutionStatus: 'ignored',
            reason: 'Historical reference, not an active planning task.',
            targetLaneId: null,
            targetTaskId: null,
          },
        },
        {
          kind: 'docs_disposition_resolve',
          actor: 'codex',
          resolutionScope: 'docs_disposition',
          issueKind: 'unknown_task_like_id',
          documentPath: 'docs/planning/status/example.md',
          referenceText: 'WEB-123',
          laneId: null,
          taskId: null,
          resolutionStatus: 'ignored',
          reason: 'Historical reference, not an active planning task.',
          targetLaneId: null,
          targetTaskId: null,
          sourceContentSha256: 'd'.repeat(64),
          idempotencyKey: 'resolve-doc-gap',
        }
      ),
    /already completed for source hash/
  );
});

test('parseArgs validates docs resolution scope and status', () => {
  assert.throws(
    () =>
      parseArgs([
        'docs-disposition',
        'resolve',
        '--kind',
        'unknown_task_like_id',
        '--actor',
        'codex',
        '--reason',
        'Missing path.',
      ]),
    /Missing required --path/
  );

  assert.throws(
    () =>
      parseArgs([
        'task-gap',
        'resolve',
        '--kind',
        'done_or_review_without_evidence',
        '--actor',
        'codex',
        '--reason',
        'Missing selector.',
      ]),
    /Task gap resolution requires --path or both --lane and --task/
  );

  assert.throws(
    () =>
      parseArgs([
        'docs-disposition',
        'resolve',
        '--kind',
        'unknown_task_like_id',
        '--path',
        'docs/planning/status/example.md',
        '--actor',
        'codex',
        '--resolution',
        'maybe',
        '--reason',
        'Invalid resolution.',
      ]),
    /Invalid docs resolution status "maybe"/
  );
});

test('parseArgs requires task create objective and validates effort points', () => {
  assert.throws(
    () => parseArgs(['task', 'create', '--lane', 'E', '--task', 'F-29-E2E', '--actor', 'codex']),
    /Missing required --objective/
  );

  assert.throws(
    () =>
      parseArgs([
        'task',
        'create',
        '--lane',
        'E',
        '--task',
        'F-29-E2E',
        '--actor',
        'codex',
        '--objective',
        'Invalid effort.',
        '--effort-points',
        '-1',
      ]),
    /Invalid --effort-points "-1"/
  );
});

test('parseArgs derives different default idempotency keys for different updates', () => {
  const reviewCommand = parseArgs([
    'task',
    'update',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--status',
    'review',
  ]);
  const doneCommand = parseArgs([
    'task',
    'update',
    '--lane',
    'A',
    '--task',
    'GOV-S3',
    '--actor',
    'codex',
    '--status',
    'done',
  ]);

  assert.notEqual(reviewCommand.idempotencyKey, doneCommand.idempotencyKey);
});

test('assertIdempotentReplayMatches rejects same key with different command payload', () => {
  assert.throws(
    () =>
      assertIdempotentReplayMatches(
        {
          operation_type: 'task_update',
          actor: 'codex',
          lane_id: 'A',
          task_id: 'GOV-S3',
          expected_revision: null,
          payload: { status: 'review', progressPct: null, statusReason: null, evidenceRefs: [] },
        },
        {
          kind: 'task_update',
          actor: 'codex',
          laneId: 'A',
          taskId: 'GOV-S3',
          expectedRevision: null,
          status: 'done',
          progressPct: null,
          statusReason: null,
          evidenceRefs: [],
          idempotencyKey: 'same-key',
        }
      ),
    /Idempotency key "same-key" already belongs to a different planning operation/
  );
});

test('assertIdempotentReplayMatches accepts jsonb payloads with reordered keys', () => {
  assert.doesNotThrow(() =>
    assertIdempotentReplayMatches(
      {
        operation_type: 'task_update',
        actor: 'codex',
        lane_id: 'A',
        task_id: 'GOV-S3',
        expected_revision: null,
        payload: {
          evidenceRefs: [],
          statusReason: null,
          progressPct: null,
          status: 'review',
        },
      },
      {
        kind: 'task_update',
        actor: 'codex',
        laneId: 'A',
        taskId: 'GOV-S3',
        expectedRevision: null,
        status: 'review',
        progressPct: null,
        statusReason: null,
        evidenceRefs: [],
        idempotencyKey: 'same-key',
      }
    )
  );
});

test('assertIdempotentReplayMatches rejects stale idempotent replays after task revision advances', () => {
  assert.throws(
    () =>
      assertIdempotentReplayMatches(
        {
          operation_type: 'task_release',
          actor: 'codex',
          lane_id: 'A',
          task_id: 'GOV-S3',
          expected_revision: null,
          resulting_revision: 3,
          payload: {},
        },
        {
          kind: 'task_release',
          actor: 'codex',
          laneId: 'A',
          taskId: 'GOV-S3',
          expectedRevision: null,
          idempotencyKey: 'release-key',
        },
        { revision: 4 }
      ),
    /Idempotency key "release-key" already completed at revision 3, but A\/GOV-S3 is now at revision 4/
  );
});

test('validateTaskStatus accepts the lane task statuses used by governance planning', () => {
  for (const status of ['queued', 'in_progress', 'blocked', 'review', 'done']) {
    assert.equal(validateTaskStatus(status), status);
  }
});

test('planTaskLocalOperation applies optimistic revisions and creates an audit payload', () => {
  const operation = planTaskLocalOperation({
    command: {
      kind: 'task_update',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      status: 'done',
      progressPct: 100,
      statusReason: 'Local DB authoring command validated',
      evidenceRefs: [
        'docs/planning/closeouts/20260507-gov-s2-doc-driven-operating-framework-closeout.md',
      ],
      expectedRevision: 2,
      idempotencyKey: 'codex-gov-s3-done',
    },
    importedTask,
    currentState: {
      revision: 2,
      claimedBy: 'codex',
      claimToken: 'claim-token',
      claimExpiresAt: '2026-05-07T12:00:00.000Z',
    },
    operationId: 'op-1',
    now: '2026-05-07T10:00:00.000Z',
  });

  assert.equal(operation.state.revision, 3);
  assert.equal(operation.state.status, 'done');
  assert.equal(operation.state.progressPct, 100);
  assert.equal(operation.audit.operationType, 'task_update');
  assert.equal(operation.audit.expectedRevision, 2);
  assert.equal(operation.audit.resultingRevision, 3);
  assert.equal(operation.audit.baseSourceContentSha256, importedTask.sourceContentSha256);
});

test('planTaskLocalOperation rebases stale local task state to the current imported source', () => {
  const operation = planTaskLocalOperation({
    command: {
      kind: 'task_update',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      status: 'queued',
      expectedRevision: null,
      idempotencyKey: 'rebase-stale-local-task-state',
    },
    importedTask,
    currentState: {
      sourcePath: 'docs/planning/state/agent-lane-a.yaml',
      baseSourceContentSha256: 'b'.repeat(64),
      revision: 4,
      status: 'in_progress',
      progressPct: 65,
      evidenceRefs: ['docs/planning/closeouts/stale-overlay.md'],
      statusReason: 'Previous local progress should remain visible after a new operation',
      claimedBy: null,
      claimToken: null,
      claimExpiresAt: null,
    },
    operationId: 'op-rebase',
    now: '2026-05-07T10:00:00.000Z',
  });

  assert.equal(operation.state.revision, 5);
  assert.equal(operation.state.status, 'queued');
  assert.equal(operation.state.progressPct, 65);
  assert.deepEqual(operation.state.evidenceRefs, ['docs/planning/closeouts/stale-overlay.md']);
  assert.equal(operation.state.baseSourceContentSha256, importedTask.sourceContentSha256);
  assert.equal(operation.audit.baseSourceContentSha256, importedTask.sourceContentSha256);
  assert.equal(operation.audit.previousRevision, 4);
});

test('planTaskLocalOperation rejects stale expected revisions', () => {
  assert.throws(
    () =>
      planTaskLocalOperation({
        command: {
          kind: 'task_update',
          actor: 'codex',
          laneId: 'A',
          taskId: 'GOV-S3',
          expectedRevision: 1,
          idempotencyKey: 'stale',
        },
        importedTask,
        currentState: { revision: 2 },
        operationId: 'op-2',
        now: '2026-05-07T10:00:00.000Z',
      }),
    /Stale planning task revision for A\/GOV-S3: expected 1 but current revision is 2/
  );
});

test('planTaskLocalOperation creates a claim token and preserves audit across command shape', () => {
  const operation = planTaskLocalOperation({
    command: {
      kind: 'task_claim',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      ttlMinutes: 90,
      idempotencyKey: 'claim-gov-s3',
    },
    importedTask,
    currentState: null,
    operationId: 'op-claim',
    now: '2026-05-07T10:00:00.000Z',
  });

  assert.equal(operation.state.revision, 1);
  assert.equal(operation.state.claimedBy, 'codex');
  assert.equal(operation.state.claimToken, 'op-claim');
  assert.equal(operation.state.claimExpiresAt, '2026-05-07T11:30:00.000Z');
  assert.equal(operation.audit.operationType, 'task_claim');
});

test('planTaskDefinitionOperation creates a local task definition with auditable raw task', () => {
  const operation = planTaskDefinitionOperation({
    command: {
      kind: 'task_create',
      actor: 'codex',
      laneId: 'E',
      taskId: 'F-29-E2E',
      parentTaskId: 'F-29',
      priority: 'P0',
      status: 'queued',
      objective: 'Prove the next E2E route through the planning DB command rail.',
      dependency: 'F-28-C',
      target: 'apps/web/cypress/e2e/canvas',
      complexity: 'M',
      effortPoints: 3,
      progressPct: 0,
      evidenceRefs: ['aider/tasks/07-f-29-e2e.md'],
      statusReason: 'Created through planning DB command rail.',
      idempotencyKey: 'create-f29',
    },
    importedLane: {
      laneId: 'E',
      sourcePath: 'docs/planning/state/agent-lane-e.yaml',
      sourceContentSha256: 'b'.repeat(64),
    },
    importedTask: null,
    localDefinition: null,
    localTombstone: null,
    operationId: 'op-create',
    now: '2026-05-10T10:00:00.000Z',
  });

  assert.equal(operation.definition.laneId, 'E');
  assert.equal(operation.definition.taskId, 'F-29-E2E');
  assert.equal(operation.definition.sourcePath, 'docs/planning/state/agent-lane-e.yaml');
  assert.equal(operation.definition.sourceContentSha256, 'b'.repeat(64));
  assert.equal(operation.definition.parentTaskId, 'F-29');
  assert.equal(operation.definition.rawTask.task_id, 'F-29-E2E');
  assert.equal(operation.definition.rawTask.parent_task, 'F-29');
  assert.equal(operation.definition.rawTask.parent_task_id, undefined);
  assert.equal(
    operation.definition.rawTask.objective,
    'Prove the next E2E route through the planning DB command rail.'
  );
  assert.equal(operation.definition.rawTask.effort_points, 3);
  assert.equal(operation.audit.operationType, 'task_create');
  assert.equal(operation.audit.resultingRevision, 0);
});

test('planTaskDefinitionOperation rejects duplicate task creation', () => {
  assert.throws(
    () =>
      planTaskDefinitionOperation({
        command: {
          kind: 'task_create',
          actor: 'codex',
          laneId: 'E',
          taskId: 'F-29-E2E',
          objective: 'Duplicate task.',
          status: 'queued',
          idempotencyKey: 'duplicate',
        },
        importedLane: {
          laneId: 'E',
          sourcePath: 'docs/planning/state/agent-lane-e.yaml',
          sourceContentSha256: 'b'.repeat(64),
        },
        importedTask,
        localDefinition: null,
        localTombstone: null,
        operationId: 'op-duplicate',
        now: '2026-05-10T10:00:00.000Z',
      }),
    /Planning task E\/F-29-E2E already exists/
  );
});

test('planTaskDefinitionOperation deletes an effective task with revision guard', () => {
  const operation = planTaskDefinitionOperation({
    command: {
      kind: 'task_delete',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S3',
      expectedRevision: 2,
      statusReason: 'Closed by DB-owned task lifecycle command.',
      idempotencyKey: 'delete-gov-s3',
    },
    importedLane: null,
    importedTask,
    localDefinition: null,
    localTombstone: null,
    currentState: { revision: 2 },
    operationId: 'op-delete',
    now: '2026-05-10T10:00:00.000Z',
  });

  assert.equal(operation.tombstone.laneId, 'A');
  assert.equal(operation.tombstone.taskId, 'GOV-S3');
  assert.equal(operation.tombstone.baseSourceContentSha256, importedTask.sourceContentSha256);
  assert.equal(operation.tombstone.statusReason, 'Closed by DB-owned task lifecycle command.');
  assert.equal(operation.state.revision, 3);
  assert.equal(operation.state.statusReason, 'Closed by DB-owned task lifecycle command.');
  assert.equal(operation.audit.operationType, 'task_delete');
  assert.equal(operation.audit.previousRevision, 2);
  assert.equal(operation.audit.resultingRevision, 3);
});

test('planDocsResolutionOperation records source-hash guarded disposition resolutions', () => {
  const operation = planDocsResolutionOperation({
    command: {
      kind: 'docs_disposition_resolve',
      resolutionScope: 'docs_disposition',
      issueKind: 'unknown_task_like_id',
      documentPath: 'docs/planning/status/example.md',
      referenceText: 'WEB-123',
      actor: 'codex',
      resolutionStatus: 'ignored',
      reason: 'Historical reference, not an active planning task.',
      idempotencyKey: 'resolve-doc-gap',
    },
    sourceRow: {
      action_id: 'action-1',
      action_kind: 'unknown_task_like_id',
      document_path: 'docs/planning/status/example.md',
      reference_text: 'WEB-123',
      source_content_sha256: 'c'.repeat(64),
      reason: 'Task-like reference is not registered in planning lanes.',
    },
    operationId: 'op-doc-resolution',
    now: '2026-05-10T12:00:00.000Z',
  });

  assert.equal(
    operation.resolution.resolutionKey,
    'docs_disposition:c1da6232a85c07f5f0e5e77a6fc6449469bbc29e32819cc65fd20581b1f30c4b'
  );
  assert.equal(operation.resolution.sourceContentSha256, 'c'.repeat(64));
  assert.equal(operation.resolution.resolutionStatus, 'ignored');
  assert.equal(operation.audit.operationType, 'docs_disposition_resolve');
  assert.equal(operation.audit.resolutionKey, operation.resolution.resolutionKey);
});

test('planDocsResolutionOperation records task gap links without creating tasks', () => {
  const operation = planDocsResolutionOperation({
    command: {
      kind: 'task_gap_resolve',
      resolutionScope: 'task_gap',
      issueKind: 'active_review_without_task_link',
      documentPath: 'docs/planning/reviews/example.md',
      actor: 'codex',
      resolutionStatus: 'linked',
      reason: 'Linked to the active DB task.',
      targetLaneId: 'A',
      targetTaskId: 'GOV-S3',
      idempotencyKey: 'resolve-task-gap',
    },
    sourceRow: {
      gap_kind: 'active_review_without_task_link',
      lane_id: null,
      task_id: null,
      document_path: 'docs/planning/reviews/example.md',
      source_content_sha256: 'd'.repeat(64),
      reason: 'Active review document has no registered planning task link.',
    },
    operationId: 'op-gap-resolution',
    now: '2026-05-10T12:00:00.000Z',
  });

  assert.equal(operation.resolution.resolutionScope, 'task_gap');
  assert.equal(operation.resolution.issueKind, 'active_review_without_task_link');
  assert.equal(operation.resolution.documentPath, 'docs/planning/reviews/example.md');
  assert.equal(operation.resolution.targetLaneId, 'A');
  assert.equal(operation.resolution.targetTaskId, 'GOV-S3');
  assert.equal(operation.audit.payload.resolutionStatus, 'linked');
});

test('buildAuditRows formats durable local audit rows for CLI output', () => {
  const rows = buildAuditRows([
    {
      operation_id: 'op-1',
      operation_type: 'task_update',
      actor: 'codex',
      lane_id: 'A',
      task_id: 'GOV-S3',
      expected_revision: 2,
      resulting_revision: 3,
      created_at: '2026-05-07T10:00:00.000Z',
    },
  ]);

  assert.deepEqual(rows, [
    '2026-05-07T10:00:00.000Z op-1 task_update A/GOV-S3 actor=codex expected=2 resulting=3',
  ]);
});

test('buildDocsResolutionAuditRows formats durable docs resolution audit rows', () => {
  const rows = buildDocsResolutionAuditRows([
    {
      created_at: '2026-05-10T12:00:00.000Z',
      operation_id: 'op-doc-resolution',
      operation_type: 'docs_disposition_resolve',
      actor: 'codex',
      resolution_scope: 'docs_disposition',
      issue_kind: 'unknown_task_like_id',
      document_path: 'docs/planning/status/example.md',
      reference_text: 'WEB-123',
      resolution_status: 'ignored',
    },
  ]);

  assert.deepEqual(rows, [
    '2026-05-10T12:00:00.000Z op-doc-resolution docs_disposition_resolve docs_disposition/unknown_task_like_id docs/planning/status/example.md ref=WEB-123 status=ignored actor=codex',
  ]);
});
