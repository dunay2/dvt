-- Declare GraphNodeColumnSection implementation symbols for feature
-- mechanization. Migration 479 owns the component/file/rail mapping; this
-- migration supplies the implementation-manifest symbols required by the
-- guard for the extracted column disclosure leaf.

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
  'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#rendercanvasgraphnodecolumnsection',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'implemented',
  'RenderCanvasGraphNodeColumnSection',
  'rendercanvasgraphnodecolumnsection',
  'query',
  'GraphNodeColumnSection',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx#GraphNodeCardColumn',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx#GraphNodeColumn',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx#GraphNodeColumnSection',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx#GraphNodeColumnSectionProps'
  ),
  jsonb_build_array(
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
    'tools/planning-db/migrations/480_graph_node_column_section_feature_mechanization.sql'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/manual de implementacion.txt'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
    'tools/planning-db/migrations/480_graph_node_column_section_feature_mechanization.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeColumnSection.test.tsx src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Graph node column section feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeColumnSection.test.tsx src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Graph node column section feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:migrate',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/480_graph_node_column_section_feature_mechanization.sql',
  md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeColumnSection:symbols:480'),
  jsonb_build_object(
    'name', 'RenderCanvasGraphNodeColumnSection',
    'type', 'query',
    'dddOwner', 'GraphNodeColumnSection',
    'status', 'implemented',
    'presentationSupportOnly', true,
    'parentComponentId', 'web.component.canvas.GraphNodeCardView'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extract the graph-node column disclosure into a focused presentation leaf while keeping GraphNodeCardView as the composition shell.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.GraphNodeCardView',
      'web.component.canvas.GraphNodeColumnSection',
      'web.component.canvas.GraphVisualTokens'
    ),
    'userStories', jsonb_build_array(
      'As a Canvas user, I can expand a graph node card to inspect recorded columns without the card inventing missing schema metadata.',
      'As a Canvas maintainer, I can change column disclosure markup without changing the graph node card shell.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/manual de implementacion.txt'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
      'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
      'tools/planning-db/migrations/480_graph_node_column_section_feature_mechanization.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
      'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'
    ),
    'domainObjects', jsonb_build_array(
      'GraphNodeCardView',
      'GraphNodeColumnSection',
      'RecordedGraphNodeColumns'
    ),
    'fowlerSignals', jsonb_build_array(
      'extract_component',
      'presentation_boundary',
      'no_placeholder_metadata'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeColumnSection.test.tsx src/app/plugins/graph/GraphNodeCardView.test.tsx',
      'node --test --test-name-pattern "tracked migrations register Graph node column section feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:presentation_leaf_component'),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeColumnSection.test.tsx src/app/plugins/graph/GraphNodeCardView.test.tsx',
      'node --test --test-name-pattern "tracked migrations register Graph node column section feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:migrate',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderCanvasGraphNodeColumnSection',
        'type', 'query',
        'dddOwner', 'GraphNodeColumnSection',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'graph-node-column-section-symbols',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'Extracted GraphNodeColumnSection symbols are rejected until Planning DB declares them.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
          'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
          'tools/planning-db/migrations/480_graph_node_column_section_feature_mechanization.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'GraphNodeCardColumn',
        'path', 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
        'dddOwner', 'GraphNodeColumnSection',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeColumnSection'),
        'fowlerSignals', jsonb_build_array('compatibility_alias', 'composition_boundary'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_leaf_component',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'GraphNodeColumn',
        'path', 'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
        'dddOwner', 'GraphNodeColumnSection',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeColumnSection'),
        'fowlerSignals', jsonb_build_array('presentation_read_model_input'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_leaf_component',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx')
      ),
      jsonb_build_object(
        'name', 'GraphNodeColumnSection',
        'path', 'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
        'dddOwner', 'GraphNodeColumnSection',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeColumnSection'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'no_placeholder_metadata'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_leaf_component',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx')
      ),
      jsonb_build_object(
        'name', 'GraphNodeColumnSectionProps',
        'path', 'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
        'dddOwner', 'GraphNodeColumnSection',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeColumnSection'),
        'fowlerSignals', jsonb_build_array('parameter_object', 'presentation_boundary'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_leaf_component',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx')
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
