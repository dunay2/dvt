-- Deduplicate relation-projection symbol manifests after consolidating local
-- development migrations into the tracked DB-first manifest.

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = coalesce(
    (
      select jsonb_agg(distinct ref.value order by ref.value)
      from jsonb_array_elements_text(coalesce(rails.symbol_refs, '[]'::jsonb)) ref(value)
    ),
    '[]'::jsonb
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(
      (
        select jsonb_agg(deduped.symbol_entry order by deduped.symbol_path, deduped.symbol_name)
        from (
          select distinct on (symbol_entry->>'path', symbol_entry->>'name')
            symbol_entry->>'name' as symbol_name,
            symbol_entry->>'path' as symbol_path,
            symbol_entry
          from jsonb_array_elements(coalesce(rails.raw_manifest->'symbols', '[]'::jsonb)) symbol_entry
          order by
            symbol_entry->>'path',
            symbol_entry->>'name',
            symbol_entry->>'dddOwner' desc
        ) deduped
      ),
      '[]'::jsonb
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/471_graph_node_card_relation_projection_symbol_dedupe.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardStrategy:relation-projection-symbol-dedupe:471'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name in (
    'ProjectGraphNodeCardReadModel',
    'RenderCanvasGraphNodeCard'
  )
  and raw_manifest ? 'symbols'
  and raw_manifest::text like any (array[
    '%GraphNodeRelationParts%',
    '%recordValue%',
    '%resolveGraphNodeRelationParts%',
    '%resolveGraphNodeRelationPath%'
  ]);
