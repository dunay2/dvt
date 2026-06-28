-- Reconcile Canvas background context-menu gaps and evidence into relational
-- read models. Component summaries must not rely on JSON list counts as the
-- source of truth for gaps or validation evidence.

alter table planning_query_store.frontend_component_validation_evidence
  drop constraint if exists frontend_component_validation_evidence_kind_check;

alter table planning_query_store.frontend_component_validation_evidence
  add constraint frontend_component_validation_evidence_kind_check
  check (evidence_kind in (
    'unit-test',
    'presentation-test',
    'architecture-test',
    'integration-test',
    'e2e-test'
  ));

update planning_query_store.frontend_component_local_components
set
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'gapSourceOfTruth', 'planning_query_store.frontend_component_capability_gap_query',
    'evidenceSourceOfTruth', 'planning_query_store.frontend_component_validation_evidence_query'
  ),
  source_path = 'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
  source_content_sha256 = md5('canvas-context-menu-gap-evidence-reconcile:local-components:357'),
  updated_at = now()
where component_id in (
  'web.component.canvas.CanvasAddNodeCatalog',
  'web.component.canvas.CanvasBackgroundContextMenu',
  'web.component.canvas.CanvasContextMenu',
  'web.component.canvas.CanvasSettings'
);

insert into planning_query_store.frontend_component_capability_gaps (
  component_id,
  gap_id,
  gap_kind,
  gap_status,
  description,
  owning_task_id,
  raw_gap,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'CANVAS-ADD-NODE-CATALOG-CATEGORIZED-SEARCH',
    'missing-context-panel',
    'planned',
    'Add... currently opens a minimal categorized menu; a searchable component catalog remains the target component behavior.',
    null,
    jsonb_build_object(
      'parentComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'launchRail', 'OpenCanvasAddNodeCatalog',
      'creationRailAfterSelection', 'CreateCanvasAuthoringNode'
    ),
    'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
    md5('gap:CanvasAddNodeCatalog:categorized-search:357')
  ),
  (
    'web.component.canvas.CanvasSettings',
    'CANVAS-SETTINGS-OWNED-COMPONENT-FILES',
    'component-ownership',
    'planned',
    'Canvas settings is reachable from the background menu but still needs owned component files and tests.',
    null,
    jsonb_build_object(
      'parentComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'launchRail', 'OpenCanvasSettings'
    ),
    'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
    md5('gap:CanvasSettings:owned-component-files:357')
  )
on conflict (component_id, gap_id) do update set
  gap_kind = excluded.gap_kind,
  gap_status = excluded.gap_status,
  description = excluded.description,
  owning_task_id = excluded.owning_task_id,
  raw_gap = excluded.raw_gap,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_capability_gaps
set
  gap_status = 'closed',
  description = 'Canvas background no longer exposes PreviewExecutionPlan; preview/run ownership is represented outside the background context menu.',
  raw_gap = coalesce(raw_gap, '{}'::jsonb) || jsonb_build_object(
    'closedBy', 'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
    'backgroundRootActions', jsonb_build_array('Add...', 'Canvas settings')
  ),
  source_path = 'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
  source_content_sha256 = md5('gap:CanvasBackgroundContextMenu:preview-action-closed:357'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasBackgroundContextMenu'
  and gap_id = 'CANVAS-PREVIEW-ACTION-BELONGS-TO-RUN-PREVIEW';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasContextMenu',
    'EV-CANVAS-CONTEXT-MENU-PRESENTATION-TEMPLATE',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'RenderCanvasContextMenu',
    'host',
    'CanvasContextMenuView renders the host template from sections and delegates actions without owning command decisions.',
    jsonb_build_object('fileRole', 'presentation-test'),
    'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
    md5('evidence:CanvasContextMenu:presentation-template:357')
  ),
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'EV-CANVAS-ADD-NODE-CATALOG-MODEL-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
    'OpenCanvasAddNodeCatalog',
    'canvas-background',
    'Add... opens an add-node catalog model and moves source import inside that catalog when the source import rail is available.',
    jsonb_build_object('parentComponentId', 'web.component.canvas.CanvasBackgroundContextMenu'),
    'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
    md5('evidence:CanvasAddNodeCatalog:model-unit:357')
  ),
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'EV-CANVAS-ADD-NODE-CATALOG-VIEWPORT-INTEGRATION',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
    'OpenCanvasAddNodeCatalog',
    'canvas-background',
    'Viewport integration proves right-click background opens Add... first and then resolves Add source from the catalog with spatial coordinates.',
    jsonb_build_object('parentComponentId', 'web.component.canvas.CanvasBackgroundContextMenu'),
    'tools/planning-db/migrations/357_canvas_background_context_menu_gap_evidence_reconcile.sql',
    md5('evidence:CanvasAddNodeCatalog:viewport-integration:357')
  )
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
