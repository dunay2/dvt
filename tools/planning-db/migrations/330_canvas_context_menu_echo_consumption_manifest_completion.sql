-- Complete the DB-first feature mechanization manifest inserted by migration
-- 329. Migration 329 was already applied in local development, so this patch
-- keeps rebuilds deterministic without editing an applied migration checksum.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#consumePendingPaneClickEcho',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#isNearPosition',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#consumePendingPaneClickEcho',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql',
    'tools/planning-db/migrations/330_canvas_context_menu_echo_consumption_manifest_completion.sql'
  ),
  governing_sources = jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql',
    'tools/planning-db/migrations/330_canvas_context_menu_echo_consumption_manifest_completion.sql'
  ),
  architecture_guards = jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Canvas context menu echo consumption repair|tracked migrations complete Canvas context menu echo repair manifest" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  completion_gate = jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Canvas context menu echo consumption repair|tracked migrations complete Canvas context menu echo repair manifest" scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  source_path = 'tools/planning-db/migrations/330_canvas_context_menu_echo_consumption_manifest_completion.sql',
  source_content_sha256 = repeat('c', 64),
  raw_rail = jsonb_build_object(
    'name', 'ResolveCanvasContextMenu',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'CanvasContextMenuReadModel'
  ),
  raw_manifest = jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
      'planning-db://task/E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
      'buzon/TAREA.TXT'
    ),
    'userStories', jsonb_build_array(
      'Canvas right-click keeps the contextual menu open through browser echo events.',
      'A later intentional background click closes the contextual menu instead of being ignored by stale echo state.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql',
      'tools/planning-db/migrations/330_canvas_context_menu_echo_consumption_manifest_completion.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/archive/**',
      'buzon/**',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#gesture_lifecycle',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#pane_echo_state'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveCanvasContextMenu',
        'type', 'query',
        'dddOwner', 'CanvasContextMenuReadModel',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasContextMenuReadModel',
        'type', 'query read model',
        'owner', 'Canvas workbench'
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuPresenter',
        'type', 'interaction presenter',
        'owner', 'Canvas workbench'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'browser_gesture_contract',
      'hidden_authority',
      'presentation_logic_separation'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'Canvas context-menu echo lifecycle',
        'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
      ),
      jsonb_build_object(
        'name', 'Planning DB migration registry',
        'command', 'node --test --test-name-pattern "tracked migrations register Canvas context menu echo consumption repair|tracked migrations complete Canvas context menu echo repair manifest" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'N/A - presenter lifecycle regression covered below browser E2E',
        'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-context-menu-consumed-document-echo',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx --testNamePattern "later click at the context point"',
        'expectedFailure', 'A later click at the original context point remains ignored after the document pointer echo was consumed.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
      )
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
        'cypressCoverage', 'not_applicable: presenter lifecycle regression',
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
        'cypressCoverage', 'not_applicable: presenter lifecycle regression',
        'unitTests',
          jsonb_build_array('apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx')
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'node --test --test-name-pattern "tracked migrations register Canvas context menu echo consumption repair|tracked migrations complete Canvas context menu echo repair manifest" scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id =
  'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql#E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1#query#001#resolvecanvascontextmenu';
