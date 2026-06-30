-- Register the extracted Canvas node port handle presentation boundary in
-- Planning DB. The code slice moves React Flow handle details out of
-- CanvasNodeShell while keeping DBT/DVT card strategy semantics under the
-- existing GraphNodeCard component and RenderCanvasGraphNodeCard rail.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'CANVAS-NODE-PORT-HANDLE-PRESENTATION-BOUNDARY-20260626',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'Canvas node port handle presentation boundary',
  'Frontend / Canvas',
  'implemented',
  'CanvasNodeShell must compose presentation components instead of embedding React Flow handle markup and styling. The extracted CanvasNodePortHandle keeps port rendering under the GraphNodeCard component owner while leaving DBT/DVT card strategy behavior outside the shell.',
  'boundary_drift',
  'RenderCanvasGraphNodeCard',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

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
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
    'component',
    'CanvasNodePortHandle',
    jsonb_build_object(
      'role', 'graph node source/target port presentation component',
      'rail', 'RenderCanvasGraphNodeCard',
      'presentationBoundary', true,
      'parentShell', 'CanvasNodeShell'
    ),
    'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
    md5('CanvasNodePortHandle.tsx:310')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasNodeShell composes component-owned source/target port handles',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
    md5('CanvasNodeShell.test.tsx:310')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'EV-WEB-CANVAS-NODE-PORT-HANDLE-PRESENTATION',
  'web.component.canvas.GraphNodeCard',
  'test',
  'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx',
  'passing',
  jsonb_build_object(
    'scope', 'CanvasNodeShell delegates source/target port rendering to CanvasNodePortHandle',
    'redGreenCycle', 'expected failure: no canvas-node-port-handle data slots before extraction'
  ),
  'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
  md5('EV-WEB-CANVAS-NODE-PORT-HANDLE-PRESENTATION:310')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'presentationBoundaryMigration',
    'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
    'presentationBoundary',
    'CanvasNodeShell composes CanvasNodePortHandle for source/target React Flow handles instead of owning handle markup.'
  ),
  source_path = 'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
  source_content_sha256 = md5('GraphNodeCard:RenderCanvasGraphNodeCard:310'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and rail_name = 'RenderCanvasGraphNodeCard';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandle'),
        ('apps/web/src/app/components/canvas/CanvasNodeShell.tsx#CanvasNodeShell'),
        ('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx#renders graph ports through component-owned presentation slots')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx'),
        ('apps/web/src/app/components/canvas/CanvasNodeShell.tsx'),
        ('apps/web/src/app/components/canvas/DbtNodeComponent.module.css'),
        ('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx'),
        ('tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/components/canvas/**'),
        ('tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql')
    ) surfaces(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'),
        ('node --test --test-name-pattern "Canvas node port handle presentation boundary" scripts/planning-db-migrate.test.cjs'),
        ('pnpm planning:db:query canvas-component-registry-drift --limit 50')
    ) guards(value)
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'),
        ('node --test --test-name-pattern "Canvas node port handle presentation boundary" scripts/planning-db-migrate.test.cjs'),
        ('pnpm planning:db:query canvas-component-registry-drift --limit 50')
    ) gates(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'presentationBoundarySlice',
      jsonb_build_object(
        'componentId', 'web.component.canvas.GraphNodeCard',
        'rail', 'RenderCanvasGraphNodeCard',
        'extractedComponent', 'CanvasNodePortHandle',
        'redTest', 'CanvasNodeShell.test.tsx expected canvas-node-port-handle data slots before implementation',
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
      )
    ),
  source_path = 'tools/planning-db/migrations/310_canvas_node_port_handle_presentation_boundary.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:RenderCanvasGraphNodeCard:310'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
