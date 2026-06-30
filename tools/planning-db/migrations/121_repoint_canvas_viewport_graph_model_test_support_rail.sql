-- Reconcile the Canvas viewport graph-model component-test rail with the
-- tracked canonical test module. The earlier DB-local row pointed to a planned
-- support split that was not implemented on main; old split paths are kept as
-- explicitly deprecated evidence instead of being recreated as stubs.

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
  created_by,
  created_at,
  updated_at
)
values (
  'local#CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618#command#validatecanvasviewportgraphmodelcomponenttests',
  'CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618',
  'implemented',
  'ValidateCanvasViewportGraphModelComponentTests',
  'validatecanvasviewportgraphmodelcomponenttests',
  'command',
  'CanvasGraphViewportPresentation',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx#ViewportGraphModelState',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx#buildCanonicalNode',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx#renderViewportGraphModel',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts#useCanvasViewportGraphModel'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx#ViewportGraphModelState',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx#buildCanonicalNode',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx#renderViewportGraphModel',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts#useCanvasViewportGraphModel'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-layout-persistence-component.md',
    'docs/planning/status/canonical-doc-code-matrix.md'
  ),
  jsonb_build_array(
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
    'tools/planning-db/migrations/121_repoint_canvas_viewport_graph_model_test_support_rail.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
    'pnpm planning:db:integrity:check'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
  '876933e349dda1f7d8570e646a1024591dd89d5f61f349f2e379bacdb69b5960',
  jsonb_build_object(
    'name',
    'ValidateCanvasViewportGraphModelComponentTests',
    'type',
    'command',
    'dddOwner',
    'CanvasGraphViewportPresentation',
    'status',
    'implemented',
    'sourceRepointReason',
    'Repointed from planned useCanvasViewportGraphModel.test.support.ts and split component tests to the tracked canonical useCanvasViewportGraphModel.test.tsx module.',
    'deprecatedSourcePaths',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
    )
  ),
  jsonb_build_object(
    'version',
    1,
    'featureId',
    'CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618',
    'mechanizationStatus',
    'implemented',
    'noHumanDecisionsRemaining',
    true,
    'implementationPlan',
    'DB-first Canvas viewport graph-model component tests remain canonical in useCanvasViewportGraphModel.test.tsx; removed support split is deprecated until a real support module exists.',
    'userStories',
    jsonb_build_array(
      'Canvas viewport graph-model tests remain focused by component behavior without referencing nonexistent split support files.'
    ),
    'componentGuides',
    jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-layout-persistence-component.md',
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md',
      'docs/architecture/components/web/graph/canvas-workspace-explorer-user-stories.md'
    ),
    'governingSources',
    jsonb_build_array(
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'domainObjects',
    jsonb_build_array(
      'CanvasGraphViewportPresentation',
      'CanvasViewportGraphModelTestContract'
    ),
    'fowlerSignals',
    jsonb_build_array(
      'Deprecated support-split rail is repointed to the tracked canonical component test because the split helpers were not implemented on main.'
    ),
    'cypressFlows',
    jsonb_build_array('not_applicable:component_test_modularization'),
    'architectureGuards',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
      'pnpm planning:db:integrity:check'
    ),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'ValidateCanvasViewportGraphModelComponentTests',
        'type',
        'command',
        'status',
        'implemented',
        'dddOwner',
        'CanvasGraphViewportPresentation'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'ViewportGraphModelState',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx'
        ),
        'fowlerSignals',
        jsonb_build_array('Canonical component test owns the hook state contract.'),
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts'
      ),
      jsonb_build_object(
        'name',
        'buildCanonicalNode',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx'
        ),
        'fowlerSignals',
        jsonb_build_array('Canonical component test owns node fixture construction for viewport projection behavior.'),
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts'
      ),
      jsonb_build_object(
        'name',
        'renderViewportGraphModel',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx'
        ),
        'fowlerSignals',
        jsonb_build_array('Canonical component test owns the React Query harness for viewport graph-model projection checks.'),
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts'
      ),
      jsonb_build_object(
        'name',
        'useCanvasViewportGraphModel',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx'
        ),
        'fowlerSignals',
        jsonb_build_array('Production hook remains the behavior under validation; no parallel test support API is invented.'),
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts'
      )
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
      'tools/planning-db/migrations/121_repoint_canvas_viewport_graph_model_test_support_rail.sql'
    ),
    'forbiddenImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
    ),
    'deprecatedSourcePaths',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
    ),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id',
        'validatecanvasviewportgraphmodelcomponenttests-repoint',
        'redTest',
        'pnpm planning:db:query source-drift --limit 20 --no-refresh',
        'greenTest',
        'pnpm docs:feature-mechanization:implementation',
        'patchSurfaces',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
          'tools/planning-db/migrations/121_repoint_canvas_viewport_graph_model_test_support_rail.sql'
        ),
        'expectedFailure',
        'DB-local viewport graph-model component-test rail pointed to removed useCanvasViewportGraphModel.test.support.ts.'
      )
    ),
    'completionGate',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check',
      'pnpm verify:prepush'
    ),
    'sourceRepointReason',
    'Repointed from planned useCanvasViewportGraphModel.test.support.ts and split component tests to the tracked canonical useCanvasViewportGraphModel.test.tsx module.'
  ),
  0,
  'codex',
  now(),
  now()
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
