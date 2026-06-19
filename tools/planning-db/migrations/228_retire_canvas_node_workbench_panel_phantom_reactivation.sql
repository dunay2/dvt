-- Retire the DB-local reactivation of SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL.
-- The expected CanvasNodeWorkbenchPanel.tsx file is not tracked. The real
-- active surfaces are CanvasNodeWorkbenchOverlay.tsx and InspectorPanel.tsx.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  supersedes_id,
  approved_at
)
values (
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Retire phantom Canvas node workbench panel reactivation',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The Planning DB contained a later reactivation design for SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL, but the declared CanvasNodeWorkbenchPanel.tsx and CanvasNodeWorkbenchPanel.test.tsx files are not tracked. Existing active files already resolve to SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL. This migration retires the phantom component boundary and redirects the overlay dependency to the real inspector component.',
  'boundary_drift',
  'RecordArchitectureComponent;RecordArchitectureRelation;ValidateComponentIntegrity',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
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
  supersedes_id = excluded.supersedes_id,
  approved_at = excluded.approved_at,
  updated_at = now();

update architecture.design
set
  status = 'superseded',
  rationale = rationale || ' Superseded by PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619 because the reactivated panel file is not tracked.',
  updated_at = now()
where design_id = 'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619';

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded phantom component. CanvasNodeWorkbenchPanel.tsx is not tracked; overlay presentation is owned by SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and InspectorPanel.tsx is owned by SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  cq_rails = 'none - superseded phantom component',
  source_path = 'tools/planning-db/migrations/228_retire_canvas_node_workbench_panel_phantom_reactivation.sql',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'tools/planning-db/migrations/228_retire_canvas_node_workbench_panel_phantom_reactivation.sql'
      limit 1
    ),
    source_content_sha256
  ),
  revision = greatest(revision, 1) + 1
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component
set
  owner = 'CanvasNodeWorkbenchDuplicateResolution',
  repo_path = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  public_contract = 'Deprecated phantom component. CanvasNodeWorkbenchPanel.tsx is not tracked; use SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  status = 'deprecated',
  maturity_score = null,
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component_responsibility
set
  responsibility = 'Superseded phantom component retained only for audit.',
  reason_to_change = 'Reactivated panel path is absent; active behavior belongs to overlay and inspector components.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  status = 'drift'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.contract
set
  contract_ref = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  compatibility = 'internal',
  status = 'deprecated',
  validation_command = 'pnpm planning:db:query component-integrity --no-refresh --limit 120',
  updated_at = now()
where owner_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component_relation
set
  status = 'drift',
  failure_mode = 'Superseded phantom panel relation. Active overlay presentation depends on SYS-WEB-CANVAS-INSPECTOR-PANEL instead.',
  source_refs = jsonb_build_array(
    'tools/planning-db/migrations/228_retire_canvas_node_workbench_panel_phantom_reactivation.sql'
  ),
  updated_at = now()
where relation_id in (
  'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
  'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL'
);

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
  'SYS-WEB-CANVAS-INSPECTOR-PANEL',
  'depends_on',
  'outbound',
  'sync',
  'Overlay handoff breaks if InspectorPanel ownership moves without updating Canvas node workbench relations.',
  'browser-local Canvas node workbench presentation',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/components/InspectorPanel.tsx',
    'tools/planning-db/migrations/228_retire_canvas_node_workbench_panel_phantom_reactivation.sql'
  ),
  'implemented'
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

update architecture.component_test
set
  test_path = 'scripts/planning-db-migrate.test.cjs',
  test_kind = 'architecture',
  coverage_level = 'boundary',
  required = true,
  validation_command = 'node --test scripts/planning-db-migrate.test.cjs'
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'Phantom panel retirement is observable through component-integrity and component-profile; active overlay and inspector files remain mapped to their real components.',
  'dashboard',
  true,
  'implemented'
)
on conflict (observability_id) do update set
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
