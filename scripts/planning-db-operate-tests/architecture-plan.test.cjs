const test = require('node:test');
const {
  assert,
  assertArchitectureDesignIdempotentReplayMatches,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  parseArgs,
  planArchitectureDesignCreateOperation,
  planArchitectureComponentRecordOperation,
  planArchitectureContractRecordOperation,
  planArchitecturePortRecordOperation,
  planArchitectureStorageIoRecordOperation,
  planArchitectureTestRecordOperation,
  planArchitectureObservabilityRecordOperation,
  planArchitectureRelationRecordOperation,
  writePlannedArchitectureContractRecordOperation,
  writePlannedArchitecturePortRecordOperation,
  writePlannedArchitectureStorageIoRecordOperation,
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

test('architecture relation record planner promotes existing relations with update scope', () => {
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
    'implemented',
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

  assert.equal(planned.relation.status, 'implemented');
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

test('architecture observability evidence planner emits component_observability and audit rows', () => {
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
        scope_kind: 'may_reference',
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
