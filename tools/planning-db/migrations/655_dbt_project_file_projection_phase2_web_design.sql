-- Model the Web half of dbt file-backed Canvas before implementation. This
-- migration records planned ownership and reused rails without claiming
-- implementation evidence. Migration 656 performs the executable closeout.

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
values
  (
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql',
    repeat(md5('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH:planned:655'), 2),
    0,
    'Web dbt project graph query adapter',
    'component',
    'SYS-WEB-APP-SERVICES',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Adapt ProjectDbtGraphFromFiles to one typed browser query port and validate its versioned response.',
    'DbtProjectGraphQueryPort',
    'ProjectDbtGraphFromFiles',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql',
    repeat(md5('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL:planned:655'), 2),
    0,
    'dbt file projection model',
    'component',
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Resolve explicit file authority and project DbtProjectGraphProjection resources to canonical Canvas identities without draft semantics.',
    'DbtProjectFileCanvasProjection',
    'ProjectDbtGraphFromFiles;GetCanvasLayout',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql',
    repeat(md5('SYS-WEB-CANVAS-DBT-FILE-PROJECTION:planned:655'), 2),
    0,
    'Canvas dbt file projection surface',
    'component',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    true,
    'Compose an inspectable file-authoritative Canvas using the shared graph surface while excluding semantic mutation, preview, and run.',
    'DbtProjectFileCanvas',
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'owns', 'apps/web/src/app/ports/dbtProjectGraph.ts', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'owns', 'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts', 1),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'owns', 'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.test.ts', 2),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'owns', 'apps/web/src/app/queries/dbtProjectQueries.ts', 3),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'owns', 'apps/web/src/app/views/canvas/canvasRouteAuthority.ts', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'owns', 'apps/web/src/app/views/canvas/canvasRouteAuthority.test.ts', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 2),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts', 3),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 2),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts', 3),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 4),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 5)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'responsibility', 'Expose one typed ProjectDbtGraphFromFiles query port and HTTP adapter.', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'reason_to_change', 'The protected dbt graph HTTP contract, scope, response validation, or query cache policy changes.', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'invariant', 'The adapter parses DbtProjectGraphProjection.v1 and cannot synthesize graph-draft fallback data.', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'non_goal', 'Parse dbt, Jinja, manifests, or project files in the browser.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'responsibility', 'Resolve an explicit authority binding and map one dbt projection to canonical nodes and edges keyed by unique_id.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'reason_to_change', 'The route authority vocabulary or deterministic resource-to-Canvas mapping changes.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'invariant', 'Missing, malformed, or unknown explicit authority fails closed and never selects graph-draft authority.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'invariant', 'Source, model, seed, snapshot, test, exposure, and metric identities remain their dbt unique_id values.', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'invariant', 'Invalid and unavailable analysis preserve file authority and expose diagnostics instead of draft semantics.', 2),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'non_goal', 'Merge WorkspaceGraphAuthoringDraft.v1 nodes, edges, or revision state.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'responsibility', 'Compose query, route-local layout, inspection, and contextual code into a read-only file-backed Canvas.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'reason_to_change', 'The file-backed Canvas interaction posture, presentation composition, or file-resource workbench changes.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'Inspectability and layout movement are independent from semantic graph mutation permission.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'File-backed Canvas exposes no source import, graph mutation, Preview, Run, or graph-draft request.', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'Node Code opens originalFilePath in the existing workspace file working tree and uses the existing automatic synchronization command.', 2),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'Layout is local presentation state keyed by workspace scope, canvasId, authority kind, projectRoot, and stable resource identity.', 3),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'non_goal', 'Persist visual positions or semantic edits into dbt project files during Phase 2.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'consumer', 'SYS-WEB-CANVAS-GRAPH-SURFACE;web.component.canvas.NodeWorkbench;SYS-WEB-VIEWS-CODE', 0)
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
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
values
  (
    'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
    'Web dbt project graph query adapter',
    'query-view',
    'needed',
    'create',
    'Frontend / Services',
    'Validate and expose ProjectDbtGraphFromFiles through one browser query port.',
    '/canvas',
    'dbt',
    jsonb_build_array('Implementation and executable adapter evidence are pending.'),
    '[]'::jsonb,
    'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql',
    md5('frontend:dbt-project-graph-query:planned:655'),
    jsonb_build_object(
      'componentFamily', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
      'plannedFiles', jsonb_build_array(
        'apps/web/src/app/ports/dbtProjectGraph.ts',
        'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts',
        'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.test.ts',
        'apps/web/src/app/queries/dbtProjectQueries.ts'
      ),
      'implementationStatus', 'planned'
    )
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
    'dbt file projection model',
    'query-view',
    'needed',
    'create',
    'Frontend / Canvas',
    'Resolve explicit file authority and map the server projection into canonical Canvas identities.',
    '/canvas',
    'dbt',
    jsonb_build_array('Implementation and pure mapping evidence are pending.'),
    '[]'::jsonb,
    'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql',
    md5('frontend:dbt-file-projection-model:planned:655'),
    jsonb_build_object(
      'componentFamily', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
      'plannedFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasRouteAuthority.ts',
        'apps/web/src/app/views/canvas/canvasRouteAuthority.test.ts',
        'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts',
        'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts'
      ),
      'implementationStatus', 'planned'
    )
  ),
  (
    'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'Canvas dbt file projection surface',
    'primary-surface',
    'needed',
    'create',
    'Frontend / Canvas',
    'Compose an inspectable read-only dbt file graph with route-local layout and contextual Code.',
    '/canvas',
    'dbt',
    jsonb_build_array('Controller, presentation, architecture, Cypress, and human browser evidence are pending.'),
    '[]'::jsonb,
    'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql',
    md5('frontend:dbt-file-projection-surface:planned:655'),
    jsonb_build_object(
      'componentFamily', jsonb_build_array(
        'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
        'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
        'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
      ),
      'plannedFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts',
        'apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx',
        'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx',
        'apps/web/src/app/plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts',
        'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts',
        'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'
      ),
      'implementationStatus', 'planned'
    )
  )
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

delete from planning_query_store.frontend_component_local_cq_rails
where component_id in (
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
);

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'ProjectDbtGraphFromFiles', 'query', 'gap-needed', jsonb_build_object('owner', 'DbtProjectGraphProjection', 'reuse', true, 'phase', 2), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-query:ProjectDbtGraphFromFiles:655')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'ProjectDbtGraphFromFiles', 'projection', 'gap-needed', jsonb_build_object('owner', 'DbtProjectFileCanvasProjection', 'reuse', true, 'phase', 2), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-projection:ProjectDbtGraphFromFiles:655')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'GetCanvasLayout', 'local-query', 'implemented-local', jsonb_build_object('owner', 'CanvasLayoutProjection', 'reuse', true), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-projection:GetCanvasLayout:655')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'ProjectDbtGraphFromFiles', 'query', 'gap-needed', jsonb_build_object('owner', 'DbtProjectFileCanvas', 'reuse', true, 'phase', 2), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-surface:ProjectDbtGraphFromFiles:655')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'PersistCanvasLayout', 'local-command', 'implemented-local', jsonb_build_object('owner', 'CanvasLayoutProjection', 'reuse', true), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-surface:PersistCanvasLayout:655')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'InspectCanvasNodeProperties', 'query', 'partial-ui', jsonb_build_object('owner', 'CanvasNodeWorkbenchPanel', 'reuse', true, 'requiredPosture', 'read-only'), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-surface:InspectCanvasNodeProperties:655')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'ReadWorkspaceFiles', 'query', 'implemented-api', jsonb_build_object('owner', 'WorkspaceFiles', 'reuse', true), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-surface:ReadWorkspaceFiles:655')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'SaveWorkspaceFileContent', 'command', 'implemented-api', jsonb_build_object('owner', 'WorkspaceFileMutationCoordinator', 'reuse', true, 'manualSave', false), 'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql', md5('rail:web-surface:SaveWorkspaceFileContent:655'));

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
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
  'web.canvas.graph',
  '/canvas',
  'authority-selected-primary-surface',
  0,
  jsonb_build_object('activation', 'explicit dbt-project-files authority binding', 'fallback', false),
  'tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql',
  md5('surface:dbt-file-projection:web.canvas.graph:655')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = coalesce(implementation_refs, '[]'::jsonb)
    || jsonb_build_array('tools/planning-db/migrations/655_dbt_project_file_projection_phase2_web_design.sql'),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';
