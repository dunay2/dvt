-- Retire the contextual UX copy of ProjectGraphNodeCardReadModel. The
-- canonical rail is the graph card strategy projection declared by
-- docs/architecture/components/web/frontend-component-inventory.md.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'buzon/planning-db-component-coherence-prompt-20260615.md',
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
      '"WebCanvasGraphNodeCardStrategy"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Duplicate of CANVAS-CARD-STRATEGY-PROJECTION-20260616; canonical owner is web.component.canvas.GraphNodeCardStrategy.'::text
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
        'ProjectGraphNodeCardReadModel',
        'type',
        'query',
        'status',
        'retired',
        'dddOwner',
        'WebCanvasGraphNodeCardStrategy'
      )
    ),
    true
  ),
  revision = greatest(revision, 6),
  updated_at = now()
where feature_id = 'CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1'
  and rail_type = 'query'
  and normalized_rail_name = 'projectgraphnodecardreadmodel'
  and source_path in ('buzon/TAREA.TXT', 'buzon/planning-db-component-coherence-prompt-20260615.md');
