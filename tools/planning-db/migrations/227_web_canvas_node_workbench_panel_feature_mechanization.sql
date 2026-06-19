-- DB-first feature-mechanization manifest for the Canvas-owned node workbench
-- panel slice. The panel is a real presentation component under Canvas
-- ownership, and the legacy post-import reconciliation rows must not be read
-- as incomplete feature manifests.

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = (
    rail.raw_manifest
    - 'featureId'
    - 'mechanizationStatus'
    - 'implementationPlan'
    - 'componentGuides'
    - 'symbols'
    - 'architectureGuards'
    - 'completionGate'
    - 'governingSources'
  ) || jsonb_build_object(
    'localRailReconciliation',
    true,
    'reconciledBy',
    '227_web_canvas_node_workbench_panel_feature_mechanization',
    'reconciliationScope',
    'command_query_rail_query'
  ),
  updated_at = now(),
  revision = revision + 1
where rail.rail_id like 'local#post-import-rail-reconciliation#FRONTEND-GAP-RAIL-RECONCILIATION-20260619#%';

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
  'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties',
  'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619',
  'implemented',
  'InspectCanvasNodeProperties',
  'inspectcanvasnodeproperties',
  'query',
  'CanvasNodeWorkbenchPanel',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanelProps',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchSection',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchTabItem',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#PRIMARY_NODE_WORKBENCH_SECTION_IDS',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#isPrimarySection',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#renderCountBadge',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#renderSectionBody',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#resolveActiveNodeWorkbenchTab',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#sectionSlot'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/225_web_canvas_node_workbench_panel_reactivation.sql',
    'tools/planning-db/migrations/226_web_canvas_node_workbench_panel_effective_reactivation.sql',
    'tools/planning-db/migrations/227_web_canvas_node_workbench_panel_feature_mechanization.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/225_web_canvas_node_workbench_panel_reactivation.sql',
    'tools/planning-db/migrations/226_web_canvas_node_workbench_panel_effective_reactivation.sql',
    'tools/planning-db/migrations/227_web_canvas_node_workbench_panel_feature_mechanization.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "node workbench panel feature mechanization" scripts/planning-db-migrate.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm governance:refresh',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', 'InspectCanvasNodeProperties',
    'type', 'query',
    'dddOwner', 'CanvasNodeWorkbenchPanel',
    'status', 'implemented',
    'implementationRefs', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx'
    )
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'DB-first Canvas node workbench panel separates Canvas contextual presentation from the generic inspector, while keeping node properties, authoring fields, plugin panels, and tab overflow under an owned Canvas component.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'userStories', jsonb_build_array(
      'As a Canvas author, opening a node workbench shows node properties in a Canvas-owned panel instead of the generic inspector shell.',
      'As a Canvas maintainer, the workbench panel has its own component, tests, architecture mapping, and DB feature mechanization record before deeper UX slices continue.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/225_web_canvas_node_workbench_panel_reactivation.sql',
      'tools/planning-db/migrations/226_web_canvas_node_workbench_panel_effective_reactivation.sql',
      'tools/planning-db/migrations/227_web_canvas_node_workbench_panel_feature_mechanization.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/InspectorPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
      'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasNodeWorkbenchPanel',
      'NodePropertiesReadModel',
      'CanvasInspectorAuthoringContract'
    ),
    'fowlerSignals', jsonb_build_array(
      'responsibility_overload',
      'presentation_logic_separation',
      'component_ownership_drift'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:component_boundary_covered_by_presentation_and_architecture_tests'
    ),
    'completionGate', jsonb_build_array(
      'node --test --test-name-pattern "node workbench panel feature mechanization" scripts/planning-db-migrate.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm governance:refresh',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'InspectCanvasNodeProperties',
        'type', 'query',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ConfigureCanvasDbtNode',
        'type', 'command',
        'dddOwner', 'CanvasInspectorAuthoringSection',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ConfigureCanvasDvtNode',
        'type', 'command',
        'dddOwner', 'CanvasInspectorAuthoringSection',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-node-workbench-panel-owned-presentation',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
        'expectedFailure', 'The Canvas node workbench had no owned panel component proving primary text tabs, overflow, metadata sections, and authoring composition.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      ),
      jsonb_build_object(
        'id', 'canvas-node-workbench-overlay-handoff',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
        'expectedFailure', 'The contextual overlay still delegated to CanvasInspectorPanel instead of CanvasNodeWorkbenchPanel.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
          'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      jsonb_build_object(
        'id', 'canvas-node-workbench-panel-feature-mechanization',
        'redTest', 'node --test --test-name-pattern "node workbench panel feature mechanization" scripts/planning-db-migrate.test.cjs',
        'expectedFailure', 'New CanvasNodeWorkbenchPanel top-level symbols were rejected until the Planning DB owned their feature mechanization manifest.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/227_web_canvas_node_workbench_panel_feature_mechanization.sql'
        ),
        'greenTest', 'node --test --test-name-pattern "node workbench panel feature mechanization" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'PRIMARY_NODE_WORKBENCH_SECTION_IDS',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'NodeWorkbenchTabItem',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasNodeWorkbenchPanelProps',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('component_ownership_drift'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'sectionSlot',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'isPrimarySection',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'renderCountBadge',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'renderSectionBody',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'resolveActiveNodeWorkbenchTab',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasNodeWorkbenchSection',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasNodeWorkbenchPanel',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties', 'ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'),
        'fowlerSignals', jsonb_build_array('responsibility_overload', 'component_ownership_drift'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
        )
      )
    )
  ),
  0,
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
