create or replace view planning_query_store.planning_task_dependencies as
select
  task.lane_id,
  task.task_id,
  entry.dependency_order::integer as dependency_order,
  nullif(substring(btrim(entry.dependency_entry) from '^[^[:space:]]+'), '') as dependency_task_id,
  btrim(entry.dependency_entry) as dependency_text,
  task.source_path,
  task.source_content_sha256
from planning_query_store.planning_effective_tasks task
cross join lateral regexp_split_to_table(
  coalesce(task.dependency, ''),
  ',|\mand\M'
) with ordinality as entry(dependency_entry, dependency_order)
where btrim(coalesce(task.dependency, '')) <> ''
  and lower(btrim(coalesce(task.dependency, ''))) <> 'none'
  and btrim(entry.dependency_entry) <> '';

create or replace view planning_query_store.planning_task_evidence_refs as
select
  task.lane_id,
  task.task_id,
  evidence.evidence_order::integer as evidence_order,
  evidence.evidence_ref,
  task.source_path,
  task.source_content_sha256
from planning_query_store.planning_effective_tasks task
cross join lateral jsonb_array_elements_text(
  coalesce(task.evidence_refs, '[]'::jsonb)
) with ordinality as evidence(evidence_ref, evidence_order);

create or replace view planning_query_store.planning_task_status_events as
select
  concat('effective:', task.lane_id, ':', task.task_id, ':', task.revision) as event_id,
  'effective_state'::text as event_kind,
  task.lane_id,
  task.task_id,
  task.status,
  task.progress_pct,
  task.claimed_by as actor,
  coalesce(task.local_updated_at, now()) as occurred_at,
  task.source_path,
  task.source_content_sha256,
  jsonb_build_object(
    'baseStatus', task.base_status,
    'revision', task.revision,
    'statusReason', task.status_reason
  ) as raw_event
from planning_query_store.planning_effective_tasks task
union all
select
  operation.operation_id as event_id,
  operation.operation_type as event_kind,
  operation.lane_id,
  operation.task_id,
  operation.payload ->> 'status' as status,
  nullif(operation.payload ->> 'progressPct', '')::numeric(5, 2) as progress_pct,
  operation.actor,
  operation.created_at as occurred_at,
  operation.source_path,
  operation.base_source_content_sha256 as source_content_sha256,
  operation.payload as raw_event
from planning_query_store.planning_local_operations operation
where operation.operation_type in ('task_create', 'task_update', 'task_delete');

create table if not exists planning_query_store.planning_artifacts (
  artifact_path text primary key,
  artifact_kind text not null,
  source_table text not null,
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  source_content_sha256 text check (
    source_content_sha256 is null
    or source_content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  exported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists planning_task_dependencies_dependency_idx
  on planning_query_store.planning_tasks (task_id);

create index if not exists planning_artifacts_kind_idx
  on planning_query_store.planning_artifacts (artifact_kind, artifact_path);

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
  and not exists (
    select 1
    from missing_dependencies missing
    where missing.lane_id = candidate.lane_id
      and missing.task_id = candidate.task_id
  );
