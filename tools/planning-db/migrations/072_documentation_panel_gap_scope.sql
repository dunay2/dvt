drop view if exists component_engineering.documentation_panel_query;
drop view if exists planning_query_store.documentation_panel_query;

create or replace view planning_query_store.documentation_panel_query as
with document_panels as (
  select
    'document:' || lifecycle.document_path || ':metadata' as panel_id,
    'metadata'::text as panel_surface,
    10::int as panel_order,
    'document'::text as entity_kind,
    lifecycle.document_path as entity_id,
    lifecycle.title as entity_label,
    ''::text as component_id,
    lifecycle.document_path as source_path,
    'frontmatter'::text as section_kind,
    10::int as section_order,
    field.field_key,
    field.field_value,
    'text'::text as value_kind,
    field.field_order,
    case
      when lifecycle.lifecycle_gap_kind = 'none' then 'ready'
      else 'blocked'
    end as panel_state,
    lifecycle.lifecycle_gap_kind as gap_kind,
    lifecycle.source_content_sha256
  from planning_query_store.documentation_lifecycle_query lifecycle
  cross join lateral (
    values
      ('title', lifecycle.title, 10),
      ('document_type', lifecycle.document_type, 20),
      ('status', coalesce(lifecycle.status, ''), 30),
      ('canonicality', lifecycle.canonicality, 40),
      ('lifecycle_state', lifecycle.lifecycle_state, 50),
      ('subject_key', coalesce(lifecycle.subject_key, ''), 60),
      ('owner', coalesce(lifecycle.owner, ''), 70)
  ) as field(field_key, field_value, field_order)
),
document_section_panels as (
  select
    'document:' || document.document_path || ':sections' as panel_id,
    'sections'::text as panel_surface,
    20::int as panel_order,
    'document'::text as entity_kind,
    document.document_path as entity_id,
    document.title as entity_label,
    ''::text as component_id,
    document.document_path as source_path,
    'section'::text as section_kind,
    section.ordinal::int as section_order,
    'heading'::text as field_key,
    section.heading as field_value,
    'text'::text as value_kind,
    10::int as field_order,
    'ready'::text as panel_state,
    'none'::text as gap_kind,
    document.source_content_sha256
  from planning_query_store.knowledge_document_sections section
  join planning_query_store.knowledge_documents document
    on document.document_id = section.document_id
),
component_panels as (
  select
    'component:' || roadmap.component_id || ':properties' as panel_id,
    'properties'::text as panel_surface,
    30::int as panel_order,
    'component'::text as entity_kind,
    roadmap.component_id as entity_id,
    roadmap.component_name as entity_label,
    roadmap.component_id,
    roadmap.source_path,
    'overview'::text as section_kind,
    10::int as section_order,
    field.field_key,
    field.field_value,
    'text'::text as value_kind,
    field.field_order,
    case
      when roadmap.gap_kind = 'none' then 'ready'
      else 'blocked'
    end as panel_state,
    roadmap.gap_kind,
    roadmap.source_content_sha256
  from planning_query_store.component_roadmap_query roadmap
  cross join lateral (
    values
      ('component_name', roadmap.component_name, 10),
      ('implementation_state', roadmap.implementation_state, 20),
      ('planning_state', roadmap.planning_state, 30),
      ('architecture_status', roadmap.architecture_status, 40),
      ('engineering_quality_state', roadmap.engineering_quality_state, 50),
      ('planned_feature_count', roadmap.planned_feature_count::text, 60),
      ('implemented_feature_count', roadmap.implemented_feature_count::text, 70)
  ) as field(field_key, field_value, field_order)
),
required_section_gaps as (
  select
    'document:' || lifecycle.document_path || ':gaps' as panel_id,
    'gaps'::text as panel_surface,
    40::int as panel_order,
    'document'::text as entity_kind,
    lifecycle.document_path as entity_id,
    lifecycle.title as entity_label,
    ''::text as component_id,
    lifecycle.document_path as source_path,
    required.section_kind,
    required.section_order,
    'required_section'::text as field_key,
    required.section_kind as field_value,
    'text'::text as value_kind,
    10::int as field_order,
    'blocked'::text as panel_state,
    'missing_required_section'::text as gap_kind,
    lifecycle.source_content_sha256
  from planning_query_store.documentation_lifecycle_query lifecycle
  cross join (
    values
      ('overview', 10),
      ('responsibilities', 20),
      ('command-query-rails', 30),
      ('validation', 40)
  ) as required(section_kind, section_order)
  left join planning_query_store.knowledge_documents document
    on document.document_path = lifecycle.document_path
  left join planning_query_store.knowledge_document_sections section
    on section.document_id = document.document_id
   and planning_query_store.documentation_subject_key(section.heading) = required.section_kind
  where (
      lifecycle.document_path like 'docs/architecture/components/%'
      or lifecycle.document_path like 'docs/planning/proposals/%'
    )
    and section.section_id is null
),
panel_rows as (
  select * from document_panels
  union all
  select * from document_section_panels
  union all
  select * from component_panels
  union all
  select * from required_section_gaps
)
select
  panel_id,
  panel_surface,
  panel_order,
  entity_kind,
  entity_id,
  entity_label,
  component_id,
  source_path,
  section_kind,
  section_order,
  field_key,
  coalesce(field_value, '') as field_value,
  value_kind,
  field_order,
  panel_state,
  gap_kind,
  gap_kind <> 'none' as is_gap,
  source_content_sha256
from panel_rows;

create or replace view component_engineering.documentation_panel_query as
select *
from planning_query_store.documentation_panel_query;

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
  'Documentation panel catalog',
  'planning_query_store.documentation_panel_query over documentation lifecycle, component roadmap, and knowledge sections',
  'Use existing document import and component/architecture write rails',
  'generated',
  'pnpm planning:db:query documentation-panels',
  'Relational panel facts for DB-generated documentation and component UI panels',
  'node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs',
  'Generated-only',
  'tools/planning-db/migrations/072_documentation_panel_gap_scope.sql',
  repeat('0', 64),
  0,
  'migration',
  '{"authority":"db_projection","panelModel":"relational","panelRuntimeScope":"component_and_proposal_required_sections"}'::jsonb
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
