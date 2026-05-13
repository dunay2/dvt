create schema if not exists component_engineering;

create or replace view component_engineering.component_tree_query as
select
  component_id,
  name,
  component_level,
  parent_component_id,
  root_unit,
  domain_unit,
  status,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  children_required,
  direct_file_count,
  descendant_component_count,
  descendant_file_count,
  ddd_owner,
  cq_rails,
  is_materialized_component,
  has_children,
  is_leaf_component,
  raw_units
from planning_query_store.component_engineering_component_tree_query;

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

create or replace view component_engineering.rule_catalog_query as
select
  rule_id,
  name,
  category,
  severity,
  subject_level,
  subject_scope,
  predicate_owner,
  case
    when evaluation_view = 'component_engineering_rule_evaluation_query'
      then 'component_engineering.rule_evaluation_query'
    else evaluation_view
  end as evaluation_view,
  drift_code,
  governing_doc,
  remediation,
  validation_command
from planning_query_store.component_engineering_rule_catalog_query;

create or replace view component_engineering.rule_evaluation_query as
select
  rule_id,
  rule_name,
  category,
  severity,
  subject_id,
  subject_level,
  subject_name,
  evaluation_state,
  drift_code,
  evidence,
  remediation,
  metadata
from planning_query_store.component_engineering_rule_evaluation_query;

create or replace view component_engineering.component_quality_query as
select
  component_id,
  name,
  component_level,
  parent_component_id,
  governance_state,
  quality_state,
  direct_file_count,
  descendant_file_count,
  children_count,
  test_file_count,
  rule_count,
  failing_rule_count,
  error_count,
  warning_count,
  drift_codes
from planning_query_store.component_engineering_quality_query;

create or replace view component_engineering.component_drift_query as
select
  component_id,
  drift_code,
  metadata
from planning_query_store.component_engineering_drift_query;

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
    tree.raw_units,
    unit.source_paths,
    unit.source_content_sha256_values
  from component_engineering.component_tree_query tree
  left join planning_query_store.governance_unit_query unit
    on unit.unit_id = tree.component_id
),
semantic_fields as (
  select
    base.component_id,
    (
      select nullif(btrim(raw_unit.value->>'ownedConcern'), '')
      from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
      where nullif(btrim(raw_unit.value->>'ownedConcern'), '') is not null
      order by raw_unit.value->>'id'
      limit 1
    ) as owned_concern,
    coalesce(
      (
        select case
          when jsonb_typeof(raw_unit.value->'responsibilities') = 'array'
            then raw_unit.value->'responsibilities'
          when jsonb_typeof(raw_unit.value->'responsibilities') = 'string'
            and nullif(btrim(raw_unit.value->>'responsibilities'), '') is not null
            then jsonb_build_array(raw_unit.value->>'responsibilities')
          else null
        end
        from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
        where raw_unit.value ? 'responsibilities'
        order by raw_unit.value->>'id'
        limit 1
      ),
      '[]'::jsonb
    ) as responsibilities,
    coalesce(
      (
        select case
          when jsonb_typeof(raw_unit.value->'nonGoals') = 'array'
            then raw_unit.value->'nonGoals'
          when jsonb_typeof(raw_unit.value->'nonGoals') = 'string'
            and nullif(btrim(raw_unit.value->>'nonGoals'), '') is not null
            then jsonb_build_array(raw_unit.value->>'nonGoals')
          else null
        end
        from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
        where raw_unit.value ? 'nonGoals'
        order by raw_unit.value->>'id'
        limit 1
      ),
      '[]'::jsonb
    ) as non_goals,
    coalesce(
      (
        select case
          when jsonb_typeof(raw_unit.value->'reasonsToChange') = 'array'
            then raw_unit.value->'reasonsToChange'
          when jsonb_typeof(raw_unit.value->'reasonsToChange') = 'string'
            and nullif(btrim(raw_unit.value->>'reasonsToChange'), '') is not null
            then jsonb_build_array(raw_unit.value->>'reasonsToChange')
          else null
        end
        from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
        where raw_unit.value ? 'reasonsToChange'
        order by raw_unit.value->>'id'
        limit 1
      ),
      '[]'::jsonb
    ) as reasons_to_change,
    coalesce(
      (
        select case
          when jsonb_typeof(raw_unit.value->'publicApi') = 'array'
            then raw_unit.value->'publicApi'
          when jsonb_typeof(raw_unit.value->'publicApi') = 'string'
            and nullif(btrim(raw_unit.value->>'publicApi'), '') is not null
            then jsonb_build_array(raw_unit.value->>'publicApi')
          else null
        end
        from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
        where raw_unit.value ? 'publicApi'
        order by raw_unit.value->>'id'
        limit 1
      ),
      '[]'::jsonb
    ) as declared_public_api,
    coalesce(
      (
        select case
          when jsonb_typeof(raw_unit.value->'invariants') = 'array'
            then raw_unit.value->'invariants'
          when jsonb_typeof(raw_unit.value->'invariants') = 'string'
            and nullif(btrim(raw_unit.value->>'invariants'), '') is not null
            then jsonb_build_array(raw_unit.value->>'invariants')
          else null
        end
        from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
        where raw_unit.value ? 'invariants'
        order by raw_unit.value->>'id'
        limit 1
      ),
      '[]'::jsonb
    ) as invariants,
    coalesce(
      (
        select case
          when jsonb_typeof(raw_unit.value->'transitions') = 'array'
            then raw_unit.value->'transitions'
          when jsonb_typeof(raw_unit.value->'transitions') = 'string'
            and nullif(btrim(raw_unit.value->>'transitions'), '') is not null
            then jsonb_build_array(raw_unit.value->>'transitions')
          else null
        end
        from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
        where raw_unit.value ? 'transitions'
        order by raw_unit.value->>'id'
        limit 1
      ),
      '[]'::jsonb
    ) as transitions,
    coalesce(
      (
        select case
          when jsonb_typeof(raw_unit.value->'consumers') = 'array'
            then raw_unit.value->'consumers'
          when jsonb_typeof(raw_unit.value->'consumers') = 'string'
            and nullif(btrim(raw_unit.value->>'consumers'), '') is not null
            then jsonb_build_array(raw_unit.value->>'consumers')
          else null
        end
        from jsonb_array_elements(coalesce(base.raw_units, '[]'::jsonb)) as raw_unit(value)
        where raw_unit.value ? 'consumers'
        order by raw_unit.value->>'id'
        limit 1
      ),
      '[]'::jsonb
    ) as consumers
  from component_base base
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
    base.owned_concern,
    base.responsibilities,
    base.non_goals,
    base.reasons_to_change,
    case
      when jsonb_array_length(base.declared_public_api) > 0 then base.declared_public_api
      when nullif(btrim(coalesce(base.cq_rails, '')), '') is not null
        and base.cq_rails !~* '^none(\s|$|-)'
        then jsonb_build_array(base.cq_rails)
      else '[]'::jsonb
    end as public_api,
    base.invariants,
    base.transitions,
    base.consumers,
    base.direct_file_count,
    base.descendant_component_count,
    base.descendant_file_count,
    coalesce(quality.children_count, 0)::int as children_count,
    coalesce(quality.test_file_count, 0)::int as test_file_count,
    coalesce(quality.quality_state, 'not_indexed') as quality_state,
    coalesce(quality.drift_codes, array[]::text[]) as drift_codes,
    coalesce(base.source_paths, '[]'::jsonb) as source_paths,
    coalesce(base.source_content_sha256_values, '[]'::jsonb) as source_content_sha256_values
  from (
    select
      component_base.*,
      semantic_fields.owned_concern,
      semantic_fields.responsibilities,
      semantic_fields.non_goals,
      semantic_fields.reasons_to_change,
      semantic_fields.declared_public_api,
      semantic_fields.invariants,
      semantic_fields.transitions,
      semantic_fields.consumers
    from component_base
    left join semantic_fields
      on semantic_fields.component_id = component_base.component_id
  ) base
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
