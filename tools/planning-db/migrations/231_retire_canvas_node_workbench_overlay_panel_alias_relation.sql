-- Remove the active duplicate relation that still pointed the Canvas node
-- workbench overlay at the superseded phantom panel component. Relation rows
-- have no deprecated state, so the governed duplicate-removal pattern is to
-- keep the canonical relation and delete the obsolete alias.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-RELATION-DEDUP-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Deduplicate Canvas node workbench overlay panel relation',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The Canvas node workbench overlay had both a canonical dependency on SYS-WEB-CANVAS-INSPECTOR-PANEL and a legacy dependency on the superseded SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL phantom component. Because architecture.component_relation has no deprecated state, this migration keeps the canonical overlay-to-inspector relation and removes the obsolete overlay-to-panel alias.',
  'boundary_drift',
  'RecordArchitectureRelation;ValidateComponentIntegrity;ReadArchitectureRelations',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619',
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

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-RELATION-DEDUP-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-RELATION-DEDUP-20260619',
    'component',
    'SYS-WEB-CANVAS-INSPECTOR-PANEL',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-RELATION-DEDUP-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-RELATION-DEDUP-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-RELATION-DEDUP-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL',
    'may_delete',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component_relation
set
  source_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
  target_component_id = 'SYS-WEB-CANVAS-INSPECTOR-PANEL',
  relation_type = 'depends_on',
  direction = 'outbound',
  sync_async = 'sync',
  contract_id = null,
  status = 'implemented',
  failure_mode = 'Canonical overlay to InspectorPanel dependency kept after phantom panel retirement and legacy alias removal.',
  authorization_scope = 'browser-local Canvas node workbench presentation',
  source_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/components/InspectorPanel.tsx',
    'tools/planning-db/migrations/231_retire_canvas_node_workbench_overlay_panel_alias_relation.sql'
  ),
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL';

delete from architecture.component_relation relation
where relation.relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL';

update architecture.component_observability
set
  signal_name = 'Phantom panel retirement is observable through component-integrity and component-profile; active overlay presentation keeps only the canonical InspectorPanel dependency.'
where observability_id = 'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT';
