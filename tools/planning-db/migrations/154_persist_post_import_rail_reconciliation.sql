-- Persist rail reconciliations in DB-local authority so governance imports do
-- not re-open historical vocabulary gaps. Imported archive-only rails are
-- treated as retired in the canonical query surface instead of active gaps.

drop table if exists pg_temp.local_implemented_rail_reconciliation;

create temporary table local_implemented_rail_reconciliation (
  feature_id text not null,
  rail_name text not null,
  rail_type text not null,
  ddd_owner text not null,
  source_path text not null,
  implementation_refs jsonb not null,
  documentation_refs jsonb not null,
  governing_sources jsonb not null,
  allowed_implementation_surfaces jsonb not null,
  architecture_guards jsonb not null,
  completion_gate jsonb not null,
  implementation_note text not null
);

insert into local_implemented_rail_reconciliation (
  feature_id,
  rail_name,
  rail_type,
  ddd_owner,
  source_path,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  implementation_note
)
values
  (
    'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
    'AppendRunEventsCommand',
    'command',
    'Engine state store',
    'docs/planning/proposals/mandatory/runtime-and-contracts/run-events-hash-partitioning-plan-20260513.md',
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
    jsonb_build_array('IRunStateStore append authority', 'RunStateCommandPort adapter bridge'),
    jsonb_build_array('Append path must remain tenant scoped and idempotent.'),
    jsonb_build_array('pnpm --filter @dvt/adapter-postgres test -- PostgresRunEventStore.test.ts runStateCommandPortBridge.test.ts'),
    'Existing state-store append ports implement the documented AppendRunEventsCommand rail.'
  ),
  (
    'S08-SCOPED-ARTIFACT-PORT-CLOSURE-20260509',
    'GetPlanRecordByRef',
    'query',
    'Plan record read model',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    jsonb_build_array(
      'packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts#getPlanRecordByRef',
      'packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts#getPlanRecordByRef',
      'packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts#getPlanRecordByRef'
    ),
    jsonb_build_array(
      'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
      'docs/architecture/components/engine/contracts/plan-store-records-component.md'
    ),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/contracts/planner/plan-store-records-v1.md'),
    jsonb_build_array('IPlanStoreReader query port', 'Postgres plan-store adapter'),
    jsonb_build_array('Scoped PlanRef lookup must reject mismatched metadata.'),
    jsonb_build_array('pnpm --filter @dvt/adapter-postgres test -- PostgresPlanStore.records-core.integration.test.ts'),
    'Plan-store read port and Postgres adapter implement the scoped PlanRef read model.'
  ),
  (
    'POST-MERGE-PLANNING-CLOSEOUT-GUARDRAIL-20260508',
    'QueryPlanningOpenTasks',
    'query',
    'Planning query store',
    'docs/planning/proposals/mandatory/governance-and-docs/post-merge-planning-closeout-drift-problem-20260508.md',
    jsonb_build_array(
      'tools/planning-db/migrations/007_planning_open_task_views.sql#planning_open_tasks',
      'scripts/planning-db-query.cjs#readOpenTaskRows',
      'scripts/planning-db-query.test.cjs#readOpenTaskRows'
    ),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/post-merge-planning-closeout-drift-problem-20260508.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/planning/status/governance-document-rule-inventory.md'),
    jsonb_build_array('pnpm planning:db:query open', 'planning_query_store.planning_open_tasks'),
    jsonb_build_array('Open-task status logic must stay in the DB view, not duplicated in CLI code.'),
    jsonb_build_array('node --test scripts/planning-db-query.test.cjs'),
    'The Planning DB open-task view and query CLI implement QueryPlanningOpenTasks.'
  ),
  (
    'POST-MERGE-PLANNING-CLOSEOUT-GUARDRAIL-20260508',
    'QueryPlanningNextTasks',
    'query',
    'Planning query store',
    'docs/planning/proposals/mandatory/governance-and-docs/post-merge-planning-closeout-drift-problem-20260508.md',
    jsonb_build_array(
      'tools/planning-db/migrations/008_planning_next_task_views.sql#planning_next_tasks',
      'tools/planning-db/migrations/040_planning_next_task_claim_boundary.sql#planning_next_tasks',
      'scripts/planning-db-query.cjs#readNextTaskRows',
      'scripts/planning-db-query.test.cjs#readNextTaskRows'
    ),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/post-merge-planning-closeout-drift-problem-20260508.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/planning/status/governance-document-rule-inventory.md'),
    jsonb_build_array('pnpm planning:db:query next', 'planning_query_store.planning_next_tasks'),
    jsonb_build_array('Next-task routing must respect dependency and claim recovery boundaries.'),
    jsonb_build_array('node --test scripts/planning-db-query.test.cjs'),
    'The Planning DB next-task view and query CLI implement QueryPlanningNextTasks.'
  ),
  (
    'SYS-GOV-UNIT-INDEX',
    'SubdivideRuntimeGovernanceRoot',
    'command',
    'SYS-RUNTIME-ROOT runtime component model',
    'docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md',
    jsonb_build_array(
      'tools/planning-db/migrations/147_api_runtime_adapter_component_authority.sql#runtime_components',
      'tools/planning-db/migrations/150_temporal_dbt_plugin_imported_leaf_reconciliation.sql'
    ),
    jsonb_build_array(
      'docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
    ),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/planning/status/governance-document-rule-inventory.md'),
    jsonb_build_array('planning_query_store.governance_component_local_definitions', 'architecture.component'),
    jsonb_build_array('Runtime root must have governed leaf components before files are assigned.'),
    jsonb_build_array('pnpm planning:db:query component-integrity --no-refresh --limit 120'),
    'Runtime component subdivision is implemented by the component authority migrations.'
  ),
  (
    'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
    'ValidateEngineCoverageScopeContract',
    'query',
    'CI tool contract tests',
    'docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md',
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
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md'),
    jsonb_build_array('node --test tools/ci/*.test.mjs', 'pnpm test:coverage:engine'),
    jsonb_build_array('Coverage relevant patterns must include engine workspace policy.'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs tools/ci/root-test-runner-config.test.mjs'),
    'CI tool tests and coverage scripts implement the engine coverage scope contract rail.'
  ),
  (
    'ARCH-DEPS-GUARD',
    'ApplyArchitectureDependencyBoundaryGate',
    'command',
    'Repository CI governance baseline',
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-dependency-boundary-guard-implementation-plan-20260502.md',
    jsonb_build_array(
      '.github/workflows/pr-quality-gate.yml#Validate architecture dependency boundaries',
      'package.json#arch:deps',
      'tools/ci/check-architecture-dependencies.mjs',
      'tools/ci/architecture-dependency-guard.test.mjs'
    ),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/architecture-dependency-boundary-guard-implementation-plan-20260502.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('pnpm arch:deps', 'PR Quality Gate'),
    jsonb_build_array('PR quality gate and local scripts must both run pnpm arch:deps.'),
    jsonb_build_array('node --test tools/ci/architecture-dependency-guard.test.mjs', 'pnpm arch:deps'),
    'The architecture dependency guard is wired through package.json and the PR Quality Gate.'
  ),
  (
    'CI-GOV-PARITY',
    'ApplyPrQualityGovernanceParity',
    'command',
    'Repository CI governance baseline',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md',
    jsonb_build_array('.github/workflows/pr-quality-gate.yml', 'tools/ci/workflow-pattern-parity.test.mjs'),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('PR Quality Gate', 'pnpm verify:prepush governance subset'),
    jsonb_build_array('Remote PR quality workflow must cover the governed prepush subset.'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs'),
    'CI governance parity is enforced by the PR quality workflow and parity test.'
  ),
  (
    'CI-GOV-PARITY',
    'ApplyWorkflowDependencyPins',
    'command',
    'Workflow dependency policy',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md',
    jsonb_build_array('.github/workflows/create-labels.yml', '.github/workflows/docs-deploy.yml', 'tools/ci/workflow-pattern-parity.test.mjs'),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('GitHub workflow action pins', 'docs builder dependency pin'),
    jsonb_build_array('Workflow action and docs builder references must stay pinned.'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs'),
    'Workflow dependency pins are applied in tracked GitHub workflow files and guarded by parity tests.'
  ),
  (
    'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
    'CheckWorkflowDependencyPins',
    'query',
    'Workflow dependency policy',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md',
    jsonb_build_array('tools/ci/workflow-pattern-parity.test.mjs#workflow dependency pins'),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs'),
    jsonb_build_array('Unpinned governed workflow dependencies must fail the parity test.'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs'),
    'The workflow-pattern parity test implements the dependency pin query.'
  ),
  (
    'CI-GOV-PARITY',
    'ApplyContractsWorkflowCredentialPosture',
    'command',
    'Contracts workflow runtime credential posture',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md',
    jsonb_build_array('.github/workflows/contracts.yml', 'tools/ci/workflow-pattern-parity.test.mjs'),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('Contracts workflow runtime credential derivation'),
    jsonb_build_array('Contracts workflow must not reintroduce reusable PostgreSQL password literals.'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs'),
    'Contracts workflow credential posture is applied in contracts.yml and guarded by parity tests.'
  ),
  (
    'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
    'CheckContractsWorkflowCredentialPosture',
    'query',
    'Contracts workflow runtime credential posture',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md',
    jsonb_build_array('tools/ci/workflow-pattern-parity.test.mjs#contracts workflow credential posture'),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs'),
    jsonb_build_array('Reusable workflow database credentials must be absent.'),
    jsonb_build_array('node --test tools/ci/workflow-pattern-parity.test.mjs'),
    'The workflow-pattern parity test implements the contracts credential posture query.'
  ),
  (
    'CI-PRECOMMIT-LIFECYCLE-DEDUPE',
    'ApplyPrecommitHookLifecycleDedupe',
    'command',
    'Repository Git hook lifecycle',
    'docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md',
    jsonb_build_array('package.json#hooks:precommit', '.husky/pre-commit', 'tools/ci/precommit-hook-wiring.test.mjs'),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('pnpm run hooks:precommit', '.husky/pre-commit'),
    jsonb_build_array('Root package must not define a lifecycle precommit script.'),
    jsonb_build_array('node --test tools/ci/precommit-hook-wiring.test.mjs'),
    'The precommit lifecycle dedupe command is implemented by hooks:precommit wiring.'
  ),
  (
    'CI-PRECOMMIT-LIFECYCLE-DEDUPE',
    'DocumentPrecommitHookLifecycleState',
    'command',
    'Repository CI process guidance',
    'docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md',
    jsonb_build_array(
      'docs/guides/testing-and-ci-capabilities.md#hooks:precommit',
      'docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md'
    ),
    jsonb_build_array(
      'docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md',
      'docs/guides/testing-and-ci-capabilities.md'
    ),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/guides/testing-and-ci-capabilities.md'),
    jsonb_build_array('Testing and CI capabilities guide'),
    jsonb_build_array('Contributor docs must name hooks:precommit, not the obsolete precommit lifecycle path.'),
    jsonb_build_array('node --test tools/ci/precommit-hook-wiring.test.mjs'),
    'The current hook lifecycle is documented in the canonical testing and CI guide.'
  ),
  (
    'GOV-S3-PLANNING-STATE-QUERY-STORE',
    'QueryGovernedFeatureWork',
    'query',
    'DocsDispositionQueue',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md',
    jsonb_build_array(
      'tools/planning-db/migrations/019_planning_work_intake_query.sql#planning_work_intake_query',
      'scripts/planning-db-query.cjs#feature-work',
      'scripts/planning-db-query.test.cjs#readFeatureWorkRows'
    ),
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/planning/status/governance-document-rule-inventory.md'),
    jsonb_build_array('pnpm planning:db:query feature-work', 'planning_query_store.planning_work_intake_query'),
    jsonb_build_array('Governed feature work must come from DB views, not ad hoc document scans.'),
    jsonb_build_array('node --test scripts/planning-db-query.test.cjs'),
    'The Planning DB work-intake query and feature-work CLI implement QueryGovernedFeatureWork.'
  ),
  (
    'AR-D3-WORKER-SCALING-STRATEGY',
    'TemporalWorkerScalingStrategy',
    'query',
    'Runtime / SRE worker topology policy',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d3-worker-scaling-strategy-plan-20260514.md',
    jsonb_build_array(
      'packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts',
      'docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md',
      'docs/runbooks/temporal-worker-scaling-operations.md'
    ),
    jsonb_build_array('docs/planning/proposals/mandatory/runtime-and-contracts/ar-d3-worker-scaling-strategy-plan-20260514.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/adr/ADR-0001-temporal-integration-test-policy.md', 'docs/adr/ADR-0003-execution-model.md'),
    jsonb_build_array('Temporal worker scaling strategy docs', 'Temporal adapter architecture test'),
    jsonb_build_array('Worker scaling docs must not imply a global shared worker pool unsupported by the adapter.'),
    jsonb_build_array('pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts'),
    'The AR-D3 strategy is implemented as an operator policy query guarded by an architecture test.'
  );

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by,
  created_at,
  updated_at
)
select
  'local#post-import-rail-reconciliation#' || feature_id || '#' || rail_type || '#' || lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')) as rail_id,
  feature_id,
  'implemented'::text as mechanization_status,
  rail_name,
  lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')) as normalized_rail_name,
  rail_type,
  ddd_owner,
  'implemented'::text as rail_status,
  implementation_refs as symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  coalesce(
    (select file_ref.content_hash from planning_query_store.governance_files file_ref where file_ref.path = source_path),
    repeat('0', 64)
  ) as source_content_sha256,
  jsonb_build_object(
    'name', rail_name,
    'type', rail_type,
    'status', 'implemented',
    'dddOwner', ddd_owner,
    'implementationRefs', implementation_refs,
    'implementationNote', implementation_note,
    'reconciledBy', '154_persist_post_import_rail_reconciliation'
  ) as raw_rail,
  jsonb_build_object(
    'featureId', feature_id,
    'mechanizationStatus', 'implemented',
    'implementationPlan', 'Planning DB post-import rail reconciliation',
    'sourcePath', source_path,
    'componentGuides', jsonb_build_array(),
    'symbols', jsonb_build_array(),
    'architectureGuards', architecture_guards,
    'completionGate', completion_gate,
    'governingSources', governing_sources
  ) as raw_manifest,
  1 as revision,
  'codex'::text as created_by,
  now() as created_at,
  now() as updated_at
from local_implemented_rail_reconciliation
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_status = excluded.rail_status,
  ddd_owner = excluded.ddd_owner,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails rail
set
  source_path = 'apps/web/src/testing/vitestSuites.architecture.test.ts',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/testing/vitestSuites.architecture.test.ts'
    ),
    rail.source_content_sha256
  ),
  raw_rail = rail.raw_rail || jsonb_build_object(
    'deprecatedSourcePath',
    'apps/web/src/testing/vitestSuites.architecture.support.ts',
    'sourcePathReconciledBy',
    '154_persist_post_import_rail_reconciliation'
  ),
  raw_manifest = rail.raw_manifest || jsonb_build_object(
    'deprecatedSourcePath',
    'apps/web/src/testing/vitestSuites.architecture.support.ts',
    'sourcePath',
    'apps/web/src/testing/vitestSuites.architecture.test.ts'
  ),
  updated_at = now()
where rail.source_path = 'apps/web/src/testing/vitestSuites.architecture.support.ts';

update planning_query_store.feature_mechanization_local_operations operation
set
  source_path = 'apps/web/src/testing/vitestSuites.architecture.test.ts',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/testing/vitestSuites.architecture.test.ts'
    ),
    operation.source_content_sha256
  )
where operation.source_path = 'apps/web/src/testing/vitestSuites.architecture.support.ts';

create or replace view planning_query_store.command_query_rail_query as
with manifest_rails as (
  select
    rail.rail_id,
    rail.feature_id,
    case
      when rail.source_path like 'docs/archive/%' then 'closed'
      else rail.mechanization_status
    end as mechanization_status,
    rail.rail_name,
    rail.normalized_rail_name,
    rail.rail_type,
    rail.ddd_owner,
    case
      when rail.source_path like 'docs/archive/%' then 'retired'
      else rail.rail_status
    end as rail_status,
    rail.symbol_refs,
    rail.implementation_refs,
    rail.documentation_refs,
    rail.implementation_ref_count,
    rail.documentation_ref_count,
    rail.governing_sources,
    rail.allowed_implementation_surfaces,
    rail.architecture_guards,
    rail.completion_gate,
    case
      when rail.source_path like 'docs/archive/%' then false
      else rail.is_gap
    end as is_gap,
    rail.reference_count,
    rail.duplicate_count,
    rail.is_duplicate,
    rail.source_path,
    rail.source_content_sha256,
    rail.raw_rail,
    rail.raw_manifest,
    rail.rail_source,
    rail.imported_at,
    case
      when rail.source_path like 'docs/archive/%' then 5
      when rail.rail_source = 'local' then 0
      when rail.feature_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG' then 1
      when rail.source_path like 'docs/architecture/components/%command-query-catalog.md' then 1
      when rail.source_path like 'docs/architecture/components/%' then 2
      when rail.mechanization_status in ('implemented', 'closed') then 3
      else 4
    end as authority_priority
  from planning_query_store.command_query_rail_manifest_query rail
),
reference_rollup as (
  select
    rail_type,
    normalized_rail_name,
    count(*)::int as reference_count,
    count(*) filter (
      where authority_priority <= 2
        and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
    )::int as canonical_candidate_count,
    jsonb_agg(distinct feature_id order by feature_id) as related_feature_ids,
    jsonb_agg(distinct source_path order by source_path) as related_source_paths
  from manifest_rails
  group by rail_type, normalized_rail_name
),
ranked_canonical_rails as (
  select
    rail.*,
    row_number() over (
      partition by rail.rail_type, rail.normalized_rail_name
      order by
        case when lower(coalesce(rail.rail_status, '')) in ('deprecated', 'retired') then 1 else 0 end,
        case when rail.rail_source = 'local' then 0 else 1 end,
        rail.is_gap,
        rail.authority_priority,
        rail.implementation_ref_count desc,
        rail.documentation_ref_count desc,
        rail.imported_at desc,
        rail.rail_id
    ) as canonical_rank
  from manifest_rails rail
)
select
  rail.rail_id,
  rail.feature_id,
  rail.mechanization_status,
  rail.rail_name,
  rail.normalized_rail_name,
  rail.rail_type,
  rail.ddd_owner,
  rail.rail_status,
  rail.symbol_refs,
  rail.implementation_refs,
  rail.documentation_refs,
  rail.implementation_ref_count,
  rail.documentation_ref_count,
  rail.governing_sources,
  rail.allowed_implementation_surfaces,
  rail.architecture_guards,
  rail.completion_gate,
  rail.is_gap,
  rollup.reference_count,
  rollup.canonical_candidate_count as duplicate_count,
  rollup.canonical_candidate_count > 1 as is_duplicate,
  rollup.related_feature_ids,
  rollup.related_source_paths,
  rail.source_path,
  rail.source_content_sha256,
  rail.raw_rail,
  rail.raw_manifest,
  rail.rail_source,
  rail.imported_at
from ranked_canonical_rails rail
join reference_rollup rollup
  on rollup.rail_type = rail.rail_type
 and rollup.normalized_rail_name = rail.normalized_rail_name
where rail.canonical_rank = 1;
