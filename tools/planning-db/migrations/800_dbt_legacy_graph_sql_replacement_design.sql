-- Extend the DBT graph SQL authority design for pre-marker workspaces.
-- Unmarked divergent SQL is information-theoretically ambiguous: it may be a
-- historical Canvas projection or an external edit. The browser must therefore
-- require an explicit, revision-bound replacement decision instead of guessing.

update architecture.design
set
  status = 'review',
  rationale = rationale || E'\n\nUpgrade correction: an unmarked divergent model file cannot be classified safely from bytes alone. Preview must expose an explicit replacement confirmation bound to the observed file revision and proposed graph payload. Cancellation preserves every file; a changed file or graph invalidates the authorization; malformed managed markers remain non-replaceable.',
  approved_at = null,
  updated_at = now()
where design_id = 'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.tsx', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'test', 'TEST-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, maturity_score, parent_component_id
)
values (
  'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'DBT graph SQL replacement confirmation',
  'ui-view',
  'ui',
  'GraphSqlReplacementConfirmationDialog',
  'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.tsx',
  'GraphSqlReplacementConfirmationDialog',
  'browser',
  'high',
  'proposed',
  70,
  'SYS-WEB-CANVAS-DIALOGS-RECOVERY-PLAYGROUND'
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
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values (
  'RESP-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'Present ambiguous pre-marker DBT model paths and emit only confirm or cancel intent from a supplied semantic contract.',
  'The user-facing graph SQL replacement confirmation changes.',
  'GraphSqlReplacementConfirmationDialog',
  'proposed'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction, negative_tests, status
)
values (
  'PORT-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'confirmGraphSqlReplacement',
  'ui-action',
  'inbound',
  array[
    'confirmation writes files directly',
    'cancellation preserves pending authorization',
    'a malformed managed marker is offered for replacement',
    'unlocalized authority text is rendered'
  ],
  'proposed'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-WEB-CANVAS-MODAL-HOST-CONTAINS-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'SYS-WEB-CANVAS-DIALOGS-RECOVERY-PLAYGROUND',
    'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'contains',
    'outbound',
    'sync',
    'The confirmation view acquires orchestration or workspace-file write authority.',
    'authorized graph-draft Canvas scope',
    jsonb_build_array('CanvasModalHost', 'canvasModalHostPropsBuilder'),
    'proposed'
  ),
  (
    'REL-WEB-CANVAS-GRAPH-SQL-CONFIRMATION-AUTHORIZES-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'calls',
    'outbound',
    'async',
    'A stale or graph-mismatched authorization replaces a workspace file.',
    'authorized graph-draft Canvas scope; exact path and revisions only',
    jsonb_build_array('useCanvasPlanActionHandler', 'publishGraphDbtWorkspaceArtifacts'),
    'proposed'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'tools/planning-db/migrations/800_dbt_legacy_graph_sql_replacement_design.sql',
  repeat(md5('SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION:800'), 2),
  0,
  'DBT graph SQL replacement confirmation',
  'component',
  'SYS-WEB-CANVAS-DIALOGS-RECOVERY-PLAYGROUND',
  'SYS-DVT',
  'SYS-WEB',
  'review',
  false,
  'Own passive confirmation presentation for ambiguous pre-marker DBT model SQL paths.',
  'GraphSqlReplacementConfirmationDialog',
  '',
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
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'invariant', 'Unmarked divergent SQL is replaceable only with explicit authorization bound to its observed content SHA-256 and the exact proposed managed-content SHA-256.', 3),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'invariant', 'Malformed or payload-mismatched graph-managed SQL is never eligible for legacy replacement.', 4),
  ('SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION', 'invariant', 'The view receives paths and callbacks; it does not classify SQL, read files, publish artifacts, or own command/query rails.', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION', 'invariant', 'Visible copy is localized and confirmation explains that existing bytes will be replaced by Canvas authority.', 1),
  ('SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION', 'non_goal', 'Infer file provenance or perform workspace-file persistence.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION', 'owns', 'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.tsx', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION', 'owns', 'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphSqlReplacementConfirmationDialog',
  'GraphSqlReplacementConfirmationDialog',
  'modal',
  'planned',
  'create',
  'Frontend / Canvas DBT publication',
  'Render one localized confirm-or-cancel dialog from supplied ambiguous SQL paths.',
  '@dvt/web',
  '/canvas',
  'dbt',
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'architectureComponentId', 'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'presentationOnly', true,
    'stateOwner', false,
    'cqRails', jsonb_build_array()
  ),
  'tools/planning-db/migrations/800_dbt_legacy_graph_sql_replacement_design.sql',
  md5('component:GraphSqlReplacementConfirmationDialog:planned:800')
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

do $$
declare
  canonical_save_rail_count integer;
  false_leaf_rail_count integer;
begin
  select count(*) into canonical_save_rail_count
  from planning_query_store.command_query_rail_query
  where rail_name = 'SaveWorkspaceFileContent'
    and rail_type = 'command'
    and rail_status <> 'retired';

  if canonical_save_rail_count <> 1 then
    raise exception 'Legacy graph SQL replacement requires exactly one SaveWorkspaceFileContent command, found %', canonical_save_rail_count;
  end if;

  select count(*) into false_leaf_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.GraphSqlReplacementConfirmationDialog';

  if false_leaf_rail_count <> 0 then
    raise exception 'Passive graph SQL replacement confirmation must not claim command/query rails';
  end if;
end
$$;
