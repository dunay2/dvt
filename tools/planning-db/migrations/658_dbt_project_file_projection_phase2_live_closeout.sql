-- Close only the read-only dbt file projection phase. The round-trip umbrella
-- remains open for later visual-authoring and execution-authority phases.

update architecture.design
set
  status = 'implemented',
  rationale = 'Protected workspace files now feed server-owned dbt parse, a versioned ProjectDbtGraphFromFiles query, and an inspectable read-only Canvas. The browser proof covers all phase-two resource kinds, diagnostics, layout persistence, factual inspection, contextual Code, and forbids graph-draft fallback.',
  updated_at = now()
where design_id = 'DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:658'), 2),
  status = 'canonical',
  revision = revision + 1
where component_id in (
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
);

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
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileLayout.ts', 4),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileLayout.test.ts', 5),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 2),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts', 3),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 4),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'owns', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 5)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'public_api', 'IDbtProjectGraphQueryPort.getProjectGraph', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'transition', 'A scoped authority binding is requested, the versioned HTTP response is validated, and mismatched authority is rejected.', 0),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'consumer', 'useDbtProjectGraphQuery', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'public_api', 'projectDbtProjectGraphToCanonicalCanvas', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'public_api', 'buildDbtProjectFileInitialNodePositions', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'transition', 'Explicit route authority selects the file projection; fresh, invalid, and unavailable query states remain distinct.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'consumer', 'useDbtProjectFileCanvasController', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'public_api', 'DbtProjectFileCanvas', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'transition', 'Query state becomes loading, ready, invalid, or unavailable presentation without crossing into graph-draft mutation.', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'consumer', 'Canvas route authority branch', 0),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'consumer', 'CodeView scoped workspace files', 1),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'invariant', 'The deterministic initial layout reserves the governed card bounds, never overlaps projected resources, and lets persisted user positions override regenerated defaults.', 3),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'Read-only inspection renders factual properties and never mounts disabled graph-draft authoring controls or synthesized authoring SQL.', 7),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'Opening contextual Code preserves a non-zero graph surface beside the scoped workspace editor.', 8)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.frontend_component_local_components component
set
  component_status = 'current',
  capability_gaps = '[]'::jsonb,
  evidence_refs = case component.component_id
    when 'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH' then jsonb_build_array(
      'EV-DBT-PROJECT-GRAPH-WEB-ADAPTER'
    )
    when 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL' then jsonb_build_array(
      'EV-DBT-PROJECT-FILE-PROJECTION-MODEL',
      'EV-DBT-PROJECT-FILE-PROJECTION-LAYOUT'
    )
    else jsonb_build_array(
      'EV-DBT-PROJECT-FILE-PROJECTION-ARCHITECTURE',
      'EV-DBT-PROJECT-FILE-PROJECTION-LIVE'
    )
  end,
  raw_component = coalesce(component.raw_component, '{}'::jsonb) || jsonb_build_object(
    'implementationStatus', 'current',
    'phase', 2,
    'authority', 'dbt-project-files',
    'semanticMutation', false
  ),
  source_path = 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql',
  source_content_sha256 = md5(component.component_id || ':current:658'),
  updated_at = now()
where component.component_id in (
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
);

delete from planning_query_store.frontend_component_local_files
where component_id in (
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
);

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'apps/web/src/app/ports/dbtProjectGraph.ts', 'application-port', 'IDbtProjectGraphQueryPort', jsonb_build_object('rail', 'ProjectDbtGraphFromFiles', 'authority', 'dbt-project-files'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectGraph-port:658')),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts', 'http-adapter', 'createApiDbtProjectGraphQueryPort', jsonb_build_object('rail', 'ProjectDbtGraphFromFiles', 'schemaValidation', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectGraph-api:658')),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.test.ts', 'adapter-test', null, jsonb_build_object('rail', 'ProjectDbtGraphFromFiles', 'negativeScopeCoverage', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectGraph-api-test:658')),
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'apps/web/src/app/queries/dbtProjectQueries.ts', 'query-hook', 'useDbtProjectGraphQuery', jsonb_build_object('rail', 'ProjectDbtGraphFromFiles', 'queryOnly', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectQueries:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'apps/web/src/app/views/canvas/canvasRouteAuthority.ts', 'authority-policy', 'resolveCanvasRouteAuthority', jsonb_build_object('failClosed', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:canvasRouteAuthority:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'apps/web/src/app/views/canvas/canvasRouteAuthority.test.ts', 'unit-test', null, jsonb_build_object('scope', 'explicit authority parsing and rejection'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:canvasRouteAuthority-test:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts', 'read-model', 'projectDbtProjectGraphToCanonicalCanvas', jsonb_build_object('rail', 'ProjectDbtGraphFromFiles', 'pure', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectFileProjection:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts', 'unit-test', null, jsonb_build_object('scope', 'resource identity, metadata, diagnostics, and path normalization'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectFileProjection-test:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'apps/web/src/app/views/canvas/dbtProjectFileLayout.ts', 'layout-policy', 'buildDbtProjectFileInitialNodePositions', jsonb_build_object('pure', true, 'persistedPositionsWin', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectFileLayout:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'apps/web/src/app/views/canvas/dbtProjectFileLayout.test.ts', 'unit-test', null, jsonb_build_object('scope', 'non-overlap and persisted-position precedence'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectFileLayout-test:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'controller', 'useDbtProjectFileCanvasController', jsonb_build_object('queryRail', 'ProjectDbtGraphFromFiles', 'semanticMutation', false), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:useDbtProjectFileCanvasController:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx', 'composition', 'DbtProjectFileCanvas', jsonb_build_object('authorityBranch', 'dbt-project-files'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:DbtProjectFileCanvas:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'presentation-template', 'DbtProjectFileCanvasView', jsonb_build_object('readOnly', true, 'contextualCode', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:DbtProjectFileCanvasView:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'apps/web/src/app/plugins/dbt/dbtProjectFileCanvasSurfaceStrategy.ts', 'surface-strategy', 'dbtProjectFileCanvasSurfaceStrategy', jsonb_build_object('operationalDrawer', false, 'semanticMutation', false), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectFileCanvasSurfaceStrategy:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 'architecture-test', null, jsonb_build_object('scope', 'authority and composition boundaries'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectFileProjection-architecture-test:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'e2e-test', null, jsonb_build_object('scope', 'protected file-to-dbt-to-Canvas vertical', 'noIntercept', true, 'noDraftSeeding', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('file:dbtProjectFileProjection-live:658'));

update planning_query_store.frontend_component_local_cq_rails
set
  rail_status = case rail_name
    when 'ProjectDbtGraphFromFiles' then 'implemented'
    when 'InspectCanvasNodeProperties' then 'implemented-ui'
    else rail_status
  end,
  source_path = 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql',
  source_content_sha256 = md5(component_id || ':' || rail_name || ':implemented:658'),
  updated_at = now()
where component_id in (
  'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL',
  'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
);

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
values
  ('EV-DBT-PROJECT-GRAPH-WEB-ADAPTER', 'SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'adapter-test', 'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.test.ts', 'passing', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/services/dbtProject/dbtProjectGraph.api.test.ts', 'scopeMismatchRejected', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('evidence:dbt-project-graph-web-adapter:658')),
  ('EV-DBT-PROJECT-FILE-PROJECTION-MODEL', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'unit-test', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts', 'passing', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/dbtProjectFileProjection.test.ts'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('evidence:dbt-project-file-projection-model:658')),
  ('EV-DBT-PROJECT-FILE-PROJECTION-LAYOUT', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'unit-test', 'apps/web/src/app/views/canvas/dbtProjectFileLayout.test.ts', 'passing', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/dbtProjectFileLayout.test.ts', 'nonOverlap', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('evidence:dbt-project-file-layout:658')),
  ('EV-DBT-PROJECT-FILE-PROJECTION-ARCHITECTURE', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'architecture-test', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 'passing', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('evidence:dbt-project-file-projection-architecture:658')),
  ('EV-DBT-PROJECT-FILE-PROJECTION-LIVE', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'e2e-test', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'passing', jsonb_build_object('command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'result', '2 passing', 'realAdapters', jsonb_build_array('protected API', 'PostgreSQL', 'dbt CLI', 'scoped workspace files'), 'noIntercept', true, 'noGraphDraftFallback', true, 'nonOverlappingCards', true, 'factualReadOnlyWorkbench', true, 'contextualCodeKeepsGraphVisible', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('evidence:dbt-project-file-projection-live:658'))
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  ('SYS-WEB-SERVICES-DBT-PROJECT-GRAPH', 'EV-DBT-PROJECT-GRAPH-WEB-ADAPTER', 'integration-test', 'current', 'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.test.ts', 'ProjectDbtGraphFromFiles', 'dbt-project-graph-web-adapter', 'The browser adapter validates the versioned projection and rejects authority bindings that differ from the request.', jsonb_build_object('schema', 'DbtProjectGraphProjection.v1'), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('validation:dbt-project-graph-web-adapter:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'EV-DBT-PROJECT-FILE-PROJECTION-MODEL', 'unit-test', 'current', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts', 'ProjectDbtGraphFromFiles', 'dbt-project-file-projection-model', 'All supported dbt resource identities, relations, paths, metadata, and diagnostic states project without draft semantics.', jsonb_build_object('resourceKinds', jsonb_build_array('source', 'model', 'seed', 'snapshot', 'test', 'exposure', 'metric')), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('validation:dbt-project-file-projection-model:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL', 'EV-DBT-PROJECT-FILE-PROJECTION-LAYOUT', 'unit-test', 'current', 'apps/web/src/app/views/canvas/dbtProjectFileLayout.test.ts', 'PersistCanvasLayout', 'dbt-project-file-layout', 'Initial cards do not overlap and route-local persisted positions remain authoritative.', jsonb_build_object('cardBounds', '400x200', 'persistedPositionsWin', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('validation:dbt-project-file-layout:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'EV-DBT-PROJECT-FILE-PROJECTION-ARCHITECTURE', 'architecture-test', 'current', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 'ProjectDbtGraphFromFiles', 'dbt-project-file-projection-architecture', 'The route chooses one authority before hooks run and the file surface excludes draft mutation and operational execution controls.', jsonb_build_object('singleAuthorityBranch', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('validation:dbt-project-file-projection-architecture:658')),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'EV-DBT-PROJECT-FILE-PROJECTION-LIVE', 'e2e-test', 'current', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'ProjectDbtGraphFromFiles', 'dbt-project-file-projection-live', 'A demanding user can inspect and move a real file-derived dbt graph, understand columns and tests, open the exact SQL file, reload layout, and see invalid analysis without graph-draft fallback.', jsonb_build_object('result', '2 passing', 'noIntercept', true, 'noFakeSuccess', true), 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', md5('validation:dbt-project-file-projection-live:658'))
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_surface_links
set
  source_path = 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql',
  source_content_sha256 = md5('surface:dbt-file-projection:web.canvas.graph:implemented:658'),
  raw_link = coalesce(raw_link, '{}'::jsonb) || jsonb_build_object(
    'status', 'implemented',
    'semanticMutation', false,
    'fallback', false
  ),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

with required_surface(surface) as (
  values
    ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'),
    ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'),
    ('apps/web/src/app/views/canvas/CanvasShell.graphSurface.test.tsx'),
    ('apps/web/src/app/views/canvas/CanvasShellMainPanelFrame.tsx'),
    ('apps/web/src/app/views/canvas/CanvasViewport.test.tsx'),
    ('apps/web/src/app/views/canvas/canvasPalette.ts'),
    ('apps/web/src/app/views/canvas/canvasViewportStyle.ts'),
    ('apps/web/src/app/views/canvas/dbtProjectFileLayout.ts'),
    ('apps/web/src/app/views/canvas/dbtProjectFileLayout.test.ts'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'),
    ('tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql')
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
)
update planning_query_store.feature_mechanization_local_rails rail
set
  rail_status = 'implemented',
  allowed_implementation_surfaces = reconciled_surface.surfaces,
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.implementation_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/src/app/ports/dbtProjectGraph.ts',
          'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts',
          'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts',
          'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts',
          'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx',
          'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
          'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql'
        )
    ) refs(ref)
  ),
  symbol_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.symbol_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/src/app/ports/dbtProjectGraph.ts#IDbtProjectGraphQueryPort',
          'apps/web/src/app/services/dbtProject/dbtProjectGraph.api.ts#createApiDbtProjectGraphQueryPort',
          'apps/web/src/app/views/canvas/dbtProjectFileProjection.ts#projectDbtProjectGraphToCanonicalCanvas',
          'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts#useDbtProjectFileCanvasController',
          'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx#DbtProjectFileCanvasView'
        )
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{allowedImplementationSurfaces}',
      reconciled_surface.surfaces,
      true
    ),
    '{liveEvidence}',
    jsonb_build_object(
      'status', 'current',
      'spec', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      'result', '2 passing',
      'noIntercept', true,
      'noGraphDraftFallback', true,
      'humanBrowserQa', jsonb_build_object(
        'nonOverlappingCards', true,
        'factualReadOnlyWorkbench', true,
        'draggableWorkbench', true,
        'contextualCodeGraphHeight', 'non-zero',
        'consoleErrors', 0,
        'consoleWarnings', 0
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql',
  source_content_sha256 = repeat(md5('ProjectDbtGraphFromFiles:phase2-web-live:658'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surface
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';
