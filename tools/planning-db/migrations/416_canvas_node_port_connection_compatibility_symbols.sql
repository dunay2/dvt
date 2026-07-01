-- Complete feature mechanization for the Canvas node port compatibility slice.
-- This records the new presenter symbols and the DbtNodeCard adapter handoff
-- without moving ownership of DbtNodeComponent into GraphNodeCard.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopy.types.ts',
    'copy-contract',
    'CanvasViewCopy',
    jsonb_build_object(
      'responsibility', 'Expose Canvas node port compatibility copy keys consumed by the GraphNodeCard port projection.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'ownerNote', 'Shared Canvas copy DTO; registered here only for this component slice evidence.'
    ),
    'tools/planning-db/migrations/416_canvas_node_port_connection_compatibility_symbols.sql',
    md5('file:canvasCopy.types:port-compatibility-symbols:416')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    'integration-adapter',
    'DbtNodeData',
    jsonb_build_object(
      'responsibility', 'Pass caller-owned port compatibility view data from DbtNodeData into CanvasNodeShell.',
      'rails', jsonb_build_array('RenderDbtCanvasNodeCard', 'RenderCanvasNodePortHandle'),
      'targetComponent', 'web.component.canvas.GraphNodeCard',
      'ownership', 'DbtNodeCard owns adapter wiring; GraphNodeCard owns the shell and port presentation.'
    ),
    'tools/planning-db/migrations/416_canvas_node_port_connection_compatibility_symbols.sql',
    md5('file:DbtNodeComponent:port-compatibility-adapter:416')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasCopy.types.ts',
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'tools/planning-db/migrations/416_canvas_node_port_connection_compatibility_symbols.sql'
      )
    ) as refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasCopy.types.ts',
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'tools/planning-db/migrations/416_canvas_node_port_connection_compatibility_symbols.sql'
      )
    ) as refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name', 'CanvasNodePortCompatibilityView',
          'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
          'dddOwner', 'CanvasNodePortHandle',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('presentation_view_model_contract', 'published_interface'),
          'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:presentation_contract_unit_covered'
        ),
        jsonb_build_object(
          'name', 'BuildCanvasConnectionCompatibilityArgs',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('explicit_parameter_object', 'read_model_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'CanvasNodePortCompatibility',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('value_object', 'read_model_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'CanvasNodePortCompatibilityByDirection',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('value_object', 'read_model_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'CanvasNodePortCompatibilityState',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('explicit_state_set', 'read_model_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'MutableCompatibility',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('internal_accumulator', 'encapsulated_collection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'buildCanvasConnectionCompatibilityByNodeId',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('pure_function', 'read_model_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'createEmptyCompatibility',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('factory_method', 'internal_helper'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'resolveState',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('replace_conditional_with_explicit_state', 'internal_helper'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'toCompatibility',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('conversion_function', 'internal_helper'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'toValidationEdges',
          'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
          'dddOwner', 'CanvasConnectionAggregate read projection',
          'cqRails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('anti_corruption_mapping', 'internal_helper'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:pure_presenter_unit_covered'
        ),
        jsonb_build_object(
          'name', 'formatCompatibleNodeNames',
          'path', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
          'dddOwner', 'Canvas node mapper',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('formatting_helper', 'copy_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:view_model_projection_covered'
        ),
        jsonb_build_object(
          'name', 'toPortCompatibilityView',
          'path', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
          'dddOwner', 'Canvas node mapper',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('conversion_function', 'copy_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:view_model_projection_covered'
        ),
        jsonb_build_object(
          'name', 'toPortCompatibilityViewModel',
          'path', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
          'dddOwner', 'Canvas node mapper',
          'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
          'fowlerSignals', jsonb_build_array('conversion_function', 'copy_projection'),
          'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'),
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage', 'not_applicable:view_model_projection_covered'
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/416_canvas_node_port_connection_compatibility_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:connection-compatibility-symbols:416'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
