-- Close the trusted pull-request metadata slice after the label mutation has
-- been isolated from candidate-code validation and its architecture guard is
-- part of the executable CI harness.

update architecture.design
set
  status = 'implemented',
  updated_at = now()
where design_id = 'TRUSTED-PR-METADATA-ISOLATION-20260720';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('TRUSTED-PR-METADATA-ISOLATION-20260720', 'component', 'SYS-CI-GOVERNANCE-GITHUB', 'may_reference', true),
  ('TRUSTED-PR-METADATA-ISOLATION-20260720', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-HARNESS', 'may_reference', true),
  ('TRUSTED-PR-METADATA-ISOLATION-20260720', 'flow', 'ApplyPullRequestFileLabels', 'may_create', true),
  ('TRUSTED-PR-METADATA-ISOLATION-20260720', 'test', 'TEST-SYS-CI-GOVERNANCE-GITHUB-COLLABORATION-AUTHORITY', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component_port
set status = 'implemented'
where port_id = 'PORT-CI-APPLY-PR-FILE-LABELS';

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values (
  'REL-CI-GITHUB-GOVERNANCE-DEPENDS-ON-CI-HARNESS',
  'SYS-CI-GOVERNANCE-GITHUB',
  'SYS-CI-GOVERNANCE-TOOLS-CI-HARNESS',
  'depends_on',
  'outbound',
  'build_time',
  null,
  'The trusted-workflow architecture test is omitted from the executable CI partition or YAML semantics are parsed by a second ad-hoc implementation.',
  'repo-local test execution',
  jsonb_build_array(
    'tools/ci/ci-tool-test-suite.mjs#EXECUTABLE_CI_TOOL_TESTS',
    'tools/ci/github-collaboration-governance.test.mjs'
  ),
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
values (
  'TEST-SYS-CI-GOVERNANCE-GITHUB-COLLABORATION-AUTHORITY',
  'SYS-CI-GOVERNANCE-GITHUB',
  'tools/ci/github-collaboration-governance.test.mjs',
  'architecture',
  'boundary',
  true,
  'node --test tools/ci/github-collaboration-governance.test.mjs tools/ci/workflow-pattern-parity.test.mjs tools/ci/ci-tool-test-suite.test.mjs'
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
values (
  'EV-CI-TRUSTED-PR-METADATA-AUTHORITY-20260720',
  'component',
  'SYS-CI-GOVERNANCE-GITHUB',
  'test',
  'node --test tools/ci/github-collaboration-governance.test.mjs tools/ci/workflow-pattern-parity.test.mjs tools/ci/ci-tool-test-suite.test.mjs',
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values (
  'SYS-CI-GOVERNANCE-GITHUB',
  'owns',
  '.github/workflows/pr-labeler.yml',
  0
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.governance_component_local_definitions
set
  cq_rails = case
    when position('ApplyPullRequestFileLabels' in cq_rails) > 0 then cq_rails
    else concat_ws(';', nullif(cq_rails, ''), 'ApplyPullRequestFileLabels')
  end,
  revision = revision + 1
where component_id = 'SYS-CI-GOVERNANCE-GITHUB';

drop table if exists pg_temp.trusted_pr_metadata_implemented_manifest;

create temporary table trusted_pr_metadata_implemented_manifest as
with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
), implemented_rails as (
  select jsonb_agg(
    case
      when rail.value ->> 'name' = 'ApplyPullRequestFileLabels'
        then jsonb_set(rail.value, '{status}', to_jsonb('implemented'::text))
      else rail.value
    end
    order by rail.ordinality
  ) as command_query_rails
  from current_manifest
  cross join lateral jsonb_array_elements(
    coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb)
  ) with ordinality rail(value, ordinality)
), allowed_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select distinct surface
    from current_manifest
    cross join lateral jsonb_array_elements_text(
      coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/planning-db/migrations/779_trusted_pr_metadata_implementation.sql'
      )
    ) surface
  ) distinct_surfaces
)
select jsonb_set(
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
    implemented_rails.command_query_rails
  ),
  '{allowedImplementationSurfaces}',
  allowed_surfaces.surfaces
) as raw_manifest
from current_manifest
cross join implemented_rails
cross join allowed_surfaces;

update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'implemented',
  raw_manifest = manifest.raw_manifest,
  allowed_implementation_surfaces = manifest.raw_manifest -> 'allowedImplementationSurfaces',
  revision = rail.revision + 1,
  updated_at = now()
from trusted_pr_metadata_implemented_manifest manifest
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

update planning_query_store.feature_mechanization_local_rails rail
set
  rail_status = 'implemented',
  symbol_refs = jsonb_build_array('.github/workflows/pr-labeler.yml#label_pull_request'),
  implementation_refs = jsonb_build_array(
    '.github/workflows/pr-labeler.yml#label_pull_request',
    '.github/workflows/pr-quality-gate.yml#pr-checks'
  ),
  source_path = 'tools/planning-db/migrations/779_trusted_pr_metadata_implementation.sql',
  source_content_sha256 = coalesce(
    (
      select content_hash
      from planning_query_store.governance_files
      where path = 'tools/planning-db/migrations/779_trusted_pr_metadata_implementation.sql'
    ),
    planning_query_store.sha256_text('trusted-pr-metadata-implementation:779')
  ),
  raw_rail = jsonb_set(
    raw_rail,
    '{status}',
    to_jsonb('implemented'::text)
  ),
  revision = rail.revision + 1,
  updated_at = now()
where rail_id = 'local#C-RELEASE-CANDIDATE-INTEGRITY-1#command#applypullrequestfilelabels';

do $$
begin
  if not exists (
    select 1
    from architecture.design
    where design_id = 'TRUSTED-PR-METADATA-ISOLATION-20260720'
      and status = 'implemented'
  ) then
    raise exception 'Trusted PR metadata isolation design is not implemented';
  end if;

  if not exists (
    select 1
    from architecture.component_port
    where port_id = 'PORT-CI-APPLY-PR-FILE-LABELS'
      and status = 'implemented'
  ) then
    raise exception 'ApplyPullRequestFileLabels port is not implemented';
  end if;

  if not exists (
    select 1
    from architecture.component_relation
    where relation_id = 'REL-CI-GITHUB-GOVERNANCE-DEPENDS-ON-CI-HARNESS'
      and status = 'implemented'
  ) then
    raise exception 'GitHub governance CI Harness dependency is missing';
  end if;

  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'ApplyPullRequestFileLabels'
      and rail_type = 'command'
      and ddd_owner = 'PullRequestFileLabelPolicy'
      and rail_status = 'implemented'
      and not is_gap
  ) then
    raise exception 'ApplyPullRequestFileLabels is not a mechanized command rail';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
      and (
        raw_manifest ->> 'mechanizationStatus' <> 'implemented'
        or raw_manifest ->> 'noHumanDecisionsRemaining' <> 'true'
        or not (
          raw_manifest -> 'allowedImplementationSurfaces'
          ? 'tools/planning-db/migrations/779_trusted_pr_metadata_implementation.sql'
        )
      )
  ) then
    raise exception 'Release candidate integrity manifest is not closed after trusted metadata isolation';
  end if;
end
$$;
