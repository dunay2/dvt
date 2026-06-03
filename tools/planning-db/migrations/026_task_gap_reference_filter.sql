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
select distinct
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
 and action.reference_text is not null
 and upper(reference.reference_text) = upper(action.reference_text)
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
