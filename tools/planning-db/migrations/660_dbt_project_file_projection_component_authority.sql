-- Promote the implemented Web dbt file projection to complete architecture
-- authority. The family remains an aggregate; concrete files, rails, and
-- executable evidence belong only to its model and presentation leaves.

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/660_dbt_project_file_projection_component_authority.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-DBT-FILE-PROJECTION:family:660'), 2),
  name = 'Canvas dbt file projection family',
  status = 'canonical',
  children_required = true,
  owned_concern = 'Define the file-authoritative Canvas family boundary and keep projection policy separate from presentation composition.',
  ddd_owner = 'DbtProjectFileCanvasFamily',
  cq_rails = 'none - aggregate family',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
  'tools/planning-db/migrations/660_dbt_project_file_projection_component_authority.sql',
  repeat(md5('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE:canonical:660'), 2),
  0,
  'Canvas dbt file projection presentation surface',
  'component',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
  'SYS-DVT',
  'SYS-WEB',
  'canonical',
  false,
  'Coordinate and render the inspectable read-only file-backed Canvas without owning resource projection policy or semantic mutation.',
  'DbtProjectFileCanvasSurface',
  'ProjectDbtGraphFromFiles;PersistCanvasLayout;InspectCanvasNodeProperties;ReadWorkspaceFiles;SaveWorkspaceFileContent',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

update planning_query_store.governance_component_local_ownership_patterns
set component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

update planning_query_store.governance_component_local_semantic_items
set component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
  and item_value not in (
    'Group the independently changeable dbt projection model and file Canvas presentation surface under one authority boundary.',
    'The boundary between file-authoritative projection policy and Canvas presentation changes.',
    'The aggregate owns no source file, command, query, or executable evidence directly.',
    'Canvas route authority branch',
    'Architecture contains relations to the projection-model and presentation-surface leaves.',
    'The family is canonical while every concrete file resolves to exactly one architecture-authoritative leaf.'
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'responsibility',
    'Group the independently changeable dbt projection model and file Canvas presentation surface under one authority boundary.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'reason_to_change',
    'The boundary between file-authoritative projection policy and Canvas presentation changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'invariant',
    'The aggregate owns no source file, command, query, or executable evidence directly.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'consumer',
    'Canvas route authority branch',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'public_api',
    'Architecture contains relations to the projection-model and presentation-surface leaves.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'transition',
    'The family is canonical while every concrete file resolves to exactly one architecture-authoritative leaf.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'responsibility',
    'Coordinate query state, route-local layout, inspection, and contextual Code in one read-only file-backed Canvas.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'reason_to_change',
    'The file-backed Canvas presentation composition or interaction posture changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'non_goal',
    'Interpret dbt files, own projection identity rules, or introduce semantic graph mutation.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
select
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
  'Canvas dbt file projection presentation surface',
  'canvas-viewport',
  'current',
  'create',
  frontend_owner,
  'Coordinate and render the inspectable read-only dbt file graph while projection policy remains in its model leaf.',
  package_name,
  route_scope,
  plugin_scope,
  '[]'::jsonb,
  evidence_refs,
  'tools/planning-db/migrations/660_dbt_project_file_projection_component_authority.sql',
  md5('frontend:dbt-file-projection-surface:current:660'),
  jsonb_build_object(
    'componentFamily', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'relationshipAuthority', 'architecture.component_relation',
    'implementationStatus', 'current',
    'phase', 2,
    'authority', 'dbt-project-files',
    'semanticMutation', false
  )
from planning_query_store.frontend_component_local_components
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
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
  evidence_refs = case
    when jsonb_array_length(excluded.evidence_refs) > 0 then excluded.evidence_refs
    else planning_query_store.frontend_component_local_components.evidence_refs
  end,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  component_name = 'Canvas dbt file projection family',
  component_kind = 'primary-surface',
  component_status = 'current',
  reuse_decision = 'create',
  responsibility = 'Define the file-authoritative Canvas family boundary without owning leaf files or executable rails.',
  evidence_refs = '[]'::jsonb,
  source_path = 'tools/planning-db/migrations/660_dbt_project_file_projection_component_authority.sql',
  source_content_sha256 = md5('frontend:dbt-file-projection-family:current:660'),
  raw_component = (coalesce(raw_component, '{}'::jsonb) - 'plannedFiles') || jsonb_build_object(
    'componentFamily', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'relationshipAuthority', 'architecture.component_relation',
    'implementationStatus', 'current',
    'phase', 2,
    'authority', 'dbt-project-files',
    'aggregate', true
  ),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

update planning_query_store.frontend_component_local_files
set component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

update planning_query_store.frontend_component_local_cq_rails
set component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

update planning_query_store.frontend_component_local_evidence
set component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

update planning_query_store.frontend_component_validation_evidence
set component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

update planning_query_store.frontend_component_local_surface_links
set component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE'
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
values
  (
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'Web dbt project graph query adapter',
    'service',
    'application',
    'DbtProjectGraphQueryPort',
    'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts',
    'IDbtProjectGraphQueryPort',
    'browser',
    'high',
    'implemented',
    90,
    'SYS-WEB-APP-SERVICES'
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'Canvas dbt file projection family',
    'module',
    'ui',
    'DbtProjectFileCanvasFamily',
    '.',
    'File-authoritative Canvas family boundary',
    'browser',
    'high',
    'implemented',
    90,
    'SYS-WEB-CANVAS-GRAPH-SURFACE'
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'dbt file projection model',
    'module',
    'ui',
    'DbtProjectFileCanvasProjection',
    'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts',
    'projectDbtProjectGraphToCanonicalCanvas and buildDbtProjectFileInitialNodePositions',
    'browser',
    'high',
    'implemented',
    92,
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'Canvas dbt file projection presentation surface',
    'ui-view',
    'ui',
    'DbtProjectFileCanvasSurface',
    'apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx',
    'DbtProjectFileCanvas read-only presentation',
    'browser',
    'high',
    'implemented',
    92,
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  (
    'RESP-WEB-DBT-PROJECT-GRAPH-ADAPTER',
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'Expose the versioned ProjectDbtGraphFromFiles query through one typed browser port and HTTP adapter.',
    'The protected graph query contract, scope, validation, or browser query policy changes.',
    'DbtProjectGraphQueryPort',
    'implemented'
  ),
  (
    'RESP-WEB-DBT-FILE-PROJECTION-FAMILY',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'Maintain the boundary between dbt file projection policy and its Canvas presentation.',
    'The component-family boundary or authority ownership changes.',
    'DbtProjectFileCanvasFamily',
    'implemented'
  ),
  (
    'RESP-WEB-DBT-FILE-PROJECTION-MODEL',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'Map one authoritative dbt projection to stable canonical Canvas identities and deterministic initial layout.',
    'The authority vocabulary, resource mapping, identity, diagnostics, or initial-layout policy changes.',
    'DbtProjectFileCanvasProjection',
    'implemented'
  ),
  (
    'RESP-WEB-DBT-FILE-PROJECTION-SURFACE',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'Coordinate and render an inspectable read-only file-backed Canvas.',
    'The Canvas presentation composition, query-state presentation, or interaction posture changes.',
    'DbtProjectFileCanvasSurface',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  (
    'REL-WEB-APP-SERVICES-CONTAINS-DBT-PROJECT-GRAPH',
    'SYS-WEB-APP-SERVICES',
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'contains',
    'outbound',
    'build_time',
    'The dbt graph browser adapter loses its application-service ownership.',
    'not_applicable',
    jsonb_build_array('apps/web/src/app/services/composition/appServices.ts'),
    'implemented'
  ),
  (
    'REL-WEB-GRAPH-SURFACE-CONTAINS-DBT-FILE-PROJECTION',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'contains',
    'outbound',
    'build_time',
    'The file-authoritative route bypasses the shared Canvas graph surface.',
    'workspace:graph-draft:view',
    jsonb_build_array('apps/web/src/app/views/Canvas.tsx'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-FILE-PROJECTION-CONTAINS-MODEL',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'contains',
    'outbound',
    'build_time',
    'Projection identity and layout policy leak into presentation composition.',
    'not_applicable',
    jsonb_build_array('apps/web/src/app/views/canvas/dbtProjectFileProjection.ts'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-FILE-PROJECTION-CONTAINS-SURFACE',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'contains',
    'outbound',
    'build_time',
    'Presentation files become direct ownership of the aggregate family.',
    'not_applicable',
    jsonb_build_array('apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-FILE-SURFACE-USES-PROJECTION-MODEL',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'depends_on',
    'outbound',
    'sync',
    'The surface synthesizes resource identity, diagnostics, or layout policy.',
    'not_applicable',
    jsonb_build_array('apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-FILE-SURFACE-CALLS-PROJECT-GRAPH-ADAPTER',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'calls',
    'outbound',
    'async',
    'Query failure is hidden or replaced with graph-draft fallback data.',
    'workspace:graph-draft:view with tenant/project/environment scope',
    jsonb_build_array('apps/web/src/app/queries/dbtProjectQueries.ts', 'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-PROJECT-GRAPH-USES-PROJECTION-CONTRACT',
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING',
    'depends_on',
    'outbound',
    'sync',
    'The browser accepts a parallel or unversioned projection payload.',
    'tenant/project/environment workspace scope',
    jsonb_build_array('apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts'),
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  negative_tests,
  status
)
values (
  'PORT-WEB-DBT-PROJECT-GRAPH-QUERY',
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'ProjectDbtGraphFromFiles',
  'query',
  'outbound',
  array[
    'reject an authority binding that differs from the request',
    'reject an invalid versioned projection payload',
    'never synthesize graph-draft fallback data'
  ]::text[],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-PROJECT-GRAPH-ADAPTER',
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.test.ts',
    'integration',
    'negative',
    true,
    'pnpm --filter @dvt/web exec vitest run src/app/services/dbtProject/dbtProjectGraph.api.test.ts'
  ),
  (
    'TEST-WEB-DBT-FILE-PROJECTION-FAMILY',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'scripts/planning-db-migrate.test.cjs',
    'architecture',
    'boundary',
    true,
    'node --test scripts/planning-db-migrate.test.cjs'
  ),
  (
    'TEST-WEB-DBT-FILE-PROJECTION-MODEL',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/dbtProjectFileProjection.test.ts src/app/views/canvas/dbtProjectFileLayout.test.ts'
  ),
  (
    'TEST-WEB-DBT-FILE-PROJECTION-SURFACE-ARCHITECTURE',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts'
  ),
  (
    'TEST-WEB-DBT-FILE-PROJECTION-SURFACE-LIVE',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
    'e2e',
    'flow',
    true,
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  (
    'OBS-WEB-DBT-PROJECT-GRAPH-ADAPTER',
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'Typed query failure states are handed to the owning Canvas surface; transport telemetry remains owned by the protected API adapter.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-DBT-FILE-PROJECTION-FAMILY',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'The aggregate has no runtime behavior; component integrity and drift queries observe its boundary.',
    'metric',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-DBT-FILE-PROJECTION-MODEL',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'The pure projection model has no runtime side effects; invalid and unavailable diagnostics are explicit return data.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-DBT-FILE-PROJECTION-SURFACE',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE',
    'Loading, invalid, unavailable, and ready projection states are visible in the Canvas presentation and browser proof.',
    'log',
    true,
    'implemented'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

with required_surface(surface) as (
  values ('tools/planning-db/migrations/660_dbt_project_file_projection_component_authority.sql')
), reconciled_surface as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select value as surface
    from planning_query_store.feature_mechanization_local_rails rail,
      lateral jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
      ) item(value)
    where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
    union
    select surface from required_surface
  ) all_surface
), reconciled_ref as (
  select jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select value as ref
    from planning_query_store.feature_mechanization_local_rails rail,
      lateral jsonb_array_elements_text(
        coalesce(rail.implementation_refs, '[]'::jsonb)
      ) item(value)
    where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
    union
    values ('tools/planning-db/migrations/660_dbt_project_file_projection_component_authority.sql')
  ) all_ref
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = reconciled_surface.surfaces,
  implementation_refs = reconciled_ref.refs,
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{allowedImplementationSurfaces}',
    reconciled_surface.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/660_dbt_project_file_projection_component_authority.sql',
  source_content_sha256 = repeat(md5('ProjectDbtGraphFromFiles:component-authority:660'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surface, reconciled_ref
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

refresh materialized view planning_query_store.component_engineering_component_tree_projection;
refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
refresh materialized view planning_query_store.component_engineering_rule_evaluation_projection;
