create table if not exists planning_query_store.frontend_components (
  component_id text primary key,
  component_name text not null,
  component_kind text not null,
  component_status text not null,
  reuse_decision text not null,
  frontend_owner text not null,
  responsibility text not null,
  package_name text not null default '@dvt/web',
  route_scope text,
  plugin_scope text,
  capability_gaps jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  raw_component jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

create table if not exists planning_query_store.frontend_surface_component_links (
  component_id text not null references planning_query_store.frontend_components(component_id) on delete cascade,
  surface_id text not null references planning_query_store.frontend_mechanical_truth_surfaces(surface_id) on delete cascade,
  route_path text,
  placement_kind text not null,
  placement_order integer,
  raw_link jsonb not null default '{}'::jsonb,
  primary key (component_id, surface_id, placement_kind)
);

create table if not exists planning_query_store.frontend_component_files (
  component_id text not null references planning_query_store.frontend_components(component_id) on delete cascade,
  file_path text not null,
  file_role text not null,
  exported_symbol text,
  raw_file jsonb not null default '{}'::jsonb,
  primary key (component_id, file_path, file_role)
);

create table if not exists planning_query_store.frontend_component_cq_rails (
  component_id text not null references planning_query_store.frontend_components(component_id) on delete cascade,
  rail_name text not null,
  rail_kind text not null,
  rail_status text not null,
  raw_rail jsonb not null default '{}'::jsonb,
  primary key (component_id, rail_name)
);

create table if not exists planning_query_store.frontend_component_evidence (
  evidence_id text primary key,
  component_id text not null references planning_query_store.frontend_components(component_id) on delete cascade,
  evidence_kind text not null,
  evidence_ref text not null,
  evidence_status text not null,
  raw_evidence jsonb not null default '{}'::jsonb
);

alter table planning_query_store.frontend_components
  drop constraint if exists frontend_components_kind_check;

alter table planning_query_store.frontend_components
  add constraint frontend_components_kind_check
  check (component_kind in (
    'shell-frame',
    'shell-bar',
    'navigation',
    'health-banner',
    'console-drawer',
    'route-workbench',
    'route-toolbar',
    'state-view',
    'canvas-viewport',
    'canvas-explorer',
    'canvas-inspector',
    'modal',
    'form',
    'query-view',
    'table',
    'tab-strip',
    'primary-surface',
    'context-panel',
    'icon-wrapper'
  ));

alter table planning_query_store.frontend_components
  drop constraint if exists frontend_components_status_check;

alter table planning_query_store.frontend_components
  add constraint frontend_components_status_check
  check (component_status in ('current', 'needed', 'planned', 'partial', 'experimental', 'retire'));

alter table planning_query_store.frontend_components
  drop constraint if exists frontend_components_reuse_decision_check;

alter table planning_query_store.frontend_components
  add constraint frontend_components_reuse_decision_check
  check (reuse_decision in ('reuse', 'extract', 'create', 'harden', 'standardize', 'retire'));

alter table planning_query_store.frontend_component_files
  drop constraint if exists frontend_component_files_role_check;

alter table planning_query_store.frontend_component_files
  add constraint frontend_component_files_role_check
  check (file_role in (
    'component',
    'view',
    'hook',
    'store',
    'port',
    'adapter',
    'query',
    'model',
    'view-model',
    'tokens',
    'test',
    'architecture-test',
    'e2e-test',
    'documentation'
  ));

alter table planning_query_store.frontend_component_cq_rails
  drop constraint if exists frontend_component_cq_rails_kind_check;

alter table planning_query_store.frontend_component_cq_rails
  add constraint frontend_component_cq_rails_kind_check
  check (rail_kind in ('command', 'query', 'projection', 'local-command', 'local-query', 'command-probe'));

alter table planning_query_store.frontend_component_cq_rails
  drop constraint if exists frontend_component_cq_rails_status_check;

alter table planning_query_store.frontend_component_cq_rails
  add constraint frontend_component_cq_rails_status_check
  check (rail_status in (
    'implemented-api',
    'implemented-local',
    'implemented-projection',
    'partial-ui',
    'fail-closed',
    'gap-needed',
    'not-front-default'
  ));

create index if not exists frontend_components_kind_idx
  on planning_query_store.frontend_components (component_kind);

create index if not exists frontend_components_status_idx
  on planning_query_store.frontend_components (component_status);

create index if not exists frontend_components_owner_idx
  on planning_query_store.frontend_components (frontend_owner);

create index if not exists frontend_surface_component_links_surface_idx
  on planning_query_store.frontend_surface_component_links (surface_id);

create index if not exists frontend_component_files_path_idx
  on planning_query_store.frontend_component_files (file_path);

create index if not exists frontend_component_cq_rails_status_idx
  on planning_query_store.frontend_component_cq_rails (rail_status);

create or replace view planning_query_store.frontend_component_summary_query as
select
  component.component_id,
  component.component_name,
  component.component_kind,
  component.component_status,
  component.reuse_decision,
  component.frontend_owner,
  component.responsibility,
  component.package_name,
  component.route_scope,
  component.plugin_scope,
  component.capability_gaps,
  component.evidence_refs,
  coalesce(
    (
      select jsonb_agg(link.surface_id order by link.surface_id)
      from planning_query_store.frontend_surface_component_links link
      where link.component_id = component.component_id
    ),
    '[]'::jsonb
  ) as surface_ids,
  (
    select count(*)::int
    from planning_query_store.frontend_surface_component_links link
    where link.component_id = component.component_id
  ) as surface_count,
  (
    select count(*)::int
    from planning_query_store.frontend_component_files file_ref
    where file_ref.component_id = component.component_id
  ) as file_count,
  (
    select count(*)::int
    from planning_query_store.frontend_component_cq_rails rail
    where rail.component_id = component.component_id
  ) as rail_count,
  (
    select count(*)::int
    from planning_query_store.frontend_component_evidence evidence
    where evidence.component_id = component.component_id
  ) as evidence_count,
  jsonb_array_length(component.capability_gaps) as capability_gap_count,
  jsonb_array_length(component.evidence_refs) as evidence_ref_count,
  component.source_path,
  component.source_content_sha256,
  component.imported_at
from planning_query_store.frontend_components component;

create or replace view planning_query_store.frontend_component_file_query as
select
  file_ref.component_id,
  component.component_name,
  file_ref.file_path,
  file_ref.file_role,
  file_ref.exported_symbol,
  component.component_status,
  component.source_path,
  component.source_content_sha256
from planning_query_store.frontend_component_files file_ref
join planning_query_store.frontend_components component
  on component.component_id = file_ref.component_id;

create or replace view planning_query_store.frontend_component_rail_query as
select
  rail.component_id,
  component.component_name,
  rail.rail_name,
  rail.rail_kind,
  rail.rail_status,
  component.component_status,
  component.source_path,
  component.source_content_sha256
from planning_query_store.frontend_component_cq_rails rail
join planning_query_store.frontend_components component
  on component.component_id = rail.component_id;
