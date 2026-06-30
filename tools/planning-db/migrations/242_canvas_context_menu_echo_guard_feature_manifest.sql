-- DB-first feature-mechanization manifest for the Canvas context-menu echo
-- guard. This keeps the presenter symbol map available after a clean Planning
-- DB rebuild, without reintroducing Markdown manifests as the write surface.

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
values (
  'local#CANVAS-CONTEXTUAL-PROJECT-CODE-20260619#query#resolvecanvascontextmenu',
  'CANVAS-CONTEXTUAL-PROJECT-CODE-20260619',
  'implemented',
  'ResolveCanvasContextMenu',
  'resolvecanvascontextmenu',
  'query',
  'CanvasContextMenuReadModel',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
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
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
    'tools/planning-db/migrations/242_canvas_context_menu_echo_guard_feature_manifest.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'node ../../tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'node ../../tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    '1063f24f8ca8953cb795afa5c29326cf578c343eb0162097cc997561ca52b62e'
  ),
  jsonb_build_object(
    'name', 'ResolveCanvasContextMenu',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'CanvasContextMenuReadModel'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CANVAS-CONTEXTUAL-PROJECT-CODE-20260619',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'userStories', jsonb_build_array(
      'Canvas right-click opens the spatial context menu without a fixed insert rail.',
      'Browser click echoes after a context gesture do not close the menu before the user can act.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
      'tools/planning-db/migrations/242_canvas_context_menu_echo_guard_feature_manifest.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/archive/**',
      'buzon/**',
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#gesture_lifecycle'
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
      'presentation_logic_separation',
      'component_ownership_drift',
      'browser_gesture_contract'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'Canvas context-menu presenter lifecycle',
        'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'Canvas ready node authoring context gesture',
        'command', 'node ../../tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-context-menu-delayed-click-echo',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'expectedFailure', 'A delayed browser click echo closes the canvas context menu.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'useCanvasContextMenuPresenter',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
          'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('browser_gesture_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
        )
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'node ../../tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  1,
  'codex'
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
