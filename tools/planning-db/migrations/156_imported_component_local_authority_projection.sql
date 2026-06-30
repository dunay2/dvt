-- Keep DB-local component authority effective after governance imports.
-- Imported rows remain visible as source facts, but an explicit
-- governance_component_local_definitions row is the governed correction when a
-- component is already reconciled through planning:db:operate/component rails.

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'planning_query_store.governance_component_local_definitions',
    repeat('b', 64),
    1,
    'Temporal dbt plugin adapter package',
    'component',
    'SYS-ADAPTERS-ROOT',
    'SYS-DVT',
    'SYS-ADAPTERS',
    'review',
    false,
    'Owns the Temporal dbt plugin package, CLI runner, dbt step activity, plugin manifest, process/materializer helpers, package config, and plugin tests.',
    'TemporalDbtPluginAdapter',
    'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
    'codex'
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'planning_query_store.governance_component_local_definitions',
    repeat('c', 64),
    1,
    'Plan-store docs, reviews, risk, and evidence',
    'component',
    'SYS-PLANSTORE',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'PlanStore docs, ADRs, evidence, risk entries, command/query matrix, and status sources that govern runtime PlanStore implementation components.',
    'PlanStoreDocsRiskEvidence',
    'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = greatest(
    planning_query_store.governance_component_local_definitions.revision,
    excluded.revision
  ),
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'owns',
    'packages/@dvt/temporal-dbt-plugin/**',
    0
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'owns',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    0
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'invariant',
    'Temporal dbt plugin files resolve to SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN as the leaf component after every governance import.',
    0
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'invariant',
    'PlanStore docs/risk/evidence is a documentation leaf; runtime implementation files stay owned by specific PlanStore implementation leaves.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

create or replace view planning_query_store.governance_component_definition_query as
with imported_components as (
  select
    component.component_id,
    case
      when local_metadata.component_id is not null then 'local_import_override'
      else 'imported'
    end as definition_source,
    coalesce(local_metadata.source_path, component.source_path) as source_path,
    coalesce(
      local_metadata.source_content_sha256,
      component.source_content_sha256
    ) as source_content_sha256,
    coalesce(local_metadata.revision, 0)::integer as revision,
    coalesce(local_metadata.name, component.name) as name,
    coalesce(local_metadata.level, component.level) as level,
    coalesce(local_metadata.parent_id, component.parent_id) as parent_id,
    coalesce(local_metadata.root_unit, component.root_unit) as root_unit,
    coalesce(local_metadata.domain_unit, component.domain_unit) as domain_unit,
    coalesce(local_metadata.status, component.status) as status,
    coalesce(local_metadata.children_required, component.children_required) as children_required,
    greatest(component.file_count, coalesce(local_metadata.file_count, 0))::integer as file_count,
    coalesce(local_metadata.owns, component.owns) as owns,
    coalesce(local_metadata.excludes, component.excludes) as excludes,
    coalesce(
      local_metadata.owned_concern,
      nullif(component.raw_component->>'ownedConcern', '')
    ) as owned_concern,
    coalesce(
      local_metadata.responsibilities,
      coalesce(component.raw_component->'responsibilities', '[]'::jsonb)
    ) as responsibilities,
    coalesce(
      local_metadata.non_goals,
      coalesce(component.raw_component->'nonGoals', '[]'::jsonb)
    ) as non_goals,
    coalesce(
      local_metadata.reasons_to_change,
      coalesce(component.raw_component->'reasonsToChange', '[]'::jsonb)
    ) as reasons_to_change,
    coalesce(local_metadata.ddd_owner, component.ddd_owner) as ddd_owner,
    coalesce(local_metadata.cq_rails, component.cq_rails) as cq_rails,
    coalesce(
      local_metadata.public_api,
      coalesce(component.raw_component->'publicApi', '[]'::jsonb)
    ) as public_api,
    coalesce(
      local_metadata.invariants,
      coalesce(component.raw_component->'invariants', '[]'::jsonb)
    ) as invariants,
    coalesce(
      local_metadata.transitions,
      coalesce(component.raw_component->'transitions', '[]'::jsonb)
    ) as transitions,
    coalesce(
      local_metadata.consumers,
      coalesce(component.raw_component->'consumers', '[]'::jsonb)
    ) as consumers,
    coalesce(local_metadata.governance_refs, component.governance_refs) as governance_refs,
    coalesce(local_metadata.fowler_signals, component.fowler_signals) as fowler_signals,
    local_metadata.created_by,
    local_metadata.created_at,
    coalesce(
      local_metadata.raw_unit,
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
  left join planning_query_store.governance_component_local_metadata_query local_metadata
    on local_metadata.component_id = component.component_id
),
local_components as (
  select
    local_metadata.component_id,
    'local_command'::text as definition_source,
    local_metadata.source_path,
    local_metadata.source_content_sha256,
    local_metadata.revision,
    local_metadata.name,
    local_metadata.level,
    local_metadata.parent_id,
    local_metadata.root_unit,
    local_metadata.domain_unit,
    local_metadata.status,
    local_metadata.children_required,
    local_metadata.file_count,
    local_metadata.owns,
    local_metadata.excludes,
    local_metadata.owned_concern,
    local_metadata.responsibilities,
    local_metadata.non_goals,
    local_metadata.reasons_to_change,
    local_metadata.ddd_owner,
    local_metadata.cq_rails,
    local_metadata.public_api,
    local_metadata.invariants,
    local_metadata.transitions,
    local_metadata.consumers,
    local_metadata.governance_refs,
    local_metadata.fowler_signals,
    local_metadata.created_by,
    local_metadata.created_at,
    local_metadata.raw_unit
  from planning_query_store.governance_component_local_metadata_query local_metadata
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_metadata.component_id
  )
)
select *
from imported_components
union all
select *
from local_components;

create or replace view component_engineering.component_definition_query as
select *
from planning_query_store.governance_component_definition_query;

create or replace view planning_query_store.governance_unit_query as
with recursive local_metadata as (
  select *
  from planning_query_store.governance_component_local_metadata_query
),
base_component_unit_refs as (
  select
    component.component_id as descendant_component_id,
    component.file_count as descendant_file_count,
    coalesce(local_unit.root_unit, component.root_unit) as root_unit,
    coalesce(local_unit.domain_unit, component.domain_unit) as domain_unit,
    coalesce(local_unit.source_path, component.source_path) as source_path,
    coalesce(
      local_unit.source_content_sha256,
      component.source_content_sha256
    ) as source_content_sha256,
    coalesce(local_unit.raw_unit, ref.value) as raw_unit,
    ref.value->>'id' as unit_id,
    coalesce(local_unit.name, ref.value->>'name') as name,
    coalesce(local_unit.level, ref.value->>'level') as level,
    coalesce(local_unit.status, ref.value->>'status') as status,
    unit_position.unit_order,
    coalesce(local_unit.parent_id, parent_unit.parent_id) as parent_id
  from planning_query_store.governance_components component
  cross join lateral jsonb_array_elements(
    coalesce(component.raw_component->'unitReferences', '[]'::jsonb)
  ) as ref(value)
  left join local_metadata local_unit
    on local_unit.component_id = ref.value->>'id'
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
    local_unit.component_id as unit_id,
    local_unit.name,
    local_unit.level,
    local_unit.parent_id,
    local_unit.root_unit,
    local_unit.domain_unit,
    local_unit.status,
    local_unit.source_path,
    local_unit.source_content_sha256,
    local_unit.raw_unit
  from local_metadata local_unit
  where not exists (
    select 1
    from base_unit_rollup base_unit
    where base_unit.unit_id = local_unit.component_id
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
    coalesce(local_unit.status, component.status) as status,
    coalesce(
      case
        when local_unit.status = 'canonical' then 'governed'
        when local_unit.status is not null then local_unit.status
        else null
      end,
      component.governance_state
    ) as governance_state,
    coalesce(
      case
        when local_unit.status = 'canonical' then 'implementation-owner'
        when local_unit.status is not null then 'none'
        else null
      end,
      component.canonical_role
    ) as canonical_role,
    coalesce(
      case
        when local_unit.status = 'canonical' then 'classification-only'
        when local_unit.status = 'coverage-required' then 'coverage-required'
        when local_unit.status in ('drift', 'legacy') then 'remediation-required'
        when local_unit.status = 'review' then 'review-required'
        when local_unit.status = 'superseded' then 'retired'
        else null
      end,
      component.evidence_state
    ) as evidence_state,
    coalesce(local_unit.status = 'drift', component.is_drift) as is_drift,
    coalesce(local_unit.status = 'legacy', component.is_legacy) as is_legacy,
    coalesce(local_unit.children_required, component.children_required) as children_required,
    component.file_count,
    coalesce(local_unit.ddd_owner, component.ddd_owner) as ddd_owner,
    coalesce(local_unit.cq_rails, component.cq_rails) as cq_rails,
    coalesce(local_unit.source_path, component.source_path) as source_path,
    coalesce(
      local_unit.source_content_sha256,
      component.source_content_sha256
    ) as source_content_sha256
  from planning_query_store.governance_components component
  left join local_metadata local_unit
    on local_unit.component_id = component.component_id
  union all
  select
    local_unit.component_id,
    local_unit.status,
    case
      when local_unit.status = 'canonical' then 'governed'
      else local_unit.status
    end as governance_state,
    case
      when local_unit.status = 'canonical' then 'implementation-owner'
      else 'none'
    end as canonical_role,
    case
      when local_unit.status = 'canonical' then 'classification-only'
      when local_unit.status = 'coverage-required' then 'coverage-required'
      when local_unit.status in ('drift', 'legacy') then 'remediation-required'
      when local_unit.status = 'review' then 'review-required'
      when local_unit.status = 'superseded' then 'retired'
      else 'remediation-required'
    end as evidence_state,
    local_unit.status = 'drift' as is_drift,
    local_unit.status = 'legacy' as is_legacy,
    local_unit.children_required,
    local_unit.file_count,
    local_unit.ddd_owner,
    local_unit.cq_rails,
    local_unit.source_path,
    local_unit.source_content_sha256
  from local_metadata local_unit
  where not exists (
    select 1
    from planning_query_store.governance_components imported
    where imported.component_id = local_unit.component_id
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

create or replace view planning_query_store.component_engineering_component_tree_query as
select
  unit.unit_id as component_id,
  unit.name,
  unit.level as component_level,
  unit.parent_id as parent_component_id,
  unit.root_unit,
  unit.domain_unit,
  unit.status,
  unit.governance_state,
  unit.canonical_role,
  unit.evidence_state,
  unit.is_drift,
  unit.is_legacy,
  unit.children_required,
  unit.direct_file_count,
  unit.descendant_component_count,
  unit.descendant_file_count,
  unit.ddd_owner,
  unit.cq_rails,
  unit.is_materialized_component,
  exists (
    select 1
    from planning_query_store.governance_unit_query child
    where child.parent_id = unit.unit_id
      and child.level = 'component'
  ) as has_children,
  not exists (
    select 1
    from planning_query_store.governance_unit_query child
    where child.parent_id = unit.unit_id
      and child.level = 'component'
  ) as is_leaf_component,
  unit.raw_units
from planning_query_store.governance_unit_query unit
where unit.level = 'component';

create or replace view planning_query_store.component_engineering_file_ownership_query as
with recursive base_files as (
  select
    governance_file.path as file_path,
    governance_file.component_unit as imported_component_id,
    governance_file.owning_unit as imported_owning_unit,
    governance_file.root_unit as imported_root_unit,
    governance_file.domain_unit as imported_domain_unit,
    governance_file.owner_level as imported_owner_level,
    governance_file.governance_state as imported_governance_state,
    governance_file.canonical_role as imported_canonical_role,
    governance_file.evidence_state as imported_evidence_state,
    governance_file.is_drift as imported_is_drift,
    governance_file.is_legacy as imported_is_legacy,
    governance_file.ddd_owner as imported_ddd_owner,
    governance_file.cq_rails as imported_cq_rails,
    governance_file.source_path as imported_source_path,
    governance_file.source_content_sha256 as imported_source_content_sha256
  from planning_query_store.governance_file_query governance_file
),
active_local_components as (
  select
    local_metadata.component_id,
    local_metadata.level,
    local_metadata.root_unit,
    local_metadata.domain_unit,
    local_metadata.status,
    local_metadata.ddd_owner,
    local_metadata.cq_rails,
    local_metadata.source_path,
    local_metadata.source_content_sha256
  from planning_query_store.governance_component_local_metadata_query local_metadata
  where local_metadata.status <> 'superseded'
),
component_depth(unit_id, parent_id, depth, visited) as (
  select
    unit.unit_id,
    unit.parent_id,
    0::integer as depth,
    array[unit.unit_id]::text[] as visited
  from planning_query_store.governance_unit_query unit
  where unit.parent_id is null
  union all
  select
    child.unit_id,
    child.parent_id,
    parent.depth + 1,
    parent.visited || child.unit_id
  from planning_query_store.governance_unit_query child
  join component_depth parent
    on parent.unit_id = child.parent_id
  where not child.unit_id = any(parent.visited)
),
component_depth_rollup as (
  select
    unit_id,
    max(depth)::integer as depth
  from component_depth
  group by unit_id
),
local_file_claims as (
  select
    matched_file.file_path,
    matched_file.component_id,
    matched_file.level,
    matched_file.root_unit,
    matched_file.domain_unit,
    matched_file.status,
    matched_file.ddd_owner,
    matched_file.cq_rails,
    matched_file.source_path,
    matched_file.source_content_sha256,
    row_number() over (
      partition by matched_file.file_path
      order by
        matched_file.claim_depth desc,
        matched_file.is_leaf_component desc,
        matched_file.exact_match desc,
        length(matched_file.own_pattern) desc,
        matched_file.component_id
    ) as claim_rank
  from (
    select
      base_file.file_path,
      local_component.component_id,
      local_component.level,
      local_component.root_unit,
      local_component.domain_unit,
      local_component.status,
      local_component.ddd_owner,
      local_component.cq_rails,
      local_component.source_path,
      local_component.source_content_sha256,
      own_pattern.pattern as own_pattern,
      base_file.file_path = own_pattern.pattern as exact_match,
      coalesce(component_depth_rollup.depth, 0) as claim_depth,
      coalesce(claim_tree.is_leaf_component, false) as is_leaf_component
    from base_files base_file
    join active_local_components local_component
      on true
    join planning_query_store.governance_component_local_ownership_patterns own_pattern
      on own_pattern.component_id = local_component.component_id
     and own_pattern.pattern_kind = 'owns'
    left join component_depth_rollup
      on component_depth_rollup.unit_id = local_component.component_id
    left join planning_query_store.component_engineering_component_tree_query claim_tree
      on claim_tree.component_id = local_component.component_id
    where (
        base_file.file_path = own_pattern.pattern
        or base_file.file_path like replace(replace(own_pattern.pattern, '**', '%'), '*', '%')
      )
      and not exists (
        select 1
        from planning_query_store.governance_component_local_ownership_patterns exclude_pattern
        where exclude_pattern.component_id = local_component.component_id
          and exclude_pattern.pattern_kind = 'excludes'
          and (
            base_file.file_path = exclude_pattern.pattern
            or base_file.file_path like replace(
              replace(exclude_pattern.pattern, '**', '%'),
              '*',
              '%'
            )
          )
      )
  ) matched_file
)
select
  base_file.file_path,
  coalesce(local_claim.component_id, base_file.imported_component_id) as leaf_component_id,
  coalesce(local_claim.component_id, base_file.imported_owning_unit) as owning_unit,
  coalesce(local_claim.root_unit, base_file.imported_root_unit) as root_unit,
  coalesce(local_claim.domain_unit, base_file.imported_domain_unit) as domain_unit,
  coalesce(local_claim.level, base_file.imported_owner_level) as owner_level,
  coalesce(
    case
      when local_claim.status = 'canonical' then 'governed'
      else local_claim.status
    end,
    base_file.imported_governance_state
  ) as governance_state,
  coalesce(
    case
      when local_claim.status = 'canonical' then 'implementation-owner'
      when local_claim.status is not null then 'none'
      else null
    end,
    base_file.imported_canonical_role
  ) as canonical_role,
  coalesce(
    case
      when local_claim.status = 'canonical' then 'classification-only'
      when local_claim.status = 'coverage-required' then 'coverage-required'
      when local_claim.status in ('drift', 'legacy') then 'remediation-required'
      when local_claim.status = 'review' then 'review-required'
      when local_claim.status = 'superseded' then 'retired'
      else null
    end,
    base_file.imported_evidence_state
  ) as evidence_state,
  coalesce(local_claim.status = 'drift', base_file.imported_is_drift) as is_drift,
  coalesce(local_claim.status = 'legacy', base_file.imported_is_legacy) as is_legacy,
  coalesce(local_claim.ddd_owner, base_file.imported_ddd_owner) as ddd_owner,
  coalesce(local_claim.cq_rails, base_file.imported_cq_rails) as cq_rails,
  case
    when base_file.file_path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'
      then 'test'
    when base_file.file_path ~* '(^|/)docs/|\.md$'
      then 'doc'
    when base_file.file_path ~* '(^|/)(fixtures|vectors)/'
      then 'fixture'
    when base_file.file_path ~* '(^|/)\.github/workflows/|(^|/)scripts/|(^|/)tools/'
      then 'governance-tooling'
    else 'source'
  end as file_role,
  tree.parent_component_id,
  tree.component_level,
  tree.is_leaf_component,
  coalesce(local_claim.source_path, base_file.imported_source_path) as source_path,
  coalesce(
    local_claim.source_content_sha256,
    base_file.imported_source_content_sha256
  ) as source_content_sha256
from base_files base_file
left join local_file_claims local_claim
  on local_claim.file_path = base_file.file_path
 and local_claim.claim_rank = 1
left join planning_query_store.component_engineering_component_tree_query tree
  on tree.component_id = coalesce(local_claim.component_id, base_file.imported_component_id);

create or replace view component_engineering.file_ownership_query as
select
  ownership.file_path,
  ownership.leaf_component_id,
  ownership.owning_unit,
  ownership.root_unit,
  ownership.domain_unit,
  ownership.owner_level,
  ownership.governance_state,
  ownership.canonical_role,
  ownership.evidence_state,
  ownership.is_drift,
  ownership.is_legacy,
  ownership.ddd_owner,
  ownership.cq_rails,
  ownership.file_role,
  tree.parent_component_id,
  tree.component_level,
  tree.is_leaf_component,
  ownership.source_path,
  ownership.source_content_sha256
from planning_query_store.component_engineering_file_ownership_query ownership
left join component_engineering.component_tree_query tree
  on tree.component_id = ownership.leaf_component_id;
