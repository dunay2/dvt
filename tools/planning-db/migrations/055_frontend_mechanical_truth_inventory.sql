create table if not exists planning_query_store.frontend_mechanical_truth_surfaces (
  surface_id text primary key,
  surface_kind text not null,
  route_path text not null,
  screen_state text not null,
  frontend_owner text not null,
  registered_plugins jsonb not null default '[]'::jsonb,
  consumed_endpoints jsonb not null default '[]'::jsonb,
  zustand_stores jsonb not null default '[]'::jsonb,
  tanstack_queries jsonb not null default '[]'::jsonb,
  visible_no_backend_affordances jsonb not null default '[]'::jsonb,
  capability_gaps jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  raw_surface jsonb not null,
  imported_at timestamptz not null default now()
);

alter table planning_query_store.frontend_mechanical_truth_surfaces
  drop constraint if exists frontend_mechanical_truth_surfaces_state_check;

alter table planning_query_store.frontend_mechanical_truth_surfaces
  add constraint frontend_mechanical_truth_surfaces_state_check
  check (screen_state in ('operational-product', 'preview', 'disabled-unsupported', 'experimental'));

alter table planning_query_store.frontend_mechanical_truth_surfaces
  drop constraint if exists frontend_mechanical_truth_surfaces_kind_check;

alter table planning_query_store.frontend_mechanical_truth_surfaces
  add constraint frontend_mechanical_truth_surfaces_kind_check
  check (surface_kind in ('route', 'plugin', 'affordance'));

create index if not exists frontend_mechanical_truth_surfaces_state_idx
  on planning_query_store.frontend_mechanical_truth_surfaces (screen_state);

create index if not exists frontend_mechanical_truth_surfaces_kind_idx
  on planning_query_store.frontend_mechanical_truth_surfaces (surface_kind);

create index if not exists frontend_mechanical_truth_surfaces_route_idx
  on planning_query_store.frontend_mechanical_truth_surfaces (route_path);

create index if not exists frontend_mechanical_truth_surfaces_owner_idx
  on planning_query_store.frontend_mechanical_truth_surfaces (frontend_owner);

create index if not exists frontend_mechanical_truth_surfaces_source_idx
  on planning_query_store.frontend_mechanical_truth_surfaces (source_path);

create or replace view planning_query_store.frontend_mechanical_truth_query as
select
  surface_id,
  surface_kind,
  route_path,
  screen_state,
  frontend_owner,
  registered_plugins,
  consumed_endpoints,
  zustand_stores,
  tanstack_queries,
  visible_no_backend_affordances,
  capability_gaps,
  evidence_refs,
  jsonb_array_length(registered_plugins) as registered_plugin_count,
  jsonb_array_length(consumed_endpoints) as consumed_endpoint_count,
  jsonb_array_length(zustand_stores) as zustand_store_count,
  jsonb_array_length(tanstack_queries) as tanstack_query_count,
  jsonb_array_length(visible_no_backend_affordances) as no_backend_affordance_count,
  jsonb_array_length(capability_gaps) as capability_gap_count,
  jsonb_array_length(evidence_refs) as evidence_ref_count,
  source_path,
  source_content_sha256,
  imported_at
from planning_query_store.frontend_mechanical_truth_surfaces;
