-- Register DBT authoring fields as an effective local Canvas component. The
-- drift guard expects DbtAuthoringFields.tsx to resolve to this component; a
-- file mapping without an effective component is still unmapped in the DB view.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'WEB-CANVAS-DBT-AUTHORING-FIELDS-COMPONENT-20260626',
  'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1',
  'DBT authoring fields component registration',
  'Frontend / Canvas',
  'implemented',
  'The focused Canvas component drift query expects DbtAuthoringFields.tsx to belong to web.component.canvas.DbtAuthoringFields. That component was still only represented by older SYS-* inventory rows, so the effective frontend component registry could not join the file mapping. This migration makes DBT authoring fields a DB-first local component before UI behavior work proceeds.',
  'boundary_drift',
  'ConfigureCanvasDbtNode',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
values (
  'web.component.canvas.DbtAuthoringFields',
  'DbtAuthoringFields',
  'form',
  'current',
  'harden',
  'Frontend / Canvas',
  'Owns DBT node authoring field presentation for source/model/test metadata while the route controller owns DBT node state transitions.',
  '@dvt/web',
  '/canvas',
  'dbt',
  jsonb_build_array(
    'DBT tests still need richer target/column semantics before the full demanding-user P0 flow can close.'
  ),
  jsonb_build_array(
    'EV-WEB-CANVAS-DBT-AUTHORING-FIELDS-COMPONENT'
  ),
  'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
  md5('web.component.canvas.DbtAuthoringFields:302'),
  jsonb_build_object(
    'dbFirst', true,
    'fowlerSignal', 'boundary_drift',
    'governingRail', 'ConfigureCanvasDbtNode',
    'registryReason', 'The Canvas component drift query requires an effective component row before file mappings count.'
  )
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.DbtAuthoringFields',
  'web.canvas.graph',
  '/canvas',
  'node-workbench-dbt-authoring-fields',
  60,
  jsonb_build_object('surfaceRole', 'DBT authoring fields template'),
  'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
  md5('DbtAuthoringFields:web.canvas.graph:302')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.DbtAuthoringFields',
  'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
  'component',
  'DbtAuthoringFields',
  jsonb_build_object('role', 'DBT authoring fields template', 'rail', 'ConfigureCanvasDbtNode'),
  'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
  md5('DbtAuthoringFields.tsx:302')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.DbtAuthoringFields',
  'ConfigureCanvasDbtNode',
  'local-command',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Project DBT node authoring controls over the route-owned node draft without owning Canvas graph mutation.',
    'owner', 'DbtAuthoringFields'
  ),
  'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
  md5('DbtAuthoringFields:ConfigureCanvasDbtNode:302')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'EV-WEB-CANVAS-DBT-AUTHORING-FIELDS-COMPONENT',
  'web.component.canvas.DbtAuthoringFields',
  'test',
  'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs',
  'passing',
  jsonb_build_object('scope', 'DBT authoring fields effective component registration'),
  'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
  md5('EV-WEB-CANVAS-DBT-AUTHORING-FIELDS-COMPONENT:302')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql#DbtAuthoringFields')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql'
    ) refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql'
    ) surfaces
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs'
    ) guards
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs'
    ) gates
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'dbtAuthoringFieldsComponent', 'web.component.canvas.DbtAuthoringFields',
      'allowedImplementationSurfaces', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          select 'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql'
        ) raw_surfaces
      ),
      'architectureGuards', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'architectureGuards', '[]'::jsonb))
          union all
          select 'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs'
        ) raw_guards
      ),
      'completionGate', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'completionGate', '[]'::jsonb))
          union all
          select 'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs'
        ) raw_gates
      ),
      'redGreenCycles', coalesce(raw_manifest->'redGreenCycles', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'id', 'dbt-authoring-fields-effective-component',
            'redTest', 'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs',
            'expectedFailure', 'Migration 302 and the DBT authoring fields local component were absent.',
            'patchSurfaces', jsonb_build_array(
              'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
              'scripts/planning-db-migrate.test.cjs'
            ),
            'greenTest', 'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs'
          )
        ),
      'symbols', coalesce(raw_manifest->'symbols', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'name', 'DbtAuthoringFields',
            'path', 'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
            'dddOwner', 'FrontendComponentRegistry',
            'cqRails', jsonb_build_array('ConfigureCanvasDbtNode', 'ListCanvasComponentRegistryDrift'),
            'fowlerSignals', jsonb_build_array('boundary_drift'),
            'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
            'cypressCoverage', 'not_applicable:planning_db_registry_slice',
            'unitTests', jsonb_build_array(
              'node --test --test-name-pattern "DBT authoring fields as an effective Canvas component" scripts/planning-db-migrate.test.cjs'
            )
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/302_register_dbt_authoring_fields_component.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-REGISTRY-DRIFT-1:DbtAuthoringFields:302'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1'
  and rail_name = 'ListCanvasComponentRegistryDrift';
