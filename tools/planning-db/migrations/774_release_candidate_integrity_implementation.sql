-- Close release-candidate integrity as a DB-first component family. Migration
-- 773 records the design boundary; this migration replaces its prematurely
-- written feature rails with the implemented specification and adapters.

delete from planning_query_store.feature_mechanization_local_rails
where rail_id in (
  'local#RELEASE-PLEASE-PREMAJOR-GOVERNANCE-20260709#command#configurereleasepullrequestmergepolicy',
  'local#RELEASE-PLEASE-PREMAJOR-GOVERNANCE-20260709#query#assessreleasecandidateintegrity'
);

-- Retire the coarse records written by the untracked development form of 773.
-- The exact identifiers avoid deleting any canonical release-governance data.
delete from architecture.component_relation
where relation_id = 'REL-CI-RELEASE-CANDIDATE-GUARDS-GITHUB-WORKFLOW';

delete from architecture.component_port
where port_id in (
  'PORT-CI-ASSESS-RELEASE-CANDIDATE-INTEGRITY',
  'PORT-CI-CONFIGURE-RELEASE-MERGE-POLICY'
);

delete from architecture.component_test
where test_id = 'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-MODEL';

update architecture.design
set
  work_item_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1',
  title = 'One admitted release identity per merged pull request',
  owner = 'ReleaseCandidateIntegrityGate',
  status = 'implemented',
  rationale = 'Release Please remains the generator. A pure specification assesses exact candidate artifacts and repository policy; a Git adapter reads immutable objects; a GitHub adapter configures squash-only policy; and a trusted workflow publishes the required check without giving candidate code a write token.',
  fowler_signal = 'evolutionary_architecture',
  rail_ref = 'AssessReleaseCandidateIntegrity;ConfigureReleasePullRequestMergePolicy;PublishReleaseCandidateIntegrityCheck',
  approved_at = now(),
  updated_at = now()
where design_id = 'RELEASE-CANDIDATE-INTEGRITY-20260719';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'component', 'SYS-CI-GOVERNANCE-GITHUB', 'may_reference', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'query', 'AssessReleaseCandidateIntegrity', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'flow', 'ConfigureReleasePullRequestMergePolicy', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'flow', 'PublishReleaseCandidateIntegrityCheck', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'must_prove', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'must_prove', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'must_prove', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-WORKFLOW', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract,
  runtime, criticality, status, maturity_score, parent_component_id
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'Release candidate integrity gate',
    'module',
    'infra',
    'ReleaseCandidateIntegrityGate',
    'tools/ci/release-candidate-integrity',
    'Coordinate exact-tree candidate assessment and trusted check publication without generating releases or owning external adapters.',
    'node',
    'high',
    'implemented',
    95,
    'SYS-CI-GOVERNANCE-TOOLS-CI'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'Release candidate integrity specification',
    'module',
    'domain',
    'ReleaseCandidateIntegritySpecification',
    'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs',
    'Pure assessment of release artifact identity, semantic changelog uniqueness, version progression, and repository merge policy.',
    'node',
    'high',
    'implemented',
    95,
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'Release candidate Git object adapter',
    'adapter',
    'adapter',
    'ReleaseCandidateGitObjectAdapter',
    'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs',
    'Read the exact base and head Git objects and adapt them into a release candidate snapshot.',
    'node',
    'high',
    'implemented',
    90,
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'Release candidate GitHub policy adapter',
    'adapter',
    'adapter',
    'ReleaseMergePolicyAdapter',
    'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs',
    'Inspect and configure repository and main-ruleset release merge policy through GitHub APIs.',
    'node',
    'high',
    'implemented',
    90,
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

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values
  (
    'RESP-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'Coordinate exact candidate assessment and trusted status publication while delegating release generation, immutable Git reads, and GitHub policy mutation.',
    'The candidate admission lifecycle or trusted workflow choreography changes.',
    'ReleaseCandidateIntegrityGate',
    'implemented'
  ),
  (
    'RESP-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'Assess one immutable candidate snapshot with deterministic release and merge-policy invariants.',
    'Release identity, version, changelog, artifact, or repository policy invariants change.',
    'ReleaseCandidateIntegritySpecification',
    'implemented'
  ),
  (
    'RESP-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'Collect exact base and head artifacts from Git objects without consulting mutable working-tree files.',
    'Git command projection or supported Release Please artifact strategy changes.',
    'ReleaseCandidateGitObjectAdapter',
    'implemented'
  ),
  (
    'RESP-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'Project and idempotently configure the repository and main-ruleset merge policy through GitHub APIs.',
    'GitHub repository/ruleset API shape or governed merge policy changes.',
    'ReleaseMergePolicyAdapter',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id, contract_kind, owner_component_id, contract_ref,
  compatibility, status, validation_command
)
values
  (
    'CONTRACT-CI-RELEASE-CANDIDATE-SNAPSHOT',
    'type',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs#collectReleaseCandidateSnapshot',
    'internal',
    'implemented',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs'
  ),
  (
    'CONTRACT-CI-RELEASE-CANDIDATE-ASSESSMENT',
    'type',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs#assessReleaseCandidateIntegrity',
    'internal',
    'implemented',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs'
  ),
  (
    'CONTRACT-CI-RELEASE-MERGE-POLICY',
    'type',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
    'internal',
    'implemented',
    'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs'
  ),
  (
    'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
    'workflow',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    '.github/workflows/release.yml#publish-candidate-status',
    'internal',
    'implemented',
    'node --test tools/ci/workflow-pattern-parity.test.mjs'
  )
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values
  (
    'PORT-CI-RELEASE-CANDIDATE-ASSESSMENT',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'AssessReleaseCandidateIntegrity',
    'query',
    'inbound',
    'CONTRACT-CI-RELEASE-CANDIDATE-SNAPSHOT',
    'CONTRACT-CI-RELEASE-CANDIDATE-ASSESSMENT',
    array[
      'candidate is not the exact child of current main',
      'candidate artifacts differ outside governed generated files',
      'candidate changelog repeats a pull-request identity or published source',
      'candidate version is incoherent, non-increasing, or leaves the pre-1.0 line',
      'repository policy is not squash-only or omits the required check'
    ]::text[],
    'implemented'
  ),
  (
    'PORT-CI-RELEASE-CANDIDATE-GIT-SNAPSHOT',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'CollectReleaseCandidateSnapshot',
    'query',
    'inbound',
    null,
    'CONTRACT-CI-RELEASE-CANDIDATE-SNAPSHOT',
    array[
      'unknown, duplicate, or missing base/head argument',
      'working-tree file substituted for an immutable Git object',
      'unsupported multi-package, extra-file, non-Node, or changelog-free strategy'
    ]::text[],
    'implemented'
  ),
  (
    'PORT-CI-RELEASE-MERGE-POLICY-COMMAND',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'ConfigureReleasePullRequestMergePolicy',
    'command',
    'inbound',
    'CONTRACT-CI-RELEASE-MERGE-POLICY',
    'CONTRACT-CI-RELEASE-MERGE-POLICY',
    array[
      'repository or ruleset is not explicitly identified',
      'main ruleset lacks a pull-request rule',
      'unrelated rules or required checks are discarded',
      'post-write policy still permits merge/rebase or omits the Actions-owned check'
    ]::text[],
    'implemented'
  ),
  (
    'PORT-CI-RELEASE-CANDIDATE-CHECK-PUBLISH',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'PublishReleaseCandidateIntegrityCheck',
    'command',
    'outbound',
    'CONTRACT-CI-RELEASE-CANDIDATE-ASSESSMENT',
    'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
    array[
      'candidate-controlled code receives a checks:write token',
      'status is attached to a head SHA other than the authoritative candidate',
      'validation failure is not published as a required failing check'
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
    'REL-CI-TOOLS-CONTAINS-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'contains', 'outbound', 'build_time', null,
    'The release admission boundary becomes hidden inside generic CI tooling.',
    'repo-local CI governance',
    jsonb_build_array('tools/ci/release-candidate-integrity'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-INTEGRITY-CONTAINS-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'contains', 'outbound', 'sync',
    'CONTRACT-CI-RELEASE-CANDIDATE-ASSESSMENT',
    'Admission invariants would be coupled to I/O adapters.',
    'repo-local read',
    jsonb_build_array('assessReleaseCandidateIntegrity'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-INTEGRITY-CONTAINS-GIT-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'contains', 'outbound', 'sync',
    'CONTRACT-CI-RELEASE-CANDIDATE-SNAPSHOT',
    'Candidate assessment could read mutable working-tree state.',
    'repository Git read',
    jsonb_build_array('collectReleaseCandidateSnapshot'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-INTEGRITY-CONTAINS-GITHUB-POLICY-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'contains', 'outbound', 'sync',
    'CONTRACT-CI-RELEASE-MERGE-POLICY',
    'Repository mutation would be mixed into pure admission rules.',
    'repository administration',
    jsonb_build_array('runReleaseMergePolicyCli'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-GIT-ADAPTER-CALLS-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'calls', 'outbound', 'sync',
    'CONTRACT-CI-RELEASE-CANDIDATE-SNAPSHOT',
    'The CLI could invent a second release assessment policy.',
    'repo-local read',
    jsonb_build_array('runReleaseCandidateIntegrityCli'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-POLICY-ADAPTER-DEPENDS-ON-GITHUB',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'SYS-CI-GOVERNANCE-GITHUB',
    'depends_on', 'outbound', 'async',
    'CONTRACT-CI-RELEASE-MERGE-POLICY',
    'GitHub rejects or partially applies repository/ruleset policy.',
    'repository administration',
    jsonb_build_array('gh api', 'releaseMergePolicyCli.mjs'),
    'implemented'
  ),
  (
    'REL-CI-RELEASE-INTEGRITY-PUBLISHES-THROUGH-GITHUB',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-GITHUB',
    'publishes', 'outbound', 'async',
    'CONTRACT-CI-RELEASE-CANDIDATE-REQUIRED-CHECK',
    'The exact candidate SHA does not receive a required pass/fail check.',
    'checks:write in trusted publisher job only',
    jsonb_build_array('.github/workflows/release.yml#publish-candidate-status'),
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

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs',
    'unit', 'negative', true,
    'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs'
  ),
  (
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs',
    'integration', 'boundary', true,
    'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs'
  ),
  (
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs',
    'integration', 'negative', true,
    'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs'
  ),
  (
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-WORKFLOW',
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
    'OBS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'Release candidate integrity required check publishes pass/fail against the authoritative candidate SHA.',
    'alert', true, 'implemented'
  ),
  (
    'OBS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'Assessment JSON reports version, entry count, and all invariant violations.',
    'log', true, 'implemented'
  ),
  (
    'OBS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'Snapshot JSON reports exact base/head SHAs and changed files; Git failures fail closed.',
    'log', true, 'implemented'
  ),
  (
    'OBS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'Policy JSON reports projected repository/ruleset state and all remaining violations.',
    'log', true, 'implemented'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'tools/planning-db/migrations/774_release_candidate_integrity_implementation.sql',
    planning_query_store.sha256_text('release-candidate-integrity:assembly:774'),
    0,
    'Release candidate integrity gate',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    true,
    'Coordinate immutable candidate assessment and trusted required-check publication while delegating concrete policy and I/O concerns.',
    'ReleaseCandidateIntegrityGate',
    'AssessReleaseCandidateIntegrity;PublishReleaseCandidateIntegrityCheck',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'tools/planning-db/migrations/774_release_candidate_integrity_implementation.sql',
    planning_query_store.sha256_text('release-candidate-integrity:specification:774'),
    0,
    'Release candidate integrity specification',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Own deterministic release candidate and repository policy invariants without I/O.',
    'ReleaseCandidateIntegritySpecification',
    'AssessReleaseCandidateIntegrity',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'tools/planning-db/migrations/774_release_candidate_integrity_implementation.sql',
    planning_query_store.sha256_text('release-candidate-integrity:git-adapter:774'),
    0,
    'Release candidate Git object adapter',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Own immutable Git object collection and Release Please artifact projection.',
    'ReleaseCandidateGitObjectAdapter',
    'AssessReleaseCandidateIntegrity',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'tools/planning-db/migrations/774_release_candidate_integrity_implementation.sql',
    planning_query_store.sha256_text('release-candidate-integrity:github-policy-adapter:774'),
    0,
    'Release candidate GitHub policy adapter',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Own GitHub repository/ruleset policy projection and idempotent mutation.',
    'ReleaseMergePolicyAdapter',
    'ConfigureReleasePullRequestMergePolicy',
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 1),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs', 1),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 1);

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'responsibility', 'Coordinate immutable candidate admission and trusted required-check publication.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'reason_to_change', 'Candidate admission lifecycle or workflow choreography changes.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'public_api', 'AssessReleaseCandidateIntegrity;PublishReleaseCandidateIntegrityCheck', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'invariant', 'Candidate-controlled code never receives a token capable of publishing its own required status.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'invariant', 'Only the Release Please output verified against the exact current main SHA may be assessed and published.', 1),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'transition', 'Generated candidate -> immutable assessment -> trusted required-check receipt -> squash merge or rejection.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'consumer', 'Release Please workflow;main branch ruleset;release maintainers', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'fowler_signal', 'service_layer coordinates pure policy and gateway adapters', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'responsibility', 'Assess candidate and repository policy invariants as a pure deterministic function.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'reason_to_change', 'Release artifact identity, changelog, version, or merge-policy invariants change.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'public_api', 'extractLatestRelease;normalizeReleaseEntryIdentity;assessRepositoryMergePolicy;assessReleaseCandidateIntegrity', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'invariant', 'One pull-request identity may occur at most once in the candidate release and never after publication.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'invariant', 'Candidate version, root manifest, package metadata, and changelog form one increasing pre-1.0 release identity.', 1),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'transition', 'ReleaseCandidateSnapshot -> valid ReleaseCandidateAssessment or complete ordered violations.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'consumer', 'ReleaseCandidateGitObjectAdapter;ReleaseMergePolicyAdapter;trusted release workflow', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'governance_ref', 'docs/planning/status/release-please-continuous.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION', 'fowler_signal', 'specification pattern with referentially transparent assessment', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'responsibility', 'Collect exact Git-object release artifacts and invoke the pure specification.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'reason_to_change', 'Git CLI projection or supported release artifact strategy changes.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'public_api', 'parseReleaseCandidateArguments;collectReleaseCandidateSnapshot;runReleaseCandidateIntegrityCli', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'invariant', 'Every assessed artifact is read from the explicit immutable base or head object.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'transition', 'Explicit base/head refs -> exact Git-object ReleaseCandidateSnapshot -> specification result.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'consumer', 'Trusted release candidate validation job;local release diagnostics', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'governance_ref', 'docs/planning/status/release-please-continuous.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER', 'fowler_signal', 'gateway isolates Git process I/O from policy', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'responsibility', 'Project and idempotently configure GitHub release merge policy.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'reason_to_change', 'GitHub API shape or governed merge policy changes.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'public_api', 'projectReleaseMergePolicy;buildReleaseMergePolicyUpdate;parseReleaseMergePolicyArguments;runReleaseMergePolicyCli', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'invariant', 'Configuration preserves unrelated rules and checks while enforcing squash-only Release candidate admission.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'transition', 'GitHub repository/ruleset records -> canonical policy projection -> optional idempotent update -> verified projection.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'consumer', 'Release maintainers;trusted candidate validation job;main branch ruleset', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER', 'fowler_signal', 'gateway and mapper isolate GitHub policy I/O', 0);

with feature_common as (
  select
    jsonb_build_array(
      'docs/architecture/components/ci-governance/ci-delivery-governance-component.md',
      'docs/planning/status/release-please-continuous.md'
    ) as component_guides,
    jsonb_build_array(
      'A maintainer receives one deterministic release candidate containing one entry per merged pull request.',
      'A malformed, stale, duplicated, or policy-incoherent candidate fails closed before merge.',
      'Candidate-controlled code cannot publish or forge its own required status check.'
    ) as user_stories,
    jsonb_build_array(
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/components/ci-governance/ci-delivery-governance-component.md',
      'docs/planning/status/release-please-continuous.md',
      '.github/workflows/release.yml',
      '.github/workflows/pr-quality-gate.yml',
      'release-please-config.json'
    ) as governing_sources,
    jsonb_build_array(
      '.github/workflows/pr-quality-gate.yml',
      '.github/workflows/release.yml',
      'docs/architecture/components/ci-governance/ci-delivery-governance-component.md',
      'docs/planning/status/release-please-continuous.md',
      'package.json',
      'release-please-config.json',
      'tools/ci/workflow-pattern-parity.test.mjs',
      'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs',
      'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs',
      'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs',
      'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs',
      'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs',
      'tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs',
      'tools/planning-db/migrations/773_release_candidate_integrity_gate.sql',
      'tools/planning-db/migrations/774_release_candidate_integrity_implementation.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/**',
      'packages/**',
      '.github/actions/**'
    ) as forbidden_surfaces,
    jsonb_build_array(
      jsonb_build_object('name', 'ReleaseCandidateSnapshot', 'type', 'value object', 'owner', 'ReleaseCandidateGitObjectAdapter'),
      jsonb_build_object('name', 'ReleaseCandidateAssessment', 'type', 'specification result', 'owner', 'ReleaseCandidateIntegritySpecification'),
      jsonb_build_object('name', 'ReleasePullRequestMergePolicy', 'type', 'policy object', 'owner', 'ReleaseMergePolicyAdapter'),
      jsonb_build_object('name', 'ReleaseCandidateIntegrityCheck', 'type', 'required status receipt', 'owner', 'ReleaseCandidateIntegrityGate')
    ) as domain_objects,
    jsonb_build_array(
      'specification_pattern',
      'gateway',
      'mapper',
      'service_layer',
      'separated_interface',
      'fail_closed_security_boundary'
    ) as fowler_signals,
    jsonb_build_array(
      jsonb_build_object('name', 'release candidate model and adapters', 'command', 'node --test tools/ci/release-candidate-integrity/*.test.mjs'),
      jsonb_build_object('name', 'trusted workflow wiring', 'command', 'node --test tools/ci/workflow-pattern-parity.test.mjs'),
      jsonb_build_object('name', 'DB-first feature completeness', 'command', 'pnpm docs:feature-mechanization:implementation')
    ) as architecture_guards,
    jsonb_build_array(
      jsonb_build_object('name', 'not applicable: repository release governance', 'command', 'node --test tools/ci/workflow-pattern-parity.test.mjs')
    ) as cypress_flows,
    jsonb_build_array(
      'node --test tools/ci/release-candidate-integrity/*.test.mjs',
      'node --test tools/ci/workflow-pattern-parity.test.mjs',
      'node tools/ci/ci-tool-test-suite.mjs all',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY --no-refresh --limit 120',
      'pnpm verify:prepush'
    ) as completion_gate,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'ConfigureReleasePullRequestMergePolicy',
        'type', 'command',
        'dddOwner', 'ReleaseMergePolicyAdapter',
        'status', 'implemented',
        'dddObject', 'ReleasePullRequestMergePolicy',
        'applicationPort', 'runReleaseMergePolicyCli configure',
        'adapterSurface', 'GitHub repository and ruleset APIs through gh api',
        'scope', 'repository main branch release merges',
        'authorizationRules', jsonb_build_array('repository administration required', 'no candidate workflow token'),
        'negativeTests', jsonb_build_array('missing pull_request rule', 'unrelated rule loss', 'required check absent after write')
      ),
      jsonb_build_object(
        'name', 'AssessReleaseCandidateIntegrity',
        'type', 'query',
        'dddOwner', 'ReleaseCandidateIntegritySpecification',
        'status', 'implemented',
        'dddObject', 'ReleaseCandidateAssessment',
        'applicationPort', 'assessReleaseCandidateIntegrity',
        'adapterSurface', 'releaseCandidateIntegrityCli exact Git-object adapter',
        'scope', 'one Release Please candidate against exact current main',
        'authorizationRules', jsonb_build_array('read-only contents', 'candidate checkout without persisted credentials'),
        'negativeTests', jsonb_build_array('stale base', 'duplicate identity', 'artifact mutation', 'version regression', 'policy violation')
      ),
      jsonb_build_object(
        'name', 'PublishReleaseCandidateIntegrityCheck',
        'type', 'command',
        'dddOwner', 'ReleaseCandidateIntegrityGate',
        'status', 'implemented',
        'dddObject', 'ReleaseCandidateIntegrityCheck',
        'applicationPort', 'publish-candidate-status workflow job',
        'adapterSurface', 'GitHub Checks API',
        'scope', 'authoritative Release Please candidate head SHA',
        'authorizationRules', jsonb_build_array('checks:write only in trusted publisher job', 'publisher runs after assessment even on failure'),
        'negativeTests', jsonb_build_array('candidate code has write token', 'wrong SHA', 'failure not published')
      )
    ) as command_query_rails,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'candidate-semantic-artifact-integrity',
        'redTest', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs',
        'expectedFailure', 'Duplicate identities, mutable working-tree reads, unsupported artifacts, and version regressions were admitted.',
        'patchSurfaces', jsonb_build_array(
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs'
        ),
        'greenTest', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs'
      ),
      jsonb_build_object(
        'id', 'repository-merge-policy',
        'redTest', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs',
        'expectedFailure', 'Repository policy could preserve internal commit bodies or omit the required Actions check.',
        'patchSurfaces', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs'),
        'greenTest', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs'
      ),
      jsonb_build_object(
        'id', 'trusted-workflow-publication',
        'redTest', 'node --test tools/ci/workflow-pattern-parity.test.mjs',
        'expectedFailure', 'Candidate-controlled code could run in a write-capable job or the check was not wired as required.',
        'patchSurfaces', jsonb_build_array('.github/workflows/release.yml', '.github/workflows/pr-quality-gate.yml'),
        'greenTest', 'node --test tools/ci/workflow-pattern-parity.test.mjs'
      )
    ) as red_green_cycles,
    jsonb_build_array(
      jsonb_build_object('name', 'extractLatestRelease', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
      jsonb_build_object('name', 'normalizeReleaseEntryIdentity', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('published_language'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
      jsonb_build_object('name', 'assessRepositoryMergePolicy', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity', 'ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
      jsonb_build_object('name', 'assessReleaseCandidateIntegrity', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs', 'dddOwner', 'ReleaseCandidateIntegritySpecification', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('specification_pattern'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrity.test.mjs')),
      jsonb_build_object('name', 'parseReleaseCandidateArguments', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs', 'dddOwner', 'ReleaseCandidateGitObjectAdapter', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs')),
      jsonb_build_object('name', 'collectReleaseCandidateSnapshot', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs', 'dddOwner', 'ReleaseCandidateGitObjectAdapter', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs')),
      jsonb_build_object('name', 'runReleaseCandidateIntegrityCli', 'path', 'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs', 'dddOwner', 'ReleaseCandidateGitObjectAdapter', 'cqRails', jsonb_build_array('AssessReleaseCandidateIntegrity'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.test.mjs')),
      jsonb_build_object('name', 'projectReleaseMergePolicy', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('mapper'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
      jsonb_build_object('name', 'buildReleaseMergePolicyUpdate', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('mapper'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
      jsonb_build_object('name', 'parseReleaseMergePolicyArguments', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs')),
      jsonb_build_object('name', 'runReleaseMergePolicyCli', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'dddOwner', 'ReleaseMergePolicyAdapter', 'cqRails', jsonb_build_array('ConfigureReleasePullRequestMergePolicy'), 'fowlerSignals', jsonb_build_array('gateway'), 'architectureGuard', 'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs', 'cypressCoverage', 'not applicable: repository release governance', 'unitTests', jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs'))
    ) as symbols
),
feature_manifest as (
  select jsonb_build_object(
    'version', 1,
    'featureId', 'C-RELEASE-CANDIDATE-INTEGRITY-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Planning DB design RELEASE-CANDIDATE-INTEGRITY-20260719 and task C-RELEASE-CANDIDATE-INTEGRITY-1',
    'componentGuides', common.component_guides,
    'userStories', common.user_stories,
    'governingSources', common.governing_sources,
    'allowedImplementationSurfaces', common.allowed_surfaces,
    'forbiddenImplementationSurfaces', common.forbidden_surfaces,
    'commandQueryRails', common.command_query_rails,
    'domainObjects', common.domain_objects,
    'fowlerSignals', common.fowler_signals,
    'architectureGuards', common.architecture_guards,
    'cypressFlows', common.cypress_flows,
    'redGreenCycles', common.red_green_cycles,
    'symbols', common.symbols,
    'completionGate', common.completion_gate
  ) as raw_manifest,
  common.*
  from feature_common common
),
feature_rails as (
  select
    rail.rail_name,
    lower(rail.rail_name) as normalized_rail_name,
    rail.rail_type,
    rail.ddd_owner,
    rail.source_path,
    rail.symbol_refs,
    rail.implementation_refs,
    manifest.*
  from feature_manifest manifest
  cross join lateral (
    values
      (
        'ConfigureReleasePullRequestMergePolicy',
        'command',
        'ReleaseMergePolicyAdapter',
        'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs',
        jsonb_build_array(
          'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#projectReleaseMergePolicy',
          'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#buildReleaseMergePolicyUpdate',
          'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#parseReleaseMergePolicyArguments',
          'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#runReleaseMergePolicyCli'
        ),
        jsonb_build_array('tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs#runReleaseMergePolicyCli')
      ),
      (
        'AssessReleaseCandidateIntegrity',
        'query',
        'ReleaseCandidateIntegritySpecification',
        'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs',
        jsonb_build_array(
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs#extractLatestRelease',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs#normalizeReleaseEntryIdentity',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs#assessRepositoryMergePolicy',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs#assessReleaseCandidateIntegrity',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs#parseReleaseCandidateArguments',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs#collectReleaseCandidateSnapshot',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs#runReleaseCandidateIntegrityCli'
        ),
        jsonb_build_array(
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrity.mjs#assessReleaseCandidateIntegrity',
          'tools/ci/release-candidate-integrity/releaseCandidateIntegrityCli.mjs#runReleaseCandidateIntegrityCli'
        )
      ),
      (
        'PublishReleaseCandidateIntegrityCheck',
        'command',
        'ReleaseCandidateIntegrityGate',
        '.github/workflows/release.yml',
        jsonb_build_array('.github/workflows/release.yml#publish-candidate-status'),
        jsonb_build_array('.github/workflows/release.yml#publish-candidate-status')
      )
  ) as rail(rail_name, rail_type, ddd_owner, source_path, symbol_refs, implementation_refs)
)
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
select
  'local#C-RELEASE-CANDIDATE-INTEGRITY-1#' || rail_type || '#' || normalized_rail_name,
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'implemented',
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  'implemented',
  symbol_refs,
  implementation_refs,
  component_guides,
  governing_sources,
  allowed_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(raw_manifest)),
  jsonb_build_object(
    'name', rail_name,
    'type', rail_type,
    'dddOwner', ddd_owner,
    'status', 'implemented'
  ),
  raw_manifest,
  0,
  'codex'
from feature_rails
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

do $$
declare
  owned_file_count integer;
  test_count integer;
  rail_count integer;
  manifest_count integer;
begin
  select count(*) into owned_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id in (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER'
  )
    and pattern_kind = 'owns';
  if owned_file_count <> 6 then
    raise exception 'Release candidate integrity must own exactly six implementation/test files, found %', owned_file_count;
  end if;

  select count(*) into test_count
  from architecture.component_test
  where test_id in (
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-SPECIFICATION',
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-GIT-ADAPTER',
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'TEST-CI-RELEASE-CANDIDATE-INTEGRITY-WORKFLOW'
  )
    and required = true;
  if test_count <> 4 then
    raise exception 'Release candidate integrity requires four component tests, found %', test_count;
  end if;

  select count(*) into rail_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
    and rail_status = 'implemented';
  if rail_count <> 3 then
    raise exception 'Release candidate integrity requires three implemented rails, found %', rail_count;
  end if;

  select count(distinct source_content_sha256) into manifest_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';
  if manifest_count <> 1 then
    raise exception 'Release candidate integrity rails must share one canonical feature manifest';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
      and (
        raw_manifest ->> 'mechanizationStatus' <> 'implemented'
        or raw_manifest ->> 'noHumanDecisionsRemaining' <> 'true'
        or jsonb_array_length(raw_manifest -> 'symbols') <> 11
        or jsonb_array_length(raw_manifest -> 'commandQueryRails') <> 3
      )
  ) then
    raise exception 'Release candidate integrity feature manifest is incomplete';
  end if;
end
$$;
