-- Declare Inspector visual token exports for feature mechanization. Migration
-- 389 owns the component/file/rail mapping; this migration supplies the
-- implementation-manifest symbols required by the prepush guard.

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
  'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#inspectcanvasnodeproperties-inspector-visual-tokens',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'implemented',
  'InspectCanvasNodeProperties',
  'inspectcanvasnodeproperties',
  'query',
  'InspectorVisualTokens',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/inspector/inspectorVisualTokens.ts#inspectorVisualClasses',
    'apps/web/src/app/components/inspector/inspectorVisualTokens.ts#inspectorStatusDotClasses'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
    'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
    'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
    'tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
    'apps/web/src/app/components/InspectorPanel.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx',
    'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
    'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
    'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
    'tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
    'node --test --test-name-pattern "Inspector visual token feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
    'node --test --test-name-pattern "Inspector visual token feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql',
  md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:InspectorVisualTokens:symbols:390'),
  jsonb_build_object(
    'name', 'InspectCanvasNodeProperties',
    'type', 'query',
    'dddOwner', 'InspectorVisualTokens',
    'status', 'implemented',
    'presentationSupportOnly', true
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Separate Inspector and node workbench visual tokens from React Flow graph visual tokens while preserving the existing node-properties query rail.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.InspectorVisualTokens',
      'web.component.canvas.GraphNodeCard',
      'web.component.canvas.CanvasNodeWorkbenchPanel',
      'web.component.canvas.NodeWorkbench'
    ),
    'userStories', jsonb_build_array(
      'As a Canvas maintainer, I can update Inspector and node workbench presentation tokens without changing GraphNodeCard rendering tokens.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
      'apps/web/src/app/components/InspectorPanel.tsx',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
      'apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx',
      'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
      'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
      'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
      'tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/plugins/graph/graphVisualTokens.ts#inspector-tokens',
      'apps/web/src/app/plugins/graph/graphVisualTokens.ts#workbench-tokens'
    ),
    'domainObjects', jsonb_build_array(
      'InspectorVisualTokens',
      'CanvasNodeWorkbenchPanel',
      'NodeWorkbench',
      'GraphNodeCard'
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_boundary',
      'component_ownership_split',
      'token_churn_reduction'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
      'node --test --test-name-pattern "Inspector visual token feature mechanization" scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:presentation_token_boundary_only'),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
      'node --test --test-name-pattern "Inspector visual token feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'InspectCanvasNodeProperties',
        'type', 'query',
        'dddOwner', 'InspectorVisualTokens',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'inspector-visual-token-symbols',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'New exported Inspector visual token symbols are rejected until Planning DB declares them.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
          'tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'inspectorVisualClasses',
        'path', 'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
        'dddOwner', 'InspectorVisualTokens',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_token_contract', 'no_graph_token_ownership'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
        'cypressCoverage', 'not_applicable:presentation_token_boundary_only',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/components/InspectorPanel.test.tsx',
          'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'inspectorStatusDotClasses',
        'path', 'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
        'dddOwner', 'InspectorVisualTokens',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_token_contract', 'status_visual_mapping'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
        'cypressCoverage', 'not_applicable:presentation_token_boundary_only',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/components/InspectorPanel.test.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
