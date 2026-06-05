const test = require('node:test');
const {
  assert,
  assertArchitectureDesignIdempotentReplayMatches,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  parseArgs,
  planArchitectureDesignCreateOperation,
  planArchitectureComponentRecordOperation,
  planArchitectureRelationRecordOperation,
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
