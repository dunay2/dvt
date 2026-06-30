create or replace view architecture.component_maturity_query as
with metric_rollup as (
  select
    metric.component_id,
    coalesce(
      jsonb_object_agg(metric.metric_name, metric.metric_value order by metric.metric_name),
      '{}'::jsonb
    ) as metrics
  from architecture.component_metric metric
  group by metric.component_id
),
component_signals as (
  select
    component.component_id,
    exists (
      select 1
      from architecture.component_responsibility responsibility
      where responsibility.component_id = component.component_id
    ) as has_responsibility,
    exists (
      select 1
      from architecture.component_relation relation
      where relation.source_component_id = component.component_id
        or relation.target_component_id = component.component_id
    ) as has_relation,
    exists (
      select 1
      from architecture.component_test component_test
      where component_test.component_id = component.component_id
        and component_test.required
    ) as has_required_test,
    exists (
      select 1
      from architecture.component_observability observability
      where observability.component_id = component.component_id
        and observability.required
        and observability.status in ('implemented', 'not_applicable')
    ) as has_required_observability
  from architecture.component component
)
select
  component.component_id,
  component.name,
  coalesce(
    component.maturity_score,
    (
      case when component.owner <> '' and component.layer <> '' then 10 else 0 end
      + case when component.kind <> '' and component.repo_path <> '' then 10 else 0 end
      + case when component.public_contract <> '' or component.kind in ('module', 'adapter') then 15 else 0 end
      + case when signals.has_relation then 15 else 0 end
      + case when signals.has_required_test then 15 else 0 end
      + case
          when component.runtime = 'none'
            or component.criticality in ('low', 'medium')
            or signals.has_required_observability
            then 10
          else 0
        end
      + case
          when exists (
            select 1
            from architecture.decision decision
            where decision.applies_to @> jsonb_build_array(
              jsonb_build_object('subjectKind', 'component', 'subjectId', component.component_id)
            )
          )
            then 10
          else 0
        end
      + case
          when exists (
            select 1
            from architecture.risk risk
            where risk.component_id = component.component_id
          )
            then 5
          else 0
        end
      + case when component.status <> 'drift' then 10 else 0 end
    )::numeric
  ) as maturity_score,
  coalesce(metric_rollup.metrics, '{}'::jsonb) as metrics,
  case
    when component.status = 'deprecated' then array[]::text[]
    else array_remove(array[
      case when component.owner = '' or component.layer = '' then 'missing_owner_or_layer' end,
      case when component.kind = '' or component.repo_path = '' then 'missing_kind_or_repo_path' end,
      case
        when component.public_contract = ''
          and component.kind not in ('module', 'adapter')
          then 'missing_public_contract'
      end,
      case when not signals.has_responsibility then 'missing_responsibility' end,
      case when not signals.has_relation then 'missing_relation' end,
      case when not signals.has_required_test then 'missing_required_test' end,
      case
        when component.runtime <> 'none'
          and component.criticality in ('high', 'critical')
          and not signals.has_required_observability
          then 'missing_observability'
      end,
      case when component.status = 'drift' then 'component_in_drift' end
    ]::text[], null)
  end as missing_reasons
from architecture.component component
join component_signals signals
  on signals.component_id = component.component_id
left join metric_rollup
  on metric_rollup.component_id = component.component_id;
