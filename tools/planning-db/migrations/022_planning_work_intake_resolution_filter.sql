create or replace view planning_query_store.planning_work_intake_query as
select
  (
    case
      when coalesce(task.priority, '') ~* '^P?[0-9]+$'
        then regexp_replace(task.priority, '^P', '', 'i')::int
      else 9
    end * 100
  ) + 5 as rank_score,
  task.priority,
  'next_task'::text as intake_kind,
  task.task_id as item_id,
  task.lane_id,
  task.task_id,
  null::text as document_path,
  task.source_path,
  task.objective as title,
  'Dependency-satisfied queued planning task.'::text as reason,
  'pnpm planning:db:query task-trace --task ' || quote_literal(task.task_id)
    || ' --limit 30' as suggested_query,
  'planning_next_tasks'::text as source_view,
  task.source_content_sha256
from planning_query_store.planning_next_tasks task
union all
select
  (
    case
      when coalesce(gap.severity, '') ~* '^P?[0-9]+$'
        then regexp_replace(gap.severity, '^P', '', 'i')::int
      else 9
    end * 100
  ) + 10 as rank_score,
  gap.severity as priority,
  'task_gap'::text as intake_kind,
  'task_gap:' || gap.gap_kind || ':' || coalesce(gap.task_id, gap.document_path, gap.source_path) as item_id,
  gap.lane_id,
  gap.task_id,
  gap.document_path,
  gap.source_path,
  gap.gap_kind as title,
  gap.reason,
  case
    when gap.task_id is not null
      then 'pnpm planning:db:query task-trace --task ' || quote_literal(gap.task_id)
        || ' --limit 30'
    when gap.document_path is not null
      then 'pnpm planning:db:query task-gaps --path ' || quote_literal(gap.document_path)
        || ' --limit 30'
    else 'pnpm planning:db:query task-gaps --kind ' || quote_literal(gap.gap_kind)
      || ' --limit 30'
  end as suggested_query,
  'planning_task_gap_query'::text as source_view,
  gap.source_content_sha256
from planning_query_store.planning_task_gap_query gap
where gap.resolution_status = 'pending'
union all
select
  (
    case
      when coalesce(action.priority, '') ~* '^P?[0-9]+$'
        then regexp_replace(action.priority, '^P', '', 'i')::int
      else 9
    end * 100
  ) + 20 as rank_score,
  action.priority,
  'docs_disposition'::text as intake_kind,
  action.action_id as item_id,
  null::text as lane_id,
  null::text as task_id,
  action.document_path,
  action.document_path as source_path,
  action.action_kind as title,
  action.reason,
  'pnpm planning:db:query docs-disposition --kind ' || quote_literal(action.action_kind)
    || ' --path ' || quote_literal(action.document_path) || ' --limit 30' as suggested_query,
  'doc_disposition_action_query'::text as source_view,
  action.source_content_sha256
from planning_query_store.doc_disposition_action_query action
where action.resolution_status = 'pending'
union all
select
  (
    case
      when coalesce(remediation.priority, '') ~* '^P?[0-9]+$'
        then regexp_replace(remediation.priority, '^P', '', 'i')::int
      else 9
    end * 100
  ) + 30 as rank_score,
  remediation.priority,
  'governance_remediation'::text as intake_kind,
  remediation.task_id as item_id,
  null::text as lane_id,
  remediation.task_id,
  null::text as document_path,
  remediation.source_path,
  coalesce(remediation.component_unit, remediation.task_type, remediation.task_id) as title,
  remediation.reason,
  'pnpm planning:db:query remediation --kind ' || quote_literal(remediation.task_type)
    || ' --limit 30' as suggested_query,
  'governance_remediation_query'::text as source_view,
  remediation.source_content_sha256
from planning_query_store.governance_remediation_query remediation
union all
select
  0 as rank_score,
  'P0'::text as priority,
  'pr_readiness'::text as intake_kind,
  readiness.readiness_id as item_id,
  null::text as lane_id,
  null::text as task_id,
  null::text as document_path,
  readiness.source_path,
  readiness.effective_arc_level as title,
  'PR readiness blocker: '
    || coalesce(nullif(readiness.missing_requirements::text, '[]'), 'inspect required checks') as reason,
  'pnpm planning:db:query pr-readiness --limit 20' as suggested_query,
  'pr_readiness_query'::text as source_view,
  readiness.source_content_sha256
from planning_query_store.pr_readiness_query readiness
where readiness.blocking = true;
