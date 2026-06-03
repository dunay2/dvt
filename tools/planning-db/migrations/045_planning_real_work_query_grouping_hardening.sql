create or replace view planning_query_store.planning_real_work_query as
with task_dependency_rollup as (
  select
    task.lane_id,
    task.task_id,
    count(dependency.dependency_task_id) filter (
      where dependency.dependency_task_id is not null
        and lower(dependency.dependency_task_id) <> 'none'
    )::int as dependency_count,
    count(dependency.dependency_task_id) filter (
      where dependency.dependency_task_id is not null
        and lower(dependency.dependency_task_id) <> 'none'
        and prerequisite.task_id is null
    )::int as missing_dependency_count,
    coalesce(
      jsonb_agg(dependency.dependency_task_id order by dependency.dependency_task_id) filter (
        where dependency.dependency_task_id is not null
          and lower(dependency.dependency_task_id) <> 'none'
          and prerequisite.task_id is null
      ),
      '[]'::jsonb
    ) as missing_dependencies
  from planning_query_store.planning_open_tasks task
  left join planning_query_store.planning_task_dependencies dependency
    on dependency.lane_id = task.lane_id
   and dependency.task_id = task.task_id
  left join planning_query_store.planning_effective_tasks prerequisite
    on prerequisite.task_id = dependency.dependency_task_id
   and lower(prerequisite.status) = 'done'
  group by task.lane_id, task.task_id
),
task_rows as (
  select
    (
      case
        when coalesce(task.priority, '') ~* '^P?[0-9]+$'
          then regexp_replace(task.priority, '^P', '', 'i')::int
        else 9
      end * 100
    ) + case
      when recovery.task_id is not null then 0
      when next_task.task_id is not null then 5
      when coalesce(dependency.missing_dependency_count, 0) > 0 then 50
      else 40
    end as rank_score,
    task.priority,
    'planning_task'::text as work_kind,
    task.task_id as work_id,
    task.lane_id,
    task.task_id,
    null::text as document_path,
    task.source_path,
    task.objective as title,
    case
      when recovery.task_id is not null then 'claim_recovery'
      when next_task.task_id is not null then 'actionable_now'
      when coalesce(dependency.missing_dependency_count, 0) > 0 then 'blocked_by_dependency'
      else 'open_not_actionable'
    end as work_status,
    1::int as open_item_count,
    1::int as linked_task_count,
    coalesce(dependency.dependency_count, 0)::int as dependency_count,
    coalesce(dependency.missing_dependency_count, 0)::int as missing_dependency_count,
    coalesce(dependency.missing_dependencies, '[]'::jsonb) as missing_dependencies,
    case
      when recovery.task_id is not null
        then 'Planning task requires claim recovery before prioritization.'
      when next_task.task_id is not null
        then 'Planning task is dependency-satisfied and actionable now.'
      when coalesce(dependency.missing_dependency_count, 0) > 0
        then 'Planning task is open but blocked by unfinished dependencies.'
      else 'Planning task is open but not selected by the actionable-next route.'
    end as reason,
    'pnpm planning:db:query task-trace --task ' || quote_literal(task.task_id)
      || ' --limit 30' as suggested_query,
    'planning_open_tasks'::text as source_view,
    task.source_content_sha256
  from planning_query_store.planning_open_tasks task
  left join planning_query_store.planning_next_tasks next_task
    on next_task.lane_id = task.lane_id
   and next_task.task_id = task.task_id
  left join planning_query_store.planning_claim_recovery_tasks recovery
    on recovery.lane_id = task.lane_id
   and recovery.task_id = task.task_id
  left join task_dependency_rollup dependency
    on dependency.lane_id = task.lane_id
   and dependency.task_id = task.task_id
),
intake_ranked as (
  select
    intake.*,
    case
      when coalesce(intake.priority, '') ~* '^P?[0-9]+$'
        then regexp_replace(intake.priority, '^P', '', 'i')::int
      else 9
    end as priority_rank,
    coalesce(intake.source_path, intake.document_path, intake.item_id) as work_source_path,
    case
      when intake.intake_kind in ('docs_disposition', 'task_gap')
        then intake.intake_kind || ':' || coalesce(intake.title, intake.item_id)
          || ':' || coalesce(intake.source_path, intake.document_path, intake.item_id)
      else intake.intake_kind || ':' || coalesce(intake.source_path, intake.document_path, intake.item_id)
    end as work_group_key
  from planning_query_store.planning_work_intake_query intake
  where intake.intake_kind not in ('next_task', 'claim_recovery')
),
intake_rows as (
  select
    min(intake.rank_score)::int as rank_score,
    (array_agg(intake.priority order by intake.priority_rank, intake.priority))[1]::text as priority,
    intake.intake_kind as work_kind,
    intake.work_group_key as work_id,
    case
      when count(distinct intake.lane_id) filter (where intake.lane_id is not null) = 1
        then max(intake.lane_id)
      else null
    end as lane_id,
    case
      when count(distinct intake.task_id) filter (where intake.task_id is not null) = 1
        then max(intake.task_id)
      else null
    end as task_id,
    min(intake.document_path) filter (where intake.document_path is not null) as document_path,
    intake.work_source_path as source_path,
    count(*)::int || ' unresolved ' || replace(intake.intake_kind, '_', ' ')
      || ' item(s): ' || min(intake.title) as title,
    case intake.intake_kind
      when 'task_gap' then 'task_lineage_gap'
      when 'knowledge_action' then 'unlinked_required_action'
      when 'docs_disposition' then 'document_disposition_pending'
      when 'risk_debt' then 'open_risk_debt'
      when 'governance_remediation' then 'governance_remediation'
      when 'pr_readiness' then 'pr_readiness_blocker'
      else 'intake_pending'
    end as work_status,
    count(*)::int as open_item_count,
    count(distinct intake.task_id) filter (where intake.task_id is not null)::int
      as linked_task_count,
    0::int as dependency_count,
    0::int as missing_dependency_count,
    '[]'::jsonb as missing_dependencies,
    count(*)::int || ' pending item(s) from '
      || string_agg(distinct intake.source_view, ', ' order by intake.source_view)
      || '. Sample: ' || min(intake.reason) as reason,
    (array_agg(intake.suggested_query order by intake.rank_score, intake.item_id))[1]
      as suggested_query,
    string_agg(distinct intake.source_view, ', ' order by intake.source_view) as source_view,
    min(intake.source_content_sha256) as source_content_sha256
  from intake_ranked intake
  group by intake.intake_kind, intake.work_source_path, intake.work_group_key
)
select * from task_rows
union all
select * from intake_rows;
