alter table planning_query_store.command_query_rails
  add column if not exists implementation_refs jsonb not null default '[]'::jsonb;

alter table planning_query_store.command_query_rails
  add column if not exists documentation_refs jsonb not null default '[]'::jsonb;

update planning_query_store.command_query_rails
set implementation_refs = symbol_refs
where implementation_refs = '[]'::jsonb
  and symbol_refs <> '[]'::jsonb;

drop view if exists planning_query_store.command_query_rail_query;

create view planning_query_store.command_query_rail_query as
select
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  jsonb_array_length(implementation_refs) as implementation_ref_count,
  jsonb_array_length(documentation_refs) as documentation_ref_count,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  (
    rail_status ~* '^(missing|planned|unimplemented|not-implemented)'
    or jsonb_array_length(implementation_refs) = 0
  ) as is_gap,
  count(*) over (partition by rail_type, normalized_rail_name) as duplicate_count,
  count(*) over (partition by rail_type, normalized_rail_name) > 1 as is_duplicate,
  source_path,
  source_content_sha256,
  imported_at
from planning_query_store.command_query_rails;
