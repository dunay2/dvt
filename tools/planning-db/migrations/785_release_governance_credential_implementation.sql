-- Close the release-governance credential design after the workflows require
-- the trusted identity and merge-policy projection rejects hidden bypass data.

update architecture.design
set status = 'implemented', updated_at = now()
where design_id = 'RELEASE-GOVERNANCE-CREDENTIAL-20260719';

update architecture.component_port
set status = 'implemented'
where port_id in (
  'PORT-CI-GENERATE-RELEASE-CANDIDATE',
  'PORT-CI-INSPECT-RELEASE-PULL-REQUEST-MERGE-POLICY'
);

update architecture.component
set
  public_contract = case component_id
    when 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
      then 'Coordinate trusted release generation, authority classification, immutable candidate assessment, and required-check publication without executing candidate code.'
    when 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER'
      then 'Inspect complete GitHub repository merge policy and configure its canonical form; omitted bypass visibility fails closed.'
    else public_contract
  end,
  status = 'implemented',
  maturity_score = 100,
  updated_at = now()
where component_id in (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER'
);

drop table if exists pg_temp.release_governance_credential_implementation_manifest;

create temporary table release_governance_credential_implementation_manifest as
with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
), rewritten_rails as (
  select jsonb_agg(
    case rail.value ->> 'name'
      when 'GenerateReleaseCandidate' then
        jsonb_set(
          jsonb_set(
            jsonb_set(
              rail.value,
              '{status}', to_jsonb('implemented'::text)
            ),
            '{symbolRefs}',
            jsonb_build_array('.github/workflows/release.yml#release_please')
          ),
          '{implementationRefs}',
          jsonb_build_array(
            '.github/workflows/release.yml#Require release governance credential',
            '.github/workflows/release.yml#Run release-please'
          )
        )
      when 'InspectReleasePullRequestMergePolicy' then
        jsonb_set(
          jsonb_set(
            jsonb_set(
              rail.value,
              '{status}', to_jsonb('implemented'::text)
            ),
            '{symbolRefs}',
            jsonb_build_array(
              'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
              'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#runReleaseMergePolicyCli'
            )
          ),
          '{implementationRefs}',
          jsonb_build_array(
            'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
            '.github/workflows/release-candidate-integrity.yml#Inspect repository merge policy from trusted code'
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
), rewritten_symbols as (
  select coalesce(
    jsonb_agg(
      case
        when symbol.value ->> 'path' = 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs'
          and symbol.value ->> 'name' in ('projectReleaseMergePolicy', 'runReleaseMergePolicyCli')
        then jsonb_set(
          symbol.value,
          '{cqRails}',
          jsonb_build_array(
            'ConfigureReleasePullRequestMergePolicy',
            'InspectReleasePullRequestMergePolicy'
          )
        )
        else symbol.value
      end
      order by symbol.ordinality
    ),
    '[]'::jsonb
  ) as values
  from current_manifest
  cross join lateral jsonb_array_elements(
    coalesce(raw_manifest -> 'symbols', '[]'::jsonb)
  ) with ordinality symbol(value, ordinality)
), surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as values
  from current_manifest
  cross join lateral (
    select distinct surface
    from jsonb_array_elements_text(
      coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/planning-db/migrations/785_release_governance_credential_implementation.sql'
      )
    ) as listed(surface)
  ) distinct_surfaces
)
select jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(raw_manifest, '{mechanizationStatus}', to_jsonb('implemented'::text)),
        '{noHumanDecisionsRemaining}', 'true'::jsonb
      ),
      '{commandQueryRails}', rewritten_rails.values
    ),
    '{symbols}', rewritten_symbols.values
  ),
  '{allowedImplementationSurfaces}', surfaces.values
) as raw_manifest
from current_manifest
cross join rewritten_rails
cross join rewritten_symbols
cross join surfaces;

update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'implemented',
  raw_manifest = manifest.raw_manifest,
  allowed_implementation_surfaces = manifest.raw_manifest -> 'allowedImplementationSurfaces',
  source_content_sha256 = planning_query_store.sha256_text(
    planning_query_store.stable_jsonb_text(manifest.raw_manifest)
  ),
  revision = rail.revision + 1,
  updated_at = now()
from release_governance_credential_implementation_manifest manifest
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

update planning_query_store.feature_mechanization_local_rails rail
set
  rail_status = 'implemented',
  symbol_refs = case rail.rail_name
    when 'GenerateReleaseCandidate'
      then jsonb_build_array('.github/workflows/release.yml#release_please')
    when 'InspectReleasePullRequestMergePolicy'
      then jsonb_build_array(
        'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
        'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#runReleaseMergePolicyCli'
      )
    else rail.symbol_refs
  end,
  implementation_refs = case rail.rail_name
    when 'GenerateReleaseCandidate'
      then jsonb_build_array(
        '.github/workflows/release.yml#Require release governance credential',
        '.github/workflows/release.yml#Run release-please'
      )
    when 'InspectReleasePullRequestMergePolicy'
      then jsonb_build_array(
        'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
        '.github/workflows/release-candidate-integrity.yml#Inspect repository merge policy from trusted code'
      )
    else rail.implementation_refs
  end,
  source_path = case rail.rail_name
    when 'GenerateReleaseCandidate' then '.github/workflows/release.yml'
    when 'InspectReleasePullRequestMergePolicy'
      then 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs'
    else rail.source_path
  end,
  source_content_sha256 = planning_query_store.sha256_text(
    case rail.rail_name
      when 'GenerateReleaseCandidate' then 'release-workflow-governance:785'
      when 'InspectReleasePullRequestMergePolicy'
        then 'release-merge-policy-visibility:785'
      else rail.source_path || ':785'
    end
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(rail.raw_rail, '{status}', to_jsonb('implemented'::text)),
      '{symbolRefs}',
      case rail.rail_name
        when 'GenerateReleaseCandidate'
          then jsonb_build_array('.github/workflows/release.yml#release_please')
        when 'InspectReleasePullRequestMergePolicy'
          then jsonb_build_array(
            'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
            'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#runReleaseMergePolicyCli'
          )
        else rail.symbol_refs
      end
    ),
    '{implementationRefs}',
    case rail.rail_name
      when 'GenerateReleaseCandidate'
        then jsonb_build_array(
          '.github/workflows/release.yml#Require release governance credential',
          '.github/workflows/release.yml#Run release-please'
        )
      when 'InspectReleasePullRequestMergePolicy'
        then jsonb_build_array(
          'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
          '.github/workflows/release-candidate-integrity.yml#Inspect repository merge policy from trusted code'
        )
      else rail.implementation_refs
    end
  ),
  revision = rail.revision + 1,
  updated_at = now()
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  and rail.rail_name in (
    'GenerateReleaseCandidate',
    'InspectReleasePullRequestMergePolicy'
  );

do $$
begin
  if exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name in (
      'GenerateReleaseCandidate',
      'InspectReleasePullRequestMergePolicy'
    )
      and (rail_status <> 'implemented' or is_gap)
  ) then
    raise exception 'Release governance credential rails remain incomplete';
  end if;

  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'GenerateReleaseCandidate'
      and rail_type = 'command'
      and ddd_owner = 'ReleaseCandidateIntegrityGate'
      and rail_status = 'implemented'
      and not is_gap
  ) then
    raise exception 'GenerateReleaseCandidate implemented command rail is missing';
  end if;

  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'InspectReleasePullRequestMergePolicy'
      and rail_type = 'query'
      and ddd_owner = 'ReleaseMergePolicyAdapter'
      and rail_status = 'implemented'
      and not is_gap
  ) then
    raise exception 'InspectReleasePullRequestMergePolicy implemented query rail is missing';
  end if;
end
$$;
