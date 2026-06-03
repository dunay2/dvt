create or replace view planning_query_store.planning_task_trace_query as
with task_document_links as (
  select
    task.lane_id,
    task.task_id,
    task.priority,
    task.status,
    task.progress_pct,
    case
      when reference.document_path like 'docs/planning/reviews/%'
        or lower(coalesce(document.planning_type, '')) = 'review'
        then 'review'
      when reference.document_path like 'docs/planning/proposals/%'
        or lower(coalesce(document.planning_type, '')) like '%proposal%'
        then 'proposal'
      when reference.document_path like 'docs/planning/closeouts/%'
        or lower(coalesce(document.planning_type, '')) = 'closeout'
        then 'closeout'
      when reference.document_path like 'docs/evidence/%'
        then 'evidence_doc'
      when reference.document_path like 'docs/risk-register/%'
        then 'risk_doc'
      else 'source_doc'
    end as trace_kind,
    reference.document_path as trace_ref,
    coalesce(nullif(document.status, ''), '-') as trace_status,
    coalesce(nullif(document.title, ''), reference.document_path) as trace_detail,
    reference.document_path,
    reference.source_content_sha256,
    40 as trace_order
  from planning_query_store.planning_effective_tasks task
  join planning_query_store.doc_task_reference_query reference
    on upper(reference.reference_text) = upper(task.task_id)
   and reference.registered_planning_task = true
  join planning_query_store.doc_disposition_document_query document
    on document.document_path = reference.document_path
)
select
  task.lane_id,
  task.task_id,
  task.priority,
  task.status,
  task.progress_pct,
  'task'::text as trace_kind,
  task.task_id as trace_ref,
  task.status as trace_status,
  task.objective as trace_detail,
  null::text as document_path,
  task.source_path,
  task.source_content_sha256,
  0 as trace_order
from planning_query_store.planning_effective_tasks task
union all
select
  task.lane_id,
  task.task_id,
  task.priority,
  task.status,
  task.progress_pct,
  'parent'::text as trace_kind,
  task.parent_task_id as trace_ref,
  coalesce(parent.status, 'missing') as trace_status,
  coalesce(parent.objective, 'Parent task is not present in the effective task view.') as trace_detail,
  null::text as document_path,
  task.source_path,
  task.source_content_sha256,
  5 as trace_order
from planning_query_store.planning_effective_tasks task
left join planning_query_store.planning_effective_tasks parent
  on parent.task_id = task.parent_task_id
where nullif(task.parent_task_id, '') is not null
union all
select
  task.lane_id,
  task.task_id,
  task.priority,
  task.status,
  task.progress_pct,
  'dependency'::text as trace_kind,
  dependency.dependency_task_id as trace_ref,
  coalesce(prerequisite.status, 'missing') as trace_status,
  dependency.dependency_text as trace_detail,
  null::text as document_path,
  dependency.source_path,
  dependency.source_content_sha256,
  10 + dependency.dependency_order as trace_order
from planning_query_store.planning_effective_tasks task
join planning_query_store.planning_task_dependencies dependency
  on dependency.lane_id = task.lane_id
 and dependency.task_id = task.task_id
left join planning_query_store.planning_effective_tasks prerequisite
  on prerequisite.task_id = dependency.dependency_task_id
union all
select
  task.lane_id,
  task.task_id,
  task.priority,
  task.status,
  task.progress_pct,
  'evidence_ref'::text as trace_kind,
  evidence.evidence_ref as trace_ref,
  coalesce(nullif(document.status, ''), '-') as trace_status,
  coalesce(nullif(document.title, ''), evidence.evidence_ref) as trace_detail,
  case
    when evidence.evidence_ref like 'docs/%' then evidence.evidence_ref
    else null::text
  end as document_path,
  evidence.source_path,
  evidence.source_content_sha256,
  30 + evidence.evidence_order as trace_order
from planning_query_store.planning_effective_tasks task
join planning_query_store.planning_task_evidence_refs evidence
  on evidence.lane_id = task.lane_id
 and evidence.task_id = task.task_id
left join planning_query_store.doc_disposition_document_query document
  on document.document_path = evidence.evidence_ref
union all
select
  lane_id,
  task_id,
  priority,
  status,
  progress_pct,
  trace_kind,
  trace_ref,
  trace_status,
  trace_detail,
  document_path,
  document_path as source_path,
  source_content_sha256,
  trace_order
from task_document_links;

create or replace view planning_query_store.planning_task_gap_query as
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
  on upper(task.task_id) = upper(reference.reference_text);
