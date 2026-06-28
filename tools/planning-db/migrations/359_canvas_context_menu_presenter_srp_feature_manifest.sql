-- Complete feature mechanization for the Canvas context-menu presenter SRP
-- split. Migration 358 owns the component inventory; this migration owns the
-- implementation manifest because 358 had already been applied locally before
-- the feature-mechanization guard exposed the missing symbol declarations.

with symbol_rows as (
  select *
  from (
    values
      (
        'clickPreviewExecutionPlanFromOperationalDrawer',
        'apps/web/cypress/support/canvasExecutionSelection.ts',
        jsonb_build_array('PreviewExecutionPlan'),
        'web.component.canvas.RunPreviewSurface'
      ),
      (
        'buildCanvasAddNodeCatalogMenuModel',
        'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
        jsonb_build_array('ResolveCanvasContextMenu', 'CreateCanvasAuthoringNode'),
        'web.component.canvas.CanvasBackgroundContextMenu'
      ),
      (
        'CanvasContextMenuPresenter',
        'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'CloseCanvasContextMenuOptions',
        'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'ContextMenuEvent',
        'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'PaneClickEvent',
        'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'UseCanvasContextMenuPresenterArgs',
        'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'UseCanvasContextMenuPresenterResult',
        'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'isCanvasViewportContextTarget',
        'apps/web/src/app/views/canvas/canvasContextMenuTargetPolicy.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'resolveCanvasViewportContextMenuRequest',
        'apps/web/src/app/views/canvas/canvasContextMenuTargetPolicy.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'CONTEXT_MENU_PANE_CLICK_ECHO_TOLERANCE_PX',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'ContextMenuOpenTargetKind',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'UseCanvasContextMenuLifecycleArgs',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'UseCanvasContextMenuLifecycleResult',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'isNearPosition',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'useCanvasContextMenuLifecycle',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      ),
      (
        'useCanvasContextSurfaceContextMenu',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        jsonb_build_array('ResolveCanvasContextMenu'),
        'web.component.canvas.CanvasContextMenuPresenter'
      )
  ) as row(symbol_name, symbol_path, cq_rails, ddd_owner)
),
symbol_manifest as (
  select
    jsonb_agg(symbol_path || '#' || symbol_name order by symbol_path, symbol_name) as symbol_refs,
    jsonb_agg(
      jsonb_build_object(
        'name', symbol_name,
        'path', symbol_path,
        'cqRails', cq_rails,
        'dddOwner', ddd_owner,
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
          'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts'
        ),
        'fowlerSignals', jsonb_build_array(
          'responsibility_overload',
          'extract_function',
          'separate_presentation_from_policy'
        ),
        'cypressCoverage', 'not_applicable:presenter_srp_split',
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts'
      )
      order by symbol_path, symbol_name
    ) as symbols
  from symbol_rows
),
manifest_surfaces as (
  select jsonb_build_array(
    'apps/web/cypress/support/canvasExecutionSelection.ts',
    'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
    'apps/web/src/app/views/canvas/canvasContextMenuTargetPolicy.ts',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
    'docs/superpowers/plans/2026-06-28-canvas-background-context-menu-db-first.md',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/359_canvas_context_menu_presenter_srp_feature_manifest.sql'
  ) as surfaces
)
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
  created_by
)
select
  'local#CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628#query#resolvecanvascontextmenu',
  'CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628',
  'implemented',
  'ResolveCanvasContextMenu',
  'resolvecanvascontextmenu',
  'query',
  'web.component.canvas.CanvasContextMenuPresenter',
  'implemented',
  symbol_manifest.symbol_refs,
  manifest_surfaces.surfaces,
  jsonb_build_array('docs/superpowers/plans/2026-06-28-canvas-background-context-menu-db-first.md'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  manifest_surfaces.surfaces,
  jsonb_build_array(
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/359_canvas_context_menu_presenter_srp_feature_manifest.sql',
  md5('CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628:ResolveCanvasContextMenu:359'),
  jsonb_build_object(
    'name', 'ResolveCanvasContextMenu',
    'type', 'query',
    'dddOwner', 'web.component.canvas.CanvasContextMenuPresenter',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Split the Canvas context-menu presenter into explicit contract, lifecycle, and target-policy files while preserving the existing context-menu rails.',
    'componentGuides', jsonb_build_array(
      'planning-db:component/web.component.canvas.CanvasContextMenuPresenter'
    ),
    'userStories', jsonb_build_array(
      'As a Canvas maintainer, I can reason about the context-menu presenter as adapter, lifecycle, target policy, and contract files instead of one mixed hook.',
      'As a reviewer, I can query the DB for every file and symbol owned by the Canvas context-menu presenter split.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', manifest_surfaces.surfaces,
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'buzon/**#primary-specification',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveCanvasContextMenu',
        'type', 'query',
        'dddOwner', 'web.component.canvas.CanvasContextMenuPresenter',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'CreateCanvasAuthoringNode',
        'type', 'command',
        'dddOwner', 'web.component.canvas.CanvasContextMenuPresenter',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'RemoveCanvasEdgeFromContext',
        'type', 'command',
        'dddOwner', 'web.component.canvas.CanvasContextMenuPresenter',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      'CanvasContextMenuPresenter',
      'CanvasContextMenuModel',
      'CanvasContextMenuLifecycle',
      'CanvasContextMenuTargetPolicy'
    ),
    'symbols', symbol_manifest.symbols,
    'fowlerSignals', jsonb_build_array(
      'responsibility_overload',
      'extract_function',
      'separate_presentation_from_policy'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:presentation_presenter_split'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-context-menu-presenter-srp-split',
        'redTest', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
        'expectedFailure', 'Architecture test failed while the presenter still owned lifecycle constants, DOM target policy, or document listeners inline.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
          'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
          'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
          'apps/web/src/app/views/canvas/canvasContextMenuTargetPolicy.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts'
      )
    )
  ),
  1,
  'codex'
from symbol_manifest
cross join manifest_surfaces
on conflict (rail_id) do update set
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
  revision = excluded.revision,
  updated_at = now();
