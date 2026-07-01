-- Register the narrowed NodeFloatingToolbar action-id type in the feature
-- mechanization manifest without editing the already-applied 423 migration.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts#CanvasNodeFloatingToolbarActionId')
    ) updated_refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select jsonb_agg(value order by value::text)
      from (
        select distinct value
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) symbols(value)
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeFloatingToolbarActionId',
            'path', 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts',
            'dddOwner', 'web.component.canvas.NodeFloatingToolbar',
            'cqRails', jsonb_build_array('RenderCanvasNodeFloatingToolbar'),
            'fowlerSignals', jsonb_build_array('no_stub_actions', 'closed_operable_action_set'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:type_alias_for_presenter_model',
            'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts')
          )
        ) raw_symbols(value)
      ) distinct_symbols(value)
    ),
    true
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('tools/planning-db/migrations/424_node_floating_toolbar_action_id_manifest.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/424_node_floating_toolbar_action_id_manifest.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:action-id-manifest:424'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
