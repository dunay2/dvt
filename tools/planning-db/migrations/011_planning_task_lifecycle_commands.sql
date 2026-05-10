alter table planning_query_store.planning_local_operations
  drop constraint if exists planning_local_operations_operation_type_check;

alter table planning_query_store.planning_local_operations
  add constraint planning_local_operations_operation_type_check
  check (
    operation_type in (
      'task_claim',
      'task_release',
      'task_update',
      'task_create',
      'task_delete'
    )
  );

create table if not exists planning_query_store.planning_task_local_definitions (
  lane_id text not null,
  task_id text not null,
  source_path text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  parent_task_id text,
  priority text,
  status text not null check (status in ('queued', 'in_progress', 'blocked', 'review', 'done')),
  objective text not null default '',
  dependency text,
  target text,
  complexity text,
  effort_points numeric(8, 2) check (effort_points is null or effort_points >= 0),
  progress_pct numeric(5, 2) check (
    progress_pct is null
    or (progress_pct >= 0 and progress_pct <= 100)
  ),
  evidence_refs jsonb not null default '[]'::jsonb,
  status_reason text,
  last_verified date,
  created_by text not null,
  created_at timestamptz not null default now(),
  raw_task jsonb not null,
  primary key (lane_id, task_id)
);

create table if not exists planning_query_store.planning_task_local_tombstones (
  lane_id text not null,
  task_id text not null,
  source_path text not null,
  base_source_content_sha256 text not null check (base_source_content_sha256 ~ '^[a-f0-9]{64}$'),
  deleted_by text not null,
  deleted_at timestamptz not null default now(),
  status_reason text,
  primary key (lane_id, task_id)
);

create index if not exists planning_task_local_definitions_status_idx
  on planning_query_store.planning_task_local_definitions (status, lane_id, task_id);

create index if not exists planning_task_local_tombstones_source_idx
  on planning_query_store.planning_task_local_tombstones (
    lane_id,
    task_id,
    base_source_content_sha256
  );

create or replace view planning_query_store.planning_effective_tasks as
with imported_task_rows as (
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
   and local.base_source_content_sha256 = task.source_content_sha256
  where not exists (
    select 1
    from planning_query_store.planning_task_local_tombstones tombstone
    where tombstone.lane_id = task.lane_id
      and tombstone.task_id = task.task_id
      and tombstone.base_source_content_sha256 = task.source_content_sha256
  )
),
local_definition_rows as (
  select
    local_definition.lane_id,
    local_definition.task_id,
    local_definition.parent_task_id,
    local_definition.priority,
    coalesce(local.status, local_definition.status) as status,
    local_definition.status as base_status,
    local_definition.objective,
    local_definition.dependency,
    local_definition.target,
    local_definition.complexity,
    local_definition.effort_points,
    coalesce(local.progress_pct, local_definition.progress_pct) as progress_pct,
    coalesce(local.evidence_refs, local_definition.evidence_refs) as evidence_refs,
    case
      when local.task_id is null then local_definition.status_reason
      else local.status_reason
    end as status_reason,
    local_definition.last_verified,
    local_definition.source_path,
    local_definition.source_content_sha256,
    coalesce(local.base_source_content_sha256, local_definition.source_content_sha256) as base_source_content_sha256,
    coalesce(local.revision, 0) as revision,
    local.claimed_by,
    local.claim_token,
    local.claim_expires_at,
    local.updated_at as local_updated_at,
    local_definition.raw_task
  from planning_query_store.planning_task_local_definitions local_definition
  left join planning_query_store.planning_tasks imported_task
    on imported_task.lane_id = local_definition.lane_id
   and imported_task.task_id = local_definition.task_id
  left join planning_query_store.planning_task_local_state local
    on local.lane_id = local_definition.lane_id
   and local.task_id = local_definition.task_id
   and local.base_source_content_sha256 = local_definition.source_content_sha256
  where imported_task.task_id is null
    and not exists (
      select 1
      from planning_query_store.planning_task_local_tombstones tombstone
      where tombstone.lane_id = local_definition.lane_id
        and tombstone.task_id = local_definition.task_id
        and tombstone.base_source_content_sha256 = local_definition.source_content_sha256
    )
)
select *
from imported_task_rows
union all
select *
from local_definition_rows;
