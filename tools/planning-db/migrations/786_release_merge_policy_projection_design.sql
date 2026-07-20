-- Model the adapter translation between merge-policy evidence and candidate
-- assessment before correcting the trusted workflow composition.

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
  'RELEASE-MERGE-POLICY-PROJECTION-20260720',
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'Project merge policy evidence at the workflow boundary',
  'CI Governance',
  'approved',
  'InspectReleasePullRequestMergePolicy returns an evidence envelope while AssessReleaseCandidateIntegrity consumes the nested canonical policy. The trusted workflow is the composition boundary and must perform that explicit projection.',
  'boundary_drift',
  'InspectReleasePullRequestMergePolicy;AssessReleaseCandidateIntegrity',
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
  (
    'RELEASE-MERGE-POLICY-PROJECTION-20260720',
    'query',
    'InspectReleasePullRequestMergePolicy',
    'may_update',
    true
  ),
  (
    'RELEASE-MERGE-POLICY-PROJECTION-20260720',
    'query',
    'AssessReleaseCandidateIntegrity',
    'may_update',
    true
  ),
  (
    'RELEASE-MERGE-POLICY-PROJECTION-20260720',
    'path',
    '.github/workflows/release-candidate-integrity.yml',
    'may_update',
    true
  ),
  (
    'RELEASE-MERGE-POLICY-PROJECTION-20260720',
    'test',
    'TEST-CI-RELEASE-MERGE-POLICY-PROJECTION',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'invariant',
  'Candidate assessment receives the nested canonical policy, never the merge-policy evidence envelope.',
  0
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
), rewritten as (
  select jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(to_jsonb(surface) order by surface)
      from (
        select distinct surface
        from jsonb_array_elements_text(
          coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
          || jsonb_build_array(
            'tools/planning-db/migrations/786_release_merge_policy_projection_design.sql'
          )
        ) listed(surface)
      ) distinct_surfaces
    )
  ) as raw_manifest
  from current_manifest
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = rewritten.raw_manifest,
  allowed_implementation_surfaces = rewritten.raw_manifest -> 'allowedImplementationSurfaces',
  source_content_sha256 = planning_query_store.sha256_text(
    planning_query_store.stable_jsonb_text(rewritten.raw_manifest)
  ),
  revision = rail.revision + 1,
  updated_at = now()
from rewritten
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

do $$
begin
  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'InspectReleasePullRequestMergePolicy'
      and rail_type = 'query'
      and rail_status = 'implemented'
      and not is_gap
  ) then
    raise exception 'InspectReleasePullRequestMergePolicy query rail is unavailable';
  end if;

  if not exists (
    select 1
    from planning_query_store.command_query_rail_query
    where rail_name = 'AssessReleaseCandidateIntegrity'
      and rail_type = 'query'
      and rail_status = 'implemented'
      and not is_gap
  ) then
    raise exception 'AssessReleaseCandidateIntegrity query rail is unavailable';
  end if;
end
$$;
