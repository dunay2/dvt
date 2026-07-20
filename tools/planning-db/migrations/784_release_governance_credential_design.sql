-- Make release automation identity and complete ruleset visibility explicit
-- before changing workflow credentials or policy projection behavior.

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
  'RELEASE-GOVERNANCE-CREDENTIAL-20260719',
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'Require one trusted release governance credential',
  'CI Governance',
  'approved',
  'Release candidate generation and full repository-ruleset inspection require an identity outside GITHUB_TOKEN. The workflow must fail before mutation when that identity is absent, and policy projection must reject API responses that omit bypass actors.',
  'hidden_authority',
  'GenerateReleaseCandidate;InspectReleasePullRequestMergePolicy',
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
  ('RELEASE-GOVERNANCE-CREDENTIAL-20260719', 'command', 'GenerateReleaseCandidate', 'may_create', true),
  ('RELEASE-GOVERNANCE-CREDENTIAL-20260719', 'query', 'InspectReleasePullRequestMergePolicy', 'may_create', true),
  ('RELEASE-GOVERNANCE-CREDENTIAL-20260719', 'path', '.github/workflows/release.yml', 'may_update', true),
  ('RELEASE-GOVERNANCE-CREDENTIAL-20260719', 'path', '.github/workflows/release-candidate-integrity.yml', 'may_update', true),
  ('RELEASE-GOVERNANCE-CREDENTIAL-20260719', 'path', 'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs', 'may_update', true),
  ('RELEASE-GOVERNANCE-CREDENTIAL-20260719', 'test', 'TEST-CI-RELEASE-GOVERNANCE-CREDENTIAL-WORKFLOW', 'must_prove', true),
  ('RELEASE-GOVERNANCE-CREDENTIAL-20260719', 'test', 'TEST-CI-RELEASE-MERGE-POLICY-VISIBILITY', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values
  (
    'PORT-CI-GENERATE-RELEASE-CANDIDATE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'GenerateReleaseCandidate',
    'command',
    'inbound',
    null,
    null,
    array[
      'Release Please falls back to GITHUB_TOKEN',
      'a generated release pull request does not trigger required workflows',
      'a missing release governance credential is treated as success'
    ]::text[],
    'approved'
  ),
  (
    'PORT-CI-INSPECT-RELEASE-PULL-REQUEST-MERGE-POLICY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'InspectReleasePullRequestMergePolicy',
    'query',
    'inbound',
    null,
    null,
    array[
      'GitHub omits bypass_actors and the projection substitutes an empty list',
      'policy inspection runs with a credential that cannot observe bypass actors',
      'an incomplete ruleset response is accepted as valid policy evidence'
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

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
    'invariant',
    'Release candidate generation requires RELEASE_GOVERNANCE_TOKEN and has no GITHUB_TOKEN fallback.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'invariant',
    'A repository ruleset without an explicit bypass_actors field is incomplete evidence and fails closed.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-POLICY-ADAPTER',
    'reason_to_change',
    'GitHub ruleset visibility or release-governance credential semantics change.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

drop table if exists pg_temp.release_governance_credential_design_manifest;

create temporary table release_governance_credential_design_manifest as
with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
), new_rails as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'GenerateReleaseCandidate',
      'type', 'command',
      'boundedContext', 'Repository release governance',
      'dddOwner', 'ReleaseCandidateIntegrityGate',
      'object', 'ReleaseCandidate',
      'port', 'PORT-CI-GENERATE-RELEASE-CANDIDATE',
      'adapterSurface', 'release.yml and release-please-action',
      'scope', 'main branch release-candidate creation or update',
      'authorizationRules', jsonb_build_array(
        'RELEASE_GOVERNANCE_TOKEN is mandatory',
        'GITHUB_TOKEN fallback is forbidden',
        'workflow executes only from trusted main'
      ),
      'negativeTests', jsonb_build_array(
        'missing credential accepted',
        'release candidate created by GITHUB_TOKEN',
        'generated candidate does not trigger required workflows'
      ),
      'status', 'planned'
    ),
    jsonb_build_object(
      'name', 'InspectReleasePullRequestMergePolicy',
      'type', 'query',
      'boundedContext', 'Repository release governance',
      'dddOwner', 'ReleaseMergePolicyAdapter',
      'object', 'ReleasePullRequestMergePolicy',
      'port', 'PORT-CI-INSPECT-RELEASE-PULL-REQUEST-MERGE-POLICY',
      'adapterSurface', 'releaseMergePolicyCli GitHub ruleset adapter',
      'scope', 'named default-branch ruleset and repository merge settings',
      'authorizationRules', jsonb_build_array(
        'RELEASE_GOVERNANCE_TOKEN must expose bypass actors',
        'candidate code never receives the credential',
        'omitted protected fields fail closed'
      ),
      'negativeTests', jsonb_build_array(
        'missing bypass_actors projected as empty',
        'incomplete ruleset accepted',
        'candidate code executes with policy credential'
      ),
      'status', 'planned'
    )
  ) as rails
), surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as values
  from current_manifest
  cross join lateral (
    select distinct surface
    from jsonb_array_elements_text(
      coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        '.github/workflows/release.yml',
        '.github/workflows/release-candidate-integrity.yml',
        'docs/architecture/components/ci-governance/ci-delivery-governance-component.md',
        'docs/planning/status/release-please-continuous.md',
        'tools/ci/release-candidate-integrity/releaseMergePolicyCli.mjs',
        'tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs',
        'tools/ci/workflow-pattern-parity.test.mjs',
        'tools/planning-db/migrations/784_release_governance_credential_design.sql'
      )
    ) as listed(surface)
  ) distinct_surfaces
)
select jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(raw_manifest, '{mechanizationStatus}', to_jsonb('partial'::text)),
      '{noHumanDecisionsRemaining}', 'false'::jsonb
    ),
    '{commandQueryRails}',
    coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb) || new_rails.rails
  ),
  '{allowedImplementationSurfaces}', surfaces.values
) as raw_manifest
from current_manifest
cross join new_rails
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
from release_governance_credential_design_manifest manifest
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

with rails(rail_name, rail_type, ddd_owner, port_name) as (
  values
    ('GenerateReleaseCandidate', 'command', 'ReleaseCandidateIntegrityGate', 'PORT-CI-GENERATE-RELEASE-CANDIDATE'),
    ('InspectReleasePullRequestMergePolicy', 'query', 'ReleaseMergePolicyAdapter', 'PORT-CI-INSPECT-RELEASE-PULL-REQUEST-MERGE-POLICY')
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
  'local#C-RELEASE-CANDIDATE-INTEGRITY-1#' || rail_type || '#' || lower(rail_name),
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'implemented',
  rail_name,
  lower(rail_name),
  rail_type,
  ddd_owner,
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
    'node --test tools/ci/release-candidate-integrity/releaseMergePolicyCli.test.mjs',
    'node --test tools/ci/workflow-pattern-parity.test.mjs'
  ),
  jsonb_build_array(
    'release generation has no GITHUB_TOKEN fallback',
    'ruleset bypass visibility is explicit',
    'candidate code never receives release governance credentials'
  ),
  'tools/planning-db/migrations/784_release_governance_credential_design.sql',
  planning_query_store.sha256_text(rail_name || ':design:784'),
  jsonb_build_object(
    'name', rail_name,
    'type', rail_type,
    'dddOwner', ddd_owner,
    'port', port_name,
    'status', 'planned'
  ),
  manifest.raw_manifest,
  0,
  'codex'
from rails
cross join release_governance_credential_design_manifest manifest
on conflict (rail_id) do update set
  rail_status = excluded.rail_status,
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
    where rail_name = 'GenerateReleaseCandidate'
      and rail_type = 'command'
      and rail_status = 'planned'
  ) then
    raise exception 'GenerateReleaseCandidate planned command rail is missing';
  end if;

  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'InspectReleasePullRequestMergePolicy'
      and rail_type = 'query'
      and rail_status = 'planned'
  ) then
    raise exception 'InspectReleasePullRequestMergePolicy planned query rail is missing';
  end if;
end
$$;
