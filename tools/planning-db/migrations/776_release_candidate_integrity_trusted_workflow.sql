-- Reconcile release-candidate integrity after the hard security and Fowler QA.
-- Release generation and candidate admission have separate authorities: the
-- generator writes the PR, while one pull_request_target workflow loaded from
-- main publishes the required job status without executing candidate code.

update architecture.design
set
  rationale = 'Release Please only generates the candidate. A base-trusted pull_request_target workflow coordinates an immutable Git snapshot query and repository-policy query, then publishes the sole candidate-integrity job status without candidate credentials or candidate code execution.',
  updated_at = now()
where design_id = 'RELEASE-CANDIDATE-INTEGRITY-20260719';

update architecture.component
set
  repo_path = '.github/workflows/release-candidate-integrity.yml',
  public_contract = 'Own the single trusted Release candidate integrity job status and coordinate exact-tree assessment without generating releases or executing candidate code.',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY';

update architecture.component_responsibility
set
  responsibility = 'Coordinate exact candidate assessment from the trusted PR base and publish one required job status while delegating release generation, immutable Git reads, and GitHub policy mutation.',
  reason_to_change = 'The candidate admission lifecycle, trust boundary, or required workflow choreography changes.'
where responsibility_id = 'RESP-CI-RELEASE-CANDIDATE-INTEGRITY';

update architecture.contract
set contract_ref = '.github/workflows/release-candidate-integrity.yml#release_candidate_integrity'
where contract_id = 'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK';

update architecture.component_port
set negative_tests = array[
  'release branch is not same-repository or does not target main',
  'candidate-controlled code receives credentials or is executed',
  'status is attached to a head SHA other than the authoritative candidate',
  'validation failure does not fail the required workflow job'
]::text[]
where port_id = 'PORT-CI-RELEASE-CANDIDATE-CHECK-PUBLISH';

update architecture.component_relation
set
  failure_mode = 'The exact candidate SHA does not receive the sole required pass/fail job status.',
  authorization_scope = 'pull_request_target from trusted base with contents:read only',
  source_refs = jsonb_build_array('.github/workflows/release-candidate-integrity.yml#release_candidate_integrity'),
  updated_at = now()
where relation_id = 'REL-CI-RELEASE-INTEGRITY-PUBLISHES-THROUGH-GITHUB';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'owns',
  '.github/workflows/release-candidate-integrity.yml',
  0
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, recorded_at
)
values
  (
    'EV-CI-RELEASE-CANDIDATE-INTEGRITY-WORKFLOW-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'test',
    'node --test tools/ci/workflow-pattern-parity.test.mjs',
    'pass',
    now()
  ),
  (
    'EV-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'test',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs',
    'pass',
    now()
  ),
  (
    'EV-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'test',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs',
    'pass',
    now()
  ),
  (
    'EV-CI-RELEASE-CANDIDATE-INTEGRITY-POLICY-ADAPTER-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'test',
    'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs',
    'pass',
    now()
  )
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;

with existing_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by rail_id
  limit 1
),
renamed_symbols as (
  select jsonb_agg(
    case
      when symbol ->> 'path' = 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs'
        and symbol ->> 'name' = 'REQUIRED_CHECK_CONTEXT'
        then jsonb_set(symbol, '{name}', to_jsonb('REQUIRED_CHECK_CONTEXTS'::text))
      when symbol ->> 'path' = 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs'
        and symbol ->> 'name' = 'REQUIRED_CHECK'
        then jsonb_set(symbol, '{name}', to_jsonb('REQUIRED_CHECKS'::text))
      else symbol
    end
    order by symbol ->> 'path', symbol ->> 'name'
  ) as symbols
  from existing_manifest manifest
  cross join lateral jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbol
),
new_symbols as (
  select jsonb_build_array(
    jsonb_build_object('name', 'STRICT_SEMVER', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'GITHUB_PULL_REQUEST_TRAILER', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'DEFAULT_COMMIT_TRAILER', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'releaseEntrySourceIdentity', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
    jsonb_build_object('name', 'parseRawDiff', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs', 'dddOwner', 'ReleaseCandidateGitObjectAdapter', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs')),
    jsonb_build_object('name', 'canonicalJson', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('mapper'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
    jsonb_build_object('name', 'policyFingerprint', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('optimistic_offline_lock'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs'))
  ) as symbols
),
rewritten_manifest as (
  select jsonb_set(
    replace(
      replace(
        jsonb_set(
          manifest.raw_manifest,
          '{symbols}',
          renamed.symbols || added.symbols
        )::text,
        '.github/workflows/release.yml#publish-candidate-status',
        '.github/workflows/release-candidate-integrity.yml#release_candidate_integrity'
      ),
      'checks:write only in trusted publisher job',
      'trusted base workflow job status with contents:read only'
    )::jsonb,
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(manifest.raw_manifest -> 'allowedImplementationSurfaces')
        union
        select '.github/workflows/release-candidate-integrity.yml'
        union
        select 'tools/planning-db/migrations/776_release_candidate_integrity_trusted_workflow.sql'
      ) surfaces
    )
  ) as raw_manifest
  from existing_manifest manifest
  cross join renamed_symbols renamed
  cross join new_symbols added
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = rewritten.raw_manifest,
  allowed_implementation_surfaces = rewritten.raw_manifest -> 'allowedImplementationSurfaces',
  symbol_refs = (
    select coalesce(
      jsonb_agg((symbol ->> 'path') || '#' || (symbol ->> 'name') order by symbol ->> 'path', symbol ->> 'name'),
      '[]'::jsonb
    )
    from jsonb_array_elements(rewritten.raw_manifest -> 'symbols') symbol
    where symbol -> 'cqRails' ? rail.rail_name
  ),
  source_path = case
    when rail.rail_name = 'PublishReleaseCandidateIntegrityCheck'
      then '.github/workflows/release-candidate-integrity.yml'
    else rail.source_path
  end,
  implementation_refs = case
    when rail.rail_name = 'PublishReleaseCandidateIntegrityCheck'
      then jsonb_build_array('.github/workflows/release-candidate-integrity.yml#release_candidate_integrity')
    else rail.implementation_refs
  end,
  revision = rail.revision + 1,
  updated_at = now()
from rewritten_manifest rewritten
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

do $$
declare
  manifest_count integer;
begin
  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
      and jsonb_array_length(raw_manifest -> 'symbols') <> 37
  ) then
    raise exception 'Release candidate integrity must mechanize all thirty-seven top-level implementation symbols';
  end if;

  select count(distinct planning_query_store.stable_jsonb_text(raw_manifest))
  into manifest_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

  if manifest_count <> 1 then
    raise exception 'Release candidate integrity rails must share one canonical raw manifest';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
      and raw_manifest::text like '%.github/workflows/release.yml#publish-candidate-status%'
  ) then
    raise exception 'Release candidate integrity still references the retired release-workflow publisher';
  end if;

  if not exists (
    select 1
    from planning_query_store.governance_component_local_ownership_patterns
    where component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
      and pattern_kind = 'owns'
      and pattern = '.github/workflows/release-candidate-integrity.yml'
  ) then
    raise exception 'Release candidate integrity workflow ownership is missing';
  end if;
end
$$;
