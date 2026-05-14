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
      and task.claimed_by is not null
      and task.claim_expires_at is not null
      and task.claim_expires_at <= now()
      then 'queued_claim_expired'
    when lower(task.status) = 'queued'
      and task.claimed_by is not null
      and task.claim_expires_at is null
      then 'queued_claim_without_expiry'
    when lower(task.status) = 'queued'
      and task.claimed_by is null
      and task.claim_expires_at is not null
      then 'queued_claim_owner_missing'
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
      (
        task.claimed_by is not null
        and (
          task.claim_expires_at is null
          or task.claim_expires_at <= now()
        )
      )
      or (
        task.claimed_by is null
        and task.claim_expires_at is not null
      )
    )
  );
