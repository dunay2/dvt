create or replace view planning_query_store.planning_next_tasks as
with candidate_dependency_tokens as (
  select
    candidate.lane_id,
    candidate.task_id,
    nullif(substring(btrim(entry.dependency_entry) from '^[^[:space:]]+'), '') as dependency_task_id
  from planning_query_store.planning_open_tasks candidate
  cross join lateral regexp_split_to_table(
    coalesce(candidate.dependency, ''),
    ',|\mand\M'
  ) as entry(dependency_entry)
  where lower(candidate.status) = 'queued'
    and btrim(coalesce(candidate.dependency, '')) <> ''
    and lower(btrim(coalesce(candidate.dependency, ''))) <> 'none'
),
candidate_dependencies as (
  select distinct
    lane_id,
    task_id,
    dependency_task_id
  from candidate_dependency_tokens
  where dependency_task_id is not null
),
missing_dependencies as (
  select
    dependency.lane_id,
    dependency.task_id
  from candidate_dependencies dependency
  left join planning_query_store.planning_effective_tasks prerequisite
    on prerequisite.task_id = dependency.dependency_task_id
   and lower(prerequisite.status) = 'done'
  where prerequisite.task_id is null
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
