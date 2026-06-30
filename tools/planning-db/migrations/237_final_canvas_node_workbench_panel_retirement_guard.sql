-- Final guard for the Canvas node workbench panel retirement. Local DB refreshes
-- and parallel migrations can rehydrate the missing CanvasNodeWorkbenchPanel
-- files after earlier retirement migrations; this guard runs last and restores
-- the canonical audit-only component state.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Guard final Canvas node workbench panel retirement',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The Planning DB can receive later local rehydrations for CanvasNodeWorkbenchPanel.tsx even though the current filesystem has no such source or test files. This guard runs after those historical repairs and leaves SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL as audit-only deprecated evidence, with active behavior owned by SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  'boundary_drift',
  'RecordArchitectureComponent;RecordArchitectureRelation;ValidateComponentIntegrity;ValidateSourceDrift',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-REHYDRATION-NEUTRALIZATION-20260619',
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
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
    'query',
    'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties',
    'may_delete',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.design
set
  status = 'superseded',
  rationale = 'Superseded by PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619 because the active filesystem has no CanvasNodeWorkbenchPanel source or test files.',
  updated_at = now()
where design_id in (
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-POST-IMPORT-AUTHORITY-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PROFILE-REASSERTION-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-EFFECTIVE-REACTIVATION-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619'
);

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

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'responsibility',
    'Superseded audit-only Canvas node workbench panel; no tracked implementation files exist in this branch.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'reason_to_change',
    'Only changes when a governed migration reintroduces real CanvasNodeWorkbenchPanel implementation files.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'governance_ref',
    'tools/planning-db/migrations/237_final_canvas_node_workbench_panel_retirement_guard.sql',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'fowler_signal',
    'boundary_drift',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'transition',
    'Retirement remains in force until tracked CanvasNodeWorkbenchPanel source and test files exist.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded audit-only component. CanvasNodeWorkbenchPanel.tsx and CanvasNodeWorkbenchPanel.test.tsx are not tracked; active overlay presentation is owned by SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  cq_rails = 'none - final retirement guard',
  source_path = 'tools/planning-db/migrations/237_final_canvas_node_workbench_panel_retirement_guard.sql',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'tools/planning-db/migrations/237_final_canvas_node_workbench_panel_retirement_guard.sql'
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

update architecture.component_responsibility
set
  responsibility = 'Superseded audit-only component retained to document neutralized CanvasNodeWorkbenchPanel rehydrations.',
  reason_to_change = 'A real implementation would require tracked CanvasNodeWorkbenchPanel source and test files plus governed ownership.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  status = 'implemented'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.contract
set
  contract_ref = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  compatibility = 'internal',
  status = 'implemented',
  validation_command = 'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL --no-refresh --limit 80',
  updated_at = now()
where owner_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

delete from architecture.component_port
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

delete from architecture.component_relation
where relation_id in (
  'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
  'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL'
);

update architecture.component_test
set
  test_path = 'scripts/planning-db-migrate.test.cjs',
  test_kind = 'architecture',
  coverage_level = 'boundary',
  required = true,
  validation_command = 'node --test scripts/planning-db-migrate.test.cjs'
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component_observability
set
  signal_name = 'Neutralized Canvas node workbench panel retirement is observable through component-profile, files query absence, source-drift, and migration evidence.',
  required = true,
  status = 'implemented'
where observability_id in (
  'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-COMPONENT-PROFILE',
  'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT'
);

delete from planning_query_store.governance_files
where path in (
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
);
