-- Promote CanvasNodePortHandle from a GraphNodeCard subfile into its own
-- DB-first presentation component. This keeps the existing render behavior and
-- rail, while making the component directly queryable for ownership, evidence,
-- and future drift checks.

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
  raw_component,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasNodePortHandle',
  'CanvasNodePortHandle',
  'state-view',
  'current',
  'extract',
  'Frontend / Canvas',
  'Render tokenized React Flow source and target port handles from caller-owned presentation inputs without owning edge admission policy.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-CANVAS-NODE-PORT-HANDLE-COMPONENT-OWNERSHIP'),
  jsonb_build_object(
    'dbFirst', true,
    'manualSections', jsonb_build_array('9. Puertos', '14. Planning DB / Governance'),
    'parentComponentId', 'web.component.canvas.GraphNodeCard',
    'hostComponentId', 'web.component.canvas.CanvasNodeShell',
    'fileOwnershipModel', 'owned-leaf-component-file',
    'presentationOnly', true,
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge',
    'renderRail', 'RenderCanvasNodePortHandle',
    'hostRelationship', 'CanvasNodeShell consumes CanvasNodePortHandle for source and target React Flow handles.',
    'associatedStyleHost', 'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'associatedTestHost', 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'fowlerSignals', jsonb_build_array(
      'leaf_presentation_component',
      'ports_and_adapters_boundary',
      'no_edge_policy_in_view'
    )
  ),
  'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql',
  md5('component:CanvasNodePortHandle:ownership:426')
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
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  component_id = 'web.component.canvas.CanvasNodePortHandle',
  file_role = 'presentation',
  exported_symbol = 'CanvasNodePortHandle;CanvasNodePortHandleKind;CanvasNodePortTone;CanvasNodePortCompatibilityView',
  raw_file = jsonb_build_object(
    'responsibility', 'Render tokenized Canvas node port handles from caller-owned kind, tone, label, and compatibility inputs.',
    'rail', 'RenderCanvasNodePortHandle',
    'presentationOnly', true,
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
  ),
  source_path = 'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql',
  source_content_sha256 = md5('file:CanvasNodePortHandle:ownership:426'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx';

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
  'web.component.canvas.CanvasNodePortHandle',
  'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
  'presentation',
  'CanvasNodePortHandle;CanvasNodePortHandleKind;CanvasNodePortTone;CanvasNodePortCompatibilityView',
  jsonb_build_object(
    'responsibility', 'Render tokenized Canvas node port handles from caller-owned kind, tone, label, and compatibility inputs.',
    'rail', 'RenderCanvasNodePortHandle',
    'presentationOnly', true,
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
  ),
  'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql',
  md5('file:CanvasNodePortHandle:ownership:426')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  component_id = 'web.component.canvas.CanvasNodePortHandle',
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'owner', 'CanvasNodePortHandle',
      'hostComponentId', 'web.component.canvas.CanvasNodeShell',
      'hostRelationship', 'CanvasNodeShell consumes CanvasNodePortHandle for source and target React Flow handles.',
      'doesNotOwnEdgeAdmission', true,
      'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
    ),
  source_path = 'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql',
  source_content_sha256 = md5('rail:CanvasNodePortHandle:RenderCanvasNodePortHandle:426'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and rail_name = 'RenderCanvasNodePortHandle';

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
  'web.component.canvas.CanvasNodePortHandle',
  'RenderCanvasNodePortHandle',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'kind', 'query',
    'dddObject', 'CanvasNodePortHandle',
    'applicationPort', 'CanvasNodeShell.sourceHandleTone/targetHandleTone and compatibility inputs',
    'adapterSurface', 'CanvasNodePortHandle',
    'scope', 'presentation-only React Flow connection affordance',
    'authorization', 'inherits canvas graph visibility; no independent authority',
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge',
    'negativeTests', jsonb_build_array(
      'CanvasNodePortHandle does not confirm or reject graph edges.',
      'CanvasNodeShell passes caller-owned tone and compatibility state.',
      'CanvasNodeShell consumes CanvasNodePortHandle without embedding React Flow handle markup.'
    )
  ),
  'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql',
  md5('rail:CanvasNodePortHandle:RenderCanvasNodePortHandle:426')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
values (
  'web.component.canvas.CanvasNodePortHandle',
  'EV-CANVAS-NODE-PORT-HANDLE-COMPONENT-OWNERSHIP',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
  'RenderCanvasNodePortHandle',
  'node-port-handle',
  'CanvasNodeShell consumes CanvasNodePortHandle while CanvasNodePortHandle owns only tokenized source/target port presentation and not AuthorCanvasGraphEdge admission.',
  jsonb_build_object(
    'redGreen', true,
    'componentOwnership', 'CanvasNodePortHandle is queryable as a DB-first component.',
    'presentationOnly', true,
    'doesNotOwnEdgeAdmission', true,
    'styleHost', 'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
  ),
  'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql',
  md5('evidence:CanvasNodePortHandle:component-ownership:426')
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

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'canvasNodePortHandleComponentOwnership',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.CanvasNodePortHandle',
        'rail', 'RenderCanvasNodePortHandle',
        'hostComponentId', 'web.component.canvas.CanvasNodeShell',
        'hostRelationship', 'CanvasNodeShell consumes CanvasNodePortHandle for source and target React Flow handles.',
        'presentationOnly', true,
        'doesNotOwnEdgeAdmission', true,
        'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql'
      )
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql'
      )
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/426_canvas_node_port_handle_component_ownership.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodePortHandle:ownership:426'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
