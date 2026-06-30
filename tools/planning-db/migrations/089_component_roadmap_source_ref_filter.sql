create or replace view planning_query_store.component_roadmap_query as
with feature_manifests as (
  select distinct
    rail.feature_id,
    rail.mechanization_status,
    rail.source_path,
    rail.source_content_sha256,
    rail.raw_manifest
  from planning_query_store.command_query_rail_manifest_query rail
  where rail.raw_manifest is not null
    and rail.raw_manifest ? 'featureId'
),
planned_component_refs as (
  select
    nullif(btrim(component_ref.value), '') as component_ref,
    manifest.feature_id,
    manifest.mechanization_status,
    manifest.source_path,
    manifest.source_content_sha256
  from feature_manifests manifest
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(manifest.raw_manifest->'componentGuides') = 'array'
        then manifest.raw_manifest->'componentGuides'
      else '[]'::jsonb
    end
  ) as component_ref(value)
  where nullif(btrim(component_ref.value), '') is not null
    and component_ref.value !~ '^(docs/|buzon/)'
    and (
      component_ref.value like 'SYS-%'
      or component_ref.value ~ '^(apps|packages|scripts|tools|\.github)/'
    )
),
planned_components as (
  select
    component_ref,
    count(distinct feature_id)::int as planned_feature_count,
    count(distinct feature_id) filter (
      where mechanization_status in ('implemented', 'closed')
    )::int as implemented_feature_count,
    min(source_path) as source_path,
    min(source_content_sha256) as source_content_sha256,
    jsonb_agg(distinct feature_id order by feature_id) as feature_ids,
    jsonb_agg(distinct mechanization_status order by mechanization_status) as mechanization_states
  from planned_component_refs
  group by component_ref
),
engineering_components as (
  select
    component_id,
    name,
    component_level,
    parent_component_id,
    domain_unit,
    status,
    governance_state,
    quality_state,
    metadata_state,
    source_paths,
    source_content_sha256_values
  from component_engineering.component_metadata_query
),
architecture_components as (
  select
    component_id,
    name,
    kind,
    layer,
    owner,
    repo_path,
    status,
    maturity_score,
    parent_component_id
  from architecture.component_query
),
planned_roadmap as (
  select
    coalesce(engineering.component_id, architecture.component_id, planned.component_ref) as component_id,
    planned.component_ref,
    coalesce(engineering.name, architecture.name, planned.component_ref) as component_name,
    case
      when engineering.component_id is not null then 'implemented'
      else 'planned'
    end as implementation_state,
    case
      when planned.planned_feature_count > 0
        and planned.planned_feature_count = planned.implemented_feature_count
        then 'programmed'
      else 'open'
    end as planning_state,
    case
      when engineering.component_id is null then 'planned_component_missing_db_component'
      when architecture.component_id is null then 'component_missing_architecture_authority'
      else 'none'
    end as gap_kind,
    coalesce(architecture.status, 'missing') as architecture_status,
    coalesce(engineering.quality_state, 'missing') as engineering_quality_state,
    planned.planned_feature_count,
    planned.implemented_feature_count,
    planned.source_path,
    planned.source_content_sha256
  from planned_components planned
  left join engineering_components engineering
    on engineering.component_id = planned.component_ref
    or exists (
      select 1
      from jsonb_array_elements_text(coalesce(engineering.source_paths, '[]'::jsonb)) as source_path(value)
      where source_path.value = planned.component_ref
    )
  left join architecture_components architecture
    on architecture.component_id = coalesce(engineering.component_id, planned.component_ref)
    or architecture.repo_path = planned.component_ref
),
engineering_roadmap as (
  select
    engineering.component_id,
    null::text as component_ref,
    engineering.name as component_name,
    'implemented'::text as implementation_state,
    'unplanned'::text as planning_state,
    case
      when architecture.component_id is null then 'component_missing_architecture_authority'
      else 'none'
    end as gap_kind,
    coalesce(architecture.status, 'missing') as architecture_status,
    coalesce(engineering.quality_state, 'missing') as engineering_quality_state,
    0::int as planned_feature_count,
    0::int as implemented_feature_count,
    engineering.source_paths->>0 as source_path,
    engineering.source_content_sha256_values->>0 as source_content_sha256
  from engineering_components engineering
  left join architecture_components architecture
    on architecture.component_id = engineering.component_id
  where not exists (
    select 1
    from planned_components planned
    where planned.component_ref = engineering.component_id
       or exists (
         select 1
         from jsonb_array_elements_text(coalesce(engineering.source_paths, '[]'::jsonb)) as source_path(value)
         where source_path.value = planned.component_ref
       )
  )
),
architecture_roadmap as (
  select
    architecture.component_id,
    null::text as component_ref,
    architecture.name as component_name,
    'declared'::text as implementation_state,
    'accepted'::text as planning_state,
    'architecture_component_missing_engineering_component'::text as gap_kind,
    architecture.status as architecture_status,
    'missing'::text as engineering_quality_state,
    0::int as planned_feature_count,
    0::int as implemented_feature_count,
    architecture.repo_path as source_path,
    repeat('0', 64) as source_content_sha256
  from architecture_components architecture
  where not exists (
    select 1
    from engineering_components engineering
    where engineering.component_id = architecture.component_id
  )
  and not exists (
    select 1
    from planned_components planned
    where planned.component_ref = architecture.component_id
       or planned.component_ref = architecture.repo_path
  )
),
component_roadmap as (
  select * from planned_roadmap
  union all
  select * from engineering_roadmap
  union all
  select * from architecture_roadmap
)
select
  component_id as component_key,
  component_id,
  component_ref,
  component_name,
  implementation_state,
  planning_state,
  gap_kind,
  gap_kind <> 'none' as is_gap,
  architecture_status,
  engineering_quality_state,
  planned_feature_count,
  implemented_feature_count,
  coalesce(source_path, '-') as source_path,
  coalesce(source_content_sha256, repeat('0', 64)) as source_content_sha256
from component_roadmap;

create or replace view component_engineering.component_roadmap_query as
select *
from planning_query_store.component_roadmap_query;

insert into planning_query_store.db_governance_surfaces (
  surface_name,
  canonical_source,
  write_rail,
  write_rail_kind,
  read_query_rail,
  projection,
  validation,
  migration_state,
  source_ref,
  source_content_sha256,
  revision,
  updated_by,
  raw_surface
)
values (
  'System component roadmap',
  'planning_query_store.component_roadmap_query over component_engineering, architecture, and feature-mechanization DB projections',
  'Use existing component, architecture, and feature-mechanization write rails',
  'generated',
  'pnpm planning:db:query component-roadmap',
  'DB read model for implemented, declared, and planned component gap inspection; feature-mechanization documentation guides remain sources, not component ids',
  'node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs',
  'Generated-only',
  'tools/planning-db/migrations/089_component_roadmap_source_ref_filter.sql',
  repeat('0', 64),
  0,
  'migration',
  '{"authority":"db_projection","componentRefFilter":"mechanical-component-id-or-repo-path"}'::jsonb
)
on conflict (surface_name) do update
set
  canonical_source = excluded.canonical_source,
  write_rail = excluded.write_rail,
  write_rail_kind = excluded.write_rail_kind,
  read_query_rail = excluded.read_query_rail,
  projection = excluded.projection,
  validation = excluded.validation,
  migration_state = excluded.migration_state,
  source_ref = excluded.source_ref,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.db_governance_surfaces.revision + 1,
  updated_by = excluded.updated_by,
  updated_at = now(),
  raw_surface = excluded.raw_surface;
