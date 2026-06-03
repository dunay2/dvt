create or replace view planning_query_store.planning_effective_tasks as
select
  task.lane_id,
  task.task_id,
  task.parent_task_id,
  task.priority,
  coalesce(local.status, task.status) as status,
  task.status as base_status,
  task.objective,
  task.dependency,
  task.target,
  task.complexity,
  task.effort_points,
  coalesce(local.progress_pct, task.progress_pct) as progress_pct,
  coalesce(local.evidence_refs, task.evidence_refs) as evidence_refs,
  case
    when local.task_id is null then task.status_reason
    else local.status_reason
  end as status_reason,
  task.last_verified,
  task.source_path,
  task.source_content_sha256,
  coalesce(local.base_source_content_sha256, task.source_content_sha256) as base_source_content_sha256,
  coalesce(local.revision, 0) as revision,
  local.claimed_by,
  local.claim_token,
  local.claim_expires_at,
  local.updated_at as local_updated_at,
  task.raw_task
from planning_query_store.planning_tasks task
left join planning_query_store.planning_task_local_state local
  on local.lane_id = task.lane_id
 and local.task_id = task.task_id
 and local.base_source_content_sha256 = task.source_content_sha256;
