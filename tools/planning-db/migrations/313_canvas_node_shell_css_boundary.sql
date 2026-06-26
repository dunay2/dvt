-- Move the graph-node shell presentation stylesheet out of the historical DBT
-- node component module. The shared GraphNodeCard owner keeps the generic
-- shell CSS, while the obsolete DBT CSS mapping is retired from the local
-- frontend component file registry.

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
  'web.component.canvas.GraphNodeCard',
  'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
  'style',
  null,
  jsonb_build_object(
    'role', 'shared graph node shell and port-handle styling',
    'rail', 'RenderCanvasGraphNodeCard',
    'retiredLegacyStyle', 'apps/web/src/app/components/canvas/DbtNodeComponent.module.css'
  ),
  'tools/planning-db/migrations/313_canvas_node_shell_css_boundary.sql',
  md5('CanvasNodeShell.module.css:313')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.DbtNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/DbtNodeComponent.module.css';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/components/canvas/CanvasNodeShell.module.css#CanvasNodeShellStyles'),
        ('tools/planning-db/migrations/313_canvas_node_shell_css_boundary.sql#CanvasNodeShellCssBoundary')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/313_canvas_node_shell_css_boundary.sql'
    ) surfaces(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'allowedImplementationSurfaces',
      (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          select 'tools/planning-db/migrations/313_canvas_node_shell_css_boundary.sql'
        ) surfaces(value)
      )
    ),
  source_path = 'tools/planning-db/migrations/313_canvas_node_shell_css_boundary.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodeShellCssBoundary:313'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
