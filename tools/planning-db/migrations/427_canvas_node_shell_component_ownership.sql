-- Promote CanvasNodeShell from GraphNodeCard file ownership into its own
-- DB-first host/template component. The shell composes the node body, React
-- Flow handle presentation, and node context-menu trigger without owning the
-- port renderer, node menu template, or edge admission policy.

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
  'web.component.canvas.CanvasNodeShell',
  'CanvasNodeShell',
  'state-view',
  'current',
  'extract',
  'Frontend / Canvas',
  'Host the React Flow node shell template around a precomputed Canvas node body, composing port handles and node context-menu presentation without owning their behavior.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-CANVAS-NODE-SHELL-COMPONENT-OWNERSHIP'),
  jsonb_build_object(
    'dbFirst', true,
    'manualSections', jsonb_build_array('11. Floating toolbar y play', '14. Planning DB / Governance'),
    'parentComponentId', 'web.component.canvas.GraphNodeCard',
    'hostTemplate', true,
    'fileOwnershipModel', 'owned-host-template-files',
    'renderRail', 'RenderCanvasNodeShell',
    'composedRails', jsonb_build_array('RenderCanvasNodePortHandle', 'ShowCanvasNodeContextMenu'),
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge',
    'doesNotOwnPortRendering', true,
    'doesNotOwnNodeMenuTemplate', true,
    'doesNotOwnEdgeAdmission', true,
    'compositionRelationships', jsonb_build_array(
      'CanvasNodeShell composes CanvasNodePortHandle for source and target React Flow handles.',
      'CanvasNodeShell delegates node menu presentation to CanvasNodeContextMenuView.',
      'CanvasNodeShell wraps a caller-provided node body and does not calculate graph card data.'
    ),
    'fowlerSignals', jsonb_build_array(
      'host_template_component',
      'presentation_logic_separation',
      'ports_and_adapters_boundary',
      'no_edge_policy_in_view'
    )
  ),
  'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
  md5('component:CanvasNodeShell:ownership:427')
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
  component_id = 'web.component.canvas.CanvasNodeShell',
  file_role = 'component',
  exported_symbol = 'CanvasNodeShell',
  raw_file = jsonb_build_object(
    'responsibility', 'Render the Canvas node host template around caller-owned node card content, port handles, and node context-menu trigger.',
    'rail', 'RenderCanvasNodeShell',
    'hostTemplate', true,
    'composes', jsonb_build_array('CanvasNodePortHandle', 'CanvasNodeContextMenuView'),
    'doesNotOwnPortRendering', true,
    'doesNotOwnNodeMenuTemplate', true,
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
  ),
  source_path = 'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
  source_content_sha256 = md5('file:CanvasNodeShell.tsx:ownership:427'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.tsx';

update planning_query_store.frontend_component_local_files
set
  component_id = 'web.component.canvas.CanvasNodeShell',
  file_role = 'style',
  exported_symbol = 'CanvasNodeShellStyles',
  raw_file = jsonb_build_object(
    'responsibility', 'Own tokenized host shell and port placement styles consumed by CanvasNodeShell and CanvasNodePortHandle.',
    'rail', 'RenderCanvasNodeShell',
    'tokenized', true,
    'doesNotOwnVisualTokens', false
  ),
  source_path = 'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
  source_content_sha256 = md5('file:CanvasNodeShell.module.css:ownership:427'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.module.css';

update planning_query_store.frontend_component_local_files
set
  component_id = 'web.component.canvas.CanvasNodeShell',
  file_role = 'test',
  exported_symbol = 'CanvasNodeShellPresentationTests',
  raw_file = jsonb_build_object(
    'responsibility', 'Verify CanvasNodeShell host gestures, port composition, caller-owned labels, compatibility projection, and tokenized styling boundaries.',
    'rails', jsonb_build_array('RenderCanvasNodeShell', 'RenderCanvasNodePortHandle'),
    'evidence', 'EV-CANVAS-NODE-SHELL-COMPONENT-OWNERSHIP'
  ),
  source_path = 'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
  source_content_sha256 = md5('file:CanvasNodeShell.test.tsx:ownership:427'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx';

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
    'web.component.canvas.CanvasNodeShell',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'component',
    'CanvasNodeShell',
    jsonb_build_object(
      'responsibility', 'Render the Canvas node host template around caller-owned node card content, port handles, and node context-menu trigger.',
      'rail', 'RenderCanvasNodeShell',
      'hostTemplate', true,
      'composes', jsonb_build_array('CanvasNodePortHandle', 'CanvasNodeContextMenuView'),
      'doesNotOwnPortRendering', true,
      'doesNotOwnNodeMenuTemplate', true,
      'doesNotOwnEdgeAdmission', true,
      'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
    ),
    'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
    md5('file:CanvasNodeShell.tsx:ownership:427')
  ),
  (
    'web.component.canvas.CanvasNodeShell',
    'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'style',
    'CanvasNodeShellStyles',
    jsonb_build_object(
      'responsibility', 'Own tokenized host shell and port placement styles consumed by CanvasNodeShell and CanvasNodePortHandle.',
      'rail', 'RenderCanvasNodeShell',
      'tokenized', true,
      'doesNotOwnVisualTokens', false
    ),
    'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
    md5('file:CanvasNodeShell.module.css:ownership:427')
  ),
  (
    'web.component.canvas.CanvasNodeShell',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'test',
    'CanvasNodeShellPresentationTests',
    jsonb_build_object(
      'responsibility', 'Verify CanvasNodeShell host gestures, port composition, caller-owned labels, compatibility projection, and tokenized styling boundaries.',
      'rails', jsonb_build_array('RenderCanvasNodeShell', 'RenderCanvasNodePortHandle'),
      'evidence', 'EV-CANVAS-NODE-SHELL-COMPONENT-OWNERSHIP'
    ),
    'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
    md5('file:CanvasNodeShell.test.tsx:ownership:427')
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
values
  (
    'web.component.canvas.CanvasNodeShell',
    'RenderCanvasNodeShell',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'kind', 'query',
      'dddObject', 'CanvasNodeShell',
      'applicationPort', 'CanvasNodeShell props: children, contextMenuModel, handle visibility, handle tones, compatibility inputs, gesture callbacks',
      'adapterSurface', 'CanvasNodeShell',
      'scope', 'presentation host template for a React Flow Canvas node',
      'authorization', 'inherits canvas graph visibility; no independent authority',
      'hostTemplate', true,
      'composes', jsonb_build_array('RenderCanvasNodePortHandle', 'ShowCanvasNodeContextMenu'),
      'doesNotOwnPortRendering', true,
      'doesNotOwnNodeMenuTemplate', true,
      'doesNotOwnEdgeAdmission', true,
      'edgeAdmissionRail', 'AuthorCanvasGraphEdge',
      'negativeTests', jsonb_build_array(
        'CanvasNodeShell does not calculate GraphNodeCard read models.',
        'CanvasNodeShell composes CanvasNodePortHandle instead of embedding React Flow handle markup.',
        'CanvasNodeShell delegates node menu presentation to CanvasNodeContextMenuView.',
        'CanvasNodeShell does not admit, reject, or persist graph edges.'
      )
    ),
    'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
    md5('rail:CanvasNodeShell:RenderCanvasNodeShell:427')
  ),
  (
    'web.component.canvas.CanvasNodeShell',
    'ShowCanvasNodeContextMenu',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'kind', 'query',
      'dddObject', 'CanvasNodeShell',
      'applicationPort', 'contextMenuModel and onContextMenuAction props',
      'adapterSurface', 'CanvasNodeContextMenuView',
      'scope', 'node context-menu trigger hosted by CanvasNodeShell',
      'authorization', 'inherits canvas graph visibility; actions are governed by the supplied CanvasNodeContextMenuModel',
      'templateOwner', 'web.component.canvas.CanvasNodeContextMenuView',
      'doesNotOwnNodeMenuTemplate', true,
      'negativeTests', jsonb_build_array(
        'CanvasNodeShell delegates node menu presentation to CanvasNodeContextMenuView.',
        'CanvasNodeShell does not duplicate node workbench section actions inside the host template.'
      )
    ),
    'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
    md5('rail:CanvasNodeShell:ShowCanvasNodeContextMenu:427')
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
  'web.component.canvas.CanvasNodeShell',
  'EV-CANVAS-NODE-SHELL-COMPONENT-OWNERSHIP',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
  'RenderCanvasNodeShell',
  'canvas-node-shell',
  'CanvasNodeShell is queryable as a DB-first host/template component, composes CanvasNodePortHandle, delegates node menu presentation, and does not own AuthorCanvasGraphEdge admission.',
  jsonb_build_object(
    'redGreen', true,
    'componentOwnership', 'CanvasNodeShell is queryable as a DB-first host/template component.',
    'hostTemplate', true,
    'composes', jsonb_build_array('CanvasNodePortHandle', 'CanvasNodeContextMenuView'),
    'doesNotOwnPortRendering', true,
    'doesNotOwnNodeMenuTemplate', true,
    'doesNotOwnEdgeAdmission', true,
    'edgeAdmissionRail', 'AuthorCanvasGraphEdge',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
  ),
  'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
  md5('evidence:CanvasNodeShell:component-ownership:427')
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
      'canvasNodeShellComponentOwnership',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.CanvasNodeShell',
        'rails', jsonb_build_array('RenderCanvasNodeShell', 'ShowCanvasNodeContextMenu', 'RenderCanvasNodePortHandle'),
        'hostTemplate', true,
        'compositionRelationships', jsonb_build_array(
          'CanvasNodeShell composes CanvasNodePortHandle for source and target React Flow handles.',
          'CanvasNodeShell delegates node menu presentation to CanvasNodeContextMenuView.'
        ),
        'doesNotOwnPortRendering', true,
        'doesNotOwnNodeMenuTemplate', true,
        'doesNotOwnEdgeAdmission', true,
        'edgeAdmissionRail', 'AuthorCanvasGraphEdge'
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql'
      )
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql'
      )
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/427_canvas_node_shell_component_ownership.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodeShell:ownership:427'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';