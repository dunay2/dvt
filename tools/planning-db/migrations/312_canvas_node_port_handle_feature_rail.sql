-- Persist the Canvas node port handle feature mechanization rail as a clean
-- DB migration. The local operate command is useful for live DB work, but CI
-- and fresh clones need the same raw_manifest without depending on local state.

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
  'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#rendercanvasgraphnodecard',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'implemented',
  'RenderCanvasGraphNodeCard',
  'rendercanvasgraphnodecard',
  'query',
  'GraphNodeCard',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandle',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandleKind',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandleProps',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx#CanvasNodeShell',
    'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql#CanvasNodePortHandleBoundary',
    'tools/planning-db/migrations/311_canvas_node_port_handle_feature_symbols.sql#CanvasNodePortHandleSymbols',
    'tools/planning-db/migrations/312_canvas_node_port_handle_feature_rail.sql#CanvasNodePortHandleFeatureRail'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandle',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandleKind',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandleProps',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx#CanvasNodeShell',
    'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql#CanvasNodePortHandleBoundary',
    'tools/planning-db/migrations/311_canvas_node_port_handle_feature_symbols.sql#CanvasNodePortHandleSymbols',
    'tools/planning-db/migrations/312_canvas_node_port_handle_feature_rail.sql#CanvasNodePortHandleFeatureRail'
  ),
  jsonb_build_array(
    'buzon/TAREA.TXT',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
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
    'apps/web/src/app/components/canvas/**',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
    'tools/planning-db/migrations/311_canvas_node_port_handle_feature_symbols.sql',
    'tools/planning-db/migrations/312_canvas_node_port_handle_feature_rail.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
    'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query canvas-component-registry-drift --limit 50'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
    'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/312_canvas_node_port_handle_feature_rail.sql',
  md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:RenderCanvasGraphNodeCard:312'),
  jsonb_build_object(
    'name', 'RenderCanvasGraphNodeCard',
    'type', 'query',
    'dddOwner', 'GraphNodeCard',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extract Canvas graph node port rendering into a component-owned presentation boundary so CanvasNodeShell composes node card primitives instead of embedding React Flow handle markup and styling.',
    'componentGuides', jsonb_build_array('web.component.canvas.GraphNodeCard'),
    'userStories', jsonb_build_array(
      'As a Canvas implementer, I need node card ports to be owned by a reusable presentation component so DBT and DVT card strategies do not duplicate handle markup.'
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
      'apps/web/src/app/components/canvas/**',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
      'tools/planning-db/migrations/311_canvas_node_port_handle_feature_symbols.sql',
      'tools/planning-db/migrations/312_canvas_node_port_handle_feature_rail.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array('buzon/**#primary-specification'),
    'domainObjects', jsonb_build_array('GraphNodeCard', 'CanvasNodePortHandle'),
    'fowlerSignals', jsonb_build_array('boundary_drift'),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
      'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query canvas-component-registry-drift --limit 50'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:presentation_component_boundary'),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
      'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderCanvasGraphNodeCard',
        'type', 'query',
        'dddOwner', 'GraphNodeCard',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'rendercanvasgraphnodecard-record',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
        'expectedFailure', 'CanvasNodeShell did not expose component-owned canvas-node-port-handle source/target slots before extracting CanvasNodePortHandle.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
          'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
          'apps/web/src/app/components/canvas/DbtNodeComponent.module.css',
          'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
          'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
          'tools/planning-db/migrations/311_canvas_node_port_handle_feature_symbols.sql',
          'tools/planning-db/migrations/312_canvas_node_port_handle_feature_rail.sql'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasNodePortHandle',
        'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'dddOwner', 'GraphNodeCard',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
        'fowlerSignals', jsonb_build_array('boundary_drift'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_component_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasNodePortHandleKind',
        'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'dddOwner', 'GraphNodeCard',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
        'fowlerSignals', jsonb_build_array('boundary_drift'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
        'cypressCoverage', 'not_applicable:type_alias',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasNodePortHandleProps',
        'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'dddOwner', 'GraphNodeCard',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
        'fowlerSignals', jsonb_build_array('boundary_drift'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
        'cypressCoverage', 'not_applicable:type_alias',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
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
