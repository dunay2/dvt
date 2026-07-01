-- Keep GraphNodeCardView presentation ownership stable after governance imports.
-- The imported inventory still lists GraphNodeCardView.tsx under the strategy
-- component. This local retirement row masks that imported ownership and the
-- effective view filters the local tombstone out of component-file reads.

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
  'web.component.canvas.GraphNodeCardStrategy',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
  'component',
  'GraphNodeCardView',
  jsonb_build_object(
    'retiredForPresentationOwnership', true,
    'reassignedToComponent', 'web.component.canvas.GraphNodeCardView',
    'reassignedRole', 'presentation',
    'rail', 'RenderCanvasGraphNodeCard',
    'reason', 'GraphNodeCardStrategy owns projection; GraphNodeCardView owns the presentational template.'
  ),
  'tools/planning-db/migrations/421_graph_node_card_view_import_overlay.sql',
  md5('file:GraphNodeCardStrategy:GraphNodeCardView.tsx:retired-for-presentation-ownership:421')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

create or replace view planning_query_store.frontend_component_file_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.exported_symbol,
    imported.raw_file,
    null::text as source_path,
    null::text as source_content_sha256
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select
    local_file.component_id,
    local_file.file_path,
    local_file.file_role,
    local_file.exported_symbol,
    local_file.raw_file,
    local_file.source_path,
    local_file.source_content_sha256
  from planning_query_store.frontend_component_local_files local_file
)
select
  file_ref.component_id,
  component.component_name,
  file_ref.file_path,
  file_ref.file_role,
  file_ref.exported_symbol,
  component.component_status,
  coalesce(file_ref.source_path, component.source_path) as source_path,
  coalesce(file_ref.source_content_sha256, component.source_content_sha256) as source_content_sha256
from effective_files file_ref
join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = file_ref.component_id
where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForPresentationOwnership')::boolean, false);

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
  'web.component.canvas.GraphNodeCardView',
  'EV-CANVAS-GRAPH-NODE-CARD-VIEW-IMPORT-OVERLAY',
  'integration-test',
  'current',
  'pnpm planning:db:query frontend-component-files --path apps/web/src/app/plugins/graph/GraphNodeCardView.tsx --limit 50',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-view-import-overlay',
  'GraphNodeCardView.tsx has one effective component owner after governance import: web.component.canvas.GraphNodeCardView.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'governance import reintroduced GraphNodeCardStrategy ownership for GraphNodeCardView.tsx after migration 420.',
    'expectedOwner', 'web.component.canvas.GraphNodeCardView',
    'retiredImportedOwner', 'web.component.canvas.GraphNodeCardStrategy'
  ),
  'tools/planning-db/migrations/421_graph_node_card_view_import_overlay.sql',
  md5('evidence:GraphNodeCardView:import-overlay:421')
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
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('tools/planning-db/migrations/421_graph_node_card_view_import_overlay.sql'),
        ('scripts/planning-db-migrate.test.cjs')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('tools/planning-db/migrations/421_graph_node_card_view_import_overlay.sql'),
        ('scripts/planning-db-migrate.test.cjs')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardViewImportOverlay',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCardView',
        'rail', 'RenderCanvasGraphNodeCard',
        'retiredImportedOwner', 'web.component.canvas.GraphNodeCardStrategy',
        'retiredFilePath', 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
        'retiredRole', 'component'
      )
    ),
  source_path = 'tools/planning-db/migrations/421_graph_node_card_view_import_overlay.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardView:import-overlay:421'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
