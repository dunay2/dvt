-- Keep the active RenderCanvasContextualGraphSurface rail aligned with the
-- frontend component inventory: CanvasViewport owns the primary graph surface
-- projection.

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'web.component.canvas.CanvasViewport',
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  source_path = 'docs/architecture/components/web/frontend-component-inventory.md',
  source_content_sha256 = '7b73a419fc7179522a9e12103ba6653fdaa4c5b96bff0201fe93da97918e2d3a',
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"implemented"'::jsonb,
        true
      ),
      '{dddOwner}',
      '"web.component.canvas.CanvasViewport"'::jsonb,
      true
    ),
    '{canonicalReason}',
    to_jsonb(
      'CanvasViewport owns RenderCanvasContextualGraphSurface in the frontend component inventory.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{mechanizationStatus}',
      '"implemented"'::jsonb,
      true
    ),
    '{commandQueryRails}',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'RenderCanvasContextualGraphSurface',
        'type',
        'query',
        'status',
        'implemented',
        'dddOwner',
        'web.component.canvas.CanvasViewport'
      )
    ),
    true
  ),
  revision = greatest(revision, 8),
  updated_at = now()
where feature_id = 'CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1'
  and rail_type = 'query'
  and normalized_rail_name = 'rendercanvascontextualgraphsurface';
