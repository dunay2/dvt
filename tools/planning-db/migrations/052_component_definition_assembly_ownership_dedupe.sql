with local_components as (
  select component_id
  from planning_query_store.governance_component_local_definitions
),
local_parent_child as (
  select
    parent.component_id as parent_component_id,
    child.component_id as child_component_id
  from planning_query_store.component_engineering_component_tree_query child
  join planning_query_store.component_engineering_component_tree_query parent
    on parent.component_id = child.parent_component_id
  join local_components local_parent
    on local_parent.component_id = parent.component_id
  join local_components local_child
    on local_child.component_id = child.component_id
),
base_files as (
  select path as file_path
  from planning_query_store.governance_file_query
),
parent_pattern_files as (
  select
    parent_pattern.component_id as parent_component_id,
    parent_pattern.pattern as parent_pattern,
    base_file.file_path
  from planning_query_store.governance_component_local_ownership_patterns parent_pattern
  join base_files base_file
    on base_file.file_path = parent_pattern.pattern
    or base_file.file_path like replace(
      replace(parent_pattern.pattern, '**', '%'),
      '*',
      '%'
    )
  where parent_pattern.pattern_kind = 'owns'
    and exists (
      select 1
      from local_parent_child parent_child
      where parent_child.parent_component_id = parent_pattern.component_id
    )
),
child_pattern_files as (
  select
    parent_child.parent_component_id,
    child_pattern.component_id as child_component_id,
    base_file.file_path
  from local_parent_child parent_child
  join planning_query_store.governance_component_local_ownership_patterns child_pattern
    on child_pattern.component_id = parent_child.child_component_id
   and child_pattern.pattern_kind = 'owns'
  join base_files base_file
    on base_file.file_path = child_pattern.pattern
    or base_file.file_path like replace(
      replace(child_pattern.pattern, '**', '%'),
      '*',
      '%'
    )
),
child_file_claims as (
  select distinct
    child_pattern_file.parent_component_id,
    child_pattern_file.child_component_id,
    child_pattern_file.file_path
  from child_pattern_files child_pattern_file
  where not exists (
    select 1
    from planning_query_store.governance_component_local_ownership_patterns exclude_pattern
    where exclude_pattern.component_id = child_pattern_file.child_component_id
      and exclude_pattern.pattern_kind = 'excludes'
      and (
        child_pattern_file.file_path = exclude_pattern.pattern
        or child_pattern_file.file_path like replace(
          replace(exclude_pattern.pattern, '**', '%'),
          '*',
          '%'
        )
      )
  )
),
parent_pattern_coverage as (
  select
    parent_pattern_files.parent_component_id,
    parent_pattern_files.parent_pattern,
    count(distinct parent_pattern_files.file_path) as parent_file_count,
    count(distinct child_file_claims.file_path) as child_covered_file_count
  from parent_pattern_files
  left join child_file_claims
    on child_file_claims.parent_component_id = parent_pattern_files.parent_component_id
   and child_file_claims.file_path = parent_pattern_files.file_path
  group by
    parent_pattern_files.parent_component_id,
    parent_pattern_files.parent_pattern
),
parent_child_claim_overlaps as (
  select
    parent_pattern_coverage.parent_component_id,
    parent_pattern_coverage.parent_pattern
  from parent_pattern_coverage
  where parent_pattern_coverage.parent_file_count > 0
    and parent_pattern_coverage.parent_file_count =
      parent_pattern_coverage.child_covered_file_count
),
marked_parent_assemblies as (
  update planning_query_store.governance_component_local_definitions parent_definition
  set children_required = true
  where coalesce(parent_definition.children_required, false) = false
    and exists (
      select 1
      from parent_child_claim_overlaps overlap
      where overlap.parent_component_id = parent_definition.component_id
    )
  returning parent_definition.component_id
)
delete from planning_query_store.governance_component_local_ownership_patterns parent_pattern
using parent_child_claim_overlaps overlap
where parent_pattern.component_id = overlap.parent_component_id
  and parent_pattern.pattern_kind = 'owns'
  and parent_pattern.pattern = overlap.parent_pattern
  and (
    not exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns exclude_pattern
      where exclude_pattern.component_id = parent_pattern.component_id
        and exclude_pattern.pattern_kind = 'excludes'
    )
    or exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns remaining_pattern
      where remaining_pattern.component_id = parent_pattern.component_id
        and remaining_pattern.pattern_kind = 'owns'
        and remaining_pattern.pattern <> parent_pattern.pattern
        and not exists (
          select 1
          from parent_child_claim_overlaps remaining_overlap
          where remaining_overlap.parent_component_id = remaining_pattern.component_id
            and remaining_overlap.parent_pattern = remaining_pattern.pattern
        )
    )
  );
