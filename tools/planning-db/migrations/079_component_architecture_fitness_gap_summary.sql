create or replace view architecture.component_fitness_gap_summary_query as
with classified as (
  select
    classification.*,
    nullif(
      concat_ws(
        '/',
        nullif(split_part(classification.source_path, '/', 1), ''),
        nullif(split_part(classification.source_path, '/', 2), ''),
        nullif(split_part(classification.source_path, '/', 3), '')
      ),
      ''
    ) as source_prefix,
    nullif(
      concat_ws(
        '/',
        nullif(split_part(coalesce(classification.target_path, ''), '/', 1), ''),
        nullif(split_part(coalesce(classification.target_path, ''), '/', 2), ''),
        nullif(split_part(coalesce(classification.target_path, ''), '/', 3), '')
      ),
      ''
    ) as target_prefix
  from architecture.component_dependency_classification_query classification
  where classification.fitness_state <> 'pass'
)
select
  scan_id,
  design_id,
  dependency_classification as gap_kind,
  fitness_state,
  case fitness_state
    when 'fail' then 'error'
    when 'warning' then 'warning'
    else 'info'
  end as severity,
  coalesce(source_prefix, '-') as source_prefix,
  coalesce(target_prefix, '-') as target_prefix,
  source_component_id,
  target_component_id,
  relation_type,
  count(*)::int as observation_count,
  count(*) filter (where is_test)::int as test_observation_count,
  min(source_path) as sample_source_path,
  min(target_path) as sample_target_path,
  min(import_literal) as sample_import_literal,
  case dependency_classification
    when 'unmapped_source' then 'Record or refine architecture.component ownership for the source prefix.'
    when 'unmapped_target' then 'Record or refine architecture.component ownership for the target prefix.'
    when 'ambiguous_mapping' then 'Narrow overlapping architecture.component repo_path ownership.'
    when 'undeclared_dependency' then 'Record architecture.component_relation or refactor the dependency.'
    when 'reverse_declared' then 'Correct relation direction or refactor the dependency.'
    else 'Review architecture fitness classification.'
  end as action_hint
from classified
group by
  scan_id,
  design_id,
  dependency_classification,
  fitness_state,
  source_prefix,
  target_prefix,
  source_component_id,
  target_component_id,
  relation_type;
