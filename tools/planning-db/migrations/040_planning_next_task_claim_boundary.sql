create or replace view planning_query_store.planning_next_tasks as
with missing_dependencies as (
  select
    dependency.lane_id,
    dependency.task_id
  from planning_query_store.planning_task_dependencies dependency
  left join planning_query_store.planning_effective_tasks prerequisite
    on prerequisite.task_id = dependency.dependency_task_id
   and lower(prerequisite.status) = 'done'
  where dependency.dependency_task_id is not null
    and lower(dependency.dependency_task_id) <> 'none'
    and prerequisite.task_id is null
)
select candidate.*
from planning_query_store.planning_open_tasks candidate
where lower(candidate.status) = 'queued'
  and candidate.claimed_by is null
  and candidate.claim_expires_at is null
  and not exists (
    select 1
    from missing_dependencies missing
    where missing.lane_id = candidate.lane_id
      and missing.task_id = candidate.task_id
  );

create or replace view planning_query_store.planning_claim_recovery_tasks as
select
  task.*,
  case
    when lower(task.status) = 'in_progress'
      and task.claimed_by is null
      then 'in_progress_claim_missing'
    when lower(task.status) = 'in_progress'
      and task.claim_expires_at is not null
      and task.claim_expires_at <= now()
      then 'in_progress_claim_expired'
    when lower(task.status) = 'queued'
      and task.claim_expires_at is not null
      and task.claim_expires_at <= now()
      then 'queued_claim_expired'
    when lower(task.status) = 'queued'
      and task.claimed_by is not null
      and task.claim_expires_at is null
      then 'queued_claim_without_expiry'
    else 'claim_recovery_required'
  end as recovery_reason
from planning_query_store.planning_open_tasks task
where (
    lower(task.status) = 'in_progress'
    and (
      task.claimed_by is null
      or task.claim_expires_at is null
      or task.claim_expires_at <= now()
    )
  )
  or (
    lower(task.status) = 'queued'
    and (
      task.claimed_by is not null
      or task.claim_expires_at is not null
    )
  );

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
  'Dependency-satisfied queued planning task with no active or stale claim.'::text as reason,
  'pnpm planning:db:query task-trace --task ' || quote_literal(task.task_id)
    || ' --limit 30' as suggested_query,
  'planning_next_tasks'::text as source_view,
  task.source_content_sha256
from planning_query_store.planning_next_tasks task
union all
select
  (
    case
      when coalesce(task.priority, '') ~* '^P?[0-9]+$'
        then regexp_replace(task.priority, '^P', '', 'i')::int
      else 9
    end * 100
  ) + 8 as rank_score,
  task.priority,
  'claim_recovery'::text as intake_kind,
  task.task_id as item_id,
  task.lane_id,
  task.task_id,
  null::text as document_path,
  task.source_path,
  task.objective as title,
  'Planning task requires claim recovery: ' || task.recovery_reason as reason,
  'pnpm planning:db:operate task show --lane ' || quote_literal(task.lane_id)
    || ' --task ' || quote_literal(task.task_id) as suggested_query,
  'planning_claim_recovery_tasks'::text as source_view,
  task.source_content_sha256
from planning_query_store.planning_claim_recovery_tasks task
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
      when coalesce(debt.priority, '') ~* '^P?[0-9]+$'
        then regexp_replace(debt.priority, '^P', '', 'i')::int
      else 9
    end * 100
  ) + 25 as rank_score,
  debt.priority,
  'risk_debt'::text as intake_kind,
  debt.risk_id as item_id,
  null::text as lane_id,
  debt.risk_id as task_id,
  debt.source_path as document_path,
  debt.source_path,
  debt.title,
  'Open risk-register debt: severity=' || debt.severity || ', probability=' || debt.probability
    as reason,
  'pnpm planning:db:query debt --path ' || quote_literal(debt.source_path)
    || ' --limit 30' as suggested_query,
  'risk_debt_query'::text as source_view,
  debt.source_content_sha256
from planning_query_store.risk_debt_query debt
where debt.is_open = true
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
