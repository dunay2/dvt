-- Close the Phase 4 authority gap discovered by the live Preview proof.
-- PreviewExecutionPlan remains the product command. This migration models an
-- internal authority strategy that resolves its graph and selection from the
-- active semantic authority instead of assuming graph-draft storage.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'may_reference', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'component', 'SYS-PLANNER-EXECUTABLE-SUBGRAPH', 'may_reference', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'contract', 'PlanPreviewProvenance.v1', 'may_update', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'path', 'apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts', 'may_create', true),
  ('DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'path', 'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY',
  'Preview selection authority resolver',
  'service',
  'application',
  'Execution Plan',
  'apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts',
  'PreviewExecutionPlan internal authority strategy',
  'node',
  'critical',
  'proposed',
  'SYS-API-APPLICATION-SERVICES'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY',
  'tools/planning-db/migrations/698_dbt_preview_authority_resolution_design.sql',
  repeat(md5('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY:698'), 2),
  0,
  'Preview selection authority resolver',
  'component',
  'SYS-API-APPLICATION-SERVICES',
  'SYS-DVT',
  'SYS-API-ROOT',
  'review',
  false,
  'Resolve the executable Preview graph and selected closure from exactly one authorized Canvas authority without trusting browser graph semantics.',
  'PreviewSelectionAuthorityResolver',
  'PreviewExecutionPlan;ProjectDbtGraphFromFiles;BuildDbtPlannerGraphSource',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change, ddd_owner, status
)
values (
  'RESP-PREVIEW-SELECTION-AUTHORITY',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY',
  'Resolve and verify one server-authoritative executable graph and closure for PreviewExecutionPlan.',
  'Preview authority modes or their authoritative selection-validation policy changes.',
  'PreviewSelectionAuthorityResolver',
  'proposed'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  (
    'REL-PREVIEW-SELECTION-AUTHORITY-READS-DBT-PROJECTION',
    'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY',
    'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
    'reads',
    'outbound',
    'async',
    'CONTRACT-PLAN-PREVIEW-PROVENANCE-V1',
    'Missing authority, stale revision, stale analysis, target drift, or unknown selected resources reject Preview.',
    'workspace:graph-draft:preview',
    jsonb_build_array('ProjectDbtGraphFromFiles', 'PreviewExecutionPlan'),
    'proposed'
  ),
  (
    'REL-PREVIEW-SELECTION-AUTHORITY-USES-SUBGRAPH',
    'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY',
    'SYS-PLANNER-EXECUTABLE-SUBGRAPH',
    'calls',
    'outbound',
    'sync',
    null,
    'Invalid graph-draft selection rejects Preview without falling back to another authority.',
    'workspace:graph-draft:preview',
    jsonb_build_array('PreviewExecutionPlan'),
    'proposed'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-PREVIEW-SELECTION-AUTHORITY',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY',
  'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts',
  'unit',
  'boundary',
  true,
  'pnpm --filter dvt-api exec vitest run test/application/services/resolveAuthorizedPreviewSelection.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'owns', 'apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts', 0),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'owns', 'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'invariant', 'Graph-draft Preview derives closure only from the authorized persisted graph draft.', 0),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'invariant', 'dbt-project-files Preview re-queries ProjectDbtGraphFromFiles and never reads or falls back to graph-draft semantics.', 1),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'invariant', 'The server rejects browser graph semantics that differ from the current authoritative dbt projection, revision, analysis, target, or selected resource set.', 2),
  ('SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'non_goal', 'Create a new product command/query rail or mutate either authority.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'invariant',
  'dbt file provenance identifies the bound canvas as well as project root, immutable revision, analysis, selection, and server-owned execution target.',
  2
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
