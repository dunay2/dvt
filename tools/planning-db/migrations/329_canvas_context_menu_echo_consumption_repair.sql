-- Register the Canvas context-menu echo-consumption repair as DB-first rail
-- evidence for ResolveCanvasContextMenu.

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
  'CANVAS-CONTEXT-MENU-ECHO-CONSUMPTION-REPAIR-20260626',
  'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1',
  'Canvas context-menu echo consumption repair',
  'Frontend / Canvas',
  'implemented',
  'The Canvas context menu suppresses browser echo events after a pane context-menu open. Review evidence showed the document pointer echo could be consumed without clearing the pending echo state, causing a later click at the original context point to be ignored. The presenter now consumes that pending state exactly when the document echo is handled, preserving intentional outside-click dismissal.',
  'hidden_authority',
  'ResolveCanvasContextMenu',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by,
  created_at,
  updated_at
)
values (
  'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql#E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1#query#001#resolvecanvascontextmenu',
  'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1',
  'implemented',
  'ResolveCanvasContextMenu',
  'resolvecanvascontextmenu',
  'query',
  'CanvasContextMenuReadModel',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#consumePendingPaneClickEcho',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#isNearPosition',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#consumePendingPaneClickEcho',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql'
  ),
  '[]'::jsonb,
  jsonb_build_array(
    'AGENTS.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Canvas context menu echo consumption repair" scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql',
  repeat('b', 64),
  jsonb_build_object(
    'rail', 'ResolveCanvasContextMenu',
    'type', 'query',
    'owner', 'CanvasContextMenuReadModel'
  ),
  jsonb_build_object(
    'featureId', 'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'railName', 'ResolveCanvasContextMenu',
        'railType', 'query',
        'dddOwner', 'CanvasContextMenuReadModel',
        'status', 'implemented'
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql'
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'consumePendingPaneClickEcho',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('Explicit Policy', 'Guard Clause'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'cypressCoverage', 'N/A - presenter lifecycle regression',
        'unitTests',
          jsonb_build_array('apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx')
      ),
      jsonb_build_object(
        'name', 'useCanvasContextMenuPresenter',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('Presenter', 'Guard Clause'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'cypressCoverage', 'N/A - presenter lifecycle regression',
        'unitTests',
          jsonb_build_array('apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx')
      )
    )
  ),
  0,
  'codex',
  now(),
  now()
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
