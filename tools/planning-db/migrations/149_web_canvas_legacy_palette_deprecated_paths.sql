-- Removed Canvas fixed-palette files are deprecated evidence, not active
-- ownership patterns. Active ownership stays with CanvasViewport,
-- CanvasContextMenuView, and useCanvasContextMenuPresenter.

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT'
  and pattern_kind = 'owns'
  and pattern in (
    'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
    'apps/web/src/app/views/canvas/CanvasAddNodePalette.test.tsx',
    'apps/web/src/app/views/canvas/canvasTransformationTemplateCatalog.ts',
    'apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog.ts'
  );

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'owns',
  'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
  0
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'non_goal',
    'Do not recreate retired source path apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx.',
    0
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'non_goal',
    'Do not recreate retired test path apps/web/src/app/views/canvas/CanvasAddNodePalette.test.tsx.',
    1
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'non_goal',
    'Do not recreate retired template catalog apps/web/src/app/views/canvas/canvasTransformationTemplateCatalog.ts.',
    2
  ),
  (
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'non_goal',
    'Do not recreate retired template catalog apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog.ts.',
    3
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
