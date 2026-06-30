-- Merge the metadata projection slice into the existing feature-mechanization
-- manifest instead of keeping a same-owner local rail duplicate.

with patch as (
  select
    feature_id,
    symbol_refs,
    implementation_refs,
    documentation_refs,
    governing_sources,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties'
),
patched as (
  update planning_query_store.command_query_rails rail
  set
    symbol_refs = (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb))
        union
        select value
        from jsonb_array_elements_text(patch.symbol_refs)
      ) refs
    ),
    implementation_refs = (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb))
        union
        select value
        from jsonb_array_elements_text(patch.implementation_refs)
      ) refs
    ),
    documentation_refs = (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.documentation_refs, '[]'::jsonb))
        union
        select value
        from jsonb_array_elements_text(patch.documentation_refs)
      ) refs
    ),
    governing_sources = (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.governing_sources, '[]'::jsonb))
        union
        select value
        from jsonb_array_elements_text(patch.governing_sources)
      ) refs
    ),
    allowed_implementation_surfaces = (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb))
        union
        select value
        from jsonb_array_elements_text(patch.allowed_implementation_surfaces)
      ) refs
    ),
    architecture_guards = (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.architecture_guards, '[]'::jsonb))
        union
        select value
        from jsonb_array_elements_text(patch.architecture_guards)
      ) refs
    ),
    completion_gate = (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.completion_gate, '[]'::jsonb))
        union
        select value
        from jsonb_array_elements_text(patch.completion_gate)
      ) refs
    ),
    raw_manifest =
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              coalesce(rail.raw_manifest, '{}'::jsonb),
              '{allowedImplementationSurfaces}',
              (
                select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
                from (
                  select value
                  from jsonb_array_elements_text(
                    coalesce(rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
                  )
                  union
                  select value
                  from jsonb_array_elements_text(patch.raw_manifest->'allowedImplementationSurfaces')
                ) refs
              ),
              true
            ),
            '{architectureGuards}',
            (
              select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
              from (
                select value
                from jsonb_array_elements_text(
                  coalesce(rail.raw_manifest->'architectureGuards', '[]'::jsonb)
                )
                union
                select value
                from jsonb_array_elements_text(patch.raw_manifest->'architectureGuards')
              ) refs
            ),
            true
          ),
          '{completionGate}',
          (
            select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
            from (
              select value
              from jsonb_array_elements_text(
                coalesce(rail.raw_manifest->'completionGate', '[]'::jsonb)
              )
              union
              select value
              from jsonb_array_elements_text(patch.raw_manifest->'completionGate')
            ) refs
          ),
          true
        ),
        '{symbols}',
        (
          select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb)
          from (
            select distinct symbol
            from (
              select symbol
              from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
              union all
              select symbol
              from jsonb_array_elements(patch.raw_manifest->'symbols') symbols(symbol)
            ) all_symbols
          ) distinct_symbols
        ),
        true
      )
  from patch
  where rail.raw_manifest->>'featureId' = patch.feature_id
  returning rail.rail_id
)
delete from planning_query_store.feature_mechanization_local_rails local_rail
where local_rail.rail_id =
  'local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties'
  and exists (select 1 from patched);
