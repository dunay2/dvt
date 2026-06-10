drop view if exists planning_query_store.fowler_analysis_work_query;
drop view if exists planning_query_store.fowler_analysis_retirement_query;
drop view if exists planning_query_store.fowler_analysis_canonical_coverage_query;
drop view if exists planning_query_store.fowler_analysis_reference_query;
drop view if exists planning_query_store.fowler_analysis_improvement_query;
drop view if exists planning_query_store.fowler_analysis_document_query;

create table if not exists planning_query_store.fowler_analysis_dispositions (
  document_path text primary key,
  disposition_status text not null,
  disposition_kind text not null,
  canonical_target_path text,
  reason text not null,
  source_content_sha256 text not null,
  recorded_by text not null,
  recorded_at timestamptz not null default now(),
  raw_disposition jsonb not null default '{}'::jsonb,
  constraint fowler_analysis_dispositions_status_check
    check (disposition_status in ('proposed', 'accepted', 'rejected', 'superseded'))
);

create table if not exists planning_query_store.fowler_analysis_canonical_targets (
  document_path text not null,
  target_path text not null,
  target_kind text not null default 'canonical_document',
  target_status text not null,
  reason text not null,
  source_content_sha256 text not null,
  linked_by text not null,
  linked_at timestamptz not null default now(),
  raw_target jsonb not null default '{}'::jsonb,
  primary key (document_path, target_path),
  constraint fowler_analysis_canonical_targets_status_check
    check (target_status in ('proposed', 'accepted', 'rejected', 'superseded'))
);

create table if not exists planning_query_store.fowler_analysis_reference_resolutions (
  document_path text not null,
  reference_path text not null,
  relation_type text not null,
  resolution_status text not null,
  canonical_target_path text,
  reason text not null,
  source_content_sha256 text not null,
  resolved_by text not null,
  resolved_at timestamptz not null default now(),
  raw_resolution jsonb not null default '{}'::jsonb,
  primary key (document_path, reference_path, relation_type),
  constraint fowler_analysis_reference_resolutions_status_check
    check (resolution_status in ('resolved', 'obsolete', 'replaced', 'blocked', 'ignored'))
);

create table if not exists planning_query_store.fowler_analysis_retirement_decisions (
  document_path text primary key,
  decision_status text not null,
  reason text not null,
  source_content_sha256 text not null,
  decided_by text not null,
  decided_at timestamptz not null default now(),
  raw_decision jsonb not null default '{}'::jsonb,
  constraint fowler_analysis_retirement_decisions_status_check
    check (decision_status in ('approved', 'rejected', 'blocked'))
);

create table if not exists planning_query_store.fowler_analysis_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null,
  actor text not null,
  document_path text not null,
  target_path text,
  reference_path text,
  relation_type text,
  source_content_sha256 text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fowler_analysis_operations_type_check
    check (operation_type in (
      'fowler_analysis_disposition_record',
      'fowler_analysis_canonical_target_link',
      'fowler_analysis_reference_resolve',
      'fowler_analysis_retirement_approve'
    ))
);

create index if not exists fowler_analysis_targets_document_idx
  on planning_query_store.fowler_analysis_canonical_targets(document_path);

create index if not exists fowler_analysis_targets_target_idx
  on planning_query_store.fowler_analysis_canonical_targets(target_path);

create index if not exists fowler_analysis_reference_resolutions_document_idx
  on planning_query_store.fowler_analysis_reference_resolutions(document_path);

create index if not exists fowler_analysis_operations_document_idx
  on planning_query_store.fowler_analysis_operations(document_path);

create or replace view planning_query_store.fowler_analysis_document_query as
select
  lifecycle.document_id,
  lifecycle.document_path,
  lifecycle.document_type,
  lifecycle.title,
  lifecycle.status,
  lifecycle.planning_type,
  lifecycle.owner,
  lifecycle.canonicality,
  lifecycle.lifecycle_state,
  lifecycle.canonical_disposition as imported_canonical_disposition,
  lifecycle.subject_key,
  lifecycle.action_count,
  lifecycle.open_action_count,
  lifecycle.inbound_knowledge_reference_count,
  lifecycle.inbound_repository_reference_count,
  (
    lifecycle.inbound_knowledge_reference_count
    + lifecycle.inbound_repository_reference_count
  )::int as inbound_reference_count,
  case
    when lifecycle.document_path like 'buzon/%' then 'intake'
    when lifecycle.document_path like 'docs/planning/reviews/%' then 'review'
    when lifecycle.document_path like 'docs/planning/proposals/%' then 'proposal'
    when lifecycle.document_path like 'docs/architecture/%' then 'architecture'
    when lifecycle.document_path like 'docs/evidence/%' then 'evidence'
    else lifecycle.canonicality
  end as document_class,
  lifecycle.lifecycle_gap_kind,
  lifecycle.source_content_sha256
from planning_query_store.documentation_lifecycle_query lifecycle
where lifecycle.document_type = 'fowler_analysis'
   or lower(lifecycle.document_path) like '%fowler%'
   or lower(lifecycle.title) like '%fowler%';

create or replace view planning_query_store.fowler_analysis_improvement_query as
select
  document.document_path,
  action.action_id as improvement_id,
  action.summary,
  action.status,
  action.required,
  action.line_number,
  case
    when lower(coalesce(action.status, '')) in (
      'deferred',
      'done',
      'rejected',
      'resolved',
      'superseded'
    )
      then 'closed'
    else 'open'
  end as improvement_state,
  document.source_content_sha256
from planning_query_store.fowler_analysis_document_query document
join planning_query_store.knowledge_action_items action
  on action.source_document_id = document.document_id;

create or replace view planning_query_store.fowler_analysis_reference_query as
with accepted_targets as (
  select
    target.document_path,
    min(target.target_path) as canonical_target_path
  from planning_query_store.fowler_analysis_canonical_targets target
  where target.target_status = 'accepted'
  group by target.document_path
),
imported_references as (
  select
    document.document_path,
    'repository_path_reference'::text as reference_kind,
    reference.relation_type,
    reference.source_path as reference_path,
    ownership.leaf_component_id as reference_component_id,
    ownership.file_role as reference_file_role,
    reference.sample_text,
    reference.source_content_sha256
  from planning_query_store.fowler_analysis_document_query document
  join planning_query_store.knowledge_intake_repository_references reference
    on reference.target_document_path = document.document_path
  left join planning_query_store.component_engineering_file_ownership_query ownership
    on ownership.file_path = reference.source_path
  where reference.source_path not like 'buzon/%'

  union all

  select
    document.document_path,
    'knowledge_document_link'::text as reference_kind,
    link.relation_type,
    source_document.document_path as reference_path,
    ownership.leaf_component_id as reference_component_id,
    ownership.file_role as reference_file_role,
    source_document.title as sample_text,
    source_document.source_content_sha256
  from planning_query_store.fowler_analysis_document_query document
  join planning_query_store.knowledge_document_links link
    on link.to_document_id = document.document_id
  join planning_query_store.knowledge_documents source_document
    on source_document.document_id = link.from_document_id
  left join planning_query_store.component_engineering_file_ownership_query ownership
    on ownership.file_path = source_document.document_path
  where source_document.document_path not like 'buzon/%'
),
classified as (
  select
    reference.document_path,
    reference.reference_kind,
    reference.relation_type,
    reference.reference_path,
    target.canonical_target_path,
    coalesce(resolution.resolution_status, 'pending') as resolution_status,
    case
      when resolution.resolution_status in ('resolved', 'obsolete', 'replaced')
        then 'resolved'
      else 'live'
    end as reference_state,
    reference.reference_component_id,
    reference.reference_file_role,
    reference.sample_text,
    reference.source_content_sha256
  from imported_references reference
  left join accepted_targets target
    on target.document_path = reference.document_path
  left join planning_query_store.fowler_analysis_reference_resolutions resolution
    on resolution.document_path = reference.document_path
   and resolution.reference_path = reference.reference_path
   and resolution.relation_type = reference.relation_type
)
select
  document_path,
  reference_kind,
  relation_type,
  reference_path,
  canonical_target_path,
  resolution_status,
  reference_state,
  reference_component_id,
  reference_file_role,
  sample_text,
  source_content_sha256
from classified;

create or replace view planning_query_store.fowler_analysis_canonical_coverage_query as
with accepted_targets as (
  select distinct on (target.document_path)
    target.document_path,
    target.target_path,
    target.target_status,
    target.source_content_sha256
  from planning_query_store.fowler_analysis_canonical_targets target
  where target.target_status = 'accepted'
  order by target.document_path, target.linked_at desc, target.target_path
)
select
  document.document_path,
  document.subject_key,
  document.title,
  target.target_path,
  target.target_status,
  case
    when document.document_class <> 'intake' then 'canonical_source'
    when target.target_path is null then 'target_missing'
    when target_document.document_path is null then 'target_missing_from_import'
    else 'covered'
  end as coverage_state,
  coalesce(target.source_content_sha256, document.source_content_sha256)
    as source_content_sha256
from planning_query_store.fowler_analysis_document_query document
left join accepted_targets target
  on target.document_path = document.document_path
left join planning_query_store.knowledge_documents target_document
  on target_document.document_path = target.target_path;

create or replace view planning_query_store.fowler_analysis_retirement_query as
with improvement_counts as (
  select
    improvement.document_path,
    count(*) filter (where improvement.improvement_state = 'open')::int
      as open_improvement_count
  from planning_query_store.fowler_analysis_improvement_query improvement
  group by improvement.document_path
),
reference_counts as (
  select
    reference.document_path,
    count(*) filter (where reference.reference_state = 'live')::int
      as unresolved_reference_count
  from planning_query_store.fowler_analysis_reference_query reference
  group by reference.document_path
),
accepted_targets as (
  select distinct on (target.document_path)
    target.document_path,
    target.target_path as canonical_target_path,
    target.target_status as canonical_target_status
  from planning_query_store.fowler_analysis_canonical_targets target
  where target.target_status = 'accepted'
  order by target.document_path, target.linked_at desc, target.target_path
),
accepted_dispositions as (
  select
    disposition.document_path,
    disposition.disposition_status,
    disposition.disposition_kind
  from planning_query_store.fowler_analysis_dispositions disposition
  where disposition.disposition_status = 'accepted'
),
retirement_decisions as (
  select
    decision.document_path,
    decision.decision_status as retirement_decision_status
  from planning_query_store.fowler_analysis_retirement_decisions decision
),
policy as (
  select
    document.document_id,
    document.document_path,
    document.document_type,
    document.title,
    document.status,
    document.planning_type,
    document.owner,
    document.document_class,
    document.canonicality,
    document.lifecycle_state,
    document.lifecycle_gap_kind,
    document.imported_canonical_disposition,
    document.subject_key,
    document.action_count,
    document.open_action_count,
    document.inbound_knowledge_reference_count,
    document.inbound_repository_reference_count,
    document.inbound_reference_count,
    coalesce(improvement_counts.open_improvement_count, 0)::int as open_improvement_count,
    coalesce(reference_counts.unresolved_reference_count, 0)::int
      as unresolved_reference_count,
    accepted_targets.canonical_target_path,
    coalesce(accepted_targets.canonical_target_status, 'missing') as canonical_target_status,
    coalesce(accepted_dispositions.disposition_status, 'missing') as disposition_status,
    coalesce(accepted_dispositions.disposition_kind, 'missing') as disposition_kind,
    coalesce(retirement_decisions.retirement_decision_status, 'not_approved')
      as retirement_decision_status,
    document.source_content_sha256
  from planning_query_store.fowler_analysis_document_query document
  left join improvement_counts
    on improvement_counts.document_path = document.document_path
  left join reference_counts
    on reference_counts.document_path = document.document_path
  left join accepted_targets
    on accepted_targets.document_path = document.document_path
  left join accepted_dispositions
    on accepted_dispositions.document_path = document.document_path
  left join retirement_decisions
    on retirement_decisions.document_path = document.document_path
)
select
  policy.document_id,
  policy.document_path,
  policy.document_type,
  policy.title,
  policy.status,
  policy.planning_type,
  policy.owner,
  policy.document_class,
  policy.canonicality,
  policy.lifecycle_state,
  policy.lifecycle_gap_kind,
  policy.imported_canonical_disposition,
  policy.subject_key,
  policy.action_count,
  policy.open_action_count,
  policy.inbound_knowledge_reference_count,
  policy.inbound_repository_reference_count,
  policy.inbound_reference_count,
  policy.open_improvement_count,
  policy.unresolved_reference_count,
  policy.canonical_target_path,
  policy.canonical_target_status,
  policy.disposition_status,
  policy.disposition_kind,
  policy.retirement_decision_status,
  case
    when policy.document_class <> 'intake' then 'governed'
    when policy.open_improvement_count > 0
      then 'pending_improvements'
    when policy.unresolved_reference_count > 0
      then 'blocked_by_references'
    when policy.canonical_target_status is distinct from 'accepted'
      then 'needs_canonical_decision'
    when policy.disposition_status is distinct from 'accepted'
      then 'needs_disposition_decision'
    when policy.retirement_decision_status <> 'approved'
      then 'needs_retirement_approval'
    else 'ready_to_retire'
  end as retirement_state,
  (
    policy.document_class = 'intake'
    and policy.open_improvement_count = 0
    and policy.unresolved_reference_count = 0
    and policy.canonical_target_status = 'accepted'
    and policy.disposition_status = 'accepted'
    and policy.retirement_decision_status = 'approved'
  ) as retirement_allowed,
  'pnpm planning:db:query fowler-analysis-retirement --path '
    || quote_literal(policy.document_path) || ' --limit 30' as suggested_query,
  policy.source_content_sha256
from policy;

create or replace view planning_query_store.fowler_analysis_work_query as
select
  retirement.document_id,
  retirement.document_path,
  retirement.document_type,
  retirement.title,
  retirement.status,
  retirement.planning_type,
  retirement.owner,
  retirement.document_class,
  retirement.canonicality,
  retirement.lifecycle_state,
  coalesce(retirement.canonical_target_path, retirement.imported_canonical_disposition, '')
    as canonical_disposition,
  retirement.subject_key,
  retirement.action_count,
  retirement.open_action_count,
  retirement.inbound_knowledge_reference_count,
  retirement.inbound_repository_reference_count,
  retirement.inbound_reference_count,
  (
    retirement.open_improvement_count
    + case
        when retirement.document_class = 'intake'
          and retirement.retirement_state in (
            'needs_canonical_decision',
            'needs_disposition_decision',
            'needs_retirement_approval'
          )
          then 1
        else 0
      end
  )::int as pending_improvement_count,
  (
    retirement.open_improvement_count > 0
    or retirement.retirement_state in (
      'needs_canonical_decision',
      'needs_disposition_decision',
      'needs_retirement_approval'
    )
  ) as is_pending_improvement,
  retirement.retirement_allowed,
  case
    when retirement.document_class = 'intake' then retirement.retirement_state
    when retirement.open_improvement_count > 0 then 'pending_improvements'
    else 'governed'
  end as work_state,
  case
    when retirement.retirement_state = 'needs_canonical_decision'
      then 'intake_missing_canonical_target'
    when retirement.retirement_state = 'needs_disposition_decision'
      then 'intake_missing_accepted_disposition'
    when retirement.retirement_state = 'needs_retirement_approval'
      then 'intake_missing_retirement_approval'
    else retirement.lifecycle_gap_kind
  end as lifecycle_gap_kind,
  'pnpm planning:db:query fowler-analysis --path '
    || quote_literal(retirement.document_path) || ' --limit 30' as suggested_query,
  retirement.source_content_sha256
from planning_query_store.fowler_analysis_retirement_query retirement;

insert into planning_query_store.db_governance_surfaces (
  surface_name,
  canonical_source,
  write_rail,
  write_rail_kind,
  read_query_rail,
  projection,
  validation,
  migration_state,
  source_ref,
  source_content_sha256,
  revision,
  updated_by,
  raw_surface
)
values (
  'Fowler analysis retirement rails',
  'planning_query_store.fowler_analysis_* relational decision tables and imported knowledge references',
  'pnpm planning:db:operate fowler-analysis <record-disposition|link-canonical-target|resolve-reference|approve-retirement>',
  'db_command',
  'pnpm planning:db:query fowler-analysis-retirement',
  'planning_query_store.fowler_analysis_retirement_query',
  'node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs',
  'DB-first',
  'tools/planning-db/migrations/074_fowler_analysis_retirement_rails.sql',
  repeat('0', 64),
  0,
  'migration',
  jsonb_build_object(
    'authority', 'db_projection',
    'queries', jsonb_build_array(
      'QueryFowlerAnalysisReferences',
      'QueryFowlerAnalysisRetirementCandidates',
      'QueryFowlerAnalysisCanonicalCoverage'
    ),
    'commands', jsonb_build_array(
      'RecordFowlerAnalysisDisposition',
      'LinkFowlerAnalysisCanonicalTarget',
      'ResolveFowlerAnalysisReference',
      'ApproveFowlerAnalysisRetirement'
    ),
    'retirementRule', 'no live refs, accepted target, no open improvements, accepted disposition, approved retirement decision'
  )
)
on conflict (surface_name) do update
set
  canonical_source = excluded.canonical_source,
  write_rail = excluded.write_rail,
  write_rail_kind = excluded.write_rail_kind,
  read_query_rail = excluded.read_query_rail,
  projection = excluded.projection,
  validation = excluded.validation,
  migration_state = excluded.migration_state,
  source_ref = excluded.source_ref,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.db_governance_surfaces.revision + 1,
  updated_by = excluded.updated_by,
  updated_at = now(),
  raw_surface = excluded.raw_surface;
