-- Keep the Canvas node properties feature manifest scoped to the web
-- NodeWorkbench read model. Backend source import remains owned by the
-- ImportWarehouseSources feature manifest.

update planning_query_store.command_query_rails rail
set
  symbol_refs = (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) refs(value)
    where value not like 'apps/api/%'
  ),
  implementation_refs = (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb)) refs(value)
    where value not like 'apps/api/%'
  ),
  allowed_implementation_surfaces = (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
    where value not like 'apps/api/%'
  ),
  completion_gate = (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from jsonb_array_elements_text(coalesce(rail.completion_gate, '[]'::jsonb)) refs(value)
    where value not like 'pnpm --filter dvt-api%'
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
              from jsonb_array_elements_text(
                coalesce(rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
              ) refs(value)
              where value not like 'apps/api/%'
            ),
            true
          ),
          '{completionGate}',
          (
            select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
            from jsonb_array_elements_text(coalesce(rail.raw_manifest->'completionGate', '[]'::jsonb)) refs(value)
            where value not like 'pnpm --filter dvt-api%'
          ),
          true
        ),
        '{symbols}',
        (
          select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb)
          from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
          where symbol->>'path' not like 'apps/api/%'
        ),
        true
      ),
      '{redGreenCycles}',
      (
        select coalesce(jsonb_agg(cycle order by cycle->>'id'), '[]'::jsonb)
        from jsonb_array_elements(coalesce(rail.raw_manifest->'redGreenCycles', '[]'::jsonb)) cycles(cycle)
        where cycle->>'id' <> 'importwarehousesources-row-count-preservation'
      ),
      true
    )
where rail.raw_manifest->>'featureId' = 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604';
