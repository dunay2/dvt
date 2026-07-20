-- Extend the canonical PR metadata validation feature with the Dependabot
-- title-generation policy that must produce metadata accepted by that query.

with target as (
  select
    rail_id,
    raw_manifest,
    coalesce(allowed_implementation_surfaces, '[]'::jsonb) as allowed_surfaces,
    coalesce(implementation_refs, '[]'::jsonb) as implementation_refs
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'A-CI-PR-TITLE-LOCAL-AUTHORITY-1'
), reconciled as (
  select
    target.rail_id,
    (
      select jsonb_agg(to_jsonb(surface) order by surface)
      from (
        select distinct surface
        from jsonb_array_elements_text(
          target.allowed_surfaces
          || jsonb_build_array(
            '.github/dependabot.yml',
            'tools/planning-db/migrations/788_dependabot_pr_title_contract.sql'
          )
        ) as allowed(surface)
      ) distinct_surfaces
    ) as allowed_surfaces,
    (
      select jsonb_agg(to_jsonb(reference) order by reference)
      from (
        select distinct reference
        from jsonb_array_elements_text(
          target.implementation_refs
          || jsonb_build_array(
            '.github/dependabot.yml',
            'tools/planning-db/migrations/788_dependabot_pr_title_contract.sql'
          )
        ) as implementation(reference)
      ) distinct_references
    ) as implementation_refs,
    case
      when coalesce(target.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
        @> jsonb_build_array(jsonb_build_object('id', 'dependabot-pr-title-contract'))
        then coalesce(target.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
      else coalesce(target.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'id', 'dependabot-pr-title-contract',
            'redTest', 'node --test tools/ci/github-collaboration-governance.test.mjs',
            'expectedFailure', 'Dependabot composes duplicate Conventional Commit scopes that the canonical PR title validator rejects.',
            'patchSurfaces', jsonb_build_array(
              '.github/dependabot.yml',
              'tools/ci/github-collaboration-governance.test.mjs'
            ),
            'greenTest', 'pnpm pr:validate-title "chore(deps): Bump the linting dependency group"'
          )
        )
    end as red_green_cycles,
    case
      when coalesce(target.raw_manifest -> 'userStories', '[]'::jsonb)
        @> jsonb_build_array('A dependency update pull request receives a title accepted by the canonical repository validator without manual repair.')
        then coalesce(target.raw_manifest -> 'userStories', '[]'::jsonb)
      else coalesce(target.raw_manifest -> 'userStories', '[]'::jsonb)
        || jsonb_build_array('A dependency update pull request receives a title accepted by the canonical repository validator without manual repair.')
    end as user_stories,
    target.raw_manifest
  from target
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = reconciled.allowed_surfaces,
  implementation_refs = reconciled.implementation_refs,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        reconciled.raw_manifest,
        '{allowedImplementationSurfaces}',
        reconciled.allowed_surfaces,
        true
      ),
      '{redGreenCycles}',
      reconciled.red_green_cycles,
      true
    ),
    '{userStories}',
    reconciled.user_stories,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled
where rail.rail_id = reconciled.rail_id;

do $$
begin
  if not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    where rail.feature_id = 'A-CI-PR-TITLE-LOCAL-AUTHORITY-1'
      and rail.allowed_implementation_surfaces @> jsonb_build_array('.github/dependabot.yml')
      and rail.raw_manifest -> 'redGreenCycles'
        @> jsonb_build_array(jsonb_build_object('id', 'dependabot-pr-title-contract'))
  ) then
    raise exception 'Dependabot PR title generation is not governed by the canonical PR metadata feature';
  end if;
end
$$;
