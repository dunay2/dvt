-- Close the merge-policy evidence projection after the trusted workflow passes
-- only the nested canonical policy to candidate assessment.

update architecture.design
set status = 'implemented', updated_at = now()
where design_id = 'RELEASE-MERGE-POLICY-PROJECTION-20260720';

drop table if exists pg_temp.release_merge_policy_projection_manifest;

create temporary table release_merge_policy_projection_manifest as
with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
), rewritten_rails as (
  select jsonb_agg(
    case
      when rail.value ->> 'name' = 'InspectReleasePullRequestMergePolicy'
      then jsonb_set(
        rail.value,
        '{implementationRefs}',
        coalesce(rail.value -> 'implementationRefs', '[]'::jsonb)
        || jsonb_build_array(
          '.github/workflows/release-candidate-integrity.yml#Assess exact candidate with trusted code'
        )
      )
      else rail.value
    end
    order by rail.ordinality
  ) as values
  from current_manifest
  cross join lateral jsonb_array_elements(
    coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb)
  ) with ordinality rail(value, ordinality)
), surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as values
  from current_manifest
  cross join lateral (
    select distinct surface
    from jsonb_array_elements_text(
      coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/planning-db/migrations/787_release_merge_policy_projection_implementation.sql'
      )
    ) listed(surface)
  ) distinct_surfaces
)
select jsonb_set(
  jsonb_set(raw_manifest, '{commandQueryRails}', rewritten_rails.values),
  '{allowedImplementationSurfaces}', surfaces.values
) as raw_manifest
from current_manifest
cross join rewritten_rails
cross join surfaces;

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = manifest.raw_manifest,
  allowed_implementation_surfaces = manifest.raw_manifest -> 'allowedImplementationSurfaces',
  source_content_sha256 = planning_query_store.sha256_text(
    planning_query_store.stable_jsonb_text(manifest.raw_manifest)
  ),
  revision = rail.revision + 1,
  updated_at = now()
from release_merge_policy_projection_manifest manifest
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = rail.implementation_refs
    || jsonb_build_array(
      '.github/workflows/release-candidate-integrity.yml#Assess exact candidate with trusted code'
    ),
  raw_rail = jsonb_set(
    rail.raw_rail,
    '{implementationRefs}',
    coalesce(rail.raw_rail -> 'implementationRefs', '[]'::jsonb)
    || jsonb_build_array(
      '.github/workflows/release-candidate-integrity.yml#Assess exact candidate with trusted code'
    )
  ),
  source_content_sha256 = planning_query_store.sha256_text(
    'release-merge-policy-projection:787'
  ),
  revision = rail.revision + 1,
  updated_at = now()
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  and rail.rail_name = 'InspectReleasePullRequestMergePolicy';

do $$
begin
  if not exists (
    select 1
    from architecture.design
    where design_id = 'RELEASE-MERGE-POLICY-PROJECTION-20260720'
      and status = 'implemented'
  ) then
    raise exception 'Release merge-policy projection design remains incomplete';
  end if;

  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'InspectReleasePullRequestMergePolicy'
      and rail_status = 'implemented'
      and not is_gap
      and implementation_refs ?
        '.github/workflows/release-candidate-integrity.yml#Assess exact candidate with trusted code'
  ) then
    raise exception 'Merge-policy projection evidence is missing from the query rail';
  end if;
end
$$;
