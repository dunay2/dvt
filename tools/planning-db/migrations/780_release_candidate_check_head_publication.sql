-- Close the SHA-identity gap in the trusted release-candidate check. The
-- workflow coordinates three authority-separated jobs; an application service
-- owns publication invariants and a GitHub adapter owns Checks API I/O.

update architecture.design
set
  rationale = 'Release Please only generates the candidate. A trusted coordinator opens the required check on the exact PR head SHA, runs immutable assessment in a separate read-only job, and completes the same check through an application service and GitHub Checks adapter.',
  updated_at = now()
where design_id = 'RELEASE-CANDIDATE-INTEGRITY-20260719';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-CHECK-PUBLICATION-SERVICE', 'must_prove', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-GITHUB-CHECK-ADAPTER', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract,
  runtime, criticality, status, maturity_score, parent_component_id
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'Release candidate check publication service',
    'service',
    'application',
    'ReleaseCandidateCheckPublicationService',
    'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs',
    'Open and complete the one canonical required check only on the authoritative pull-request head SHA.',
    'node',
    'high',
    'implemented',
    95,
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'Release candidate GitHub Checks adapter',
    'adapter',
    'adapter',
    'ReleaseCandidateCheckGitHubAdapter',
    'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs',
    'Create, verify, and complete GitHub check runs through the Checks API without owning release policy.',
    'node',
    'high',
    'implemented',
    95,
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

update architecture.component
set
  public_contract = 'Coordinate trusted begin, read-only assessment, and completion jobs while delegating check lifecycle invariants and GitHub API I/O.',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY';

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values
  (
    'RESP-CI-RELEASE-CANDIDATE-CHECK-PUBLICATION-SERVICE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'Enforce the required-check name, exact head SHA, lifecycle, terminal conclusion, and returned receipt identity.',
    'Required-check publication semantics or lifecycle invariants change.',
    'ReleaseCandidateCheckPublicationService',
    'implemented'
  ),
  (
    'RESP-CI-RELEASE-CANDIDATE-GITHUB-CHECK-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'Adapt check publication commands to GitHub Checks API requests and verify remote identity before mutation.',
    'GitHub Checks API shape, authentication, or error semantics change.',
    'ReleaseCandidateCheckGitHubAdapter',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.contract
set
  owner_component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
  contract_ref = 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs#beginReleaseCandidateIntegrityCheck;completeReleaseCandidateIntegrityCheck',
  validation_command = 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs',
  updated_at = now()
where contract_id = 'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK';

update architecture.component_port
set
  component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
  direction = 'inbound',
  negative_tests = array[
    'candidate-controlled code receives a checks:write token',
    'check is opened or completed on a SHA other than the authoritative PR head',
    'remote receipt name, ID, or head SHA differs from the publication command',
    'assessment failure is not published as a failing required check'
  ]::text[],
  status = 'implemented'
where port_id = 'PORT-CI-RELEASE-CANDIDATE-CHECK-PUBLISH';

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values (
  'PORT-CI-RELEASE-CANDIDATE-GITHUB-CHECK-WRITE',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
  'WriteReleaseCandidateIntegrityCheckRun',
  'command',
  'outbound',
  'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
  'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
  array[
    'GitHub API returns a check for another head SHA',
    'completion mutates a check before reading and verifying its identity',
    'GitHub API failure is converted into success'
  ]::text[],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  (
    'REL-CI-RELEASE-INTEGRITY-CONTAINS-CHECK-PUBLICATION-SERVICE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'contains', 'outbound', 'sync',
    'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
    'Workflow choreography would own check identity and lifecycle policy.',
    'trusted workflow invocation',
    jsonb_build_array('.github/workflows/release-candidate-integrity.yml'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-INTEGRITY-CONTAINS-GITHUB-CHECK-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'contains', 'outbound', 'sync',
    'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
    'GitHub Checks API I/O would be hidden inside workflow shell.',
    'checks:write only in trusted publisher jobs',
    jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-CHECK-PUBLICATION-DEPENDS-ON-GITHUB-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'depends_on', 'outbound', 'async',
    'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
    'The required check cannot be published or its remote identity cannot be verified.',
    'application port; token remains in trusted adapter process',
    jsonb_build_array('beginReleaseCandidateIntegrityCheck', 'completeReleaseCandidateIntegrityCheck'),
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update architecture.component_relation
set
  source_component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
  failure_mode = 'GitHub does not attach the explicit required check to the exact pull-request head SHA.',
  authorization_scope = 'checks:write only in base-trusted begin and completion jobs',
  source_refs = jsonb_build_array(
    'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs',
    '.github/workflows/release-candidate-integrity.yml'
  ),
  updated_at = now()
where relation_id = 'REL-CI-RELEASE-INTEGRITY-PUBLISHES-THROUGH-GITHUB';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-CI-RELEASE-CANDIDATE-CHECK-PUBLICATION-SERVICE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs',
    'unit', 'negative', true,
    'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs'
  ),
  (
    'TEST-CI-RELEASE-CANDIDATE-GITHUB-CHECK-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs',
    'integration', 'boundary', true,
    'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, recorded_at
)
values
  (
    'EV-CI-RELEASE-CANDIDATE-CHECK-PUBLICATION-SERVICE-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'test',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs',
    'pass', now()
  ),
  (
    'EV-CI-RELEASE-CANDIDATE-GITHUB-CHECK-ADAPTER-20260719',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'test',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs',
    'pass', now()
  )
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'tools/planning-db/migrations/780_release_candidate_check_head_publication.sql',
    planning_query_store.sha256_text('release-candidate-check-publication-service:780'),
    0,
    'Release candidate check publication service',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-DVT', 'SYS-DVT', 'canonical', false,
    'Own the exact-head required-check lifecycle and receipt invariants.',
    'ReleaseCandidateCheckPublicationService',
    'PublishReleaseCandidateIntegrityCheck',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'tools/planning-db/migrations/780_release_candidate_check_head_publication.sql',
    planning_query_store.sha256_text('release-candidate-github-check-adapter:780'),
    0,
    'Release candidate GitHub Checks adapter',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-DVT', 'SYS-DVT', 'canonical', false,
    'Own GitHub Checks API request, response, and remote identity adaptation.',
    'ReleaseCandidateCheckGitHubAdapter',
    'PublishReleaseCandidateIntegrityCheck',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.governance_component_local_definitions.revision + 1,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 1),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'responsibility', 'Enforce one exact-head required-check lifecycle.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'reason_to_change', 'Required-check lifecycle or receipt invariants change.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'public_api', 'beginReleaseCandidateIntegrityCheck;completeReleaseCandidateIntegrityCheck', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'invariant', 'The canonical check name and exact 40-character PR head SHA cannot be supplied by workflow callers.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'transition', 'Absent -> in_progress on head SHA -> success or failure on the same check-run identity.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'consumer', 'Trusted release candidate begin and completion jobs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE', 'fowler_signal', 'service layer with separated outbound port', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'responsibility', 'Adapt the publication service port to GitHub Checks API.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'reason_to_change', 'GitHub Checks API or token contract changes.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'public_api', 'createGitHubCheckRunPort;parseReleaseCandidateCheckArguments;runReleaseCandidateCheckCli', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'invariant', 'Completion reads and verifies remote name and head SHA before PATCH.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'transition', 'Publication command -> GitHub request -> normalized and verified check receipt.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'consumer', 'ReleaseCandidateCheckPublicationService;trusted workflow publisher jobs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER', 'fowler_signal', 'gateway isolates GitHub Checks API I/O', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with existing_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by rail_id
  limit 1
),
new_symbols as (
  select jsonb_build_array(
    jsonb_build_object('name', 'RELEASE_CANDIDATE_CHECK_NAME', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'COMMIT_SHA', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'REPOSITORY', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'ALLOWED_CONCLUSIONS', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'requireRepository', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('service_layer'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'requireHeadSha', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('service_layer'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'requireCheckRunId', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('service_layer'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'requirePublicationIdentity', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('service_layer'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'beginReleaseCandidateIntegrityCheck', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('service_layer'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'completeReleaseCandidateIntegrityCheck', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs', 'dddOwner', 'ReleaseCandidateCheckPublicationService', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('service_layer'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs')),
    jsonb_build_object('name', 'SUPPORTED_FLAGS', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs', 'dddOwner', 'ReleaseCandidateCheckGitHubAdapter', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs')),
    jsonb_build_object('name', 'readArguments', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs', 'dddOwner', 'ReleaseCandidateCheckGitHubAdapter', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs')),
    jsonb_build_object('name', 'parseReleaseCandidateCheckArguments', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs', 'dddOwner', 'ReleaseCandidateCheckGitHubAdapter', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs')),
    jsonb_build_object('name', 'projectCheckRun', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs', 'dddOwner', 'ReleaseCandidateCheckGitHubAdapter', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('mapper'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs')),
    jsonb_build_object('name', 'createGitHubCheckRunPort', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs', 'dddOwner', 'ReleaseCandidateCheckGitHubAdapter', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs')),
    jsonb_build_object('name', 'runReleaseCandidateCheckCli', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs', 'dddOwner', 'ReleaseCandidateCheckGitHubAdapter', 'cqRails', jsonb_build_array('PublishReleaseCandidateIntegrityCheck'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs'))
  ) as symbols
),
rewritten_manifest as (
  select jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          manifest.raw_manifest,
          '{symbols}',
          manifest.raw_manifest -> 'symbols' || added.symbols
        ),
        '{allowedImplementationSurfaces}',
        (
          select jsonb_agg(surface order by surface)
          from (
            select distinct value as surface
            from jsonb_array_elements_text(manifest.raw_manifest -> 'allowedImplementationSurfaces')
            union select 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs'
            union select 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.test.mjs'
            union select 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs'
            union select 'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.test.mjs'
            union select 'tools/planning-db/migrations/780_release_candidate_check_head_publication.sql'
          ) surfaces
        )
      ),
      '{domainObjects}',
      (
        select jsonb_agg(
          case
            when value ->> 'name' = 'ReleaseCandidateIntegrityCheck'
              then jsonb_set(value, '{owner}', to_jsonb('ReleaseCandidateCheckPublicationService'::text))
            else value
          end
        )
        from jsonb_array_elements(manifest.raw_manifest -> 'domainObjects')
      )
    ),
    '{commandQueryRails}',
    (
      select jsonb_agg(
        case
          when value ->> 'name' = 'PublishReleaseCandidateIntegrityCheck'
            then jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    value,
                    '{dddOwner}',
                    to_jsonb('ReleaseCandidateCheckPublicationService'::text)
                  ),
                  '{applicationPort}',
                  to_jsonb('beginReleaseCandidateIntegrityCheck;completeReleaseCandidateIntegrityCheck'::text)
                ),
                '{adapterSurface}',
                to_jsonb('releaseCandidateCheckGithubAdapter GitHub Checks API gateway'::text)
              ),
              '{authorizationRules}',
              jsonb_build_array(
                'checks:write only in base-trusted begin and completion jobs',
                'candidate assessment job has contents:read only'
              )
            )
          else value
        end
      )
      from jsonb_array_elements(manifest.raw_manifest -> 'commandQueryRails')
    )
  ) as raw_manifest
  from existing_manifest manifest
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
  ddd_owner = case
    when rail.rail_name = 'PublishReleaseCandidateIntegrityCheck'
      then 'ReleaseCandidateCheckPublicationService'
    else rail.ddd_owner
  end,
  source_path = case
    when rail.rail_name = 'PublishReleaseCandidateIntegrityCheck'
      then 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs'
    else rail.source_path
  end,
  implementation_refs = case
    when rail.rail_name = 'PublishReleaseCandidateIntegrityCheck'
      then jsonb_build_array(
        'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs',
        'tools/ci/release-candidate-integrity/releaseCandidateCheckGithubAdapter.mjs',
        '.github/workflows/release-candidate-integrity.yml'
      )
    else rail.implementation_refs
  end,
  source_content_sha256 = planning_query_store.sha256_text(rewritten.raw_manifest::text),
  revision = rail.revision + 1,
  updated_at = now()
from rewritten_manifest rewritten
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

do $$
declare
  child_count integer;
  publisher_file_count integer;
  publisher_rail_count integer;
begin
  select count(*) into child_count
  from architecture.component
  where parent_component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
    and component_id in (
      'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
      'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER'
    );
  if child_count <> 2 then
    raise exception 'Release candidate check publication requires service and adapter components';
  end if;

  select count(*) into publisher_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id in (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER'
  ) and pattern_kind = 'owns';
  if publisher_file_count <> 4 then
    raise exception 'Release candidate check publisher must own exactly four implementation/test files';
  end if;

  select count(*) into publisher_rail_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
    and rail_name = 'PublishReleaseCandidateIntegrityCheck'
    and ddd_owner = 'ReleaseCandidateCheckPublicationService'
    and source_path = 'tools/ci/release-candidate-integrity/releaseCandidateCheckPublication.mjs';
  if publisher_rail_count <> 1 then
    raise exception 'PublishReleaseCandidateIntegrityCheck must resolve once to the application service';
  end if;
end $$;
