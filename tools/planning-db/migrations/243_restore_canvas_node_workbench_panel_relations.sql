-- Restore active Canvas node workbench panel relations after the retirement
-- merge reconciliation. These relations close architecture maturity evidence
-- for the reactivated component and make component-profile show how the panel
-- belongs to the Canvas node workbench boundary.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-RELATION-RESTORE-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Restore Canvas node workbench panel relations',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The active Canvas node workbench panel needs declared contains and overlay dependency relations so architecture maturity evidence matches the implemented files, ports, tests, and feature manifest.',
  'responsibility_overload',
  'InspectCanvasNodeProperties;ConfigureCanvasDbtNode;ConfigureCanvasDvtNode',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619',
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
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-RELATION-RESTORE-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-RELATION-RESTORE-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-RELATION-RESTORE-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
values
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'contains',
    'outbound',
    'sync',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    'Node workbench falls back to the generic inspector if the panel is removed without a governed replacement.',
    'browser-local Canvas node workbench',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
    ),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    'Contextual node overlay cannot render node metadata without the panel component.',
    'browser-local Canvas node workbench',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
    ),
    'implemented'
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
