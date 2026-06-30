-- Close command/query vocabulary gaps only where implementation evidence is
-- already present, and retire the archived ADR-0000 traceability rail instead
-- of keeping an active nonfunctional declaration.

with implemented_rails(
  rail_name,
  rail_type,
  ddd_owner,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  implementation_note
) as (
  values
    (
      'AppendRunEventsCommand',
      'command',
      'Engine state store',
      jsonb_build_array(
        'packages/@dvt/engine/src/ports/IRunStateStore.ts#appendAndEnqueueTx',
        'packages/@dvt/engine/src/ports/IRunStateStore.ts#appendTransitions',
        'packages/@dvt/adapter-postgres/src/runStateCommandPortBridge.ts#appendTransitions',
        'packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/runtime-and-contracts/run-events-hash-partitioning-plan-20260513.md',
        'docs/architecture/components/engine/contracts/state-store/IRunStateStore.v1.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/architecture/components/engine/contracts/state-store/IRunStateStore.v1.md'
      ),
      jsonb_build_array(
        'IRunStateStore append authority',
        'RunStateCommandPort adapter bridge',
        'Postgres run event store'
      ),
      jsonb_build_array(
        'Append path must remain tenant scoped and idempotent.',
        'Duplicate event appends must keep existing dedup semantics.'
      ),
      jsonb_build_array(
        'pnpm --filter @dvt/adapter-postgres test -- PostgresRunEventStore.test.ts runStateCommandPortBridge.test.ts'
      ),
      'Existing state-store append ports implement the documented AppendRunEventsCommand rail.'
    ),
    (
      'GetPlanRecordByRef',
      'query',
      'Plan record read model',
      jsonb_build_array(
        'packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts#getPlanRecordByRef',
        'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts#getPlanRecordByRef',
        'packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts#getPlanRecordByRef'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
        'docs/architecture/components/engine/contracts/plan-store-records-component.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/contracts/planner/plan-store-records-v1.md'
      ),
      jsonb_build_array(
        'IPlanStoreReader query port',
        'Postgres plan-store adapter'
      ),
      jsonb_build_array(
        'Scoped PlanRef lookup must reject mismatched metadata.',
        'Cross-tenant existence must not leak through planRef lookups.'
      ),
      jsonb_build_array(
        'pnpm --filter @dvt/adapter-postgres test -- PostgresPlanStore.records-core.integration.test.ts'
      ),
      'Plan-store read port and Postgres adapter implement the scoped PlanRef read model.'
    ),
    (
      'QueryPlanningOpenTasks',
      'query',
      'Planning query store',
      jsonb_build_array(
        'tools/planning-db/migrations/007_planning_open_task_views.sql#planning_open_tasks',
        'scripts/planning-db-query.cjs#readOpenTaskRows',
        'scripts/planning-db-query.test.cjs#readOpenTaskRows'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/post-merge-planning-closeout-drift-problem-20260508.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/planning/status/governance-document-rule-inventory.md'
      ),
      jsonb_build_array(
        'pnpm planning:db:query open',
        'planning_query_store.planning_open_tasks'
      ),
      jsonb_build_array(
        'Open-task status logic must stay in the DB view, not duplicated in CLI code.'
      ),
      jsonb_build_array(
        'node --test scripts/planning-db-query.test.cjs'
      ),
      'The Planning DB open-task view and query CLI implement the QueryPlanningOpenTasks rail.'
    ),
    (
      'QueryPlanningNextTasks',
      'query',
      'Planning query store',
      jsonb_build_array(
        'tools/planning-db/migrations/008_planning_next_task_views.sql#planning_next_tasks',
        'tools/planning-db/migrations/040_planning_next_task_claim_boundary.sql#planning_next_tasks',
        'scripts/planning-db-query.cjs#readNextTaskRows',
        'scripts/planning-db-query.test.cjs#readNextTaskRows'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/post-merge-planning-closeout-drift-problem-20260508.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/planning/status/governance-document-rule-inventory.md'
      ),
      jsonb_build_array(
        'pnpm planning:db:query next',
        'planning_query_store.planning_next_tasks'
      ),
      jsonb_build_array(
        'Next-task routing must respect dependency and claim recovery boundaries.'
      ),
      jsonb_build_array(
        'node --test scripts/planning-db-query.test.cjs'
      ),
      'The Planning DB next-task view and query CLI implement the QueryPlanningNextTasks rail.'
    ),
    (
      'SubdivideRuntimeGovernanceRoot',
      'command',
      'SYS-RUNTIME-ROOT runtime component model',
      jsonb_build_array(
        'tools/planning-db/migrations/147_api_runtime_adapter_component_authority.sql#runtime_components',
        'tools/planning-db/migrations/150_temporal_dbt_plugin_imported_leaf_reconciliation.sql'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md',
        'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/planning/status/governance-document-rule-inventory.md'
      ),
      jsonb_build_array(
        'planning_query_store.governance_component_local_definitions',
        'architecture.component'
      ),
      jsonb_build_array(
        'Runtime root must have governed leaf components before files are assigned.'
      ),
      jsonb_build_array(
        'pnpm planning:db:query component-integrity --no-refresh --limit 120',
        'pnpm planning:db:query component-quality --no-refresh --limit 260'
      ),
      'Runtime component subdivision is implemented by the component authority migrations.'
    ),
    (
      'ValidateEngineCoverageScopeContract',
      'query',
      'CI tool contract tests',
      jsonb_build_array(
        'tools/ci/scope-config.mjs#TEST_SCOPE_PATTERNS',
        'tools/ci/workflow-pattern-parity.test.mjs#engine coverage scope',
        'tools/ci/root-test-runner-config.test.mjs#engine coverage thresholds',
        'package.json#test:coverage:engine'
      ),
      jsonb_build_array(
        'docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md',
        'docs/planning/proposals/mandatory/governance-and-docs/ci-audit-engine-coverage-plan-20260515.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md'
      ),
      jsonb_build_array(
        'node --test tools/ci/*.test.mjs',
        'pnpm test:coverage:engine'
      ),
      jsonb_build_array(
        'Coverage relevant patterns must include engine workspace policy.',
        'Root test runner config must keep engine coverage thresholds explicit.'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs tools/ci/root-test-runner-config.test.mjs'
      ),
      'CI tool tests and coverage scripts implement the engine coverage scope contract rail.'
    )
)
update planning_query_store.command_query_rails rail
set
  ddd_owner = implemented.ddd_owner,
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  implementation_refs = implemented.implementation_refs,
  documentation_refs = implemented.documentation_refs,
  governing_sources = implemented.governing_sources,
  allowed_implementation_surfaces = implemented.allowed_implementation_surfaces,
  architecture_guards = implemented.architecture_guards,
  completion_gate = implemented.completion_gate,
  raw_rail = rail.raw_rail || jsonb_build_object(
    'status',
    'implemented',
    'dddOwner',
    implemented.ddd_owner,
    'implementationRefs',
    implemented.implementation_refs,
    'implementationNote',
    implemented.implementation_note,
    'reconciledBy',
    '152_reconcile_implemented_and_archived_gap_rails'
  ),
  raw_manifest = rail.raw_manifest || jsonb_build_object(
    'mechanizationStatus',
    'implemented',
    'implementationRefs',
    implemented.implementation_refs,
    'governingSources',
    implemented.governing_sources
  )
from implemented_rails implemented
where rail.rail_name = implemented.rail_name
  and rail.rail_type = implemented.rail_type;

update planning_query_store.command_query_rails rail
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  implementation_refs = '[]'::jsonb,
  governing_sources = jsonb_build_array(
    'docs/archive/planning/proposals/ci-adr0-owner-consolidation-plan-20260511.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  architecture_guards = jsonb_build_array(
    'Archived planning proposal rails are not active product rails.'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'
  ),
  raw_rail = rail.raw_rail || jsonb_build_object(
    'status',
    'retired',
    'retirementReason',
    'RunAdr0TraceabilityGate is sourced only from docs/archive and is no longer an active CI command rail.',
    'reconciledBy',
    '152_reconcile_implemented_and_archived_gap_rails'
  ),
  raw_manifest = rail.raw_manifest || jsonb_build_object(
    'mechanizationStatus',
    'closed',
    'retirementReason',
    'Archived ADR-0000 traceability proposal rail retired from active vocabulary.'
  )
where rail.rail_name = 'RunAdr0TraceabilityGate'
  and rail.rail_type = 'command'
  and rail.source_path like 'docs/archive/%';
