-- Reconcile every added CanvasViewport test-boundary symbol into the existing
-- node-presentation feature. The adapters prove the governed viewport rail;
-- they do not create product commands or queries of their own.

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select jsonb_agg(symbol_ref order by symbol_ref)
    from (
      select distinct value as symbol_ref
      from jsonb_array_elements_text(coalesce(rails.symbol_refs, '[]'::jsonb))
      union
      select symbol_path || '#' || symbol_name
      from (
        values
          ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx', 'getCanvasViewportRegistryMock'),
          ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx', 'getCanvasViewportXyflowState'),
          ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'getCanvasViewportRegistryMock'),
          ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'resetCanvasViewportNodeTypeRegistryTestAdapter'),
          ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'resolveNodeKindRegistration'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'Controls'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MiniMap'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MockMiniMapProps'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MockReactFlowProps'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'ReactFlow'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'getCanvasViewportXyflowState'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'resetCanvasViewportXyflowTestAdapter'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'useReactFlow'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'xyflowState')
      ) symbol_specs(symbol_path, symbol_name)
    ) normalized_symbol_refs
  ),
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(coalesce(rails.implementation_refs, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/790_canvas_viewport_test_adapter_feature_symbols.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/790_canvas_viewport_test_adapter_feature_symbols.sql'
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rails.raw_manifest, '{}'::jsonb),
      '{symbols}',
      (
        select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
        from (
          select existing as symbol
          from jsonb_array_elements(coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)) existing
          where not exists (
            select 1
            from (
              values
                ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx', 'getCanvasViewportRegistryMock'),
                ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx', 'getCanvasViewportXyflowState'),
                ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'getCanvasViewportRegistryMock'),
                ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'resetCanvasViewportNodeTypeRegistryTestAdapter'),
                ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'resolveNodeKindRegistration'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'Controls'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MiniMap'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MockMiniMapProps'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MockReactFlowProps'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'ReactFlow'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'getCanvasViewportXyflowState'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'resetCanvasViewportXyflowTestAdapter'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'useReactFlow'),
                ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'xyflowState')
            ) replacement(symbol_path, symbol_name)
            where existing ->> 'path' = replacement.symbol_path
              and existing ->> 'name' = replacement.symbol_name
          )
          union all
          select jsonb_build_object(
            'name', symbol_name,
            'path', symbol_path,
            'dddOwner', 'CanvasViewportTestBoundary',
            'cqRails', jsonb_build_array('RenderCanvasContextualGraphSurface'),
            'fowlerSignals', jsonb_build_array(
              'deterministic_module_boundary',
              'explicit_test_adapter',
              'single_responsibility'
            ),
            'architectureGuard', 'apps/web/src/app/views/canvas/CanvasViewport.architecture.test.ts',
            'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/views/canvas/CanvasViewport.test.tsx',
              'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
              'apps/web/src/app/views/canvas/CanvasViewport.edgeContextMenu.test.tsx',
              'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
              'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'
            )
          )
          from (
            values
              ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx', 'getCanvasViewportRegistryMock'),
              ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx', 'getCanvasViewportXyflowState'),
              ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'getCanvasViewportRegistryMock'),
              ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'resetCanvasViewportNodeTypeRegistryTestAdapter'),
              ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts', 'resolveNodeKindRegistration'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'Controls'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MiniMap'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MockMiniMapProps'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'MockReactFlowProps'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'ReactFlow'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'getCanvasViewportXyflowState'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'resetCanvasViewportXyflowTestAdapter'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'useReactFlow'),
              ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx', 'xyflowState')
          ) symbol_specs(symbol_path, symbol_name)
        ) normalized_symbols
      ),
      true
    ),
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(
          coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
        )
        union
        select 'tools/planning-db/migrations/790_canvas_viewport_test_adapter_feature_symbols.sql'
      ) normalized_manifest_surfaces
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/790_canvas_viewport_test_adapter_feature_symbols.sql',
  source_content_sha256 = repeat(md5(rails.rail_id || ':canvas-viewport-test-symbols:790'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1';

do $$
declare
  expected_symbol_count constant integer := 14;
  incomplete_rail_count integer;
begin
  select count(*) into incomplete_rail_count
  from planning_query_store.feature_mechanization_local_rails rails
  where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
    and (
      select count(*)
      from jsonb_array_elements(coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)) symbol
      where symbol ->> 'dddOwner' = 'CanvasViewportTestBoundary'
    ) <> expected_symbol_count;

  if incomplete_rail_count <> 0 then
    raise exception 'CanvasViewport test-boundary symbols are incomplete in % feature rails', incomplete_rail_count;
  end if;
end
$$;
