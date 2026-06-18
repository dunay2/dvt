-- Code-symbol diagnostics must use the effective component ownership tree.
-- The imported code_symbols table keeps its original component snapshot for
-- traceability, while the query views project the current leaf ownership from
-- component_engineering_file_ownership_query.

create or replace view planning_query_store.code_symbol_inventory_query as
select
  symbol.symbol_id,
  symbol.source_path,
  symbol.source_content_sha256,
  symbol.file_path,
  coalesce(ownership.leaf_component_id, symbol.component_id) as component_id,
  coalesce(ownership.owning_unit, symbol.owning_unit) as owning_unit,
  coalesce(ownership.root_unit, symbol.root_unit) as root_unit,
  coalesce(ownership.domain_unit, symbol.domain_unit) as domain_unit,
  symbol.symbol_name,
  symbol.symbol_kind,
  symbol.export_kind,
  symbol.signature,
  symbol.signature_sha256,
  symbol.start_line,
  symbol.end_line,
  symbol.body_sha256,
  symbol.normalized_body_length,
  symbol.import_refs,
  symbol.metadata || jsonb_build_object(
    'importedComponentId', symbol.component_id,
    'effectiveComponentId', coalesce(ownership.leaf_component_id, symbol.component_id),
    'effectiveOwningUnit', coalesce(ownership.owning_unit, symbol.owning_unit),
    'ownershipSource', case
      when ownership.file_path is not null
        then 'planning_query_store.component_engineering_file_ownership_query'
      else 'planning_query_store.code_symbols'
    end
  ) as metadata,
  symbol.raw_symbol,
  symbol.imported_at
from planning_query_store.code_symbols symbol
left join planning_query_store.component_engineering_file_ownership_query ownership
  on ownership.file_path = symbol.file_path;

create or replace view planning_query_store.code_symbol_exact_duplicate_query as
with duplicate_bodies as (
  select
    body_sha256,
    count(*)::int as duplicate_count,
    count(distinct file_path)::int as duplicate_file_count,
    count(distinct coalesce(component_id, 'unknown'))::int as duplicate_component_count,
    jsonb_agg(distinct file_path order by file_path) as duplicate_files,
    jsonb_agg(
      distinct coalesce(component_id, 'unknown')
      order by coalesce(component_id, 'unknown')
    ) as duplicate_components
  from planning_query_store.code_symbol_inventory_query
  where normalized_body_length >= 80
  group by body_sha256
  having count(distinct file_path) > 1
)
select
  'exact_body_duplicate'::text as finding_kind,
  'warning'::text as severity,
  concat('body:', symbol.body_sha256) as duplicate_key,
  symbol.symbol_id,
  symbol.symbol_name,
  symbol.symbol_kind,
  symbol.component_id,
  symbol.file_path as source_path,
  symbol.start_line,
  duplicate_bodies.duplicate_count,
  'Extract one canonical helper or document why local duplication is intentional.'::text as action_hint,
  jsonb_build_object(
    'bodySha256', symbol.body_sha256,
    'duplicateFileCount', duplicate_bodies.duplicate_file_count,
    'duplicateComponentCount', duplicate_bodies.duplicate_component_count,
    'duplicateFiles', duplicate_bodies.duplicate_files,
    'duplicateComponents', duplicate_bodies.duplicate_components,
    'normalizedBodyLength', symbol.normalized_body_length,
    'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query'
  ) as metadata
from planning_query_store.code_symbol_inventory_query symbol
join duplicate_bodies
  on duplicate_bodies.body_sha256 = symbol.body_sha256;

create or replace view planning_query_store.code_symbol_name_duplicate_query as
with duplicate_names as (
  select
    lower(symbol_name) as normalized_symbol_name,
    symbol_kind,
    count(*)::int as duplicate_count,
    count(distinct file_path)::int as duplicate_file_count,
    jsonb_agg(distinct file_path order by file_path) as duplicate_files
  from planning_query_store.code_symbol_inventory_query
  group by lower(symbol_name), symbol_kind
  having count(distinct file_path) > 1
)
select
  'same_name_duplicate'::text as finding_kind,
  'info'::text as severity,
  concat('name:', duplicate_names.normalized_symbol_name, ':', duplicate_names.symbol_kind) as duplicate_key,
  symbol.symbol_id,
  symbol.symbol_name,
  symbol.symbol_kind,
  symbol.component_id,
  symbol.file_path as source_path,
  symbol.start_line,
  duplicate_names.duplicate_count,
  'Review whether repeated symbol names express one reusable concept or separate bounded-context intent.'::text as action_hint,
  jsonb_build_object(
    'duplicateFileCount', duplicate_names.duplicate_file_count,
    'duplicateFiles', duplicate_names.duplicate_files,
    'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query'
  ) as metadata
from planning_query_store.code_symbol_inventory_query symbol
join duplicate_names
  on duplicate_names.normalized_symbol_name = lower(symbol.symbol_name)
 and duplicate_names.symbol_kind = symbol.symbol_kind;

create or replace view planning_query_store.code_symbol_semantic_candidate_query as
with semantic_candidates as (
  select
    body_sha256,
    count(*)::int as duplicate_count,
    count(distinct symbol_name)::int as distinct_symbol_name_count,
    jsonb_agg(distinct symbol_name order by symbol_name) as symbol_names,
    jsonb_agg(distinct file_path order by file_path) as duplicate_files
  from planning_query_store.code_symbol_inventory_query
  where normalized_body_length >= 80
  group by body_sha256
  having count(distinct file_path) > 1
     and count(distinct symbol_name) > 1
)
select
  'semantic_duplicate_candidate'::text as finding_kind,
  'warning'::text as severity,
  concat('semantic-body:', symbol.body_sha256) as duplicate_key,
  symbol.symbol_id,
  symbol.symbol_name,
  symbol.symbol_kind,
  symbol.component_id,
  symbol.file_path as source_path,
  symbol.start_line,
  semantic_candidates.duplicate_count,
  'Decide whether differently named symbols are one canonical behavior before adding another local helper.'::text as action_hint,
  jsonb_build_object(
    'symbolNames', semantic_candidates.symbol_names,
    'duplicateFiles', semantic_candidates.duplicate_files,
    'distinctSymbolNameCount', semantic_candidates.distinct_symbol_name_count,
    'normalizedBodyLength', symbol.normalized_body_length,
    'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query'
  ) as metadata
from planning_query_store.code_symbol_inventory_query symbol
join semantic_candidates
  on semantic_candidates.body_sha256 = symbol.body_sha256;

create or replace view planning_query_store.code_symbol_problem_query as
select * from planning_query_store.code_symbol_exact_duplicate_query
union all
select * from planning_query_store.code_symbol_name_duplicate_query
union all
select * from planning_query_store.code_symbol_semantic_candidate_query;
