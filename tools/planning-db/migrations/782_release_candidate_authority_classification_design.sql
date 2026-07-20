-- Model pull-request authority before any Checks API mutation. The classifier
-- is a pure query over trusted event metadata; the workflow may publish only
-- to the commit identity returned by that query.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719',
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'Classify pull-request authority before check publication',
  'CI Governance',
  'approved',
  'A pure specification classifies trusted pull-request metadata before any checks:write job starts. Same-repository pull requests publish on the exact head SHA; fork product pull requests publish on the base-repository test merge SHA; release candidates remain restricted to same-repository pull requests targeting main.',
  'hidden_authority',
  'ClassifyReleaseCandidateAuthority',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'may_create', true),
  ('RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'may_create', true),
  ('RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719', 'query', 'ClassifyReleaseCandidateAuthority', 'may_create', true),
  ('RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-AUTHORITY-SPECIFICATION', 'must_prove', true),
  ('RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-AUTHORITY-CLI-ADAPTER', 'must_prove', true),
  ('RELEASE-CANDIDATE-AUTHORITY-CLASSIFICATION-20260719', 'test', 'TEST-CI-RELEASE-CANDIDATE-AUTHORITY-WORKFLOW', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract,
  runtime, criticality, status, maturity_score, parent_component_id
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'Release candidate authority specification',
    'module',
    'domain',
    'ReleaseCandidateAuthoritySpecification',
    'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs',
    'Classify trusted pull-request metadata into assessment posture and one authoritative check-publication commit.',
    'node',
    'high',
    'approved',
    0,
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'Release candidate authority CLI adapter',
    'adapter',
    'adapter',
    'ReleaseCandidateAuthorityCliAdapter',
    'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs',
    'Parse trusted workflow metadata and emit the authority classification as one machine-readable JSON value.',
    'node',
    'high',
    'approved',
    0,
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
    'RESP-CI-RELEASE-CANDIDATE-AUTHORITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'Classify pull-request authority, release-candidate eligibility, assessment posture, and check-publication commit without performing I/O.',
    'Repository trust, release-candidate eligibility, or required-check target semantics change.',
    'ReleaseCandidateAuthoritySpecification',
    'approved'
  ),
  (
    'RESP-CI-RELEASE-CANDIDATE-AUTHORITY-CLI-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'Adapt strict CLI arguments into the authority query and serialize exactly one JSON result.',
    'Trusted workflow argument or process serialization semantics change.',
    'ReleaseCandidateAuthorityCliAdapter',
    'approved'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values (
  'PORT-CI-CLASSIFY-RELEASE-CANDIDATE-AUTHORITY',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
  'ClassifyReleaseCandidateAuthority',
  'query',
  'inbound',
  null,
  null,
  array[
    'a checks:write job starts before authority classification succeeds',
    'a fork product pull request publishes directly on the fork head SHA',
    'a fork or non-main release candidate is admitted for assessment',
    'missing repository or commit identity is converted into success'
  ]::text[],
  'approved'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  (
    'REL-CI-RELEASE-INTEGRITY-CONTAINS-AUTHORITY-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'contains', 'outbound', 'sync', null,
    'Workflow shell owns repository trust and commit-target policy.',
    'trusted event metadata; no write permission',
    jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs'),
    'approved'
  ),
  (
    'REL-CI-RELEASE-INTEGRITY-CONTAINS-AUTHORITY-CLI-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'contains', 'outbound', 'sync', null,
    'Workflow shell duplicates argument validation and output projection.',
    'trusted base checkout; no write permission',
    jsonb_build_array('tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs'),
    'approved'
  ),
  (
    'REL-CI-RELEASE-AUTHORITY-CLI-DEPENDS-ON-SPECIFICATION',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'depends_on', 'outbound', 'sync', null,
    'CLI process disagrees with the canonical authority specification.',
    'in-process query invocation',
    jsonb_build_array('classifyReleaseCandidateAuthority'),
    'approved'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION',
    'tools/planning-db/migrations/782_release_candidate_authority_classification_design.sql',
    planning_query_store.sha256_text('release-candidate-authority-specification:782'),
    0,
    'Release candidate authority specification',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-DVT', 'SYS-DVT', 'canonical', false,
    'Own deterministic pull-request authority and publication-target classification.',
    'ReleaseCandidateAuthoritySpecification',
    'ClassifyReleaseCandidateAuthority',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER',
    'tools/planning-db/migrations/782_release_candidate_authority_classification_design.sql',
    planning_query_store.sha256_text('release-candidate-authority-cli-adapter:782'),
    0,
    'Release candidate authority CLI adapter',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'SYS-DVT', 'SYS-DVT', 'canonical', false,
    'Own strict CLI input and JSON output adaptation for authority classification.',
    'ReleaseCandidateAuthorityCliAdapter',
    'ClassifyReleaseCandidateAuthority',
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
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs', 1),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'owns', 'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'responsibility', 'Classify pull-request authority and the authoritative check-publication commit.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'reason_to_change', 'Repository trust, release-candidate eligibility, or publication-target semantics change.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'public_api', 'classifyReleaseCandidateAuthority', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'invariant', 'Classification completes before any checks:write job and returns one valid publication SHA.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'transition', 'Trusted pull-request metadata -> accepted classification or explicit rejection.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'consumer', 'Release candidate integrity workflow coordinator', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-SPECIFICATION', 'fowler_signal', 'pure specification over trusted event metadata', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'responsibility', 'Adapt strict process arguments and JSON output for authority classification.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'reason_to_change', 'Trusted workflow process-input or output serialization semantics change.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'public_api', 'parseReleaseCandidateAuthorityArguments;runReleaseCandidateAuthorityCli', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'invariant', 'The CLI accepts every required field exactly once and emits only one JSON classification.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'transition', 'Trusted CLI arguments -> validated query input -> serialized classification.', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'consumer', 'Read-only authority-classification workflow job', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'governance_ref', 'docs/architecture/components/ci-governance/ci-delivery-governance-component.md', 0),
  ('SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-AUTHORITY-CLI-ADAPTER', 'fowler_signal', 'gateway isolates process I/O from authority policy', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

drop table if exists pg_temp.release_candidate_authority_design_manifest;

create temporary table release_candidate_authority_design_manifest as
with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
)
select jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        raw_manifest,
        '{mechanizationStatus}',
        to_jsonb('partial'::text)
      ),
      '{noHumanDecisionsRemaining}',
      'false'::jsonb
    ),
    '{commandQueryRails}',
    coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'name', 'ClassifyReleaseCandidateAuthority',
        'type', 'query',
        'boundedContext', 'Repository release governance',
        'dddOwner', 'ReleaseCandidateAuthoritySpecification',
        'object', 'ReleaseCandidateAuthorityClassification',
        'port', 'PORT-CI-CLASSIFY-RELEASE-CANDIDATE-AUTHORITY',
        'adapterSurface', 'releaseCandidateAuthorityCli trusted event adapter',
        'scope', 'one pull-request event before any check mutation',
        'authorizationRules', jsonb_build_array(
          'classification runs with contents:read only',
          'checks:write jobs depend on successful classification',
          'candidate code is never executed'
        ),
        'negativeTests', jsonb_build_array(
          'fork head used as base-repository check target',
          'fork release candidate admitted',
          'release candidate targets a branch other than main',
          'missing commit identity accepted'
        ),
        'status', 'planned'
      )
    )
  ),
  '{allowedImplementationSurfaces}',
  (
    select jsonb_agg(to_jsonb(surface) order by surface)
    from (
      select distinct surface
      from jsonb_array_elements_text(
        coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
        || jsonb_build_array(
          'tools/ci/release-candidate-integrity/releaseCandidateAuthority.mjs',
          'tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs',
          'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.mjs',
          'tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs',
          'tools/planning-db/migrations/782_release_candidate_authority_classification_design.sql'
        )
      ) as surfaces(surface)
    ) distinct_surfaces
  )
) as raw_manifest
from current_manifest;

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
from release_candidate_authority_design_manifest manifest
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
select
  'local#C-RELEASE-CANDIDATE-INTEGRITY-1#query#classifyreleasecandidateauthority',
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'implemented',
  'ClassifyReleaseCandidateAuthority',
  'classifyreleasecandidateauthority',
  'query',
  'ReleaseCandidateAuthoritySpecification',
  'planned',
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_array(
    'docs/architecture/components/ci-governance/ci-delivery-governance-component.md',
    'docs/planning/status/release-please-continuous.md'
  ),
  jsonb_build_array(
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/ci-governance/ci-delivery-governance-component.md'
  ),
  manifest.raw_manifest -> 'allowedImplementationSurfaces',
  jsonb_build_array(
    'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthority.test.mjs',
    'node --test tools/ci/release-candidate-integrity/releaseCandidateAuthorityCli.test.mjs',
    'node --test tools/ci/workflow-pattern-parity.test.mjs'
  ),
  jsonb_build_array(
    'classification precedes every checks:write job',
    'same-repository candidate uses exact head SHA',
    'fork product PR uses base-repository test merge SHA',
    'invalid release authority fails closed'
  ),
  'tools/planning-db/migrations/782_release_candidate_authority_classification_design.sql',
  planning_query_store.sha256_text('release-candidate-authority-design:782'),
  jsonb_build_object(
    'name', 'ClassifyReleaseCandidateAuthority',
    'type', 'query',
    'dddOwner', 'ReleaseCandidateAuthoritySpecification',
    'status', 'planned'
  ),
  manifest.raw_manifest,
  0,
  'codex'
from release_candidate_authority_design_manifest manifest
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
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
begin
  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'ClassifyReleaseCandidateAuthority'
      and rail_type = 'query'
      and ddd_owner = 'ReleaseCandidateAuthoritySpecification'
      and rail_status = 'planned'
  ) then
    raise exception 'ClassifyReleaseCandidateAuthority planned query rail is missing';
  end if;
end
$$;
