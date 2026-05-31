create table if not exists planning_query_store.governance_component_local_ownership_patterns (
  component_id text not null
    references planning_query_store.governance_component_local_definitions(component_id)
    on delete cascade,
  pattern_kind text not null check (pattern_kind in ('owns', 'excludes')),
  pattern text not null check (btrim(pattern) <> ''),
  pattern_order integer not null check (pattern_order >= 0),
  created_at timestamptz not null default now(),
  primary key (component_id, pattern_kind, pattern)
);

create index if not exists governance_component_local_ownership_patterns_component_kind_order_idx
  on planning_query_store.governance_component_local_ownership_patterns(
    component_id,
    pattern_kind,
    pattern_order
  );

create index if not exists governance_component_local_ownership_patterns_kind_pattern_idx
  on planning_query_store.governance_component_local_ownership_patterns(pattern_kind, pattern);

create table if not exists planning_query_store.governance_component_local_semantic_items (
  component_id text not null
    references planning_query_store.governance_component_local_definitions(component_id)
    on delete cascade,
  item_kind text not null check (
    item_kind in (
      'responsibility',
      'non_goal',
      'reason_to_change',
      'public_api',
      'invariant',
      'transition',
      'consumer',
      'governance_ref',
      'fowler_signal'
    )
  ),
  item_value text not null check (btrim(item_value) <> ''),
  item_order integer not null check (item_order >= 0),
  created_at timestamptz not null default now(),
  primary key (component_id, item_kind, item_value)
);

create index if not exists governance_component_local_semantic_items_component_kind_order_idx
  on planning_query_store.governance_component_local_semantic_items(
    component_id,
    item_kind,
    item_order
  );

create index if not exists governance_component_local_semantic_items_kind_value_idx
  on planning_query_store.governance_component_local_semantic_items(item_kind, item_value);

alter table planning_query_store.governance_component_local_definitions
  alter column raw_unit set default '{}'::jsonb;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  local_definition.component_id,
  ownership.pattern_kind,
  ownership.pattern,
  ownership.pattern_order
from planning_query_store.governance_component_local_definitions local_definition
cross join lateral (
  select
    'owns'::text as pattern_kind,
    nullif(btrim(pattern.value), '') as pattern,
    (pattern.ordinality - 1)::integer as pattern_order
  from jsonb_array_elements_text(local_definition.owns) with ordinality as pattern(value, ordinality)
  union all
  select
    'excludes'::text as pattern_kind,
    nullif(btrim(pattern.value), '') as pattern,
    (pattern.ordinality - 1)::integer as pattern_order
  from jsonb_array_elements_text(local_definition.excludes) with ordinality as pattern(value, ordinality)
) ownership
where ownership.pattern is not null
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = least(
    planning_query_store.governance_component_local_ownership_patterns.pattern_order,
    excluded.pattern_order
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  local_definition.component_id,
  semantic_item.item_kind,
  semantic_item.item_value,
  semantic_item.item_order
from planning_query_store.governance_component_local_definitions local_definition
cross join lateral (
  select
    'responsibility'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.responsibilities) with ordinality as item(value, ordinality)
  union all
  select
    'non_goal'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.non_goals) with ordinality as item(value, ordinality)
  union all
  select
    'reason_to_change'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.reasons_to_change) with ordinality as item(value, ordinality)
  union all
  select
    'public_api'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.public_api) with ordinality as item(value, ordinality)
  union all
  select
    'invariant'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.invariants) with ordinality as item(value, ordinality)
  union all
  select
    'transition'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.transitions) with ordinality as item(value, ordinality)
  union all
  select
    'consumer'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.consumers) with ordinality as item(value, ordinality)
  union all
  select
    'governance_ref'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.governance_refs) with ordinality as item(value, ordinality)
  union all
  select
    'fowler_signal'::text as item_kind,
    nullif(btrim(item.value), '') as item_value,
    (item.ordinality - 1)::integer as item_order
  from jsonb_array_elements_text(local_definition.fowler_signals) with ordinality as item(value, ordinality)
) semantic_item
where semantic_item.item_value is not null
on conflict (component_id, item_kind, item_value) do update set
  item_order = least(
    planning_query_store.governance_component_local_semantic_items.item_order,
    excluded.item_order
  );

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
local_ownership as (
  select
    pattern.component_id,
    coalesce(
      jsonb_agg(pattern.pattern order by pattern.pattern_order, pattern.pattern)
        filter (where pattern.pattern_kind = 'owns'),
      '[]'::jsonb
    ) as owns,
    coalesce(
      jsonb_agg(pattern.pattern order by pattern.pattern_order, pattern.pattern)
        filter (where pattern.pattern_kind = 'excludes'),
      '[]'::jsonb
    ) as excludes
  from planning_query_store.governance_component_local_ownership_patterns pattern
  group by pattern.component_id
),
local_semantic_items as (
  select
    item.component_id,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'responsibility'),
      '[]'::jsonb
    ) as responsibilities,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'non_goal'),
      '[]'::jsonb
    ) as non_goals,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'reason_to_change'),
      '[]'::jsonb
    ) as reasons_to_change,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'public_api'),
      '[]'::jsonb
    ) as public_api,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'invariant'),
      '[]'::jsonb
    ) as invariants,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'transition'),
      '[]'::jsonb
    ) as transitions,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'consumer'),
      '[]'::jsonb
    ) as consumers,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'governance_ref'),
      '[]'::jsonb
    ) as governance_refs,
    coalesce(
      jsonb_agg(item.item_value order by item.item_order, item.item_value)
        filter (where item.item_kind = 'fowler_signal'),
      '[]'::jsonb
    ) as fowler_signals
  from planning_query_store.governance_component_local_semantic_items item
  group by item.component_id
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
    coalesce(local_ownership.owns, '[]'::jsonb) as owns,
    coalesce(local_ownership.excludes, '[]'::jsonb) as excludes,
    local_definition.owned_concern,
    coalesce(local_semantic_items.responsibilities, '[]'::jsonb) as responsibilities,
    coalesce(local_semantic_items.non_goals, '[]'::jsonb) as non_goals,
    coalesce(local_semantic_items.reasons_to_change, '[]'::jsonb) as reasons_to_change,
    local_definition.ddd_owner,
    local_definition.cq_rails,
    coalesce(local_semantic_items.public_api, '[]'::jsonb) as public_api,
    coalesce(local_semantic_items.invariants, '[]'::jsonb) as invariants,
    coalesce(local_semantic_items.transitions, '[]'::jsonb) as transitions,
    coalesce(local_semantic_items.consumers, '[]'::jsonb) as consumers,
    coalesce(local_semantic_items.governance_refs, '[]'::jsonb) as governance_refs,
    coalesce(local_semantic_items.fowler_signals, '[]'::jsonb) as fowler_signals,
    local_definition.created_by,
    local_definition.created_at,
    local_definition.raw_unit
  from planning_query_store.governance_component_local_definitions local_definition
  left join local_ownership
    on local_ownership.component_id = local_definition.component_id
  left join local_semantic_items
    on local_semantic_items.component_id = local_definition.component_id
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

create or replace view component_engineering.component_definition_query as
select *
from planning_query_store.governance_component_definition_query;

create or replace view planning_query_store.component_engineering_file_ownership_query as
with base_files as (
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
    local_definition.component_id,
    local_definition.level,
    local_definition.root_unit,
    local_definition.domain_unit,
    local_definition.status,
    local_definition.ddd_owner,
    local_definition.cq_rails,
    local_definition.source_path,
    local_definition.source_content_sha256
  from planning_query_store.governance_component_local_definitions local_definition
  where local_definition.status <> 'superseded'
    and not exists (
      select 1
      from planning_query_store.governance_components imported
      where imported.component_id = local_definition.component_id
    )
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
      order by length(matched_file.own_pattern) desc, matched_file.component_id
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
      own_pattern.pattern as own_pattern
    from base_files base_file
    join active_local_components local_component
      on true
    join planning_query_store.governance_component_local_ownership_patterns own_pattern
      on own_pattern.component_id = local_component.component_id
     and own_pattern.pattern_kind = 'owns'
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
            or base_file.file_path like replace(replace(exclude_pattern.pattern, '**', '%'), '*', '%')
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
  file_path,
  leaf_component_id,
  owning_unit,
  root_unit,
  domain_unit,
  owner_level,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  ddd_owner,
  cq_rails,
  file_role,
  parent_component_id,
  component_level,
  is_leaf_component,
  source_path,
  source_content_sha256
from planning_query_store.component_engineering_file_ownership_query;

create or replace view component_engineering.component_metadata_query as
with component_base as (
  select
    tree.component_id,
    tree.name,
    tree.component_level,
    tree.parent_component_id,
    tree.root_unit,
    tree.domain_unit,
    tree.status,
    tree.governance_state,
    tree.canonical_role,
    tree.evidence_state,
    tree.is_drift,
    tree.is_legacy,
    tree.children_required,
    tree.direct_file_count,
    tree.descendant_component_count,
    tree.descendant_file_count,
    tree.ddd_owner,
    tree.cq_rails,
    tree.is_materialized_component,
    tree.has_children,
    tree.is_leaf_component,
    unit.source_paths,
    unit.source_content_sha256_values
  from component_engineering.component_tree_query tree
  left join planning_query_store.governance_unit_query unit
    on unit.unit_id = tree.component_id
),
definition_fields as (
  select
    definition.component_id,
    definition.owned_concern,
    definition.responsibilities,
    definition.non_goals,
    definition.reasons_to_change,
    definition.public_api as declared_public_api,
    definition.invariants,
    definition.transitions,
    definition.consumers
  from planning_query_store.governance_component_definition_query definition
),
metadata_projection as (
  select
    base.component_id,
    base.name,
    base.component_level,
    base.parent_component_id,
    base.root_unit,
    base.domain_unit,
    base.status,
    base.governance_state,
    base.ddd_owner,
    definition_fields.owned_concern,
    coalesce(definition_fields.responsibilities, '[]'::jsonb) as responsibilities,
    coalesce(definition_fields.non_goals, '[]'::jsonb) as non_goals,
    coalesce(definition_fields.reasons_to_change, '[]'::jsonb) as reasons_to_change,
    case
      when jsonb_array_length(coalesce(definition_fields.declared_public_api, '[]'::jsonb)) > 0
        then definition_fields.declared_public_api
      when nullif(btrim(coalesce(base.cq_rails, '')), '') is not null
        and base.cq_rails !~* '^none(\s|$|-)'
        then jsonb_build_array(base.cq_rails)
      else '[]'::jsonb
    end as public_api,
    coalesce(definition_fields.invariants, '[]'::jsonb) as invariants,
    coalesce(definition_fields.transitions, '[]'::jsonb) as transitions,
    coalesce(definition_fields.consumers, '[]'::jsonb) as consumers,
    base.direct_file_count,
    base.descendant_component_count,
    base.descendant_file_count,
    coalesce(quality.children_count, 0)::int as children_count,
    coalesce(quality.test_file_count, 0)::int as test_file_count,
    coalesce(quality.quality_state, 'not_indexed') as quality_state,
    coalesce(quality.drift_codes, array[]::text[]) as drift_codes,
    coalesce(base.source_paths, '[]'::jsonb) as source_paths,
    coalesce(base.source_content_sha256_values, '[]'::jsonb) as source_content_sha256_values
  from component_base base
  left join definition_fields
    on definition_fields.component_id = base.component_id
  left join component_engineering.component_quality_query quality
    on quality.component_id = base.component_id
)
select
  component_id,
  name,
  component_level,
  parent_component_id,
  root_unit,
  domain_unit,
  status,
  governance_state,
  ddd_owner,
  owned_concern,
  responsibilities,
  non_goals,
  reasons_to_change,
  public_api,
  invariants,
  transitions,
  consumers,
  direct_file_count,
  descendant_component_count,
  descendant_file_count,
  children_count,
  test_file_count,
  quality_state,
  drift_codes,
  case
    when owned_concern is not null
      and jsonb_array_length(public_api) > 0
      and jsonb_array_length(invariants) > 0
      and jsonb_array_length(transitions) > 0
      and jsonb_array_length(consumers) > 0
      then 'declared'
    else 'incomplete'
  end as metadata_state,
  source_paths,
  source_content_sha256_values
from metadata_projection;

drop view if exists planning_query_store.component_engineering_component_metadata_query;

create view planning_query_store.component_engineering_component_metadata_query as
select
  component_id,
  name,
  component_level,
  parent_component_id,
  root_unit,
  domain_unit,
  status,
  governance_state,
  ddd_owner,
  owned_concern,
  responsibilities,
  non_goals,
  reasons_to_change,
  public_api,
  invariants,
  transitions,
  consumers,
  direct_file_count,
  descendant_component_count,
  descendant_file_count,
  children_count,
  test_file_count,
  quality_state,
  drift_codes,
  metadata_state,
  source_paths,
  source_content_sha256_values
from component_engineering.component_metadata_query;
