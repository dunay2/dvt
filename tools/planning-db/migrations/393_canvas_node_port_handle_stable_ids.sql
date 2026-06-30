-- Extend the existing Canvas node port handle rail with the React Flow handle id
-- contract. This is still the RenderCanvasNodePortHandle query rail; the slice
-- adds deterministic connection anchors, not a new command/query.

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = raw_rail || jsonb_build_object(
    'stableHandleIdContract',
    'CanvasNodeShell assigns deterministic target/source React Flow handle ids to CanvasNodePortHandle.'
  ),
  source_path = 'tools/planning-db/migrations/393_canvas_node_port_handle_stable_ids.sql',
  source_content_sha256 = md5('rail:RenderCanvasNodePortHandle:stable-ids:393'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and rail_name = 'RenderCanvasNodePortHandle';

update planning_query_store.frontend_component_local_files
set
  raw_file = raw_file || jsonb_build_object(
    'stableHandleIdContract',
    'source and target React Flow handle ids are stable and owned by CanvasNodeShell.'
  ),
  source_path = 'tools/planning-db/migrations/393_canvas_node_port_handle_stable_ids.sql',
  source_content_sha256 = md5('file:CanvasNodePortHandle:stable-ids:393'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path in (
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx'
  );

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
  'web.component.canvas.GraphNodeCard',
  'EV-CANVAS-NODE-PORT-HANDLE-STABLE-ID-CONTRACT',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
  'RenderCanvasNodePortHandle',
  'node-card',
  'CanvasNodeShell renders deterministic React Flow target/source handle ids through CanvasNodePortHandle.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected target/source data-handleid values but received null attributes',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
  ),
  'tools/planning-db/migrations/393_canvas_node_port_handle_stable_ids.sql',
  md5('evidence:CanvasNodeShell:stable-handle-ids:393')
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

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = raw_rail || jsonb_build_object(
    'stableHandleIdContract',
    'CanvasNodeShell supplies target/source ids to the React Flow Handle adapter.'
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'stableHandleIdContract',
    jsonb_build_object(
      'rail', 'RenderCanvasNodePortHandle',
      'component', 'CanvasNodePortHandle',
      'host', 'CanvasNodeShell',
      'test', 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx'
    )
  ),
  source_path = 'tools/planning-db/migrations/393_canvas_node_port_handle_stable_ids.sql',
  source_content_sha256 = md5('feature:RenderCanvasNodePortHandle:stable-ids:393'),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#rendercanvasnodeporthandle';
