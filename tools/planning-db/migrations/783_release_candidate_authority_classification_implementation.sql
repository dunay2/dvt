-- Close authority classification after the pure specification, CLI adapter,
-- workflow choreography, and required-check target vocabulary are executable.

update architecture.design
set
  status = 'implemented',
  updated_at = now()
where design_id = 'RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719';

update architecture.component
set
  status = 'implemented',
  maturity_score = 95,
  updated_at = now()
where component_id in (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER'
);

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER'
);

insert into architecture.contract (
  contract_id, contract_kind, owner_component_id, contract_ref,
  compatibility, status, validation_command
)
values (
  'CONTRACT-CI-RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION',
  'type',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
  'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs#classifyReleaseCandidateAuthority',
  'internal',
  'implemented',
  'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

update architecture.component_port
set
  input_contract_id = 'CONTRACT-CI-RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION',
  output_contract_id = 'CONTRACT-CI-RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION',
  status = 'implemented'
where port_id = 'PORT-CI-CLASSIFY-RELEASE-CANDIDATE-AUTHORITY';

update architecture.component_relation
set
  contract_id = 'CONTRACT-CI-RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION',
  status = 'implemented',
  updated_at = now()
where relation_id in (
  'REL-CI-RELEASE-INTEGRITY-CONTAINS-AUTHORITY-SPECIFICATION',
  'REL-CI-RELEASE-INTEGRITY-CONTAINS-AUTHORITY-CLI-ADAPTER',
  'REL-CI-RELEASE-AUTHORITY-CLI-DEPENDS-ON-SPECIFICATION'
);

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-CI-RELEASE-CANDIDATE-AUTHORITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs',
    'unit', 'negative', true,
    'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs'
  ),
  (
    'TEST-CI-RELEASE-CANDIDATE-AUTHORITY-CLI-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs',
    'integration', 'boundary', true,
    'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs'
  ),
  (
    'TEST-CI-RELEASE-CANDIDATE-AUTHORITY-WORKFLOW',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'tools/ci/workflow-pattern-parity.test.mjs',
    'architecture', 'boundary', true,
    'node --test tools/ci/workflow-pattern-parity.test.mjs'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-CI-RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-OUTPUT',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'Trusted classification job output records pull-request kind, repository scope, assessment disposition, publication SHA, and rejection code.',
    'trace', true, 'implemented'
  ),
  (
    'OBS-CI-RELEASE-CANDIDATE-AUTHORITY-CLI-FAILURE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'CLI validation failures terminate the read-only classification job and emit the rejected input contract reason to stderr.',
    'log', true, 'implemented'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, recorded_at
)
values
  (
    'EV-CI-RELEASE-CANDIDATE-AUTHORITY-SPECIFICATION-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'test',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs',
    'pass', now()
  ),
  (
    'EV-CI-RELEASE-CANDIDATE-AUTHORITY-CLI-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'test',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs',
    'pass', now()
  ),
  (
    'EV-CI-RELEASE-CANDIDATE-AUTHORITY-WORKFLOW-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'test',
    'node --test tools/ci/workflow-pattern-parity.test.mjs',
    'pass', now()
  )
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;

-- Publication owns lifecycle identity, not authority classification. The
-- classifier guarantees the exact candidate head for release PRs and the base
-- test merge revision for fork product PRs.
update architecture.component
set
  public_contract = 'Open and complete the one canonical required check only on the authoritative publication revision selected by trusted authority classification.',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE';

update architecture.component_responsibility
set
  responsibility = 'Enforce the required-check name, publication revision, lifecycle, terminal conclusion, and returned receipt identity.',
  reason_to_change = 'Required-check publication revision semantics or lifecycle invariants change.'
where responsibility_id = 'RESP-CI-RELEASE-CANDIDATE-CHECK-PUBLICATION-SERVICE';

update architecture.component_port
set
  negative_tests = array[
    'candidate-controlled code receives a checks:write token',
    'check is opened or completed on a revision other than the classified publication SHA',
    'remote receipt name, ID, or publication SHA differs from the command',
    'assessment failure is not published as a failing required check'
  ]::text[]
where port_id = 'PORT-CI-RELEASE-CANDIDATE-CHECK-PUBLISH';

update architecture.component_observability
set signal_name = 'Verified check lifecycle receipt records check ID, canonical name, authoritative publication SHA, status, and terminal conclusion.'
where observability_id = 'OBS-CI-RELEASE-CANDIDATE-CHECK-PUBLICATION-RECEIPT';

update architecture.component_relation
set
  failure_mode = 'GitHub does not attach the explicit required check to the authority-classified publication SHA.',
  authorization_scope = 'checks:write only after successful read-only authority classification',
  updated_at = now()
where relation_id = 'REL-CI-RELEASE-INTEGRITY-PUBLISHES-THROUGH-GITHUB';

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'responsibility', 'Enforce one authority-classified required-check lifecycle.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'reason_to_change', 'Required-check publication revision or receipt invariants change.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'public_api', 'beginReleaseCandidateIntegrityCheck;completeReleaseCandidateIntegrityCheck', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'invariant', 'The canonical check name and classified 40-character publication SHA remain identical for begin and complete.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'transition', 'Absent -> in_progress on publication SHA -> success or failure on the same check-run identity.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'consumer', 'Trusted begin and completion jobs after authority classification', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'fowler_signal', 'service layer with separated authority query and outbound port', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'responsibility', 'Adapt the publication service port to GitHub Checks API.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'reason_to_change', 'GitHub Checks API or token contract changes.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'public_api', 'createGitHubCheckRunPort;parseReleaseCandidateCheckArguments;runReleaseCandidateCheckCli', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'invariant', 'Completion reads and verifies remote name and publication SHA before PATCH.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'transition', 'Publication command -> GitHub head_sha request -> normalized and verified check receipt.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'consumer', 'ReleaseCandidateCheckPublicationService;trusted workflow publisher jobs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'fowler_signal', 'gateway isolates GitHub Checks API I/O', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  owned_concern = 'Own the authority-classified required-check lifecycle and receipt invariants.',
  revision = revision + 1
where component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE';

drop table if exists pg_temp.release_candidate_authority_implemented_manifest;

create temporary table release_candidate_authority_implemented_manifest as
with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
), rewritten_rails as (
  select jsonb_agg(
    case
      when rail.value ->> 'name' = 'ClassifyReleaseCandidateAuthority' then
        rail.value || jsonb_build_object(
          'status', 'implemented',
          'applicationPort', 'classifyReleaseCandidateAuthority',
          'adapterSurface', 'releaseCandidateAuthorityCli trusted event adapter'
        )
      when rail.value ->> 'name' = 'PublishReleaseCandidateIntegrityCheck' then
        rail.value || jsonb_build_object(
          'dddOwner', 'ReleaseCandidateCheckPublicationService',
          'applicationPort', 'beginReleaseCandidateIntegrityCheck;completeReleaseCandidateIntegrityCheck',
          'adapterSurface', 'releaseCandidateCheckGithubAdapter GitHub Checks API gateway',
          'scope', 'authority-classified pull-request revision; exact head for release candidates',
          'authorizationRules', jsonb_build_array(
            'classification job is read-only and precedes publication',
            'checks:write only in base-trusted begin and completion jobs',
            'candidate assessment job has contents:read only'
          )
        )
      else rail.value
    end
    order by rail.ordinality
  ) as command_query_rails
  from current_manifest
  cross join lateral jsonb_array_elements(
    coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb)
  ) with ordinality rail(value, ordinality)
), rewritten_symbols as (
  select coalesce(jsonb_agg(symbol.value order by symbol.ordinality), '[]'::jsonb) as symbols
  from current_manifest
  cross join lateral jsonb_array_elements(
    coalesce(raw_manifest -> 'symbols', '[]'::jsonb)
  ) with ordinality symbol(value, ordinality)
  where not (
    symbol.value ->> 'path' = 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs'
    and symbol.value ->> 'name' = 'requireHeadSha'
  )
), new_symbols as (
  select jsonb_build_array(
    jsonb_build_object('name', 'COMMIT_SHA', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 'dddOwner', 'ReleaseCandidateAuthoritySpecification', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs')),
    jsonb_build_object('name', 'REPOSITORY', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 'dddOwner', 'ReleaseCandidateAuthoritySpecification', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs')),
    jsonb_build_object('name', 'RELEASE_CANDIDATE_PREFIX', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 'dddOwner', 'ReleaseCandidateAuthoritySpecification', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs')),
    jsonb_build_object('name', 'requireRef', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 'dddOwner', 'ReleaseCandidateAuthoritySpecification', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('specification'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs')),
    jsonb_build_object('name', 'requireRepository', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 'dddOwner', 'ReleaseCandidateAuthoritySpecification', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('specification'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs')),
    jsonb_build_object('name', 'requireCommitSha', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 'dddOwner', 'ReleaseCandidateAuthoritySpecification', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('specification'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs')),
    jsonb_build_object('name', 'classifyReleaseCandidateAuthority', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 'dddOwner', 'ReleaseCandidateAuthoritySpecification', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('specification'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs')),
    jsonb_build_object('name', 'SUPPORTED_FLAGS', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs', 'dddOwner', 'ReleaseCandidateAuthorityCliAdapter', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs')),
    jsonb_build_object('name', 'parseReleaseCandidateAuthorityArguments', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs', 'dddOwner', 'ReleaseCandidateAuthorityCliAdapter', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs')),
    jsonb_build_object('name', 'runReleaseCandidateAuthorityCli', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs', 'dddOwner', 'ReleaseCandidateAuthorityCliAdapter', 'cqRails', jsonb_build_array('ClassifyReleaseCandidateAuthority'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs')),
    jsonb_build_object('name', 'requirePublicationSha', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('service_layer'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs'))
  ) as symbols
), allowed_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select distinct surface
    from current_manifest
    cross join lateral jsonb_array_elements_text(
      coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs',
        'tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs',
        'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs',
        'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs',
        'tools/planning-db/migrations/783_release_candidate_authority_classification_implementation.sql'
      )
    ) surface
  ) distinct_surfaces
)
select jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          current_manifest.raw_manifest,
          '{mechanizationStatus}',
          to_jsonb('implemented'::text)
        ),
        '{noHumanDecisionsRemaining}',
        'true'::jsonb
      ),
      '{commandQueryRails}',
      rewritten_rails.command_query_rails
    ),
    '{symbols}',
    rewritten_symbols.symbols || new_symbols.symbols
  ),
  '{allowedImplementationSurfaces}',
  allowed_surfaces.surfaces
) as raw_manifest
from current_manifest
cross join rewritten_rails
cross join rewritten_symbols
cross join new_symbols
cross join allowed_surfaces;

update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'implemented',
  raw_manifest = manifest.raw_manifest,
  allowed_implementation_surfaces = manifest.raw_manifest -> 'allowedImplementationSurfaces',
  symbol_refs = (
    select coalesce(
      jsonb_agg((symbol ->> 'path') || '#' || (symbol ->> 'name') order by symbol ->> 'path', symbol ->> 'name'),
      '[]'::jsonb
    )
    from jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbol
    where symbol -> 'cqRails' ? rail.rail_name
  ),
  source_content_sha256 = planning_query_store.sha256_text(
    planning_query_store.stable_jsonb_text(manifest.raw_manifest)
  ),
  revision = rail.revision + 1,
  updated_at = now()
from release_candidate_authority_implemented_manifest manifest
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

update planning_query_store.feature_mechanization_local_rails
set
  rail_status = 'implemented',
  implementation_refs = jsonb_build_array(
    'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs#classifyReleaseCandidateAuthority',
    'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs#runReleaseCandidateAuthorityCli',
    '.github/workflows/release-candidate-integrity.yml#classify_release_candidate_authority'
  ),
  source_path = 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs',
  raw_rail = raw_rail || jsonb_build_object(
    'status', 'implemented',
    'applicationPort', 'classifyReleaseCandidateAuthority',
    'adapterSurface', 'releaseCandidateAuthorityCli trusted event adapter'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#C-RELEASE-CANDIDATE-INTEGRITY-1#query#classifyreleasecandidateauthority';

do $$
declare
  maturity_gap_count integer;
  owned_file_count integer;
begin
  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'ClassifyReleaseCandidateAuthority'
      and rail_type = 'query'
      and ddd_owner = 'ReleaseCandidateAuthoritySpecification'
      and rail_status = 'implemented'
      and not is_gap
  ) then
    raise exception 'ClassifyReleaseCandidateAuthority is not an implemented query rail';
  end if;

  select count(*) into owned_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id in (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER'
  )
    and pattern_kind = 'owns';
  if owned_file_count <> 4 then
    raise exception 'Authority classification components must own exactly four implementation/test files';
  end if;

  select count(*) into maturity_gap_count
  from architecture.component_maturity_query
  where component_id in (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER'
  )
    and coalesce(array_length(missing_reasons, 1), 0) > 0;
  if maturity_gap_count <> 0 then
    raise exception 'Authority classification or check publication retains architecture maturity gaps';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
      and (
        raw_manifest ->> 'mechanizationStatus' <> 'implemented'
        or raw_manifest ->> 'noHumanDecisionsRemaining' <> 'true'
        or not (raw_manifest -> 'allowedImplementationSurfaces' ? 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs')
        or not (raw_manifest -> 'allowedImplementationSurfaces' ? 'tools/planning-db/migrations/783_release_candidate_authority_classification_implementation.sql')
      )
  ) then
    raise exception 'Release candidate authority feature manifest is incomplete';
  end if;
end
$$;
