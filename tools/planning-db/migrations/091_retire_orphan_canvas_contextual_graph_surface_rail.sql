-- Retire the orphaned imported rail row that duplicated the accepted
-- contextual canvas graph query. The source file is not present in the
-- governed filesystem, so the DB row must not remain an active rail.

update planning_query_store.command_query_rails
set
  rail_status = 'retired',
  raw_rail = jsonb_set(
    jsonb_set(
      coalesce(raw_rail, '{}'::jsonb),
      '{railStatus}',
      '"retired"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Duplicate orphan rail retired in favor of CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1.'::text
    ),
    true
  )
where feature_id = 'CANVAS-ACTIVE-CANVAS-TOPBAR-IDENTITY-20260615'
  and rail_type = 'query'
  and normalized_rail_name = 'rendercanvascontextualgraphsurface'
  and source_path = 'buzon/TAREA.TXT';
