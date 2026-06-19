-- Reconcile the active Canvas contextual workbench panel after branch integration.
-- The panel is functional and tracked. The duplicate feature-local
-- ResolveCanvasContextMenu row stays deprecated because the canonical query rail
-- is already owned by the Canvas workbench command/query catalog.

drop table if exists pg_temp.web_canvas_contextual_workbench_panel_map;

create temporary table web_canvas_contextual_workbench_panel_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

insert into web_canvas_contextual_workbench_panel_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values (
  'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL',
  'Canvas contextual workbench panel',
  'CanvasShellContextualWorkbenchPanel',
  'ComposeCanvasShellChrome;ReadCanvasShellContextualWorkbench',
  'Owns the active Canvas contextual workbench panel shell that renders a side workbench without replacing the graph.',
  'Render the shell-owned contextual workbench panel, header, close action, and child content slot from Canvas shell contextual workbench state without owning context-menu read-model or project-code editor semantics.',
  'Canvas contextual workbench panel presentation, close affordance, header copy, shell layout sizing, or panel slot accessibility changes.',
  'CanvasContextualWorkbenchPanel.tsx is active presentation code. It must remain mapped to this component and must not be deprecated to hide duplicate ResolveCanvasContextMenu rail evidence.',
  'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx',
  'Canvas contextual workbench panel presentation adapter contract.',
  'presentation_model',
  array['CanvasContextualWorkbenchPanel', 'CanvasContextualWorkbenchPanelProps']::text[],
  array['apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx']::text[],
  array[
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.graphSurface.test.tsx'
  ]::text[],
  'integration',
  'behavior',
  'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx src/app/views/canvas/CanvasShell.graphSurface.test.tsx',
  'ReadCanvasShellContextualWorkbench',
  'query',
  array['panel treated as context-menu read model', 'close action bypasses shell state', 'graph replaced by contextual panel']::text[],
  82,
  'high',
  'PANEL'
);

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Reconcile active Canvas contextual workbench panel ownership',
  'Architecture / Planning DB',
  'implemented',
  'After integrating the Canvas contextual project-code branch, CanvasContextualWorkbenchPanel.tsx is tracked and functional but only covered by SYS-WEB-ROOT. The existing SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH component is a composite requiring child ownership, so this migration creates a concrete panel leaf and corrects stale duplicate-rail deprecation metadata without reactivating a semantic duplicate of ResolveCanvasContextMenu.',
  'boundary_drift',
  'ComposeCanvasShellChrome;ReadCanvasShellContextualWorkbench;ResolveCanvasContextMenu',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
    'component',
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
    'query',
    'local#CANVAS-CONTEXTUAL-PROJECT-CODE-20260619#query#resolvecanvascontextmenu',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
    'relation',
    'REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-PANEL',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-RECONCILE-20260619',
    'relation',
    'REL-WEB-CANVAS-SHELL-COMPOSITION-DEPENDS-ON-CONTEXTUAL-WORKBENCH-PANEL',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'tools/planning-db/migrations/224_web_canvas_contextual_workbench_panel_reconcile.sql',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = web_canvas_contextual_workbench_panel_map.repo_path
      limit 1
    ),
    md5(component_id || ':224') || md5(repo_path || cq_rails || ':web-canvas-contextual-workbench-panel')
  ),
  0,
  name,
  'component',
  'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_canvas_contextual_workbench_panel_map
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  owned.path,
  owned.path_order - 1
from web_canvas_contextual_workbench_panel_map
cross join lateral unnest(owns) with ordinality as owned(path, path_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'invariant', invariant, 0
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'transition', 'review -> implemented after component-profile shows the panel path, tests, port, relation, and stale rail deprecation correction.', 0
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'consumer', 'Canvas shell maintainers, Planning DB component-profile readers, component-integrity, and changed-slice checks', 0
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/graph/canvas-shell-component.md', 1
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md', 2
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'invariant', 'ReadCanvasShellContextualWorkbench consumes shell state; ResolveCanvasContextMenu remains the canonical context-menu read-model query and is not implemented by the panel.', 1
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'non_goal', 'Do not own CodeWorkbench, Canvas context-menu model construction, node inspection, or graph mutation semantics.', 0
  from web_canvas_contextual_workbench_panel_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_canvas_contextual_workbench_panel_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'ui-view',
  'ui',
  ddd_owner,
  repo_path,
  public_contract,
  'browser',
  criticality,
  'review',
  maturity_score,
  'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH'
from web_canvas_contextual_workbench_panel_map
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
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from web_canvas_contextual_workbench_panel_map
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-SURFACE',
  'type',
  component_id,
  repo_path || '#CanvasContextualWorkbenchPanelProps',
  'internal',
  'implemented',
  validation_command
from web_canvas_contextual_workbench_panel_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-' || relation_suffix,
  'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this active contextual workbench panel is removed or remapped without a governed Planning DB component update.',
  'repo-local Web Canvas governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from web_canvas_contextual_workbench_panel_map
union all
select
  'REL-WEB-CANVAS-SHELL-COMPOSITION-DEPENDS-ON-CONTEXTUAL-WORKBENCH-PANEL',
  'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
  component_id,
  'depends_on',
  'outbound',
  'sync',
  'CONTRACT-' || component_id || '-SURFACE',
  'CanvasShellMainPanel imports the panel; removing the panel without updating shell composition breaks contextual workbench rendering.',
  'browser-local Canvas shell chrome',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
    repo_path,
    'docs/architecture/components/web/graph/canvas-shell-component.md'
  ),
  'implemented'
from web_canvas_contextual_workbench_panel_map
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  port_kind,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  'CONTRACT-' || component_id || '-SURFACE',
  negative_tests,
  'implemented'
from web_canvas_contextual_workbench_panel_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  'TEST-' || component_id || '-' || test_path.path_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from web_canvas_contextual_workbench_panel_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, path_order)
union all
select
  'TEST-SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL-COMPONENT-PROFILE',
  'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL --no-refresh --limit 80 && pnpm planning:db:query files --path apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-COMPONENT-PROFILE',
  component_id,
  name || ' is observable through component-profile, filesystem ownership, and Canvas shell contextual workbench tests.',
  'dashboard',
  true,
  'implemented'
from web_canvas_contextual_workbench_panel_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update planning_query_store.feature_mechanization_local_rails rail
set
  rail_status = 'deprecated',
  raw_rail = (
    coalesce(rail.raw_rail, '{}'::jsonb)
    - 'deprecatedSourcePaths'
    - 'deprecationPolicy'
    - 'completionGateHardenedBy'
    - 'completionGatePolicy'
  ) || jsonb_build_object(
    'status', 'deprecated',
    'activePresentationComponent', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL',
    'activePresentationSourcePath', 'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx',
    'currentImplementationSourcePath', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'canonicalRailSources', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md'
    ),
    'sourcePathReconciledBy', '224_web_canvas_contextual_workbench_panel_reconcile',
    'deprecationPolicy', 'Deprecated because this feature-local ResolveCanvasContextMenu row duplicates the canonical Canvas context-menu query rail. CanvasContextualWorkbenchPanel.tsx is active and tracked as SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL, but it is a presentation adapter and not the query rail implementation.'
  ),
  raw_manifest = (
    coalesce(rail.raw_manifest, '{}'::jsonb)
    - 'deprecatedSourcePaths'
    - 'deprecationPolicy'
    - 'completionGateHardenedBy'
    - 'completionGatePolicy'
  ) || jsonb_build_object(
    'activePresentationComponent', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL',
    'activePresentationSourcePath', 'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx',
    'currentImplementationSourcePath', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'canonicalRailSources', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md'
    ),
    'sourcePathReconciledBy', '224_web_canvas_contextual_workbench_panel_reconcile',
    'deprecationPolicy', 'Deprecated because this feature-local ResolveCanvasContextMenu row duplicates the canonical Canvas context-menu query rail. CanvasContextualWorkbenchPanel.tsx is active and tracked as SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL, but it is a presentation adapter and not the query rail implementation.'
  ),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_id = 'local#CANVAS-CONTEXTUAL-PROJECT-CODE-20260619#query#resolvecanvascontextmenu'
  and rail.rail_status = 'deprecated';

drop table if exists pg_temp.web_canvas_contextual_workbench_panel_map;
