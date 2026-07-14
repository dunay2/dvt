-- Reconcile component maturity after the transactional authority guard became
-- executable. This is metadata closeout only; it introduces no command, query,
-- service, or adapter alias.

update planning_query_store.governance_component_local_definitions
set
  cq_rails = 'ImportDbtProject;ProjectDbtGraphFromFiles;ImportWarehouseSources;SaveWorkspaceGraphDraft',
  source_path = 'tools/planning-db/migrations/677_canvas_authoring_authority_component_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented-authority-closeout:677'), 2),
  revision = revision + 1
where component_id in (
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
  'SYS-API-RUNTIME-CANVAS-AUTHORITY'
);

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
  'SYS-API-RUNTIME-CANVAS-AUTHORITY'
);

update architecture.component_responsibility
set status = 'implemented'
where responsibility_id in (
  'RESP-CANVAS-AUTHORITY-POLICY',
  'RESP-CANVAS-AUTHORITY-RUNTIME',
  'RESP-CANVAS-AUTHORITY-STORE'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-CANVAS-AUTHORITY-POLICY-USES-STORE',
  'REL-CANVAS-AUTHORITY-RUNTIME-COMPOSES-POLICY',
  'REL-CANVAS-AUTHORITY-RUNTIME-COMPOSES-STORE',
  'REL-DBT-IMPORT-PERSISTS-AUTHORITY',
  'REL-DBT-PROJECT-GRAPH-RESOLVES-PERSISTED-AUTHORITY',
  'REL-SOURCE-IMPORT-RESOLVES-PERSISTED-AUTHORITY'
);

with target as (
  select
    rail_id,
    (
      select jsonb_agg(to_jsonb(value) order by value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb))
        union
        select 'tools/planning-db/migrations/677_canvas_authoring_authority_component_closeout.sql'
      ) surfaces
    ) as surfaces
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = target.surfaces,
  allowed_implementation_surfaces = target.surfaces,
  raw_manifest = jsonb_set(
    rail.raw_manifest,
    '{allowedImplementationSurfaces}',
    target.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from target
where rail.rail_id = target.rail_id;
