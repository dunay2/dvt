-- The workflow architecture guard parses YAML with the repository package
-- runtime. Keep ownership in CI Harness and record the release gate's explicit
-- test-time dependency instead of introducing a second parser or ownership.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values (
  'RELEASE-CANDIDATE-INTEGRITY-20260719',
  'component',
  'SYS-CI-GOVERNANCE-TOOLS-CI-HARNESS',
  'may_reference',
  true
)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values (
  'REL-CI-RELEASE-INTEGRITY-DEPENDS-ON-CI-HARNESS',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'SYS-CI-GOVERNANCE-TOOLS-CI-HARNESS',
  'depends_on',
  'outbound',
  'build_time',
  null,
  'The package-backed workflow architecture test is left in the static CI partition or replaced with ad-hoc YAML parsing.',
  'repo-local test execution',
  jsonb_build_array(
    'tools/ci/ci-tool-test-suite.mjs#EXECUTABLE_CI_TOOL_TESTS',
    'tools/ci/workflow-pattern-parity.test.mjs'
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

with updated_manifest as (
  select jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(raw_manifest -> 'allowedImplementationSurfaces')
        union
        select 'tools/ci/ci-tool-test-suite.mjs'
        union
        select 'tools/planning-db/migrations/777_release_candidate_integrity_ci_harness_dependency.sql'
      ) surfaces
    )
  ) as raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by rail_id
  limit 1
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = updated.raw_manifest,
  allowed_implementation_surfaces = updated.raw_manifest -> 'allowedImplementationSurfaces',
  revision = rail.revision + 1,
  updated_at = now()
from updated_manifest updated
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

do $$
begin
  if not exists (
    select 1
    from architecture.component_relation
    where relation_id = 'REL-CI-RELEASE-INTEGRITY-DEPENDS-ON-CI-HARNESS'
      and status = 'implemented'
  ) then
    raise exception 'Release candidate integrity CI Harness dependency is missing';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
      and not (raw_manifest -> 'allowedImplementationSurfaces' ? 'tools/ci/ci-tool-test-suite.mjs')
  ) then
    raise exception 'Release candidate integrity manifest omits the CI Harness partition surface';
  end if;
end
$$;
