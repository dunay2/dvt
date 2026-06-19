-- Final DB-local upsert for the Canvas node workbench feature after
-- governance refresh. Earlier migrations established the component and
-- repaired the read path; this migration guarantees the local feature manifest
-- exists after a refresh cycle has already run in the local DB.

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
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#NodeWorkbenchTabItem',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#PRIMARY_NODE_WORKBENCH_SECTION_IDS',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#isPrimarySection',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#renderCountBadge',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#renderSectionBody',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#resolveActiveNodeWorkbenchTab',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#sectionSlot'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'scripts/check-feature-mechanization.cjs',
    'scripts/planning-db/queries/feature-mechanization-query.cjs'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
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
    'scripts/check-feature-mechanization.cjs',
    'scripts/check-feature-mechanization.test.cjs',
    'scripts/planning-db/queries/feature-mechanization-query.cjs',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'tools/planning-db/migrations/239_web_canvas_node_workbench_panel_local_manifest_reseed.sql',
    'tools/planning-db/migrations/240_web_canvas_node_workbench_panel_manifest_completeness.sql',
    'tools/planning-db/migrations/241_web_canvas_node_workbench_panel_post_refresh_manifest.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'scripts/check-feature-mechanization.test.cjs',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  jsonb_build_array(
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
    'status', 'implemented',
    'dddOwner', 'CanvasNodeWorkbenchPanel'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'userStories', jsonb_build_array(
      'Node workbench is opened contextually from the canvas while graph remains the primary surface.',
      'Node details expose properties, columns, inputs/outputs, tests, and code without delegating to the generic inspector.'
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
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
      'scripts/check-feature-mechanization.cjs',
      'scripts/check-feature-mechanization.test.cjs',
      'scripts/planning-db/queries/feature-mechanization-query.cjs',
      'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
      'tools/planning-db/migrations/239_web_canvas_node_workbench_panel_local_manifest_reseed.sql',
      'tools/planning-db/migrations/240_web_canvas_node_workbench_panel_manifest_completeness.sql',
      'tools/planning-db/migrations/241_web_canvas_node_workbench_panel_post_refresh_manifest.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/InspectorPanel.tsx#Canvas node workbench rendering',
      'buzon/**'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'InspectCanvasNodeProperties',
        'type', 'query',
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasNodeWorkbenchPanel',
        'type', 'presentation component',
        'owner', 'Canvas workbench'
      ),
      jsonb_build_object(
        'name', 'NodePropertiesReadModel',
        'type', 'query read model',
        'owner', 'Canvas node properties'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_logic_separation',
      'component_ownership_drift',
      'responsibility_overload'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasShellMainPanel.architecture.test.ts',
        'command', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:component_boundary',
        'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-node-workbench-panel-post-refresh-manifest',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'Governance refresh removed the DB-local CanvasNodeWorkbenchPanel feature manifest before the implementation gate could see the new symbols.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/241_web_canvas_node_workbench_panel_post_refresh_manifest.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object('name', 'PRIMARY_NODE_WORKBENCH_SECTION_IDS', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'NodeWorkbenchTabItem', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeWorkbenchPanelProps', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('component_ownership_drift'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'sectionSlot', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'isPrimarySection', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'renderCountBadge', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'renderSectionBody', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'resolveActiveNodeWorkbenchTab', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeWorkbenchSection', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeWorkbenchPanel', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties', 'ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), 'fowlerSignals', jsonb_build_array('responsibility_overload', 'component_ownership_drift'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'))
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
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
