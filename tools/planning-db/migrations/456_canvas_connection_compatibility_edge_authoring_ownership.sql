-- Move the Canvas connection compatibility presenter to the edge-authoring
-- component. The presenter projects governed AuthorCanvasGraphEdge admission
-- into passive RenderCanvasNodePortHandle hints; GraphNodeCard consumes the
-- projected data but does not own compatibility or edge policy.

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
  (
    'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
    'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
    'presenter',
    'buildCanvasConnectionCompatibilityByNodeId',
    jsonb_build_object(
      'responsibility', 'Project governed AuthorCanvasGraphEdge admission into passive port compatibility hints for visible Canvas nodes.',
      'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
      'dddOwner', 'CanvasConnectionAggregate read projection',
      'policyAuthority', 'AuthorCanvasGraphEdge',
      'renderConsumerRail', 'RenderCanvasNodePortHandle',
      'doesNotRenderCard', true,
      'doesNotConfirmEdges', true
    ),
    'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql',
    md5('file:edge-authoring:canvasConnectionCompatibilityPresenter:456')
  ),
  (
    'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
    'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage', 'Presenter projects available, blocked, and unavailable port compatibility states from governed edge admission.',
      'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
      'doesNotRenderCard', true
    ),
    'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql',
    md5('file:edge-authoring:canvasConnectionCompatibilityPresenter.test:456')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'retiredForEdgeAuthoringOwnership',
      true,
      'reassignedToComponent',
      'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
      'reassignedRail',
      'AuthorCanvasGraphEdge',
      'consumerRail',
      'RenderCanvasNodePortHandle',
      'reason',
      'Connection compatibility is edge-authoring policy projection, not GraphNodeCard presentation ownership.'
    ),
  source_path = 'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql',
  source_content_sha256 = md5('file:GraphNodeCard:connection-compatibility-retired:456'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path in (
    'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
    'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'
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
values (
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
  'RenderCanvasNodePortHandle',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Expose passive port compatibility hints derived from AuthorCanvasGraphEdge for visible Canvas nodes.',
    'policyAuthority', 'AuthorCanvasGraphEdge',
    'projection', 'buildCanvasConnectionCompatibilityByNodeId',
    'presentationConsumer', 'CanvasNodePortHandle',
    'doesNotOwnCardRendering', true
  ),
  'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql',
  md5('rail:edge-authoring:RenderCanvasNodePortHandle:456')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = coalesce(planning_query_store.frontend_component_local_cq_rails.raw_rail, '{}'::jsonb)
    || excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-CANVAS-CONNECTION-COMPATIBILITY-EDGE-AUTHORING-OWNERSHIP')
    ) refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'connectionCompatibilityProjection',
      jsonb_build_object(
        'presenter', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
        'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
        'doesNotOwnCardRendering', true
      )
    ),
  source_path = 'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql',
  source_content_sha256 = md5('component:edge-authoring:connection-compatibility:456'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING';

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
values (
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
  'EV-CANVAS-CONNECTION-COMPATIBILITY-EDGE-AUTHORING-OWNERSHIP',
  'unit-test',
  'current',
  'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
  'AuthorCanvasGraphEdge',
  'node-port-compatibility',
  'Connection compatibility projection is owned by CanvasNodeEdgeAuthoring and not by GraphNodeCard presentation.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
    'companionRail', 'RenderCanvasNodePortHandle',
    'retiredComponentOwner', 'web.component.canvas.GraphNodeCard'
  ),
  'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql',
  md5('evidence:edge-authoring:connection-compatibility:456')
)
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

create or replace view planning_query_store.frontend_component_file_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.exported_symbol,
    imported.raw_file,
    null::text as source_path,
    null::text as source_content_sha256
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select
    local_file.component_id,
    local_file.file_path,
    local_file.file_role,
    local_file.exported_symbol,
    local_file.raw_file,
    local_file.source_path,
    local_file.source_content_sha256
  from planning_query_store.frontend_component_local_files local_file
)
select
  file_ref.component_id,
  component.component_name,
  file_ref.file_path,
  file_ref.file_role,
  file_ref.exported_symbol,
  component.component_status,
  coalesce(file_ref.source_path, component.source_path) as source_path,
  coalesce(file_ref.source_content_sha256, component.source_content_sha256) as source_content_sha256
from effective_files file_ref
join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = file_ref.component_id
where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForPresentationOwnership')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership')::boolean, false);

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
        'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql'
      )
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
        'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql'
      )
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'connectionCompatibilityEdgeAuthoringOwnership',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
        'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
        'retiredComponentOwner', 'web.component.canvas.GraphNodeCard',
        'presenter', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts'
      )
    ),
  source_path = 'tools/planning-db/migrations/456_canvas_connection_compatibility_edge_authoring_ownership.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:connection-compatibility-edge-authoring:456'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
