-- Register direct presentation-test evidence for CanvasNodePortHandle.
-- The port handle is a presentation/query surface only: edge admission remains
-- owned by AuthorCanvasGraphEdge, while this component renders caller-owned
-- port identity, tone, accessible copy, and passive compatibility hints.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasNodePortHandle',
  'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
  'presentation-test',
  null,
  jsonb_build_object(
    'responsibility', 'Prove CanvasNodePortHandle renders stable React Flow handle identity, semantic tone, accessible copy, and passive compatibility hints.',
    'rail', 'RenderCanvasNodePortHandle',
    'presentationOnly', true,
    'doesNotAuthorEdges', true,
    'edgeAdmissionOwner', 'AuthorCanvasGraphEdge',
    'stableHandleId', true,
    'callerOwnedAccessibleCopy', true,
    'passiveCompatibilityHint', true
  ),
  'tools/planning-db/migrations/433_canvas_node_port_handle_direct_test.sql',
  md5('file:CanvasNodePortHandle.test.tsx:433')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest',
      'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
      'stableHandleId',
      true,
      'callerOwnedAccessibleCopy',
      true,
      'passiveCompatibilityHint',
      true,
      'doesNotAuthorEdges',
      true,
      'edgeAdmissionOwner',
      'AuthorCanvasGraphEdge'
    ),
  source_path = 'tools/planning-db/migrations/433_canvas_node_port_handle_direct_test.sql',
  source_content_sha256 = md5('rail:CanvasNodePortHandle:direct-test:433'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodePortHandle'
  and rail_name = 'RenderCanvasNodePortHandle';

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
  'web.component.canvas.CanvasNodePortHandle',
  'EV-CANVAS-NODE-PORT-HANDLE-DIRECT-TEST',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
  'RenderCanvasNodePortHandle',
  'canvas-node-port-handle',
  'CanvasNodePortHandle directly proves stable source/target handle rendering, semantic tone, caller-owned aria label, and passive compatibility descriptions without deciding edge admission.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodePortHandle.test.tsx',
    'stableHandleId', true,
    'callerOwnedAccessibleCopy', true,
    'passiveCompatibilityHint', true,
    'doesNotAuthorEdges', true,
    'edgeAdmissionOwner', 'AuthorCanvasGraphEdge'
  ),
  'tools/planning-db/migrations/433_canvas_node_port_handle_direct_test.sql',
  md5('evidence:CanvasNodePortHandle:direct-test:433')
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
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-NODE-PORT-HANDLE-DIRECT-TEST')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'directComponentTest', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.test.tsx',
      'presentationOnly', true,
      'doesNotAuthorEdges', true,
      'edgeAdmissionOwner', 'AuthorCanvasGraphEdge'
    ),
  source_path = 'tools/planning-db/migrations/433_canvas_node_port_handle_direct_test.sql',
  source_content_sha256 = md5('component:CanvasNodePortHandle:direct-test:433'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodePortHandle';
