-- Normalize GraphNodeCard file roles. GraphNodeCardView is the presentation
-- template and GraphNodeCardView.test is its presentation test; the older
-- generic component/test rows duplicate ownership semantics and make the
-- component inventory noisier without adding coverage.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.GraphNodeCard'
  and (
    (file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'
      and file_role = 'component')
    or
    (file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'
      and file_role = 'test')
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
values
  (
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-GRAPH-NODE-CARD-VIEW-FILE-ROLES-NORMALIZED',
    'architecture-test',
    'current',
    'pnpm planning:db:query frontend-component-files --component web.component.canvas.GraphNodeCard --limit 200',
    'RenderCanvasGraphNodeCard',
    'node-card',
    'GraphNodeCardView files have one specific DB role each: presentation and presentation-test.',
    jsonb_build_object(
      'removedGenericRoles', jsonb_build_array('component', 'test'),
      'keptSpecificRoles', jsonb_build_array('presentation', 'presentation-test'),
      'roleNormalization', true
    ),
    'tools/planning-db/migrations/387_graph_node_card_view_file_role_normalization.sql',
    md5('evidence:GraphNodeCard:view-file-roles-normalized:387')
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
