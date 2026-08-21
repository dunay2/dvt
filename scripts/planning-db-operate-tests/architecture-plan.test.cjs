const test = require('node:test');
const crypto = require('node:crypto');
const {
  assert,
  assertArchitectureDesignIdempotentReplayMatches,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  parseArgs,
  planArchitectureDesignCreateOperation,
  planArchitectureDesignTransitionOperation,
  planArchitectureComponentRecordOperation,
  planArchitectureComponentResponsibilityRetireOperation,
  planArchitectureContractRecordOperation,
  planArchitecturePortRecordOperation,
  planArchitectureStorageIoRecordOperation,
  planArchitectureTestRetireOperation,
  planArchitectureTestRecordOperation,
  planArchitectureEvidenceRetireOperation,
  planArchitectureEvidenceRecordOperation,
  assertArchitectureEvidenceOriginAuthenticity,
  planArchitectureObservabilityRecordOperation,
  planArchitectureRelationRecordOperation,
  writePlannedArchitectureContractRecordOperation,
  writePlannedArchitectureComponentRecordOperation,
  writePlannedArchitectureComponentResponsibilityRetireOperation,
  writePlannedArchitecturePortRecordOperation,
  writePlannedArchitectureStorageIoRecordOperation,
  writePlannedArchitectureEvidenceRecordOperation,
  writePlannedArchitectureEvidenceRetireOperation,
  writePlannedArchitectureTestRetireOperation,
  writePlannedArchitectureDesignTransitionOperation,
  planFeatureMechanizationRailRetireOperation,
  writePlannedFeatureMechanizationRailRetireOperation,
} = require('./helpers.cjs');

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

test('architecture design transition planner enforces current state and approval timestamp', () => {
  const now = new Date('2026-08-10T12:00:00.000Z');
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
  ]);

  const planned = planArchitectureDesignTransitionOperation({
    command,
    existingDesign: {
      design_id: command.designId,
      status: 'review',
      approved_at: null,
    },
    operationId: 'op-architecture-design-transition',
    now,
  });

  assert.deepEqual(planned.transition, {
    designId: command.designId,
    fromStatus: 'review',
    toStatus: 'approved',
    reason: command.reason,
    approvedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  assert.equal(planned.audit.operationType, 'architecture_design_transition');
  assert.equal(planned.audit.payload.fromStatus, 'review');
  assert.equal(planned.audit.payload.toStatus, 'approved');

  assert.throws(
    () =>
      planArchitectureDesignTransitionOperation({
        command,
        existingDesign: { design_id: command.designId, status: 'proposed' },
        operationId: 'op-stale-architecture-design-transition',
        now,
      }),
    /ARCH-DESIGN-TRANSITION-CONFLICT/
  );
});

test('architecture design transition rejects implementation with must-prove violations', () => {
  assert.throws(
    () =>
      planArchitectureDesignTransitionOperation({
        command: {
          kind: 'architecture_design_transition',
          designId: 'DESIGN-FAIL-CLOSED',
          fromStatus: 'implementing',
          toStatus: 'implemented',
          reason: 'Implementation complete.',
          sourceRef: 'scripts/planning-db-operate.cjs',
          sourceContentSha256: 'e'.repeat(64),
          actor: 'codex',
          idempotencyKey: 'transition-fail-closed',
        },
        existingDesign: {
          design_id: 'DESIGN-FAIL-CLOSED',
          status: 'implementing',
        },
        implementationViolations: [
          {
            violation_kind: 'required_evidence_missing',
            subject_kind: 'command',
            subject_id: 'RecordArchitectureEvidenceExecution',
            severity: 'blocker',
          },
        ],
        operationId: 'op-transition-fail-closed',
        now: new Date('2026-08-11T13:30:00.000Z'),
      }),
    /ARCH-DESIGN-IMPLEMENTATION-EVIDENCE-MISSING/
  );
});

test('architecture design transition writer persists the CAS update and audit', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return sql.includes('update architecture.design')
        ? { rows: [{ design_id: params[0] }], rowCount: 1 }
        : { rows: [], rowCount: 1 };
    },
  };
  const planned = {
    transition: {
      designId: 'R1-1D-API-GOVERNANCE-LIFECYCLE-CLOSEOUT-20260810',
      fromStatus: 'review',
      toStatus: 'approved',
      reason: 'The governed implementation and validation evidence are complete.',
      approvedAt: '2026-08-10T12:00:00.000Z',
      updatedAt: '2026-08-10T12:00:00.000Z',
    },
    audit: {
      operationId: 'op-architecture-design-transition',
      idempotencyKey: 'approve-r1-1d-api-governance-closeout',
      operationType: 'architecture_design_transition',
      actor: 'codex',
      designId: 'R1-1D-API-GOVERNANCE-LIFECYCLE-CLOSEOUT-20260810',
      sourceRef: 'docs/architecture/components/api/index.md',
      sourceContentSha256: 'e'.repeat(64),
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 0,
      payload: { fromStatus: 'review', toStatus: 'approved' },
      createdAt: '2026-08-10T12:00:00.000Z',
    },
  };

  await writePlannedArchitectureDesignTransitionOperation(client, planned);

  assert.ok(queries.some((query) => query.sql.includes('update architecture.design')));
  assert.ok(queries.some((query) => query.sql.includes('architecture.design_operations')));
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

test('new architecture responsibilities inherit the component lifecycle state', () => {
  const planResponsibilityFor = (status) => {
    const command = parseArgs([
      'architecture-component',
      'record',
      '--design',
      'ARCHITECTURE-RESPONSIBILITY-LIFECYCLE-2343',
      '--component',
      'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES',
      '--name',
      'Run context artifact writer',
      '--kind',
      'adapter',
      '--layer',
      'adapter',
      '--owner',
      'Runtime Admission',
      '--repo-path',
      'apps/api/src/infrastructure/dbt/ArtifactBackedRunExecutionContextWriter.ts',
      '--public-contract',
      'RunExecutionContextWriter',
      '--status',
      status,
      '--responsibility',
      'RESP-RUN-CONTEXT-ARTIFACT-ADAPTER|Persist one run context in the configured artifact backend.|Artifact persistence changes.|ArtifactBackedRunExecutionContextWriter',
      '--source-ref',
      'scripts/planning-db-operate.cjs',
      '--source-content-sha256',
      'e'.repeat(64),
      '--actor',
      'codex',
    ]);

    return planArchitectureComponentRecordOperation({
      command,
      design: { design_id: command.designId, status: 'review' },
      designScopes: [
        {
          subject_kind: 'component',
          subject_id: command.componentId,
          scope_kind: 'may_create',
        },
      ],
      existingComponent: null,
      parentComponent: null,
      operationId: `op-responsibility-${status}`,
      now: new Date('2026-08-14T09:00:00.000Z'),
    }).responsibilities[0];
  };

  assert.equal(planResponsibilityFor('proposed').status, 'proposed');
  assert.equal(planResponsibilityFor('review').status, 'proposed');
  assert.equal(planResponsibilityFor('approved').status, 'approved');
  assert.equal(planResponsibilityFor('implemented').status, 'implemented');
  assert.equal(planResponsibilityFor('drift').status, 'drift');
});

test('architecture component updates preserve governed maturity and creation time', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');
  const createdAt = '2026-06-19T09:30:00.000Z';
  const command = parseArgs([
    'architecture-component',
    'record',
    '--design',
    'db-canvas-context-menu-component-path-2310-v1',
    '--component',
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
    '--name',
    'Canvas context menu primitives',
    '--kind',
    'ui-view',
    '--layer',
    'ui',
    '--owner',
    'Frontend / Canvas',
    '--repo-path',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    '--public-contract',
    'Reusable Canvas context-menu surface, section, and item primitives.',
    '--runtime',
    'browser',
    '--criticality',
    'medium',
    '--status',
    'review',
    '--responsibility',
    'RESP-SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES|Own reusable Canvas context-menu primitive rendering.|Context-menu primitive markup, accessibility role, design token, or surface styling changes.|CanvasContextMenuPresentationPrimitives',
    '--source-ref',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    '--source-content-sha256',
    'f'.repeat(64),
    '--actor',
    'codex',
  ]);

  const planned = planArchitectureComponentRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'component',
        subject_id: command.componentId,
        scope_kind: 'may_update',
      },
    ],
    existingComponent: {
      component_id: command.componentId,
      maturity_score: 78,
      created_at: createdAt,
    },
    parentComponent: null,
    operationId: 'op-architecture-component-update',
    now,
  });

  assert.equal(planned.component.maturityScore, 78);
  assert.equal(planned.component.createdAt, createdAt);
  assert.equal(planned.component.updatedAt, now.toISOString());
});

test('architecture responsibility retirement requires exact component authority and deletes one row', async () => {
  const now = new Date('2026-08-14T08:00:00.000Z');
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
  const existingResponsibility = {
    responsibility_id: command.responsibilityId,
    component_id: command.componentId,
  };
  const planned = planArchitectureComponentResponsibilityRetireOperation({
    command,
    design: { design_id: command.designId, status: 'implementing' },
    designScopes: [
      {
        subject_kind: 'component',
        subject_id: command.componentId,
        scope_kind: 'may_update',
      },
    ],
    existingResponsibility,
    operationId: 'op-architecture-responsibility-retire',
    now,
  });

  assert.equal(planned.retirement.responsibilityId, command.responsibilityId);
  assert.equal(planned.retirement.componentId, command.componentId);
  assert.equal(planned.audit.operationType, 'architecture_component_responsibility_retire');
  assert.throws(
    () =>
      planArchitectureComponentResponsibilityRetireOperation({
        command,
        design: { design_id: command.designId, status: 'implementing' },
        designScopes: [],
        existingResponsibility,
        operationId: 'op-missing-scope',
        now,
      }),
    /ARCH-COMPONENT-DESIGN-SCOPE-MISSING/
  );
  assert.throws(
    () =>
      planArchitectureComponentResponsibilityRetireOperation({
        command,
        design: { design_id: command.designId, status: 'implementing' },
        designScopes: [
          {
            subject_kind: 'component',
            subject_id: command.componentId,
            scope_kind: 'may_update',
          },
        ],
        existingResponsibility: {
          ...existingResponsibility,
          component_id: 'SYS-OTHER-COMPONENT',
        },
        operationId: 'op-component-mismatch',
        now,
      }),
    /ARCH-RESPONSIBILITY-COMPONENT-MISMATCH/
  );

  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [], rowCount: 1 };
    },
  };
  await writePlannedArchitectureComponentResponsibilityRetireOperation(client, planned);
  assert.ok(
    queries.some(
      ({ sql, params }) =>
        sql.includes('delete from architecture.component_responsibility') &&
        params[0] === command.responsibilityId &&
        params[1] === command.componentId
    )
  );
  assert.ok(queries.some(({ sql }) => sql.includes('architecture.design_operations')));
});

test('architecture component updates do not downgrade existing responsibility status', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [], rowCount: 1 };
    },
  };
  const timestamp = '2026-08-12T12:00:00.000Z';

  await writePlannedArchitectureComponentRecordOperation(client, {
    component: {
      componentId: 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
      name: 'Canvas context menu primitives',
      kind: 'ui-view',
      layer: 'ui',
      owner: 'Frontend / Canvas',
      repoPath: 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      publicContract: 'Reusable Canvas context-menu surface, section, and item primitives.',
      runtime: 'browser',
      criticality: 'medium',
      status: 'review',
      maturityScore: 78,
      parentComponentId: 'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    responsibilities: [
      {
        responsibilityId: 'RESP-SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
        componentId: 'SYS-WEB-CANVAS-CONTEXT-MENU-PRIMITIVES',
        responsibility: 'Own reusable Canvas context-menu primitive rendering.',
        reasonToChange: 'Context-menu primitive rendering changes.',
        dddOwner: 'CanvasContextMenuPresentationPrimitives',
        status: 'proposed',
        createdAt: timestamp,
      },
    ],
    audit: {
      operationId: 'op-architecture-component-update',
      idempotencyKey: 'architecture_component_record:test',
      operationType: 'architecture_component_record',
      actor: 'codex',
      designId: 'db-canvas-context-menu-component-path-2310-v1',
      sourceRef: 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      sourceContentSha256: 'f'.repeat(64),
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 0,
      payload: {},
      createdAt: timestamp,
    },
  });

  const responsibilityWrite = queries.find((query) =>
    query.sql.includes('architecture.component_responsibility')
  );
  assert.match(responsibilityWrite.sql, /status = architecture\.component_responsibility\.status/u);
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

test('architecture relation record planner retires existing relations with update scope', () => {
  const now = new Date('2026-06-12T12:00:00.000Z');
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
    '--status',
    'deprecated',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  const planned = planArchitectureRelationRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'relation',
        subject_id: 'REL-ENGINE-USES-STATE-STORE',
        scope_kind: 'may_update',
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
    existingRelation: { relation_id: 'REL-ENGINE-USES-STATE-STORE' },
    operationId: 'op-architecture-relation-promote',
    now,
  });

  assert.equal(planned.relation.status, 'deprecated');
  assert.equal(planned.audit.operationType, 'architecture_relation_record');
});

test('architecture contract record planner emits contract and audit rows', () => {
  const now = new Date('2026-06-15T09:00:00.000Z');
  const command = parseArgs([
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

  const planned = planArchitectureContractRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'contract',
        subject_id: 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
        scope_kind: 'may_create',
      },
      {
        subject_kind: 'component',
        subject_id: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
        scope_kind: 'may_reference',
      },
    ],
    ownerComponent: { component_id: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL' },
    existingContract: null,
    operationId: 'op-architecture-contract-record',
    now,
  });

  assert.equal(planned.contract.contractId, command.contractId);
  assert.equal(planned.contract.ownerComponentId, command.ownerComponentId);
  assert.equal(planned.audit.operationType, 'architecture_contract_record');
});

test('architecture contract record writer persists contract facts with audit', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };
  const planned = {
    contract: {
      contractId: 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
      contractKind: 'type',
      ownerComponentId: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
      contractRef:
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts#GraphNodeCardViewModel',
      compatibility: 'internal',
      status: 'implemented',
      validationCommand:
        'pnpm --filter @dvt/web test -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      createdAt: new Date('2026-06-15T09:00:00.000Z'),
      updatedAt: new Date('2026-06-15T09:00:00.000Z'),
    },
    audit: {
      operationId: 'op-architecture-contract-record',
      idempotencyKey: 'architecture-contract:CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
      operationType: 'architecture_contract_record',
      actor: 'codex',
      designId: 'PLANNING-DB-ARCHITECTURE-IO-RAILS-20260615',
      sourceRef:
        'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      sourceContentSha256: 'e'.repeat(64),
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 1,
      payload: { contractId: 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL' },
      createdAt: new Date('2026-06-15T09:00:00.000Z'),
    },
  };

  await writePlannedArchitectureContractRecordOperation(client, planned);

  assert.ok(queries.some((query) => query.sql.includes('architecture.contract')));
  assert.ok(queries.some((query) => query.sql.includes('architecture.design_operations')));
  assert.equal(
    queries.find((query) => query.sql.includes('architecture.contract')).params[0],
    planned.contract.contractId
  );
});

test('architecture port record planner requires component and contract authority', () => {
  const now = new Date('2026-06-15T09:10:00.000Z');
  const command = parseArgs([
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
    '--status',
    'implemented',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.throws(
    () =>
      planArchitecturePortRecordOperation({
        command,
        design: { design_id: command.designId, status: 'review' },
        designScopes: [
          {
            subject_kind: 'port',
            subject_id: 'PORT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL-QUERY',
            scope_kind: 'may_create',
          },
          {
            subject_kind: 'component',
            subject_id: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
            scope_kind: 'may_reference',
          },
          {
            subject_kind: 'contract',
            subject_id: 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
            scope_kind: 'may_reference',
          },
        ],
        component: { component_id: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL' },
        inputContract: null,
        outputContract: null,
        existingPort: null,
        operationId: 'op-architecture-port-record',
        now,
      }),
    /ARCH-PORT-CONTRACT-MISSING/
  );

  const planned = planArchitecturePortRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'port',
        subject_id: 'PORT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL-QUERY',
        scope_kind: 'may_create',
      },
      {
        subject_kind: 'component',
        subject_id: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
        scope_kind: 'may_reference',
      },
      {
        subject_kind: 'contract',
        subject_id: 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
        scope_kind: 'may_reference',
      },
    ],
    component: { component_id: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL' },
    inputContract: null,
    outputContract: { contract_id: 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL' },
    existingPort: null,
    operationId: 'op-architecture-port-record',
    now,
  });

  assert.equal(planned.port.portId, command.portId);
  assert.equal(planned.port.outputContractId, command.outputContractId);
  assert.equal(planned.port.negativeTests.length, 1);
  assert.equal(planned.audit.operationType, 'architecture_port_record');
});

test('architecture port record writer persists port facts with audit', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };
  const planned = {
    port: {
      portId: 'PORT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL-QUERY',
      componentId: 'SYS-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
      portName: 'RenderGraphNodeCard',
      portKind: 'query',
      direction: 'inbound',
      inputContractId: null,
      outputContractId: 'CONTRACT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL',
      negativeTests: [
        'graphNodeCardReadModel.architecture.test.ts rejects React component imports',
      ],
      status: 'implemented',
      createdAt: new Date('2026-06-15T09:10:00.000Z'),
    },
    audit: {
      operationId: 'op-architecture-port-record',
      idempotencyKey: 'architecture-port:PORT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL-QUERY',
      operationType: 'architecture_port_record',
      actor: 'codex',
      designId: 'PLANNING-DB-ARCHITECTURE-IO-RAILS-20260615',
      sourceRef:
        'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      sourceContentSha256: 'e'.repeat(64),
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 1,
      payload: { portId: 'PORT-WEB-CANVAS-GRAPH-NODE-CARD-READ-MODEL-QUERY' },
      createdAt: new Date('2026-06-15T09:10:00.000Z'),
    },
  };

  await writePlannedArchitecturePortRecordOperation(client, planned);

  assert.ok(queries.some((query) => query.sql.includes('architecture.component_port')));
  assert.ok(queries.some((query) => query.sql.includes('architecture.design_operations')));
  assert.equal(
    queries.find((query) => query.sql.includes('architecture.component_port')).params[0],
    planned.port.portId
  );
});

test('architecture storage I/O planner updates one design-scoped current record', () => {
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
  const existingStorageIo = {
    storage_io_id: command.storageIoId,
    component_id: command.componentId,
    storage_object: command.expectedStorageObject,
    direction: 'writes',
    access_pattern: 'projection',
    contract_id: command.contractId,
    created_at: '2026-08-07T00:49:55.642226+00:00',
  };
  const options = {
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'component',
        subject_id: command.componentId,
        scope_kind: 'may_reference',
      },
      {
        subject_kind: 'path',
        subject_id: command.storageObject,
        scope_kind: 'may_update',
      },
      {
        subject_kind: 'contract',
        subject_id: command.contractId,
        scope_kind: 'may_reference',
      },
    ],
    component: { component_id: command.componentId },
    contract: { contract_id: command.contractId },
    existingStorageIo,
    operationId: 'op-architecture-storage-io-record',
    now: new Date('2026-08-10T15:30:00.000Z'),
  };

  const planned = planArchitectureStorageIoRecordOperation(options);

  assert.equal(planned.storageIo.storageIoId, command.storageIoId);
  assert.equal(planned.storageIo.storageObject, command.storageObject);
  assert.equal(planned.storageIo.createdAt, existingStorageIo.created_at);
  assert.equal(planned.expectedStorageObject, command.expectedStorageObject);
  assert.equal(planned.audit.operationType, 'architecture_storage_io_record');

  assert.throws(
    () => planArchitectureStorageIoRecordOperation({ ...options, existingStorageIo: null }),
    /ARCH-STORAGE-IO-MISSING/
  );
  assert.throws(
    () =>
      planArchitectureStorageIoRecordOperation({
        ...options,
        existingStorageIo: { ...existingStorageIo, storage_object: 'stale-path.md' },
      }),
    /ARCH-STORAGE-IO-STALE/
  );
  assert.throws(
    () => planArchitectureStorageIoRecordOperation({ ...options, component: null }),
    /ARCH-STORAGE-IO-COMPONENT-MISSING/
  );
  assert.throws(
    () => planArchitectureStorageIoRecordOperation({ ...options, contract: null }),
    /ARCH-STORAGE-IO-CONTRACT-MISSING/
  );
  assert.throws(
    () =>
      planArchitectureStorageIoRecordOperation({
        ...options,
        designScopes: options.designScopes.filter((scope) => scope.subject_kind !== 'path'),
      }),
    /ARCH-STORAGE-IO-DESIGN-SCOPE-MISSING/
  );
});

test('architecture storage I/O writer writes audit only after optimistic path matching', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [], rowCount: sql.includes('architecture.component_storage_io') ? 1 : 0 };
    },
  };
  const planned = {
    storageIo: {
      storageIoId: 'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE-WRITE-1',
      componentId: 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE',
      storageObject: '.generated-docs/planning/status/db-surface-inventory.md',
      direction: 'writes',
      accessPattern: 'projection',
      contractId: 'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE-SURFACE',
      createdAt: '2026-08-07T00:49:55.642226+00:00',
    },
    expectedStorageObject: 'docs/planning/status/generated-db-surface-inventory.md',
    audit: {
      operationId: 'op-architecture-storage-io-record',
      idempotencyKey: 'architecture-storage-io-record',
      operationType: 'architecture_storage_io_record',
      actor: 'codex',
      designId: 'DOC1-6-STORAGE-IO-RETIREMENT-20260810',
      sourceRef: 'github:pull/2294#discussion_r3750870115',
      sourceContentSha256: 'e'.repeat(64),
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 0,
      payload: {},
      createdAt: new Date('2026-08-10T15:30:00.000Z'),
    },
  };

  await writePlannedArchitectureStorageIoRecordOperation(client, planned);

  const storageWrite = queries.find((query) =>
    query.sql.includes('architecture.component_storage_io')
  );
  assert.ok(storageWrite.sql.includes('storage_object = $2'));
  assert.ok(storageWrite.sql.includes('storage_object = $7'));
  assert.equal(storageWrite.params[1], planned.storageIo.storageObject);
  assert.equal(storageWrite.params[6], planned.expectedStorageObject);
  assert.ok(queries.some((query) => query.sql.includes('architecture.design_operations')));

  const concurrentQueries = [];
  const concurrentClient = {
    async query(sql, params) {
      concurrentQueries.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  };

  await assert.rejects(
    () => writePlannedArchitectureStorageIoRecordOperation(concurrentClient, planned),
    /ARCH-STORAGE-IO-CONCURRENT-UPDATE/
  );
  assert.equal(concurrentQueries.length, 1);
  assert.ok(
    !concurrentQueries.some((query) => query.sql.includes('architecture.design_operations'))
  );
});

test('architecture test evidence planner emits component_test and audit rows', () => {
  const now = new Date('2026-06-12T13:00:00.000Z');
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
    '--validation-command',
    'pnpm --filter @dvt/web test -- canvasDraftToolbarState.test.ts',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);

  const planned = planArchitectureTestRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'test',
        subject_id: 'TEST-WEB-CANVAS-DRAFT-SAVE-STATUS',
        scope_kind: 'may_create',
      },
      {
        subject_kind: 'component',
        subject_id: 'SYS-WEB-CANVAS-DRAFT-SAVE-STATUS',
        scope_kind: 'may_reference',
      },
    ],
    component: { component_id: 'SYS-WEB-CANVAS-DRAFT-SAVE-STATUS' },
    existingTest: null,
    operationId: 'op-architecture-test-record',
    now,
  });

  assert.equal(planned.testEvidence.testId, 'TEST-WEB-CANVAS-DRAFT-SAVE-STATUS');
  assert.equal(planned.testEvidence.required, true);
  assert.equal(planned.audit.operationType, 'architecture_test_record');
  assert.equal(planned.audit.designId, command.designId);
});

test('architecture test and execution retirement require exact may-delete scope', () => {
  const now = new Date('2026-08-11T13:00:00.000Z');
  const shared = [
    '--design',
    'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-V5-20260811',
    '--reason',
    'Independent QA proved the fact is stale current authority.',
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
  const testPlan = planArchitectureTestRetireOperation({
    command: testCommand,
    design: { design_id: testCommand.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'test',
        subject_id: testCommand.testId,
        scope_kind: 'may_delete',
      },
      {
        subject_kind: 'component',
        subject_id: testCommand.componentId,
        scope_kind: 'may_reference',
      },
    ],
    existingTest: {
      test_id: testCommand.testId,
      component_id: testCommand.componentId,
      test_path: 'apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts',
    },
    operationId: 'op-architecture-test-retire',
    now,
  });
  assert.equal(testPlan.retirement.testId, testCommand.testId);
  assert.equal(testPlan.audit.operationType, 'architecture_test_retire');
  assert.equal(testPlan.audit.payload.testId, testCommand.testId);

  const executionCommand = parseArgs([
    'architecture-evidence',
    'retire-execution',
    '--evidence',
    'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL',
    ...shared,
  ]);
  const executionPlan = planArchitectureEvidenceRetireOperation({
    command: executionCommand,
    design: { design_id: executionCommand.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'evidence',
        subject_id: executionCommand.evidenceId,
        scope_kind: 'may_delete',
      },
    ],
    existingEvidence: {
      evidence_id: executionCommand.evidenceId,
      design_id: executionCommand.designId,
    },
    operationId: 'op-architecture-evidence-retire',
    now,
  });
  assert.equal(executionPlan.retirement.evidenceId, executionCommand.evidenceId);
  assert.equal(executionPlan.audit.operationType, 'architecture_evidence_retire');
  assert.equal(executionPlan.audit.payload.evidenceId, executionCommand.evidenceId);

  assert.throws(
    () =>
      planArchitectureEvidenceRetireOperation({
        command: executionCommand,
        design: { design_id: executionCommand.designId, status: 'review' },
        designScopes: [
          {
            subject_kind: 'evidence',
            subject_id: executionCommand.evidenceId,
            scope_kind: 'may_delete',
          },
        ],
        existingEvidence: {
          evidence_id: executionCommand.evidenceId,
          design_id: 'OTHER-DESIGN',
        },
        operationId: 'op-owner-mismatch',
        now,
      }),
    /ARCH-EVIDENCE-RETIRE-DESIGN-MISMATCH/
  );

  assert.throws(
    () =>
      planArchitectureEvidenceRetireOperation({
        command: executionCommand,
        design: { design_id: executionCommand.designId, status: 'review' },
        designScopes: [],
        existingEvidence: { evidence_id: executionCommand.evidenceId },
        operationId: 'op-missing-scope',
        now,
      }),
    /ARCH-EVIDENCE-RETIRE-DESIGN-SCOPE-MISSING/
  );
});

test('retirement writers delete exact rows before recording architecture audit', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [], rowCount: 1 };
    },
  };
  const audit = {
    operationId: 'op-retire',
    idempotencyKey: 'retire-idempotency',
    operationType: 'architecture_test_retire',
    actor: 'codex',
    designId: 'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-V5-20260811',
    sourceRef: 'scripts/planning-db-operate.cjs',
    sourceContentSha256: 'e'.repeat(64),
    expectedRevision: null,
    previousRevision: 0,
    resultingRevision: 0,
    payload: {},
    createdAt: '2026-08-11T13:00:00.000Z',
  };
  await writePlannedArchitectureTestRetireOperation(client, {
    retirement: { testId: 'TEST-SYS-API-TESTS-INFRASTRUCTURE-3' },
    audit,
  });
  await writePlannedArchitectureEvidenceRetireOperation(client, {
    retirement: { evidenceId: 'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL' },
    audit: { ...audit, operationType: 'architecture_evidence_retire' },
  });

  assert.ok(
    queries.some(
      ({ sql, params }) =>
        sql.includes('delete from architecture.component_test') &&
        params[0] === 'TEST-SYS-API-TESTS-INFRASTRUCTURE-3'
    )
  );
  assert.ok(
    queries.some(
      ({ sql, params }) =>
        sql.includes('delete from architecture.evidence') &&
        params[0] === 'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL'
    )
  );
  assert.equal(
    queries.filter(({ sql }) => sql.includes('architecture.design_operations')).length,
    2
  );
});

test('feature mechanization retirement uses design scope, CAS, and audited deletion', async () => {
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
    'Reuse ImportPlanningGovernanceQueryStore.',
    '--source-ref',
    'scripts/planning-db-import.cjs',
    '--source-content-sha256',
    'e'.repeat(64),
    '--actor',
    'codex',
  ]);
  const planned = planFeatureMechanizationRailRetireOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'decision',
        subject_id: command.railId,
        scope_kind: 'may_delete',
      },
    ],
    existingRail: { rail_id: command.railId, revision: 1 },
    operationId: 'op-feature-rail-retire',
    now: new Date('2026-08-11T13:00:00.000Z'),
  });
  const queries = [];
  await writePlannedFeatureMechanizationRailRetireOperation(
    {
      async query(sql, params) {
        queries.push({ sql, params });
        return { rows: [], rowCount: 1 };
      },
    },
    planned
  );

  assert.equal(planned.retirement.railId, command.railId);
  assert.equal(planned.audit.payload.railId, command.railId);
  assert.ok(
    queries.some(
      ({ sql, params }) =>
        sql.includes('delete from planning_query_store.feature_mechanization_local_rails') &&
        params[0] === command.railId
    )
  );
  assert.ok(queries.some(({ sql }) => sql.includes('feature_mechanization_local_operations')));
});

test('architecture observability evidence planner accepts component update authority', () => {
  const now = new Date('2026-06-12T14:00:00.000Z');
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

  const planned = planArchitectureObservabilityRecordOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'evidence',
        subject_id: 'OBS-API-OPS-ROUTES-HEALTH-LOG',
        scope_kind: 'may_create',
      },
      {
        subject_kind: 'component',
        subject_id: 'SYS-API-OPS-ROUTES',
        scope_kind: 'may_update',
      },
    ],
    component: { component_id: 'SYS-API-OPS-ROUTES' },
    existingObservability: null,
    operationId: 'op-architecture-observability-record',
    now,
  });

  assert.equal(planned.observability.observabilityId, 'OBS-API-OPS-ROUTES-HEALTH-LOG');
  assert.equal(planned.observability.signalKind, 'log');
  assert.equal(planned.observability.status, 'implemented');
  assert.equal(planned.audit.operationType, 'architecture_observability_record');
  assert.equal(planned.audit.designId, command.designId);
});

test('architecture execution evidence planner requires must-prove scope and records provenance', () => {
  const now = new Date('2026-08-11T12:00:00.000Z');
  const command = parseArgs([
    'architecture-evidence',
    'record-execution',
    '--design',
    'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-20260811',
    '--evidence',
    'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL',
    '--subject-kind',
    'query',
    '--subject',
    'ClassifyArchitectureDocumentationDisposition',
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

  const planned = planArchitectureEvidenceRecordOperation({
    command,
    design: { design_id: command.designId, status: 'implementing' },
    designScopes: [
      {
        subject_kind: 'query',
        subject_id: 'ClassifyArchitectureDocumentationDisposition',
        scope_kind: 'must_prove',
      },
    ],
    sourceFile: {
      path: 'scripts/planning-db-schema.test.cjs',
      content_hash: 'e'.repeat(64),
    },
    subjectImplementation: {
      current_implementation_content_sha256: 'd'.repeat(64),
      missing_implementation_ref_count: 0,
    },
    operationId: 'op-architecture-evidence-record',
    now,
  });

  assert.equal(planned.evidence.evidenceOrigin, 'local_execution');
  assert.equal(planned.evidence.resultState, 'pass');
  assert.equal(planned.evidence.designId, command.designId);
  assert.equal(planned.evidence.sourcePath, command.sourcePath);
  assert.equal(planned.evidence.implementationContentSha256, 'd'.repeat(64));
  assert.equal(planned.audit.operationType, 'architecture_evidence_record');

  assert.throws(
    () =>
      planArchitectureEvidenceRecordOperation({
        command,
        design: { design_id: command.designId, status: 'implementing' },
        designScopes: [
          {
            subject_kind: command.subjectKind,
            subject_id: command.subjectId,
            scope_kind: 'must_prove',
          },
        ],
        sourceFile: {
          path: command.sourcePath,
          content_hash: command.sourceContentSha256,
        },
        subjectImplementation: null,
        operationId: 'op-architecture-evidence-missing-implementation',
        now,
      }),
    /ARCH-EVIDENCE-SUBJECT-IMPLEMENTATION-MISSING/u
  );
});

test('architecture execution evidence writer persists proof before its audit row', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [], rowCount: 1 };
    },
  };
  const planned = {
    evidence: {
      evidenceId: 'EVIDENCE-API-H2-4-LIFECYCLE-LOCAL',
      designId: 'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-20260811',
      subjectKind: 'test',
      subjectId: 'TEST-API-H2-4-DOCUMENT-LIFECYCLE-DISPOSITION',
      evidenceKind: 'test',
      evidenceOrigin: 'local_execution',
      sourceRef: 'node --test scripts/planning-db-schema.test.cjs',
      sourcePath: 'scripts/planning-db-schema.test.cjs',
      resultState: 'pass',
      recordedAt: '2026-08-11T12:00:00.000Z',
      sourceContentSha256: 'e'.repeat(64),
      implementationContentSha256: 'd'.repeat(64),
    },
    audit: {
      operationId: 'op-architecture-evidence-record',
      idempotencyKey: 'evidence-idempotency-key',
      operationType: 'architecture_evidence_record',
      actor: 'codex',
      designId: 'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-20260811',
      sourceRef: 'node --test scripts/planning-db-schema.test.cjs',
      sourceContentSha256: 'e'.repeat(64),
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 0,
      payload: {},
      createdAt: '2026-08-11T12:00:00.000Z',
    },
  };

  await writePlannedArchitectureEvidenceRecordOperation(client, planned);

  assert.match(queries[0].sql, /insert into architecture\.evidence/u);
  assert.match(queries[0].sql, /design_id/u);
  assert.match(queries[0].sql, /source_path/u);
  assert.match(queries[0].sql, /implementation_content_sha256/u);
  assert.equal(queries[0].params[11], 'd'.repeat(64));
  assert.equal(queries[0].params[5], 'local_execution');
  assert.match(queries[1].sql, /insert into architecture\.design_operations/u);
});

test('architecture evidence rejects forged CI origin and source hash drift', async () => {
  const committedSourceBytes = Buffer.from('committed architecture evidence source\n', 'utf8');
  const committedImplementationBytes = Buffer.from('committed implementation source\n', 'utf8');
  const committedSourceSha256 = crypto
    .createHash('sha256')
    .update(committedSourceBytes)
    .digest('hex');
  const committedImplementationSha256 = crypto
    .createHash('sha256')
    .update(committedImplementationBytes)
    .digest('hex');
  const command = parseArgs([
    'architecture-evidence',
    'record-execution',
    '--design',
    'API-H2-4-DB-FIRST-DOCUMENT-EVIDENCE-RECONCILIATION-20260811',
    '--evidence',
    'EVIDENCE-API-H2-4-CI',
    '--subject-kind',
    'command',
    '--subject',
    'RecordArchitectureEvidenceExecution',
    '--evidence-kind',
    'ci',
    '--origin',
    'ci_execution',
    '--result',
    'pass',
    '--source-ref',
    'https://github.com/dunay2/dvt/actions/runs/1234/job/5678',
    '--source-path',
    'scripts/planning-db-operate.cjs',
    '--source-content-sha256',
    committedSourceSha256,
    '--actor',
    'codex',
  ]);

  await assert.rejects(
    assertArchitectureEvidenceOriginAuthenticity(command, {
      currentGitSha: 'a'.repeat(40),
      fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }),
      repositorySlug: 'dunay2/dvt',
    }),
    /ARCH-EVIDENCE-CI-ORIGIN-UNVERIFIED/
  );

  const githubResponses = new Map([
    [
      'https://api.github.com/repos/dunay2/dvt/actions/runs/1234',
      {
        id: 1234,
        head_sha: 'a'.repeat(40),
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/dunay2/dvt/actions/runs/1234',
        repository: { full_name: 'dunay2/dvt' },
      },
    ],
    [
      'https://api.github.com/repos/dunay2/dvt/actions/jobs/5678',
      {
        id: 5678,
        run_id: 1234,
        head_sha: 'a'.repeat(40),
        status: 'completed',
        conclusion: 'success',
        html_url: command.sourceRef,
        name: 'PR Quality Checks',
      },
    ],
  ]);
  const verified = await assertArchitectureEvidenceOriginAuthenticity(command, {
    currentGitSha: 'a'.repeat(40),
    fetch: async (url) => ({
      ok: githubResponses.has(url),
      status: githubResponses.has(url) ? 200 : 404,
      json: async () => githubResponses.get(url) || {},
    }),
    repositorySlug: 'dunay2/dvt',
    subjectImplementation: {
      rail_source_path: 'scripts/architecture-evidence-ledger.cjs',
      rail_source_content_sha256: committedImplementationSha256,
      implementation_files: [
        {
          implementation_path: 'scripts/architecture-evidence-ledger.cjs',
          implementation_content_hash: committedImplementationSha256,
        },
      ],
    },
    readGitFileAtCommit: (_commitSha, filePath) =>
      filePath === command.sourcePath ? committedSourceBytes : committedImplementationBytes,
  });
  assert.equal(verified, command);

  await assert.rejects(
    assertArchitectureEvidenceOriginAuthenticity(command, {
      currentGitSha: 'a'.repeat(40),
      fetch: async (url) => ({
        ok: githubResponses.has(url),
        status: githubResponses.has(url) ? 200 : 404,
        json: async () => githubResponses.get(url) || {},
      }),
      repositorySlug: 'dunay2/dvt',
      subjectImplementation: {
        rail_source_path: 'scripts/architecture-evidence-ledger.cjs',
        rail_source_content_sha256: committedImplementationSha256,
        implementation_files: [
          {
            implementation_path: 'scripts/architecture-evidence-ledger.cjs',
            implementation_content_hash: committedImplementationSha256,
          },
        ],
      },
      readGitFileAtCommit: (_commitSha, filePath) =>
        filePath === command.sourcePath
          ? committedSourceBytes
          : Buffer.from('changed implementation source\n'),
    }),
    /ARCH-EVIDENCE-CI-ORIGIN-UNVERIFIED.*implementation bytes at the proven commit/u
  );

  await assert.rejects(
    assertArchitectureEvidenceOriginAuthenticity(command, {
      currentGitSha: 'a'.repeat(40),
      fetch: async (url) => ({
        ok: true,
        status: 200,
        json: async () => githubResponses.get(url),
      }),
      repositorySlug: 'dunay2/dvt',
      readGitFileAtCommit: () => Buffer.from('different committed bytes\n', 'utf8'),
    }),
    /ARCH-EVIDENCE-CI-ORIGIN-UNVERIFIED.*source bytes at the proven commit/u
  );

  const failedJobResponses = new Map(githubResponses);
  failedJobResponses.set('https://api.github.com/repos/dunay2/dvt/actions/jobs/5678', {
    ...githubResponses.get('https://api.github.com/repos/dunay2/dvt/actions/jobs/5678'),
    conclusion: 'failure',
  });
  await assert.rejects(
    assertArchitectureEvidenceOriginAuthenticity(command, {
      currentGitSha: 'a'.repeat(40),
      fetch: async (url) => ({
        ok: true,
        status: 200,
        json: async () => failedJobResponses.get(url),
      }),
      repositorySlug: 'dunay2/dvt',
    }),
    /ARCH-EVIDENCE-CI-ORIGIN-UNVERIFIED.*successful completed job/u
  );

  await assert.rejects(
    assertArchitectureEvidenceOriginAuthenticity(command, {
      currentGitSha: 'b'.repeat(40),
      fetch: async (url) => ({
        ok: true,
        status: 200,
        json: async () => githubResponses.get(url),
      }),
      repositorySlug: 'dunay2/dvt',
    }),
    /ARCH-EVIDENCE-CI-ORIGIN-UNVERIFIED.*current commit/u
  );
  assert.throws(
    () =>
      planArchitectureEvidenceRecordOperation({
        command: { ...command, evidenceOrigin: 'local_execution' },
        design: { design_id: command.designId, status: 'implementing' },
        designScopes: [
          {
            subject_kind: command.subjectKind,
            subject_id: command.subjectId,
            scope_kind: 'must_prove',
          },
        ],
        sourceFile: {
          path: command.sourcePath,
          content_hash: 'f'.repeat(64),
        },
        operationId: 'op-source-drift',
        now: new Date('2026-08-11T13:30:00.000Z'),
      }),
    /ARCH-EVIDENCE-SOURCE-HASH-MISMATCH/
  );
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
