-- Retire the stale DB-local feature manifest for the superseded Canvas node
-- workbench panel. The component remains as deprecated audit evidence, but the
-- feature rail must not keep nonexistent CanvasNodeWorkbenchPanel files alive.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Retire Canvas node workbench panel feature manifest',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The DB-local WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619 feature manifest can outlive the component retirement and reintroduce source-drift against CanvasNodeWorkbenchPanel.tsx. This migration removes that obsolete command/query manifest while preserving the superseded audit-only component record.',
  'boundary_drift',
  'ValidateSourceDrift;ValidateRailVocabulary;CheckFeatureMechanizationImplementation',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
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
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
    'query',
    'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
    'evidence',
    'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'may_delete',
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL'
  and pattern in (
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
  );

delete from planning_query_store.governance_component_files
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL'
  and path in (
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
  cq_rails = 'none - feature manifest retired',
  source_path = 'tools/planning-db/migrations/239_retire_canvas_node_workbench_panel_feature_manifest.sql',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'tools/planning-db/migrations/239_retire_canvas_node_workbench_panel_feature_manifest.sql'
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
  public_contract = 'Deprecated audit-only component. CanvasNodeWorkbenchPanel.tsx is not tracked; active presentation uses SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  status = 'deprecated',
  maturity_score = null,
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';
