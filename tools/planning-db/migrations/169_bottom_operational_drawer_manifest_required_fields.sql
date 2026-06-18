-- Complete the DB-local BottomOperationalDrawer feature manifests after the
-- deprecated source repoint. Fresh CI databases validate feature manifests
-- from migrations only, so required symbol cypressCoverage and forbidden
-- surfaces must be materialized in the DB-local rows rather than inherited from
-- prior live operation state.

with target_rails as (
  select
    rail.rail_id,
    rail.raw_manifest,
    rail.raw_rail
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
    and rail.source_path in (
      'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx'
    )
),
symbol_patch as (
  select
    target.rail_id,
    coalesce(
      jsonb_agg(
        case
          when symbol.value ? 'cypressCoverage' then symbol.value
          else symbol.value || jsonb_build_object(
            'cypressCoverage',
            'N/A - DB-local source reconciliation is covered by unit, presentation, and architecture tests.'
          )
        end
        order by symbol.ordinality
      ),
      '[]'::jsonb
    ) as symbols
  from target_rails target
  left join lateral jsonb_array_elements(
    coalesce(target.raw_manifest->'symbols', '[]'::jsonb)
  ) with ordinality as symbol(value, ordinality)
    on true
  group by target.rail_id
),
forbidden_patch as (
  select
    target.rail_id,
    coalesce(jsonb_agg(distinct forbidden.path order by forbidden.path), '[]'::jsonb) as forbidden_surfaces
  from target_rails target
  left join lateral (
    select value as path
    from jsonb_array_elements_text(
      coalesce(target.raw_manifest->'forbiddenImplementationSurfaces', '[]'::jsonb)
    ) existing_forbidden(value)
    where nullif(existing_forbidden.value, '') is not null
    union all
    select value as path
    from jsonb_array_elements_text(
      coalesce(
        target.raw_manifest->'deprecatedSourcePaths',
        target.raw_rail->'deprecatedSourcePaths',
        '[]'::jsonb
      )
    ) deprecated_source(value)
    where nullif(deprecated_source.value, '') is not null
  ) forbidden
    on true
  group by target.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'symbols',
      symbol_patch.symbols,
      'forbiddenImplementationSurfaces',
      forbidden_patch.forbidden_surfaces
    ),
  revision = rail.revision + 1,
  updated_at = now()
from symbol_patch
join forbidden_patch
  on forbidden_patch.rail_id = symbol_patch.rail_id
where rail.rail_id = symbol_patch.rail_id;
