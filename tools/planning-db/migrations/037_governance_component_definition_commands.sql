create table if not exists planning_query_store.governance_component_local_definitions (
  component_id text primary key,
  source_path text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  revision integer not null default 0 check (revision >= 0),
  name text not null,
  level text not null check (level = 'component'),
  parent_id text not null,
  root_unit text not null,
  domain_unit text not null,
  status text not null check (
    status in ('canonical', 'review', 'drift', 'legacy', 'coverage-required', 'superseded')
  ),
  children_required boolean not null default false,
  owns jsonb not null default '[]'::jsonb,
  excludes jsonb not null default '[]'::jsonb,
  owned_concern text not null,
  responsibilities jsonb not null default '[]'::jsonb,
  non_goals jsonb not null default '[]'::jsonb,
  reasons_to_change jsonb not null default '[]'::jsonb,
  ddd_owner text not null,
  cq_rails text not null,
  public_api jsonb not null default '[]'::jsonb,
  invariants jsonb not null default '[]'::jsonb,
  transitions jsonb not null default '[]'::jsonb,
  consumers jsonb not null default '[]'::jsonb,
  governance_refs jsonb not null default '[]'::jsonb,
  fowler_signals jsonb not null default '[]'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  raw_unit jsonb not null,
  check (jsonb_typeof(owns) = 'array'),
  check (jsonb_typeof(excludes) = 'array'),
  check (jsonb_typeof(public_api) = 'array'),
  check (jsonb_typeof(invariants) = 'array'),
  check (jsonb_typeof(transitions) = 'array'),
  check (jsonb_typeof(consumers) = 'array'),
  check (btrim(cq_rails) !~* '^none$'),
  check (btrim(cq_rails) !~* '^none[[:space:]]*$'),
  check (
    btrim(cq_rails) !~* '^none($|[[:space:]]|[-:])'
    or btrim(cq_rails) ~* '^none[[:space:]]*[-:][[:space:]]*[^[:space:]]+'
  ),
  check (jsonb_array_length(owns) > 0 or children_required = true),
  check (jsonb_array_length(excludes) = 0 or jsonb_array_length(owns) > 0),
  check (
    status <> 'canonical'
    or (
      jsonb_array_length(public_api) > 0
      and jsonb_array_length(invariants) > 0
      and jsonb_array_length(transitions) > 0
      and jsonb_array_length(consumers) > 0
    )
  )
);

create table if not exists planning_query_store.governance_component_local_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null check (operation_type in ('component_create')),
  actor text not null,
  component_id text not null,
  source_path text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  expected_revision integer check (expected_revision is null or expected_revision >= 0),
  previous_revision integer not null check (previous_revision >= 0),
  resulting_revision integer not null check (resulting_revision >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists governance_component_local_definitions_parent_idx
  on planning_query_store.governance_component_local_definitions(parent_id, component_id);

create index if not exists governance_component_local_operations_component_idx
  on planning_query_store.governance_component_local_operations(component_id, created_at);

create or replace view planning_query_store.governance_component_definition_query as
with imported_components as (
  select
    component.component_id,
    'imported'::text as definition_source,
    component.source_path,
    component.source_content_sha256,
    0::integer as revision,
    component.name,
    component.level,
    component.parent_id,
    component.root_unit,
    component.domain_unit,
    component.status,
    component.children_required,
    component.file_count,
    component.owns,
    component.excludes,
    nullif(component.raw_component->>'ownedConcern', '') as owned_concern,
    coalesce(component.raw_component->'responsibilities', '[]'::jsonb) as responsibilities,
    coalesce(component.raw_component->'nonGoals', '[]'::jsonb) as non_goals,
    coalesce(component.raw_component->'reasonsToChange', '[]'::jsonb) as reasons_to_change,
    component.ddd_owner,
    component.cq_rails,
    coalesce(component.raw_component->'publicApi', '[]'::jsonb) as public_api,
    coalesce(component.raw_component->'invariants', '[]'::jsonb) as invariants,
    coalesce(component.raw_component->'transitions', '[]'::jsonb) as transitions,
    coalesce(component.raw_component->'consumers', '[]'::jsonb) as consumers,
    component.governance_refs,
    component.fowler_signals,
    null::text as created_by,
    null::timestamptz as created_at,
    coalesce(
      (
        select unit_ref.value
        from jsonb_array_elements(coalesce(component.raw_component->'unitReferences', '[]'::jsonb))
          as unit_ref(value)
        where unit_ref.value->>'id' = component.component_id
        limit 1
      ),
      component.raw_component
    ) as raw_unit
  from planning_query_store.governance_components component
),
local_components as (
  select
    local_definition.component_id,
    'local_command'::text as definition_source,
    local_definition.source_path,
    local_definition.source_content_sha256,
    local_definition.revision,
    local_definition.name,
    local_definition.level,
    local_definition.parent_id,
    local_definition.root_unit,
    local_definition.domain_unit,
    local_definition.status,
    local_definition.children_required,
    0::integer as file_count,
    local_definition.owns,
    local_definition.excludes,
    local_definition.owned_concern,
    local_definition.responsibilities,
    local_definition.non_goals,
    local_definition.reasons_to_change,
    local_definition.ddd_owner,
    local_definition.cq_rails,
    local_definition.public_api,
    local_definition.invariants,
    local_definition.transitions,
    local_definition.consumers,
    local_definition.governance_refs,
    local_definition.fowler_signals,
    local_definition.created_by,
    local_definition.created_at,
    local_definition.raw_unit
  from planning_query_store.governance_component_local_definitions local_definition
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_definition.component_id
  )
)
select *
from imported_components
union all
select *
from local_components;

create or replace view planning_query_store.governance_unit_query as
with recursive base_component_unit_refs as (
  select
    component.component_id as descendant_component_id,
    component.file_count as descendant_file_count,
    component.root_unit,
    component.domain_unit,
    component.source_path,
    component.source_content_sha256,
    ref.value as raw_unit,
    ref.value->>'id' as unit_id,
    ref.value->>'name' as name,
    ref.value->>'level' as level,
    ref.value->>'status' as status,
    unit_position.unit_order,
    parent_unit.parent_id
  from planning_query_store.governance_components component
  cross join lateral jsonb_array_elements(
    coalesce(component.raw_component->'unitReferences', '[]'::jsonb)
  ) as ref(value)
  left join lateral (
    select unit_path.ordinality::int as unit_order
    from jsonb_array_elements_text(component.unit_path) with ordinality
      as unit_path(value, ordinality)
    where unit_path.value = ref.value->>'id'
    order by unit_path.ordinality
    limit 1
  ) unit_position on true
  left join lateral (
    select unit_path.value as parent_id
    from jsonb_array_elements_text(component.unit_path) with ordinality
      as unit_path(value, ordinality)
    where unit_position.unit_order is not null
      and unit_path.ordinality = unit_position.unit_order - 1
    limit 1
  ) parent_unit on true
  where ref.value ? 'id'
),
base_unit_rollup as (
  select
    unit_id,
    (array_agg(distinct name order by name))[1] as name,
    (array_agg(distinct level order by level))[1] as level,
    (array_agg(distinct parent_id order by parent_id) filter (where parent_id is not null))[1]
      as parent_id,
    (array_agg(distinct root_unit order by root_unit))[1] as root_unit,
    (array_agg(distinct domain_unit order by domain_unit))[1] as domain_unit,
    (array_agg(distinct status order by status))[1] as status,
    coalesce(jsonb_agg(distinct raw_unit), '[]'::jsonb) as raw_units
  from base_component_unit_refs
  group by unit_id
),
local_units as (
  select
    local_definition.component_id as unit_id,
    local_definition.name,
    local_definition.level,
    local_definition.parent_id,
    local_definition.root_unit,
    local_definition.domain_unit,
    local_definition.status,
    local_definition.source_path,
    local_definition.source_content_sha256,
    local_definition.raw_unit
  from planning_query_store.governance_component_local_definitions local_definition
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_definition.component_id
  )
),
parent_lookup as (
  select
    unit_id,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    raw_units->0 as raw_unit
  from base_unit_rollup
  union all
  select
    unit_id,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    raw_unit
  from local_units
),
local_component_unit_refs(
  descendant_component_id,
  descendant_file_count,
  root_unit,
  domain_unit,
  source_path,
  source_content_sha256,
  raw_unit,
  unit_id,
  name,
  level,
  status,
  unit_order,
  parent_id,
  visited
) as (
  select
    local_unit.unit_id as descendant_component_id,
    0::integer as descendant_file_count,
    local_unit.root_unit,
    local_unit.domain_unit,
    local_unit.source_path,
    local_unit.source_content_sha256,
    local_unit.raw_unit,
    local_unit.unit_id,
    local_unit.name,
    local_unit.level,
    local_unit.status,
    1000000::integer as unit_order,
    local_unit.parent_id,
    array[local_unit.unit_id]::text[] as visited
  from local_units local_unit
  union all
  select
    child.descendant_component_id,
    0::integer as descendant_file_count,
    child.root_unit,
    child.domain_unit,
    child.source_path,
    child.source_content_sha256,
    parent.raw_unit,
    parent.unit_id,
    parent.name,
    parent.level,
    parent.status,
    child.unit_order - 1,
    parent.parent_id,
    child.visited || parent.unit_id
  from local_component_unit_refs child
  join parent_lookup parent
    on parent.unit_id = child.parent_id
  where not parent.unit_id = any(child.visited)
),
component_unit_refs as (
  select
    descendant_component_id,
    descendant_file_count,
    root_unit,
    domain_unit,
    source_path,
    source_content_sha256,
    raw_unit,
    unit_id,
    name,
    level,
    status,
    unit_order,
    parent_id
  from base_component_unit_refs
  union all
  select
    descendant_component_id,
    descendant_file_count,
    root_unit,
    domain_unit,
    source_path,
    source_content_sha256,
    raw_unit,
    unit_id,
    name,
    level,
    status,
    unit_order,
    parent_id
  from local_component_unit_refs
),
unit_rollup as (
  select
    unit_id,
    (array_agg(distinct name order by name))[1] as name,
    (array_agg(distinct level order by level))[1] as level,
    (array_agg(distinct parent_id order by parent_id) filter (where parent_id is not null))[1]
      as parent_id,
    (array_agg(distinct root_unit order by root_unit))[1] as root_unit,
    (array_agg(distinct domain_unit order by domain_unit))[1] as domain_unit,
    (array_agg(distinct status order by status))[1] as status,
    count(distinct descendant_component_id)::int as descendant_component_count,
    coalesce(sum(descendant_file_count), 0)::int as descendant_file_count,
    coalesce(jsonb_agg(distinct source_path order by source_path), '[]'::jsonb) as source_paths,
    coalesce(jsonb_agg(distinct source_content_sha256 order by source_content_sha256), '[]'::jsonb)
      as source_content_sha256_values,
    coalesce(jsonb_agg(distinct raw_unit), '[]'::jsonb) as raw_units
  from component_unit_refs
  group by unit_id
),
direct_components as (
  select
    component.component_id,
    component.status,
    component.governance_state,
    component.canonical_role,
    component.evidence_state,
    component.is_drift,
    component.is_legacy,
    component.children_required,
    component.file_count,
    component.ddd_owner,
    component.cq_rails,
    component.source_path,
    component.source_content_sha256
  from planning_query_store.governance_components component
  union all
  select
    local_definition.component_id,
    local_definition.status,
    case
      when local_definition.status = 'canonical' then 'governed'
      else local_definition.status
    end as governance_state,
    case
      when local_definition.status = 'canonical' then 'implementation-owner'
      else 'none'
    end as canonical_role,
    case
      when local_definition.status = 'canonical' then 'classification-only'
      when local_definition.status = 'coverage-required' then 'coverage-required'
      when local_definition.status in ('drift', 'legacy') then 'remediation-required'
      when local_definition.status = 'review' then 'review-required'
      when local_definition.status = 'superseded' then 'retired'
      else 'remediation-required'
    end as evidence_state,
    local_definition.status = 'drift' as is_drift,
    local_definition.status = 'legacy' as is_legacy,
    local_definition.children_required,
    0::integer as file_count,
    local_definition.ddd_owner,
    local_definition.cq_rails,
    local_definition.source_path,
    local_definition.source_content_sha256
  from planning_query_store.governance_component_local_definitions local_definition
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_definition.component_id
  )
)
select
  unit.unit_id,
  unit.name,
  unit.level,
  unit.parent_id,
  unit.root_unit,
  unit.domain_unit,
  coalesce(component.status, unit.status) as status,
  coalesce(component.governance_state, unit.status) as governance_state,
  coalesce(component.canonical_role, 'none') as canonical_role,
  coalesce(
    component.evidence_state,
    case
      when unit.status = 'review' then 'review-required'
      else unit.status
    end
  ) as evidence_state,
  coalesce(component.is_drift, false) as is_drift,
  coalesce(component.is_legacy, false) as is_legacy,
  coalesce(component.children_required, false) as children_required,
  coalesce(component.file_count, 0)::int as direct_file_count,
  unit.descendant_component_count,
  unit.descendant_file_count,
  component.ddd_owner,
  component.cq_rails,
  component.component_id is not null as is_materialized_component,
  component.source_path as direct_source_path,
  component.source_content_sha256 as direct_source_content_sha256,
  unit.source_paths,
  unit.source_content_sha256_values,
  unit.raw_units
from unit_rollup unit
left join direct_components component
  on component.component_id = unit.unit_id;

create schema if not exists component_engineering;

create or replace view component_engineering.component_definition_query as
select *
from planning_query_store.governance_component_definition_query;
