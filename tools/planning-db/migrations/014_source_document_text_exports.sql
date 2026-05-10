alter table planning_query_store.planning_sources
  add column if not exists raw_source_text text;

alter table planning_query_store.governance_sources
  add column if not exists raw_source_text text;
