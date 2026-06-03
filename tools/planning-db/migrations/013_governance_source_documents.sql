alter table planning_query_store.planning_sources
  add column if not exists raw_source jsonb;

alter table planning_query_store.planning_sources
  add column if not exists source_authority text not null default 'database';

alter table planning_query_store.planning_sources
  drop constraint if exists planning_sources_source_authority_check;

alter table planning_query_store.planning_sources
  add constraint planning_sources_source_authority_check
  check (source_authority in ('database', 'git-bootstrap'));

alter table planning_query_store.governance_sources
  add column if not exists raw_source jsonb;

alter table planning_query_store.governance_sources
  add column if not exists source_authority text not null default 'database';

alter table planning_query_store.governance_sources
  drop constraint if exists governance_sources_source_authority_check;

alter table planning_query_store.governance_sources
  add constraint governance_sources_source_authority_check
  check (source_authority in ('database', 'git-bootstrap'));
