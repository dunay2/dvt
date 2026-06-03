create or replace view architecture.design_query as
select
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at,
  supersedes_id,
  created_at,
  updated_at
from architecture.design;

create or replace view architecture.design_scope_query as
select
  scope.design_id,
  design.work_item_id,
  design.title as design_title,
  design.status as design_status,
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  scope.required,
  scope.created_at
from architecture.design_scope scope
join architecture.design design
  on design.design_id = scope.design_id;

create or replace view architecture.component_query as
select
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id,
  created_at,
  updated_at
from architecture.component;

create or replace view architecture.component_relation_query as
select
  relation.relation_id,
  relation.source_component_id,
  source.name as source_component_name,
  relation.target_component_id,
  target.name as target_component_name,
  relation.relation_type,
  relation.direction,
  relation.sync_async,
  relation.contract_id,
  contract.contract_ref,
  relation.failure_mode,
  relation.authorization_scope,
  relation.source_refs,
  relation.status,
  relation.created_at,
  relation.updated_at
from architecture.component_relation relation
join architecture.component source
  on source.component_id = relation.source_component_id
join architecture.component target
  on target.component_id = relation.target_component_id
left join architecture.contract contract
  on contract.contract_id = relation.contract_id;

create or replace view architecture.component_responsibility_query as
select
  responsibility.responsibility_id,
  responsibility.component_id,
  component.name as component_name,
  responsibility.responsibility,
  responsibility.reason_to_change,
  responsibility.ddd_owner,
  responsibility.status,
  responsibility.created_at
from architecture.component_responsibility responsibility
join architecture.component component
  on component.component_id = responsibility.component_id;

create or replace view architecture.component_io_query as
select
  port.component_id,
  port.port_id as io_id,
  'port'::text as io_kind,
  port.port_name as io_name,
  port.direction,
  coalesce(port.input_contract_id, port.output_contract_id) as contract_id,
  'none'::text as runtime,
  jsonb_build_object(
    'portKind', port.port_kind,
    'inputContractId', port.input_contract_id,
    'outputContractId', port.output_contract_id,
    'negativeTests', to_jsonb(port.negative_tests),
    'status', port.status
  ) as metadata
from architecture.component_port port
union all
select
  event_io.component_id,
  event_io.event_io_id as io_id,
  'event'::text as io_kind,
  event_io.event_name as io_name,
  event_io.direction,
  event_io.contract_id,
  event_io.runtime,
  jsonb_build_object('status', 'declared') as metadata
from architecture.component_event_io event_io
union all
select
  storage_io.component_id,
  storage_io.storage_io_id as io_id,
  'storage'::text as io_kind,
  storage_io.storage_object as io_name,
  storage_io.direction,
  storage_io.contract_id,
  'none'::text as runtime,
  jsonb_build_object('accessPattern', storage_io.access_pattern) as metadata
from architecture.component_storage_io storage_io;

create or replace view architecture.component_flow_query as
select
  flow.flow_id,
  flow.name,
  flow.entry_component_id,
  entry_component.name as entry_component_name,
  flow.exit_component_id,
  exit_component.name as exit_component_name,
  flow.flow_kind,
  flow.status,
  flow.criticality,
  count(step.step_order)::int as step_count,
  flow.created_at,
  flow.updated_at
from architecture.component_flow flow
join architecture.component entry_component
  on entry_component.component_id = flow.entry_component_id
join architecture.component exit_component
  on exit_component.component_id = flow.exit_component_id
left join architecture.component_flow_step step
  on step.flow_id = flow.flow_id
group by
  flow.flow_id,
  entry_component.name,
  exit_component.name;

create or replace view architecture.component_flow_step_query as
select
  step.flow_id,
  step.step_order,
  step.component_id,
  component.name as component_name,
  step.relation_id,
  relation.relation_type,
  step.input_contract_id,
  input_contract.contract_ref as input_contract_ref,
  step.output_contract_id,
  output_contract.contract_ref as output_contract_ref,
  step.transformation_id,
  transformation.transformation_kind,
  step.created_at
from architecture.component_flow_step step
join architecture.component component
  on component.component_id = step.component_id
left join architecture.component_relation relation
  on relation.relation_id = step.relation_id
left join architecture.contract input_contract
  on input_contract.contract_id = step.input_contract_id
left join architecture.contract output_contract
  on output_contract.contract_id = step.output_contract_id
left join architecture.component_transformation transformation
  on transformation.transformation_id = step.transformation_id;

create or replace view architecture.component_contract_query as
select
  contract.contract_id,
  contract.contract_kind,
  contract.owner_component_id as component_id,
  component.name as component_name,
  contract.contract_ref,
  contract.compatibility,
  contract.status,
  contract.validation_command,
  contract.created_at,
  contract.updated_at
from architecture.contract contract
join architecture.component component
  on component.component_id = contract.owner_component_id;

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
  array_remove(array[
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
  ]::text[], null) as missing_reasons
from architecture.component component
join component_signals signals
  on signals.component_id = component.component_id
left join metric_rollup
  on metric_rollup.component_id = component.component_id;

create or replace view architecture.component_drift_query as
select
  'component'::text as subject_kind,
  component.component_id as subject_id,
  'component_status_drift'::text as drift_code,
  'error'::text as severity,
  jsonb_build_object('status', component.status) as metadata
from architecture.component component
where component.status = 'drift'
union all
select
  'relation'::text as subject_kind,
  relation.relation_id as subject_id,
  'relation_status_drift'::text as drift_code,
  'error'::text as severity,
  jsonb_build_object(
    'sourceComponentId', relation.source_component_id,
    'targetComponentId', relation.target_component_id,
    'status', relation.status
  ) as metadata
from architecture.component_relation relation
where relation.status = 'drift'
union all
select
  'contract'::text as subject_kind,
  contract.contract_id as subject_id,
  'contract_deprecated'::text as drift_code,
  'warning'::text as severity,
  jsonb_build_object('status', contract.status) as metadata
from architecture.contract contract
where contract.status = 'deprecated'
union all
select
  health_check.subject_kind,
  health_check.subject_id,
  'health_check_failed'::text as drift_code,
  health_check.severity,
  jsonb_build_object(
    'checkId', health_check.check_id,
    'checkKind', health_check.check_kind,
    'status', health_check.status,
    'predicate', health_check.predicate
  ) as metadata
from architecture.component_health_check health_check
where health_check.status = 'fail';

create or replace view architecture.implementation_authorization_query as
select
  scope.design_id,
  design.work_item_id,
  design.title as design_title,
  design.status as authorization_state,
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  scope.required,
  design.approved_at
from architecture.design_scope scope
join architecture.design design
  on design.design_id = scope.design_id
where design.status in ('approved', 'implementing', 'implemented');

create or replace view architecture.implementation_violation_query as
select
  health_check.check_id as violation_id,
  null::text as design_id,
  health_check.subject_kind,
  health_check.subject_id,
  'health_check_failed'::text as violation_kind,
  health_check.severity,
  jsonb_build_object(
    'checkKind', health_check.check_kind,
    'predicate', health_check.predicate,
    'queryRef', health_check.query_ref,
    'status', health_check.status
  ) as evidence
from architecture.component_health_check health_check
where health_check.status in ('fail', 'not_indexed')
  and health_check.severity in ('error', 'blocker')
union all
select
  scope.design_id || ':' || scope.subject_kind || ':' || scope.subject_id as violation_id,
  scope.design_id,
  scope.subject_kind,
  scope.subject_id,
  'required_evidence_missing'::text as violation_kind,
  'blocker'::text as severity,
  jsonb_build_object(
    'scopeKind', scope.scope_kind,
    'required', scope.required,
    'designStatus', design.status
  ) as evidence
from architecture.design_scope scope
join architecture.design design
  on design.design_id = scope.design_id
where scope.required
  and scope.scope_kind = 'must_prove'
  and design.status in ('approved', 'implementing', 'implemented')
  and not exists (
    select 1
    from architecture.evidence evidence
    where evidence.subject_kind = scope.subject_kind
      and evidence.subject_id = scope.subject_id
      and evidence.result_state = 'pass'
  );

create or replace view architecture.evidence_query as
select
  evidence.evidence_id,
  evidence.subject_kind,
  evidence.subject_id,
  evidence.evidence_kind,
  evidence.source_ref,
  evidence.result_state,
  evidence.recorded_at,
  evidence.source_content_sha256,
  case
    when evidence.result_state = 'stale' then 'stale'
    when evidence.recorded_at < now() - interval '30 days' then 'stale'
    else 'fresh'
  end as freshness_state
from architecture.evidence evidence;
