-- Declare the CanvasNodeWorkbenchPanel draggable/ordered helper symbols in
-- the existing InspectCanvasNodeProperties feature-mechanization manifest.

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
with symbol_catalog as (
  select *
  from (
    values
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'CanvasNodeWorkbenchDragState',
        'drag_state_type',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'CanvasNodeWorkbenchPosition',
        'drag_position_type',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'NODE_WORKBENCH_DEFAULT_RIGHT',
        'placement_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'NODE_WORKBENCH_DEFAULT_TOP',
        'placement_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'NODE_WORKBENCH_DEFAULT_WIDTH',
        'placement_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'NODE_WORKBENCH_DRAG_EXCLUDED_SELECTOR',
        'interactive_drag_guard',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'NODE_WORKBENCH_MIN_LEFT',
        'placement_boundary_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'NODE_WORKBENCH_MIN_TOP',
        'placement_boundary_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'resolveDefaultWorkbenchPosition',
        'default_overlay_position_query',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'CanvasNodeWorkbenchDragHandleProps',
        'drag_handle_contract_type',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'DVT_SINK_TARGET_ROW_LABELS',
        'duplicate_row_policy_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'DVT_SOURCE_TARGET_ROW_LABELS',
        'duplicate_row_policy_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'GENERAL_WORKBENCH_ALWAYS_EDITED_ROW_LABELS',
        'duplicate_row_policy_token',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'buildNodeWorkbenchReadModel',
        'workbench_projection_query',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      ),
      (
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'resolveNodeWorkbenchHiddenGeneralRowLabels',
        'duplicate_row_policy_query',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      )
  ) as symbols(path, name, fowler_signal, unit_test)
),
symbol_rollup as (
  select
    jsonb_agg(symbols.path || '#' || symbols.name order by symbols.path, symbols.name) as symbol_refs,
    jsonb_agg(
      jsonb_build_object(
        'name', symbols.name,
        'path', symbols.path,
        'dddOwner', 'CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array(symbols.fowler_signal, 'single_responsibility_workbench_projection'),
        'architectureGuard', symbols.unit_test,
        'cypressCoverage', 'not_applicable:component_presentation_unit_covered',
        'unitTests', jsonb_build_array(symbols.unit_test)
      )
      order by symbols.path, symbols.name
    ) as symbols_json
  from symbol_catalog symbols
)
select
  'local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties#workbench-draggable-ordered',
  'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604',
  'implemented',
  'InspectCanvasNodeProperties',
  'inspectcanvasnodeproperties',
  'query',
  'CanvasNodeWorkbenchPanel',
  'implemented',
  symbol_rollup.symbol_refs,
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx',
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    'tools/planning-db/migrations/588_canvas_node_workbench_draggable_ordered_feature_symbols.sql'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    'tools/planning-db/migrations/588_canvas_node_workbench_draggable_ordered_feature_symbols.sql'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
    'tools/planning-db/migrations/588_canvas_node_workbench_draggable_ordered_feature_symbols.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/components/inspector/NodePropertySectionView.test.tsx',
    'node --test scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/components/inspector/NodePropertySectionView.test.tsx',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/588_canvas_node_workbench_draggable_ordered_feature_symbols.sql',
  md5('CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604:workbench-draggable-ordered-symbols:588'),
  jsonb_build_object(
    'componentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
    'railName', 'InspectCanvasNodeProperties',
    'railType', 'query',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'tools/planning-db/migrations/588_canvas_node_workbench_draggable_ordered_feature_symbols.sql',
    'componentGuides', jsonb_build_array('web.component.canvas.CanvasNodeWorkbenchPanel'),
    'userStories', jsonb_build_array(
      'As a demanding canvas user, I can drag the node workbench away from the graph content I need to inspect.',
      'As a demanding canvas user, I see editable identity before readonly facts and do not see duplicate source target rows.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
      'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
      'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/587_canvas_node_workbench_draggable_ordered_manifest.sql',
      'tools/planning-db/migrations/588_canvas_node_workbench_draggable_ordered_feature_symbols.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/InspectorPanel.tsx',
      'apps/web/cypress/e2e/**'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasNodeWorkbenchPanel',
      'CanvasNodeWorkbenchOverlay',
      'NodePropertiesTabs',
      'NodePropertySectionView'
    ),
    'fowlerSignals', jsonb_build_array(
      'single_responsibility_workbench_projection',
      'presentation_template_slot_ordering',
      'duplicate_readonly_fact_suppression'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/components/inspector/NodePropertySectionView.test.tsx',
      'node --test scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:component_presentation_unit_covered'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/components/inspector/NodePropertySectionView.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'InspectCanvasNodeProperties',
        'type', 'query',
        'dddOwner', 'CanvasNodeWorkbenchPanel'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'workbench-drag-overlay',
        'redTest', 'CanvasNodeWorkbenchOverlay.test.tsx fails because overlay has no numeric left/top drag state.',
        'expectedFailure', 'Number.isFinite(initialLeft) is false before draggable overlay positioning.',
        'patchSurfaces', jsonb_build_array('CanvasNodeWorkbenchOverlay.tsx'),
        'greenTest', 'CanvasNodeWorkbenchOverlay.test.tsx moves the workbench from the header drag handle.'
      ),
      jsonb_build_object(
        'id', 'workbench-ordered-general',
        'redTest', 'CanvasNodeWorkbenchPanel.test.tsx fails because editable identity renders after readonly facts.',
        'expectedFailure', 'Editable name does not precede first readonly dt before the ordering fix.',
        'patchSurfaces', jsonb_build_array(
          'CanvasNodeWorkbenchPanel.tsx',
          'NodePropertiesTabs.tsx',
          'NodePropertySectionView.tsx'
        ),
        'greenTest', 'CanvasNodeWorkbenchPanel.test.tsx orders editable identity before readonly facts without repeating source target rows.'
      )
    ),
    'symbols', symbol_rollup.symbols_json
  ),
  0,
  'codex'
from symbol_rollup
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
