-- Complete query-visible evidence for the phantom panel retirement so
-- component-profile shows the current governing design, not only the older
-- reactivation and duplicate-resolution records.

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'component', 'SYS-WEB-CANVAS-INSPECTOR-PANEL', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'path', 'tools/planning-db/migrations/228_retire_canvas_node_workbench_panel_phantom_reactivation.sql', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619', 'path', 'tools/planning-db/migrations/229_sanitize_canvas_node_workbench_panel_drift_relations.sql', 'may_reference', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component_observability
set
  signal_name = 'Canvas node workbench panel is observable as a deprecated phantom component through component-profile, component-integrity, and migration evidence; active presentation files are owned by overlay and inspector components.',
  signal_kind = 'dashboard',
  required = true,
  status = 'implemented'
where observability_id = 'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-COMPONENT-PROFILE';
