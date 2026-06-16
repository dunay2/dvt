-- Repoint the local retired topbar duplicate to the governed execution prompt.
-- Migration 091 retires the imported orphan row; this keeps the DB-authored
-- local retirement evidence away from the retired buzon intake surface.

update planning_query_store.feature_mechanization_local_rails
set
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
      '"WebCanvasContextualGraphSurface"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Duplicate of CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1 contextual graph surface rail.'::text
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
        'WebCanvasContextualGraphSurface'
      )
    ),
    true
  ),
  revision = greatest(revision, 5),
  updated_at = now()
where feature_id = 'CANVAS-ACTIVE-CANVAS-TOPBAR-IDENTITY-20260615'
  and rail_type = 'query'
  and normalized_rail_name = 'rendercanvascontextualgraphsurface'
  and source_path in (
    'buzon/TAREA.TXT',
    'buzon/planning-db-component-coherence-prompt-20260615.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md'
  );
