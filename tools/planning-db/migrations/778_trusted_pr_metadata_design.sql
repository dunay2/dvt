-- Model trusted pull-request metadata mutation before moving the labeler out of
-- the candidate-code PR quality job.

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
  'TRUSTED-PR-METADATA-ISOLATION-20260720',
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'Trusted pull-request metadata isolation',
  'CI Governance',
  'approved',
  'The PR quality job executes candidate code and therefore remains read-only. File-derived label mutation moves to a trusted pull_request_target adapter, while PR scope assessment reads the immutable base SHA from the shallow merge snapshot without exposing credentials to repository code.',
  'hidden_authority',
  'ApplyPullRequestFileLabels',
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
values (
  'PORT-CI-APPLY-PR-FILE-LABELS',
  'SYS-CI-GOVERNANCE-GITHUB',
  'ApplyPullRequestFileLabels',
  'command',
  'inbound',
  null,
  null,
  array[
    'candidate-controlled code receives a pull-requests:write token',
    'the label policy is loaded from the candidate tree',
    'the trusted adapter checks out or executes candidate code',
    'label mutation and candidate validation share one job authority'
  ]::text[],
  'approved'
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

update planning_query_store.governance_component_local_definitions
set
  cq_rails = case
    when position('ApplyPullRequestFileLabels' in cq_rails) > 0 then cq_rails
    else concat_ws(';', nullif(cq_rails, ''), 'ApplyPullRequestFileLabels')
  end,
  revision = revision + 1
where component_id = 'SYS-CI-GOVERNANCE-GITHUB';

drop table if exists pg_temp.trusted_pr_metadata_manifest;

create temporary table trusted_pr_metadata_manifest as
with current_manifest as (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  order by updated_at desc, rail_id
  limit 1
), expanded as (
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
      case
        when coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb)
          @> jsonb_build_array(jsonb_build_object('name', 'ApplyPullRequestFileLabels'))
          then coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb)
        else coalesce(raw_manifest -> 'commandQueryRails', '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'name', 'ApplyPullRequestFileLabels',
            'type', 'command',
            'boundedContext', 'Repository collaboration governance',
            'dddOwner', 'PullRequestFileLabelPolicy',
            'object', 'PullRequestFileLabelSet',
            'port', 'PORT-CI-APPLY-PR-FILE-LABELS',
            'adapterSurface', '.github/workflows/pr-labeler.yml#label_pull_request',
            'authorization', 'pull_request_target with contents:read and pull-requests:write; no checkout or candidate execution',
            'negativeTests', jsonb_build_array(
              'candidate code receives write authority',
              'candidate configuration controls labels',
              'trusted labeler performs checkout or shell execution'
            ),
            'status', 'planned'
          )
        )
      end
    ),
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(to_jsonb(surface) order by surface)
      from (
        select distinct surface
        from jsonb_array_elements_text(
          coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
          || jsonb_build_array(
            '.github/workflows/pr-labeler.yml',
            'tools/ci/github-collaboration-governance.test.mjs',
            'tools/ci/ci-tool-test-suite.mjs',
            'tools/planning-db/migrations/778_trusted_pr_metadata_design.sql'
          )
        ) as surfaces(surface)
      ) distinct_surfaces
    )
  ) as raw_manifest
  from current_manifest
)
select raw_manifest
from expanded;

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = manifest.raw_manifest,
  allowed_implementation_surfaces = manifest.raw_manifest -> 'allowedImplementationSurfaces',
  revision = rail.revision + 1,
  updated_at = now()
from trusted_pr_metadata_manifest manifest
where rail.feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1';

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
select
  'local#C-RELEASE-CANDIDATE-INTEGRITY-1#command#applypullrequestfilelabels',
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'implemented',
  'ApplyPullRequestFileLabels',
  'applypullrequestfilelabels',
  'command',
  'PullRequestFileLabelPolicy',
  'planned',
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_array('docs/architecture/components/ci-governance/ci-delivery-governance-component.md'),
  jsonb_build_array(
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/ci-governance/ci-delivery-governance-component.md'
  ),
  manifest.raw_manifest -> 'allowedImplementationSurfaces',
  jsonb_build_array('node --test tools/ci/github-collaboration-governance.test.mjs'),
  jsonb_build_array(
    'one trusted pull_request_target owner',
    'no checkout or candidate execution',
    'PR quality candidate-code jobs remain read-only'
  ),
  'tools/planning-db/migrations/778_trusted_pr_metadata_design.sql',
  coalesce(
    (
      select content_hash
      from planning_query_store.governance_files
      where path = 'tools/planning-db/migrations/778_trusted_pr_metadata_design.sql'
    ),
    planning_query_store.sha256_text('trusted-pr-metadata-design:778')
  ),
  jsonb_build_object(
    'name', 'ApplyPullRequestFileLabels',
    'type', 'command',
    'boundedContext', 'Repository collaboration governance',
    'dddOwner', 'PullRequestFileLabelPolicy',
    'object', 'PullRequestFileLabelSet',
    'port', 'PORT-CI-APPLY-PR-FILE-LABELS',
    'adapterSurface', '.github/workflows/pr-labeler.yml#label_pull_request',
    'authorization', 'pull_request_target with contents:read and pull-requests:write; no checkout or candidate execution',
    'status', 'planned'
  ),
  manifest.raw_manifest,
  0,
  'codex'
from trusted_pr_metadata_manifest manifest
on conflict (rail_id) do update set
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
    where rail_name = 'ApplyPullRequestFileLabels'
      and rail_type = 'command'
      and ddd_owner = 'PullRequestFileLabelPolicy'
      and rail_status = 'planned'
  ) then
    raise exception 'ApplyPullRequestFileLabels planned command rail is missing';
  end if;
end
$$;
