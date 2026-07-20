-- Complete release-candidate feature mechanization with every top-level code
-- symbol. Private helpers remain implementation details, but DB-first source
-- ownership must still account for them and their governing rail.

with private_symbols as (
  select jsonb_build_array(
    jsonb_build_object('name', 'RELEASE_HEADING', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'CHANGELOG_METADATA_SECTIONS', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'REQUIRED_CHECK_CONTEXT', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity', 'ConfigureReleasePullRequestMergePolicy', 'PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'GITHUB_ACTIONS_APP_ID', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity', 'ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'normalizeText', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'normalizeReleaseEntryTitle', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'parseReleaseBlocks', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'canonicalJson', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'withoutProperty', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'parseVersion', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'compareVersions', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'changelogPreservesHistory', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'SUPPORTED_ARGUMENTS', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs', 'dddOwner', 'ReleaseCandidateGitObjectAdapter', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs')),
    jsonb_build_object('name', 'resolveReleaseConfiguration', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs', 'dddOwner', 'ReleaseCandidateGitObjectAdapter', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs')),
    jsonb_build_object('name', 'REQUIRED_CHECK', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
    jsonb_build_object('name', 'SUPPORTED_FLAGS', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
    jsonb_build_object('name', 'copyRule', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('mapper'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
    jsonb_build_object('name', 'defaultRequest', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
    jsonb_build_object('name', 'loadPolicy', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs'))
  ) as value
),
updated_manifests as (
  select
    rail.rail_id,
    jsonb_set(
      jsonb_set(
        rail.raw_manifest,
        '{symbols}',
        coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || private_symbols.value
      ),
      '{allowedImplementationSurfaces}',
      coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
        || jsonb_build_array('tools/planning-db/migrations/775_release_candidate_integrity_private_symbols.sql')
    ) as raw_manifest
  from planning_query_store.feature_mechanization_local_rails rail
  cross join private_symbols
  where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = updated.raw_manifest,
  allowed_implementation_surfaces = updated.raw_manifest -> 'allowedImplementationSurfaces',
  source_content_sha256 = planning_query_store.sha256_text(
    planning_query_store.stable_jsonb_text(updated.raw_manifest)
  ),
  symbol_refs = (
    select coalesce(
      jsonb_agg((symbol ->> 'path') || '#' || (symbol ->> 'name')),
      '[]'::jsonb
    )
    from jsonb_array_elements(updated.raw_manifest -> 'symbols') symbol
    where symbol -> 'cqRails' ? rail.rail_name
  ),
  revision = rail.revision + 1,
  updated_at = now()
from updated_manifests updated
where rail.rail_id = updated.rail_id;

do $$
begin
  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
      and jsonb_array_length(raw_manifest -> 'symbols') <> 30
  ) then
    raise exception 'Release candidate integrity must mechanize all thirty top-level code symbols';
  end if;

  if (
    select count(distinct source_content_sha256)
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  ) <> 1 then
    raise exception 'Release candidate integrity rails lost their canonical shared manifest';
  end if;
end
$$;
