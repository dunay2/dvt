create table if not exists planning_query_store.code_symbols (
  symbol_id text primary key,
  source_path text not null,
  source_content_sha256 text not null,
  file_path text not null,
  component_id text,
  owning_unit text,
  root_unit text,
  domain_unit text,
  symbol_name text not null,
  symbol_kind text not null,
  export_kind text not null default 'internal',
  signature text not null,
  signature_sha256 text not null,
  start_line integer not null,
  end_line integer not null,
  body_sha256 text not null,
  normalized_body_length integer not null,
  import_refs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  raw_symbol jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

create index if not exists code_symbols_body_idx
  on planning_query_store.code_symbols (body_sha256);

create index if not exists code_symbols_name_idx
  on planning_query_store.code_symbols (lower(symbol_name), symbol_kind);

create index if not exists code_symbols_component_idx
  on planning_query_store.code_symbols (component_id);

create index if not exists code_symbols_file_idx
  on planning_query_store.code_symbols (file_path);

create or replace view planning_query_store.code_symbol_inventory_query as
select
  symbol_id,
  source_path,
  source_content_sha256,
  file_path,
  component_id,
  owning_unit,
  root_unit,
  domain_unit,
  symbol_name,
  symbol_kind,
  export_kind,
  signature,
  signature_sha256,
  start_line,
  end_line,
  body_sha256,
  normalized_body_length,
  import_refs,
  metadata,
  raw_symbol,
  imported_at
from planning_query_store.code_symbols;

create or replace view planning_query_store.code_symbol_exact_duplicate_query as
with duplicate_bodies as (
  select
    body_sha256,
    count(*)::int as duplicate_count,
    count(distinct file_path)::int as duplicate_file_count,
    count(distinct coalesce(component_id, 'unknown'))::int as duplicate_component_count,
    jsonb_agg(distinct file_path order by file_path) as duplicate_files,
    jsonb_agg(distinct coalesce(component_id, 'unknown') order by coalesce(component_id, 'unknown')) as duplicate_components
  from planning_query_store.code_symbols
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
    'normalizedBodyLength', symbol.normalized_body_length
  ) as metadata
from planning_query_store.code_symbols symbol
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
  from planning_query_store.code_symbols
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
    'duplicateFiles', duplicate_names.duplicate_files
  ) as metadata
from planning_query_store.code_symbols symbol
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
  from planning_query_store.code_symbols
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
    'normalizedBodyLength', symbol.normalized_body_length
  ) as metadata
from planning_query_store.code_symbols symbol
join semantic_candidates
  on semantic_candidates.body_sha256 = symbol.body_sha256;

create or replace view planning_query_store.code_symbol_problem_query as
select * from planning_query_store.code_symbol_exact_duplicate_query
union all
select * from planning_query_store.code_symbol_name_duplicate_query
union all
select * from planning_query_store.code_symbol_semantic_candidate_query;

create or replace view planning_query_store.governed_source_drift_query as
with governed_sources as (
  select
    source_path,
    'planning_query_store.command_query_rails'::text as source_table,
    count(*)::int as reference_count
  from planning_query_store.command_query_rails
  where nullif(btrim(source_path), '') is not null
  group by source_path
  union all
  select
    source_path,
    'planning_query_store.feature_mechanization_local_rails'::text as source_table,
    count(*)::int as reference_count
  from planning_query_store.feature_mechanization_local_rails
  where nullif(btrim(source_path), '') is not null
  group by source_path
),
missing_sources as (
  select
    governed_sources.source_path,
    governed_sources.source_table,
    governed_sources.reference_count
  from governed_sources
  left join planning_query_store.governance_files file_ref
    on file_ref.path = governed_sources.source_path
  where file_ref.path is null
    and governed_sources.source_path !~ '^\.generated-docs/'
)
select
  'missing_source_file'::text as finding_kind,
  case
    when source_path like 'buzon/%' then 'error'::text
    else 'warning'::text
  end as severity,
  source_path,
  source_table,
  reference_count,
  'Repoint the governed source or retire the stale row explicitly.'::text as action_hint,
  jsonb_build_object(
    'sourcePath', source_path,
    'sourceTable', source_table,
    'referenceCount', reference_count
  ) as metadata
from missing_sources;

create or replace view planning_query_store.governance_problem_dashboard_query as
select
  'rail-vocabulary'::text as problem_surface,
  finding_kind,
  severity,
  rail_name as subject_id,
  null::text as component_id,
  source_path as path,
  duplicate_count as evidence_count,
  action_hint,
  metadata
from planning_query_store.command_query_rail_vocabulary_query
union all
select
  'component-integrity'::text as problem_surface,
  finding_kind,
  severity,
  component_id as subject_id,
  component_id,
  path,
  evidence_count,
  action_hint,
  metadata
from planning_query_store.component_integrity_query
union all
select
  'code-symbols'::text as problem_surface,
  finding_kind,
  severity,
  symbol_id as subject_id,
  component_id,
  source_path as path,
  duplicate_count as evidence_count,
  action_hint,
  metadata
from planning_query_store.code_symbol_problem_query
union all
select
  'source-drift'::text as problem_surface,
  finding_kind,
  severity,
  source_path as subject_id,
  null::text as component_id,
  source_path as path,
  reference_count as evidence_count,
  action_hint,
  metadata
from planning_query_store.governed_source_drift_query;
