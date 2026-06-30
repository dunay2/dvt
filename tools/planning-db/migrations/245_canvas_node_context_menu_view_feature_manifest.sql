-- DB-first feature-mechanization manifest for the Canvas node context-menu
-- presentation split. This keeps new symbols governed after clean DB rebuilds.

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
  'local#DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619#query#resolvecanvascontextmenu#nodecontextmenuview',
  'DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619',
  'implemented',
  'ResolveCanvasContextMenu',
  'resolvecanvascontextmenu',
  'query',
  'CanvasNodeContextMenuView',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#CanvasNodeContextMenuView',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#CanvasNodeContextMenuViewProps',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#CanvasNodeContextMenuGroup',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#CanvasNodeContextMenuGroupProps',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#CanvasNodeContextMenuActionItem',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#CanvasNodeContextMenuActionItemProps',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#NODE_CONTEXT_MENU_CONTENT_CLASS_NAME',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#NODE_CONTEXT_MENU_TITLE_CLASS_NAME',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#NODE_CONTEXT_MENU_GROUP_LABEL_CLASS_NAME'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-user-stories.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-user-stories.md',
    'tools/planning-db/migrations/244_canvas_node_context_menu_view_component.sql',
    'tools/planning-db/migrations/245_canvas_node_context_menu_view_feature_manifest.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeContextMenuView.test.tsx src/app/components/canvas/CanvasNodeShell.test.tsx',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeContextMenuView.test.tsx src/app/components/canvas/CanvasNodeShell.test.tsx',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
  'e27b88e24f8647e5bed601930099830ee2bc541ad916f123e5c58e9dfd9db5e0',
  jsonb_build_object(
    'name', 'ResolveCanvasContextMenu',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'CanvasNodeContextMenuView'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md'
    ),
    'userStories', jsonb_build_array(
      'Node context menu is a contextual action menu, not a duplicated node workbench.',
      'CanvasNodeShell delegates node menu presentation to a focused component.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx',
      'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
      'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
      'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
      'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-user-stories.md',
      'tools/planning-db/migrations/244_canvas_node_context_menu_view_component.sql',
      'tools/planning-db/migrations/245_canvas_node_context_menu_view_feature_manifest.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'buzon/**',
      'apps/web/src/app/components/canvas/DbtNodeComponent.tsx#menu_template_markup',
      'apps/web/src/app/components/canvas/CanvasNodeShell.tsx#workbench_section_actions'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveCanvasContextMenu',
        'type', 'query',
        'dddOwner', 'CanvasNodeContextMenuView',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasNodeContextMenuView',
        'type', 'presentation component',
        'owner', 'Canvas node context menu'
      ),
      jsonb_build_object(
        'name', 'CanvasNodeContextMenuModel',
        'type', 'query read model',
        'owner', 'Canvas node context menu'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_logic_separation',
      'component_ownership_drift',
      'responsibility_overload'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'Canvas node context menu view boundary',
        'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeContextMenuView.test.tsx src/app/components/canvas/CanvasNodeShell.test.tsx'
      ),
      jsonb_build_object(
        'name', 'DBT node component architecture',
        'command', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:component_boundary',
        'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeContextMenuView.test.tsx src/app/components/canvas/CanvasNodeShell.test.tsx'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-node-context-menu-view-boundary',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'New CanvasNodeContextMenuView symbols are rejected until DB-local feature mechanization declares them.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/245_canvas_node_context_menu_view_feature_manifest.sql',
          'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
          'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object('name', 'CanvasNodeContextMenuView', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeContextMenuViewProps', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeContextMenuGroup', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeContextMenuGroupProps', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeContextMenuActionItem', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeContextMenuActionItemProps', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'NODE_CONTEXT_MENU_CONTENT_CLASS_NAME', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'NODE_CONTEXT_MENU_TITLE_CLASS_NAME', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx')),
      jsonb_build_object('name', 'NODE_CONTEXT_MENU_GROUP_LABEL_CLASS_NAME', 'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx', 'dddOwner', 'CanvasNodeContextMenuView', 'cqRails', jsonb_build_array('ResolveCanvasContextMenu'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx'))
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeContextMenuView.test.tsx src/app/components/canvas/CanvasNodeShell.test.tsx',
      'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1;
