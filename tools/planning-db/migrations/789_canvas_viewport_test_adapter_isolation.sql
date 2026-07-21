-- Make the CanvasViewport presentation-test boundary explicit and deterministic.
-- Test adapters belong to the CanvasViewport host; they are not product components
-- and do not introduce a parallel command/query rail.

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
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx',
    'test-harness',
    'createCanvasViewportHarness',
    jsonb_build_object(
      'ownership', 'exclusive',
      'subject', 'CanvasViewport',
      'mockRegistration', 'consumer-spec',
      'adapters', jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx',
        'apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts'
      )
    ),
    'tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql',
    md5('file:CanvasViewport:test-harness:789')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx',
    'test-adapter',
    'ReactFlow;Controls;MiniMap;useReactFlow',
    jsonb_build_object(
      'ownership', 'exclusive',
      'adapts', '@xyflow/react',
      'purpose', 'Expose a deterministic React Flow boundary to CanvasViewport behavior specs.',
      'registeredBeforeSubjectImport', true
    ),
    'tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql',
    md5('file:CanvasViewport:xyflow-test-adapter:789')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts',
    'test-adapter',
    'resolveNodeKindRegistration',
    jsonb_build_object(
      'ownership', 'exclusive',
      'adapts', 'nodeTypeRegistry',
      'purpose', 'Resolve deterministic minimap colors without loading the product registry.',
      'registeredBeforeSubjectImport', true
    ),
    'tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql',
    md5('file:CanvasViewport:node-registry-test-adapter:789')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasViewport',
  'EV-CANVAS-VIEWPORT-SINGLE-FORK-TEST-ISOLATION',
  'integration-test',
  'current',
  'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
  'RenderCanvasContextualGraphSurface',
  'web-presentation-single-fork',
  'CanvasViewport behavior specs register shared test adapters before loading the subject and remain deterministic in the CI single-fork suite.',
  jsonb_build_object(
    'command', 'DVT_CI=1 pnpm --filter @dvt/web test:presentation:run',
    'testAdapters', jsonb_build_array(
      'canvasViewportXyflowTestAdapter',
      'canvasViewportNodeTypeRegistryTestAdapter'
    ),
    'globalHarnessMocks', false,
    'productBehaviorRelaxed', false
  ),
  'tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql',
  md5('evidence:CanvasViewport:single-fork-test-isolation:789')
)
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(evidence_ref order by evidence_ref)
    from (
      select distinct value as evidence_ref
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb))
      union
      select 'EV-CANVAS-VIEWPORT-SINGLE-FORK-TEST-ISOLATION'
    ) normalized_evidence
  ),
  raw_component = jsonb_set(
    coalesce(raw_component, '{}'::jsonb),
    '{presentationTestBoundary}',
    jsonb_build_object(
      'status', 'implemented',
      'harnessOwnsMockRegistration', false,
      'consumerSpecsOwnMockRegistration', true,
      'sharedAdapters', jsonb_build_array(
        'canvasViewportXyflowTestAdapter',
        'canvasViewportNodeTypeRegistryTestAdapter'
      ),
      'ciExecutionModel', 'isolated files in one fork'
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql',
  source_content_sha256 = md5('component:CanvasViewport:test-adapter-isolation:789'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasViewport';

update planning_query_store.feature_mechanization_local_rails rails
set
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(coalesce(rails.implementation_refs, '[]'::jsonb))
      union
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx'),
        ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx'),
        ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts'),
        ('tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql')
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb))
      union
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx'),
        ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx'),
        ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts'),
        ('tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql')
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(
          coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
        )
        union
        values
          ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx'),
          ('apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx'),
          ('apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts'),
          ('tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql')
      ) normalized_manifest_surfaces
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/789_canvas_viewport_test_adapter_isolation.sql',
  source_content_sha256 = repeat(md5(rails.rail_id || ':canvas-viewport-test-isolation:789'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1';

do $$
declare
  owned_file_count integer;
  evidence_count integer;
  incomplete_feature_rail_count integer;
begin
  select count(*) into owned_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'web.component.canvas.CanvasViewport'
    and file_path in (
      'apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx',
      'apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx',
      'apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts'
    )
    and file_role in ('test-harness', 'test-adapter');

  if owned_file_count <> 3 then
    raise exception 'CanvasViewport test boundary ownership is incomplete: %', owned_file_count;
  end if;

  select count(*) into evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'web.component.canvas.CanvasViewport'
    and evidence_id = 'EV-CANVAS-VIEWPORT-SINGLE-FORK-TEST-ISOLATION'
    and evidence_status = 'current';

  if evidence_count <> 1 then
    raise exception 'CanvasViewport test-isolation evidence is not canonical';
  end if;

  select count(*) into incomplete_feature_rail_count
  from planning_query_store.feature_mechanization_local_rails rails
  where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
    and not (
      coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb) ?
        'apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx'
      and coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb) ?
        'apps/web/src/app/views/canvas/canvasViewportXyflowTestAdapter.tsx'
      and coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb) ?
        'apps/web/src/app/views/canvas/canvasViewportNodeTypeRegistryTestAdapter.ts'
    );

  if incomplete_feature_rail_count <> 0 then
    raise exception 'CanvasViewport test adapters are missing from % feature rails', incomplete_feature_rail_count;
  end if;
end
$$;
