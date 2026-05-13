create table if not exists planning_query_store.doc_resolution_overlays (
  resolution_key text primary key,
  resolution_scope text not null check (resolution_scope in ('docs_disposition', 'task_gap')),
  issue_kind text not null,
  document_path text,
  reference_text text,
  lane_id text,
  task_id text,
  resolution_status text not null check (
    resolution_status in ('resolved', 'accepted', 'ignored', 'linked')
  ),
  resolved_by text not null,
  resolved_at timestamptz not null default now(),
  reason text not null,
  target_lane_id text,
  target_task_id text,
  source_content_sha256 text check (
    source_content_sha256 is null
    or source_content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  raw_resolution jsonb not null default '{}'::jsonb
);

create index if not exists doc_resolution_overlays_scope_idx
  on planning_query_store.doc_resolution_overlays(
    resolution_scope,
    issue_kind,
    document_path,
    lane_id,
    task_id
  );

create index if not exists doc_resolution_overlays_source_hash_idx
  on planning_query_store.doc_resolution_overlays(source_content_sha256);

create table if not exists planning_query_store.doc_resolution_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null check (
    operation_type in ('docs_disposition_resolve', 'task_gap_resolve')
  ),
  actor text not null,
  resolution_key text not null,
  resolution_scope text not null check (resolution_scope in ('docs_disposition', 'task_gap')),
  issue_kind text not null,
  document_path text,
  reference_text text,
  lane_id text,
  task_id text,
  resolution_status text not null check (
    resolution_status in ('resolved', 'accepted', 'ignored', 'linked')
  ),
  source_content_sha256 text check (
    source_content_sha256 is null
    or source_content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists doc_resolution_operations_scope_idx
  on planning_query_store.doc_resolution_operations(
    resolution_scope,
    issue_kind,
    document_path,
    lane_id,
    task_id,
    created_at
  );

create or replace view planning_query_store.doc_disposition_action_query as
select
  action.action_id,
  action.priority,
  action.action_kind,
  action.document_path,
  document.status as document_status,
  document.planning_type,
  document.is_active,
  action.reference_text,
  action.reason,
  action.blocking,
  action.evidence,
  action.source_content_sha256,
  action.raw_action,
  action.imported_at,
  coalesce(resolution.resolution_status, 'pending') as resolution_status,
  resolution.resolved_by,
  resolution.resolved_at,
  resolution.reason as resolution_reason,
  resolution.target_lane_id,
  resolution.target_task_id
from planning_query_store.doc_disposition_actions action
join planning_query_store.doc_disposition_documents document
  on document.document_path = action.document_path
left join planning_query_store.doc_resolution_overlays resolution
  on resolution.resolution_scope = 'docs_disposition'
 and resolution.issue_kind = action.action_kind
 and coalesce(resolution.document_path, '') = coalesce(action.document_path, '')
 and coalesce(resolution.reference_text, '') = coalesce(action.reference_text, '')
 and resolution.source_content_sha256 = action.source_content_sha256;

create or replace view planning_query_store.planning_task_gap_raw_query as
with task_document_links as (
  select distinct
    task.lane_id,
    task.task_id,
    reference.document_path
  from planning_query_store.planning_effective_tasks task
  join planning_query_store.doc_task_reference_query reference
    on upper(reference.reference_text) = upper(task.task_id)
   and reference.registered_planning_task = true
),
document_task_links as (
  select distinct
    reference.document_path
  from planning_query_store.doc_task_reference_query reference
  where reference.registered_planning_task = true
)
select
  'done_or_review_without_evidence'::text as gap_kind,
  'P1'::text as severity,
  task.lane_id,
  task.task_id,
  null::text as document_path,
  'Task is in review or done without evidence refs.'::text as reason,
  task.source_path,
  task.source_content_sha256
from planning_query_store.planning_effective_tasks task
where lower(task.status) in ('done', 'review')
  and not exists (
    select 1
    from planning_query_store.planning_task_evidence_refs evidence
    where evidence.lane_id = task.lane_id
      and evidence.task_id = task.task_id
  )
union all
select
  'open_without_source_document'::text as gap_kind,
  'P2'::text as severity,
  task.lane_id,
  task.task_id,
  null::text as document_path,
  'Open task has no task-referencing document and no evidence refs.'::text as reason,
  task.source_path,
  task.source_content_sha256
from planning_query_store.planning_effective_tasks task
where lower(task.status) not in ('done', 'blocked')
  and not exists (
    select 1
    from task_document_links link
    where link.lane_id = task.lane_id
      and link.task_id = task.task_id
  )
  and not exists (
    select 1
    from planning_query_store.planning_task_evidence_refs evidence
    where evidence.lane_id = task.lane_id
      and evidence.task_id = task.task_id
  )
union all
select
  'active_review_without_task_link'::text as gap_kind,
  'P1'::text as severity,
  null::text as lane_id,
  null::text as task_id,
  document.document_path,
  'Active review document has no registered planning task link.'::text as reason,
  document.document_path as source_path,
  document.source_content_sha256
from planning_query_store.doc_disposition_document_query document
where document.is_active = true
  and document.document_path like 'docs/planning/reviews/%'
  and lower(coalesce(nullif(document.status, ''), 'missing')) in ('active', 'review', 'in_progress')
  and not exists (
    select 1
    from document_task_links link
    where link.document_path = document.document_path
  )
union all
select
  'mandatory_proposal_without_task_link'::text as gap_kind,
  'P1'::text as severity,
  null::text as lane_id,
  null::text as task_id,
  document.document_path,
  'Mandatory active proposal has no registered planning task link.'::text as reason,
  document.document_path as source_path,
  document.source_content_sha256
from planning_query_store.doc_disposition_document_query document
where document.is_active = true
  and document.document_path like 'docs/planning/proposals/mandatory/%'
  and lower(coalesce(nullif(document.status, ''), 'missing')) in (
    'active',
    'draft',
    'proposed',
    'review',
    'missing'
  )
  and not exists (
    select 1
    from document_task_links link
    where link.document_path = document.document_path
  )
union all
select
  'task_linked_document_with_disposition_action'::text as gap_kind,
  action.priority as severity,
  task.lane_id,
  task.task_id,
  action.document_path,
  action.reason,
  action.document_path as source_path,
  action.source_content_sha256
from planning_query_store.doc_disposition_action_query action
join planning_query_store.doc_task_reference_query reference
  on reference.document_path = action.document_path
 and reference.registered_planning_task = true
join planning_query_store.planning_effective_tasks task
  on upper(task.task_id) = upper(reference.reference_text)
where action.resolution_status = 'pending';

create or replace view planning_query_store.planning_task_gap_query as
select
  gap.gap_kind,
  gap.severity,
  gap.lane_id,
  gap.task_id,
  gap.document_path,
  gap.reason,
  gap.source_path,
  gap.source_content_sha256,
  coalesce(resolution.resolution_status, 'pending') as resolution_status,
  resolution.resolved_by,
  resolution.resolved_at,
  resolution.reason as resolution_reason,
  resolution.target_lane_id,
  resolution.target_task_id
from planning_query_store.planning_task_gap_raw_query gap
left join planning_query_store.doc_resolution_overlays resolution
  on resolution.resolution_scope = 'task_gap'
 and resolution.issue_kind = gap.gap_kind
 and coalesce(resolution.document_path, '') = coalesce(gap.document_path, '')
 and coalesce(resolution.lane_id, '') = coalesce(gap.lane_id, '')
 and coalesce(resolution.task_id, '') = coalesce(gap.task_id, '')
 and resolution.source_content_sha256 = gap.source_content_sha256;
