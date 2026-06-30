-- Neutralize an external feature-manifest rehydration for the Canvas node
-- workbench panel. The rail points at CanvasNodeWorkbenchPanel.tsx, which is
-- not tracked in this branch.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-REHYDRATION-NEUTRALIZATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Neutralize Canvas node workbench panel feature manifest rehydration',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'An external feature-manifest rehydration restored InspectCanvasNodeProperties with source_path apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx. The file is not tracked in this branch, so the rail is removed and the panel remains audit-only deprecated evidence.',
  'boundary_drift',
  'ValidateRailVocabulary;ValidateSourceDrift;ValidateComponentIntegrity',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619',
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
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-REHYDRATION-NEUTRALIZATION-20260619',
    'query',
    'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-REHYDRATION-NEUTRALIZATION-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

delete from planning_query_store.feature_mechanization_local_rails
where rail_id = 'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties'
   or feature_id = 'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619'
   or source_path in (
     'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
     'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
   );

delete from planning_query_store.governance_files
where path in (
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
);

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded audit-only component. CanvasNodeWorkbenchPanel.tsx and CanvasNodeWorkbenchPanel.test.tsx are not tracked; active overlay presentation is owned by SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  cq_rails = 'none - superseded feature manifest rehydration',
  source_path = 'tools/planning-db/migrations/236_neutralize_canvas_panel_feature_manifest_rehydration.sql',
  revision = greatest(revision, 1) + 1
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component
set
  owner = 'CanvasNodeWorkbenchDuplicateResolution',
  repo_path = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  public_contract = 'Deprecated audit-only component. CanvasNodeWorkbenchPanel.tsx is not tracked; active presentation uses SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  status = 'deprecated',
  maturity_score = null,
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';
