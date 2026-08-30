const test = require('node:test');
const {
  assert,
  parseArgs,
  planComponentCreateOperation,
  planComponentReparentOperation,
  planComponentReviseOperation,
  validateComponentStatus,
  writePlannedComponentCreateOperation,
  writePlannedComponentReparentOperation,
  writePlannedComponentReviseOperation,
} = require('./helpers.cjs');

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

test('parseArgs builds a component reparent command with audit source', () => {
  const command = parseArgs([
    'component',
    'reparent',
    '--component',
    'SYS-WEB-CANVAS-SURFACE-STRATEGY',
    '--parent',
    'SYS-WEB-APP-PLUGINS',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
    '--expected-revision',
    '1',
    '--idempotency-key',
    'codex-component-reparent-canvas-surface',
  ]);

  assert.equal(command.kind, 'component_reparent');
  assert.equal(command.componentId, 'SYS-WEB-CANVAS-SURFACE-STRATEGY');
  assert.equal(command.parentComponentId, 'SYS-WEB-APP-PLUGINS');
  assert.equal(command.expectedRevision, 1);
});

test('parseArgs builds a scoped component revise command with ownership deltas', () => {
  const command = parseArgs([
    'component',
    'revise',
    '--design',
    'R1-1D-API-GOVERNANCE-OWNERSHIP-CLOSEOUT-20260810',
    '--component',
    'SYS-API-DOCS',
    '--status',
    'superseded',
    '--owned-concern',
    'Retired API-local documentation ownership.',
    '--remove-owns',
    'apps/api/docs/**',
    '--remove-owns',
    'apps/api/docs/legacy/**',
    '--remove-excludes',
    'apps/api/docs/generated/**',
    '--remove-excludes',
    'apps/api/docs/archive/**',
    '--responsibility',
    'Publish typed API application errors.',
    '--non-goal',
    'Translate errors into HTTP responses.',
    '--reason-to-change',
    'Application failure semantics change.',
    '--public-api',
    'RunControlUnavailableError',
    '--invariant',
    'Every unavailable run control has a typed reason.',
    '--transition',
    'Runtime denial becomes a typed application failure.',
    '--consumer',
    'HTTP error translation',
    '--source-ref',
    'docs/architecture/components/api/index.md',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
    '--expected-revision',
    '0',
    '--idempotency-key',
    'codex-component-revise-api-docs',
  ]);

  assert.equal(command.kind, 'component_revise');
  assert.equal(command.designId, 'R1-1D-API-GOVERNANCE-OWNERSHIP-CLOSEOUT-20260810');
  assert.equal(command.componentId, 'SYS-API-DOCS');
  assert.equal(command.status, 'superseded');
  assert.equal(command.ownedConcern, 'Retired API-local documentation ownership.');
  assert.deepEqual(command.removeOwns, ['apps/api/docs/**', 'apps/api/docs/legacy/**']);
  assert.deepEqual(command.removeExcludes, [
    'apps/api/docs/generated/**',
    'apps/api/docs/archive/**',
  ]);
  assert.deepEqual(command.responsibilities, ['Publish typed API application errors.']);
  assert.deepEqual(command.nonGoals, ['Translate errors into HTTP responses.']);
  assert.deepEqual(command.reasonsToChange, ['Application failure semantics change.']);
  assert.deepEqual(command.publicApi, ['RunControlUnavailableError']);
  assert.deepEqual(command.invariants, ['Every unavailable run control has a typed reason.']);
  assert.deepEqual(command.transitions, ['Runtime denial becomes a typed application failure.']);
  assert.deepEqual(command.consumers, ['HTTP error translation']);
  assert.equal(command.expectedRevision, 0);
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
  assert.equal(Object.hasOwn(planned.definition, 'rawUnit'), false);
  assert.equal(Object.hasOwn(planned.definition, 'owns'), false);
  assert.equal(Object.hasOwn(planned.definition, 'publicApi'), false);
  assert.deepEqual(planned.ownershipPatterns, [
    {
      componentId: 'SYS-RUNTIME-ENGINE-ADMISSION',
      patternKind: 'owns',
      pattern: 'packages/@dvt/engine/src/admission/**',
      patternOrder: 0,
    },
  ]);
  assert.deepEqual(
    planned.semanticItems.filter((item) => item.itemKind === 'public_api'),
    [
      {
        componentId: 'SYS-RUNTIME-ENGINE-ADMISSION',
        itemKind: 'public_api',
        itemValue: 'CreateGovernanceComponent',
        itemOrder: 0,
      },
    ]
  );
  assert.equal(planned.audit.operationType, 'component_create');
  assert.equal(planned.audit.componentId, 'SYS-RUNTIME-ENGINE-ADMISSION');
});

test('component reparent planner emits imported component update and audit row', () => {
  const now = new Date('2026-06-16T10:00:00.000Z');
  const command = parseArgs([
    'component',
    'reparent',
    '--component',
    'SYS-WEB-CANVAS-SURFACE-STRATEGY',
    '--parent',
    'SYS-WEB-APP-PLUGINS',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
  ]);

  const planned = planComponentReparentOperation({
    command,
    parentUnit: {
      unit_id: 'SYS-WEB-APP-PLUGINS',
      level: 'component',
      root_unit: 'SYS-DVT',
      domain_unit: 'SYS-WEB',
    },
    existingComponent: {
      component_id: 'SYS-WEB-CANVAS-SURFACE-STRATEGY',
      parent_id: 'SYS-WEB-ROOT',
      raw_component: { unitReferences: [{ id: 'SYS-WEB-CANVAS-SURFACE-STRATEGY' }] },
    },
    parentPathRows: [
      { unit_id: 'SYS-DVT' },
      { unit_id: 'SYS-WEB' },
      { unit_id: 'SYS-WEB-ROOT' },
      { unit_id: 'SYS-WEB-APP-PLUGINS' },
    ],
    latestOperation: { resulting_revision: 2 },
    operationId: 'op-component-reparent',
    now,
  });

  assert.equal(planned.definition.componentId, 'SYS-WEB-CANVAS-SURFACE-STRATEGY');
  assert.equal(planned.definition.parentComponentId, 'SYS-WEB-APP-PLUGINS');
  assert.deepEqual(planned.definition.unitPath, [
    'SYS-DVT',
    'SYS-WEB',
    'SYS-WEB-ROOT',
    'SYS-WEB-APP-PLUGINS',
    'SYS-WEB-CANVAS-SURFACE-STRATEGY',
  ]);
  assert.equal(planned.definition.rawComponent.parent, 'SYS-WEB-APP-PLUGINS');
  assert.equal(planned.audit.operationType, 'component_reparent');
  assert.equal(planned.audit.previousRevision, 2);
  assert.equal(planned.audit.resultingRevision, 3);
});

test('component reparent planner rejects descendant parent cycles', () => {
  const command = parseArgs([
    'component',
    'reparent',
    '--component',
    'SYS-WEB-APP-PLUGINS',
    '--parent',
    'SYS-WEB-CANVAS-SURFACE-STRATEGY',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.throws(
    () =>
      planComponentReparentOperation({
        command,
        parentUnit: {
          unit_id: 'SYS-WEB-CANVAS-SURFACE-STRATEGY',
          level: 'component',
          root_unit: 'SYS-DVT',
          domain_unit: 'SYS-WEB',
        },
        existingComponent: {
          component_id: 'SYS-WEB-APP-PLUGINS',
          parent_id: 'SYS-WEB-ROOT',
          raw_component: { unitReferences: [{ id: 'SYS-WEB-APP-PLUGINS' }] },
        },
        parentPathRows: [
          { unit_id: 'SYS-DVT' },
          { unit_id: 'SYS-WEB' },
          { unit_id: 'SYS-WEB-ROOT' },
          { unit_id: 'SYS-WEB-APP-PLUGINS' },
          { unit_id: 'SYS-WEB-CANVAS-SURFACE-STRATEGY' },
        ],
        latestOperation: { resulting_revision: 2 },
        operationId: 'op-component-reparent-cycle',
        now: new Date('2026-06-16T10:00:00.000Z'),
      }),
    /cannot be reparented under its own descendant SYS-WEB-CANVAS-SURFACE-STRATEGY/
  );
});

test('component revise planner overlays imported semantics under design scope', () => {
  const command = parseArgs([
    'component',
    'revise',
    '--design',
    'R1-1D-API-GOVERNANCE-OWNERSHIP-CLOSEOUT-20260810',
    '--component',
    'SYS-API-DOCS',
    '--status',
    'superseded',
    '--owned-concern',
    'Retired API-local documentation ownership.',
    '--remove-owns',
    'apps/api/docs/**',
    '--responsibility',
    'Retire API-local documentation ownership.',
    '--public-api',
    'Documentation disposition record',
    '--invariant',
    'Superseded components retain an audited disposition.',
    '--transition',
    'coverage-required to superseded',
    '--consumer',
    'Documentation governance',
    '--source-ref',
    'docs/architecture/components/api/index.md',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
    '--expected-revision',
    '0',
  ]);

  const planned = planComponentReviseOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    designScopes: [
      {
        subject_kind: 'component',
        subject_id: 'SYS-API-DOCS',
        scope_kind: 'may_update',
      },
    ],
    existingComponent: {
      component_id: 'SYS-API-DOCS',
      name: 'API local documentation',
      level: 'component',
      parent_id: 'SYS-API-ROOT',
      root_unit: 'SYS-DVT',
      domain_unit: 'SYS-API',
      status: 'coverage-required',
      children_required: false,
      owns: ['apps/api/docs/**'],
      excludes: [],
      owned_concern: null,
      responsibilities: [],
      non_goals: [],
      reasons_to_change: [],
      ddd_owner: 'INFRA',
      cq_rails: 'none - API local documentation',
      public_api: [],
      invariants: [],
      transitions: [],
      consumers: [],
      governance_refs: ['docs/DOCS_README.md'],
      fowler_signals: ['coverage refinement'],
      revision: 0,
    },
    latestOperation: null,
    operationId: 'op-component-revise',
    now: new Date('2026-08-10T20:00:00.000Z'),
  });

  assert.equal(planned.definition.status, 'superseded');
  assert.equal(planned.definition.ownedConcern, 'Retired API-local documentation ownership.');
  assert.equal(planned.definition.revision, 1);
  assert.deepEqual(planned.definition.responsibilities, [
    'Retire API-local documentation ownership.',
  ]);
  assert.deepEqual(planned.definition.publicApi, ['Documentation disposition record']);
  assert.deepEqual(planned.definition.invariants, [
    'Superseded components retain an audited disposition.',
  ]);
  assert.deepEqual(planned.definition.transitions, ['coverage-required to superseded']);
  assert.deepEqual(planned.definition.consumers, ['Documentation governance']);
  assert.deepEqual(planned.ownershipPatterns, []);
  assert.deepEqual(
    planned.semanticItems.filter((item) => item.itemKind === 'governance_ref'),
    [
      {
        componentId: 'SYS-API-DOCS',
        itemKind: 'governance_ref',
        itemValue: 'docs/DOCS_README.md',
        itemOrder: 0,
      },
    ]
  );
  assert.equal(planned.audit.operationType, 'component_revise');
  assert.equal(planned.audit.previousRevision, 0);
  assert.equal(planned.audit.resultingRevision, 1);
});

test('component create writer stores component lists in relational tables', async () => {
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
    '--excludes',
    'packages/@dvt/engine/src/admission/README.md',
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
  const planned = planComponentCreateOperation({
    command,
    parentUnit: {
      unit_id: 'SYS-RUNTIME-ENGINE-CORE',
      name: 'Runtime engine core',
      level: 'component',
      root_unit: 'SYS-DVT',
      domain_unit: 'SYS-RUNTIME',
    },
    existingComponent: null,
    operationId: 'op-component-create',
    now,
  });
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };

  await writePlannedComponentCreateOperation(client, planned);

  const definitionInsert = queries.find((query) =>
    query.sql.includes('governance_component_local_definitions')
  );
  assert.ok(definitionInsert);
  assert.doesNotMatch(definitionInsert.sql, /owns, excludes/);
  assert.doesNotMatch(definitionInsert.sql, /public_api/);
  assert.ok(
    queries.some((query) => query.sql.includes('governance_component_local_ownership_patterns'))
  );
  assert.ok(
    queries.some((query) => query.sql.includes('governance_component_local_semantic_items'))
  );
});

test('component reparent writer stores imported overlay and audit row', async () => {
  const command = parseArgs([
    'component',
    'reparent',
    '--component',
    'SYS-WEB-CANVAS-SURFACE-STRATEGY',
    '--parent',
    'SYS-WEB-APP-PLUGINS',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
  ]);
  const planned = planComponentReparentOperation({
    command,
    parentUnit: { unit_id: 'SYS-WEB-APP-PLUGINS', level: 'component' },
    existingComponent: {
      component_id: 'SYS-WEB-CANVAS-SURFACE-STRATEGY',
      raw_component: {},
    },
    parentPathRows: [{ unit_id: 'SYS-WEB-ROOT' }, { unit_id: 'SYS-WEB-APP-PLUGINS' }],
    latestOperation: null,
    operationId: 'op-component-reparent',
    now: new Date('2026-06-16T10:00:00.000Z'),
  });
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };

  await writePlannedComponentReparentOperation(client, planned);

  assert.ok(
    !queries.some((query) =>
      query.sql.includes('update planning_query_store.governance_components')
    )
  );
  const overlayUpsert = queries.find((query) =>
    query.sql.includes('governance_component_reparent_overrides')
  );
  assert.ok(overlayUpsert);
  assert.match(overlayUpsert.sql, /on conflict \(component_id\) do update/);
  assert.deepEqual(JSON.parse(overlayUpsert.params[4]), [
    'SYS-WEB-ROOT',
    'SYS-WEB-APP-PLUGINS',
    'SYS-WEB-CANVAS-SURFACE-STRATEGY',
  ]);
  assert.ok(queries.some((query) => query.sql.includes('governance_component_local_operations')));
});

test('component reparent writer updates local definitions when the component is DB-authored', async () => {
  const command = parseArgs([
    'component',
    'reparent',
    '--component',
    'SYS-WEB-CANVAS-SURFACE-STRATEGY',
    '--parent',
    'SYS-WEB-APP-PLUGINS',
    '--source-ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
  ]);
  const planned = planComponentReparentOperation({
    command,
    parentUnit: {
      unit_id: 'SYS-WEB-APP-PLUGINS',
      level: 'component',
      root_unit: 'SYS-DVT',
      domain_unit: 'SYS-WEB',
    },
    existingComponent: {
      source_kind: 'local',
      component_id: 'SYS-WEB-CANVAS-SURFACE-STRATEGY',
      revision: 4,
    },
    parentPathRows: [{ unit_id: 'SYS-WEB-ROOT' }, { unit_id: 'SYS-WEB-APP-PLUGINS' }],
    latestOperation: null,
    operationId: 'op-component-reparent-local',
    now: new Date('2026-06-16T10:00:00.000Z'),
  });
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };

  await writePlannedComponentReparentOperation(client, planned);

  const update = queries.find((query) =>
    query.sql.includes('update planning_query_store.governance_component_local_definitions')
  );
  assert.ok(update);
  assert.equal(update.params[1], 'SYS-WEB-APP-PLUGINS');
  assert.equal(update.params[2], 'SYS-DVT');
  assert.equal(update.params[3], 'SYS-WEB');
  assert.equal(update.params[6], 5);
});

test('component revise writer atomically replaces the effective DB override', async () => {
  const planned = {
    definition: {
      componentId: 'SYS-API-DOCS',
      sourcePath: 'docs/architecture/components/api/index.md',
      sourceContentSha256: 'a'.repeat(64),
      revision: 1,
      name: 'API local documentation',
      level: 'component',
      parentComponentId: 'SYS-API-ROOT',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-API',
      status: 'superseded',
      childrenRequired: false,
      ownedConcern: 'API local documentation.',
      dddOwner: 'INFRA',
      cqRails: 'none - API local documentation',
      createdBy: 'codex',
      createdAt: '2026-08-10T20:00:00.000Z',
    },
    ownershipPatterns: [],
    semanticItems: [],
    audit: {
      operationId: 'op-component-revise',
      idempotencyKey: 'codex-component-revise-api-docs',
      operationType: 'component_revise',
      actor: 'codex',
      componentId: 'SYS-API-DOCS',
      sourcePath: 'docs/architecture/components/api/index.md',
      sourceContentSha256: 'a'.repeat(64),
      expectedRevision: 0,
      previousRevision: 0,
      resultingRevision: 1,
      payload: {},
      createdAt: '2026-08-10T20:00:00.000Z',
    },
  };
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };

  await writePlannedComponentReviseOperation(client, planned);

  assert.ok(
    queries.some(
      (query) =>
        query.sql.includes('governance_component_local_definitions') &&
        query.sql.includes('on conflict (component_id) do update')
    )
  );
  assert.ok(
    queries.some((query) =>
      query.sql.includes(
        'delete from planning_query_store.governance_component_local_ownership_patterns'
      )
    )
  );
  assert.ok(
    queries.some((query) =>
      query.sql.includes(
        'delete from planning_query_store.governance_component_local_semantic_items'
      )
    )
  );
  assert.deepEqual(
    queries
      .filter((query) => query.sql.includes('refresh materialized view'))
      .map((query) => query.sql.trim()),
    [
      'refresh materialized view planning_query_store.component_engineering_component_tree_projection',
      'refresh materialized view planning_query_store.component_engineering_file_ownership_projection',
      'refresh materialized view planning_query_store.component_engineering_rule_evaluation_projection',
    ]
  );
  assert.ok(queries.some((query) => query.sql.includes('governance_component_local_operations')));
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
