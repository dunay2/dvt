-- Retire the responsive-shell duplicate of RenderCanvasContextualGraphSurface.
-- The canonical active rail is CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1 under
-- web.component.canvas.CanvasViewport.

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'web.component.canvas.CanvasViewport',
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md',
  source_content_sha256 = '154ff0acdea4ae3f9d998586b719e38c784ddd20d97867b5a8c2842f3373e760',
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"retired"'::jsonb,
        true
      ),
      '{dddOwner}',
      '"web.component.canvas.CanvasViewport"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Duplicate of CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1 RenderCanvasContextualGraphSurface rail.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{mechanizationStatus}',
      '"closed"'::jsonb,
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
        'retired',
        'dddOwner',
        'web.component.canvas.CanvasViewport'
      )
    ),
    true
  ),
  revision = greatest(revision, 2),
  updated_at = now()
where feature_id = 'CANVAS-RESPONSIVE-SHELL-SURFACE-20260616'
  and rail_type = 'query'
  and normalized_rail_name = 'rendercanvascontextualgraphsurface'
  and source_path in (
    'buzon/TAREA.TXT',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md'
  );
