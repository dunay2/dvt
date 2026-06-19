-- Repoint stale DB-local Canvas contextual workbench rail evidence.
-- ResolveCanvasContextMenu remains an active canonical query rail through the
-- command/query catalog and imported feature plans. This local row only kept a
-- removed implementation path as its active source, so the row is deprecated
-- as transition evidence and the removed path is retained as metadata.

with canonical_context_menu_rail (
  rail_id,
  canonical_source_path,
  deprecated_source_paths,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_current_paths,
  architecture_guards,
  completion_gate,
  red_green_cycles,
  replacement_symbols,
  canonical_rail_sources
) as (
  values (
    'local#CANVAS-CONTEXTUAL-PROJECT-CODE-20260619#query#resolvecanvascontextmenu',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    array[
      'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx'
    ]::text[],
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#BuildCanvasContextMenuModelArgs',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#CanvasContextMenuModel',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#CanvasContextMenuTarget',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#buildCanvasContextMenuModel',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#CanvasContextMenuPresenter',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#CanvasContextMenuView',
      'apps/web/src/app/views/canvas/CanvasViewport.tsx#CanvasViewport',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts#CanvasNodeContextMenuModel',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts#buildCanvasNodeContextMenuModel',
      'apps/web/src/app/components/canvas/DbtNodeComponent.tsx#DbtNodeComponent'
    ),
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#BuildCanvasContextMenuModelArgs',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#CanvasContextMenuModel',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#CanvasContextMenuTarget',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#buildCanvasContextMenuModel',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#CanvasContextMenuPresenter',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#CanvasContextMenuView',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
      'apps/web/src/app/views/canvas/CanvasViewport.tsx#CanvasViewport',
      'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
      'apps/web/src/app/views/canvas/CanvasViewport.edgeContextMenu.test.tsx',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts#CanvasNodeContextMenuModel',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts#buildCanvasNodeContextMenuModel',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
      'apps/web/src/app/components/canvas/DbtNodeComponent.tsx#DbtNodeComponent',
      'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts'
    ),
    jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
      'docs/architecture/components/web/frontend-command-query-rail-inventory.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md'
    ),
    jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
      'apps/web/src/app/views/canvas/CanvasViewport.tsx',
      'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
      'apps/web/src/app/views/canvas/CanvasViewport.edgeContextMenu.test.tsx',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
      'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
      'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md'
    ),
    jsonb_build_array(
      'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check'
    ),
    jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInteractionCommandSurface.test.ts src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasContextMenuView.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx src/app/views/canvas/CanvasViewport.contextMenu.test.tsx src/app/views/canvas/CanvasViewport.edgeContextMenu.test.tsx',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', 'resolvecanvascontextmenu-stale-local-row-deprecation',
        'redTest', 'pnpm planning:db:query source-drift --no-refresh --limit 20',
        'greenTest', 'pnpm planning:db:integrity:check',
        'patchSurfaces', jsonb_build_array(
          'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
          'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
          'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md',
          'tools/planning-db/migrations/222_deprecate_stale_canvas_contextual_workbench_rail.sql'
        ),
        'expectedFailure', 'The Planning DB reports CanvasContextualWorkbenchPanel.tsx as an active DB-local rail source even though the rail is currently governed by the command/query catalog and imported feature plans.'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'name', 'BuildCanvasContextMenuModelArgs',
        'path', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_model', 'published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts'),
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuModel',
        'path', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_model', 'published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts'),
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
      ),
      jsonb_build_object(
        'name', 'buildCanvasContextMenuModel',
        'path', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('policy_object', 'contextual_read_model'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts'),
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
      ),
      jsonb_build_object(
        'name', 'useCanvasContextMenuPresenter',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('application_service', 'presentation_model'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
        ),
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuView',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_model'),
        'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasContextMenuView.architecture.test.tsx',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx'),
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
      ),
      jsonb_build_object(
        'name', 'CanvasNodeContextMenuModel',
        'path', 'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_model', 'duplicate_semantics_guard'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation -- --feature CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604',
        'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts'),
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
      )
    ),
    jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md'
    )
  )
)
update planning_query_store.feature_mechanization_local_rails rail
set
  rail_status = 'deprecated',
  source_path = canonical.canonical_source_path,
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = canonical.canonical_source_path
      limit 1
    ),
    rail.source_content_sha256
  ),
  symbol_refs = canonical.symbol_refs,
  implementation_refs = canonical.implementation_refs,
  documentation_refs = canonical.documentation_refs,
  governing_sources = canonical.governing_sources,
  allowed_implementation_surfaces = canonical.allowed_current_paths,
  architecture_guards = canonical.architecture_guards,
  completion_gate = canonical.completion_gate,
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'status', 'deprecated',
    'deprecatedSourcePaths', to_jsonb(canonical.deprecated_source_paths),
    'currentImplementationSourcePath', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'canonicalRailSources', canonical.canonical_rail_sources,
    'sourcePathReconciledBy', '222_deprecate_stale_canvas_contextual_workbench_rail',
    'deprecationPolicy', 'CanvasContextualWorkbenchPanel.tsx is no longer tracked. ResolveCanvasContextMenu remains active through imported canonical rail sources; this local row is deprecated transition evidence only.'
  ),
  raw_manifest = (
    coalesce(rail.raw_manifest, '{}'::jsonb)
    - 'symbols'
    - 'allowedImplementationSurfaces'
    - 'completionGate'
    - 'redGreenCycles'
  ) || jsonb_build_object(
    'symbols', canonical.replacement_symbols,
    'allowedImplementationSurfaces', canonical.allowed_current_paths,
    'completionGate', canonical.completion_gate,
    'redGreenCycles', canonical.red_green_cycles,
    'deprecatedSourcePaths', to_jsonb(canonical.deprecated_source_paths),
    'currentImplementationSourcePath', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'canonicalRailSources', canonical.canonical_rail_sources,
    'sourcePathReconciledBy', '222_deprecate_stale_canvas_contextual_workbench_rail',
    'deprecationPolicy', 'CanvasContextualWorkbenchPanel.tsx is no longer tracked. ResolveCanvasContextMenu remains active through imported canonical rail sources; this local row is deprecated transition evidence only.'
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from canonical_context_menu_rail canonical
where rail.rail_id = canonical.rail_id;
