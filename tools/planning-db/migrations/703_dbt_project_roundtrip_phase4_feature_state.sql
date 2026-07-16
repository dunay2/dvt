-- Keep the aggregate dbt project round-trip feature honest after Phase 4.
-- Feature mechanization has a binary implemented/closed vocabulary, so the
-- implemented mapping closes the Phase 4 scope while the manifest names the
-- later product phases that remain separately gated by the parent task.

with target_rail as (
  select rail.rail_id, rail.rail_name
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
    and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
), reconciled_surface as (
  select
    rail.rail_id,
    coalesce(
      (
        select jsonb_agg(to_jsonb(surface) order by surface)
        from (
          select distinct surface_item.value as surface
          from jsonb_array_elements_text(
            coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
            || jsonb_build_array(
              'tools/planning-db/migrations/703_dbt_project_roundtrip_phase4_feature_state.sql'
            )
          ) surface_item(value)
        ) distinct_surface
      ),
      '[]'::jsonb
    ) as surfaces
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rail using (rail_id)
), reconciled_story as (
  select
    rail.rail_id,
    coalesce(
      (
        select jsonb_agg(to_jsonb(story) order by story)
        from (
          select distinct story_item.value as story
          from jsonb_array_elements_text(
            coalesce(rail.raw_manifest -> 'userStories', '[]'::jsonb)
            || jsonb_build_array(
              'A workspace editor can preview the selected file-authoritative dbt project revision without regenerating project files.',
              'A workspace editor can start a run only from the exact previewed file-authoritative revision and authorized selection.',
              'A workspace editor can reopen run evidence and inspect the persisted project revision and execution-target provenance.'
            )
          ) story_item(value)
        ) distinct_story
      ),
      '[]'::jsonb
    ) as stories
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rail using (rail_id)
)
update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'implemented',
  implementation_refs = reconciled_surface.surfaces,
  allowed_implementation_surfaces = reconciled_surface.surfaces,
  source_path = 'tools/planning-db/migrations/703_dbt_project_roundtrip_phase4_feature_state.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':phase4-feature-state:703'), 2),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'phase4FeatureStateReconciledBy',
    '703_dbt_project_roundtrip_phase4_feature_state'
  ),
  raw_manifest = rail.raw_manifest || jsonb_build_object(
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Complete the governed dbt project round trip through Phase 4: validate and import, project authoritative files, mutate files safely, import sources by authority mode, preview a revision-bound planner graph, and run the same immutable secret-free project bundle. Canonical Phases 5-7 remain separately gated: conservative visual edits, export, and graph-draft adoption.',
    'userStories', reconciled_story.stories,
    'currentImplementationSourcePath',
    'tools/planning-db/migrations/703_dbt_project_roundtrip_phase4_feature_state.sql',
    'allowedImplementationSurfaces', reconciled_surface.surfaces
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surface
join reconciled_story using (rail_id)
where rail.rail_id = reconciled_surface.rail_id;

do $$
declare
  reconciled_count integer;
begin
  select count(*) into reconciled_count
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
    and rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
    and rail.mechanization_status = 'implemented'
    and rail.raw_manifest ->> 'mechanizationStatus' = 'implemented'
    and rail.raw_manifest ->> 'noHumanDecisionsRemaining' = 'true'
    and rail.raw_manifest ->> 'implementationPlan' like '%Canonical Phases 5-7 remain separately gated%'
    and rail.raw_manifest -> 'userStories' @> jsonb_build_array(
      'A workspace editor can preview the selected file-authoritative dbt project revision without regenerating project files.',
      'A workspace editor can start a run only from the exact previewed file-authoritative revision and authorized selection.',
      'A workspace editor can reopen run evidence and inspect the persisted project revision and execution-target provenance.'
    )
    and rail.allowed_implementation_surfaces
      ? 'tools/planning-db/migrations/703_dbt_project_roundtrip_phase4_feature_state.sql';

  if reconciled_count <> 2 then
    raise exception 'Phase 4 aggregate feature state requires two implemented mappings with closed Phase 4 decisions, found %', reconciled_count;
  end if;
end $$;
