-- Register the Canvas context-menu presenter SRP split in the DB-first
-- component inventory. The presenter remains the owning adapter for the
-- existing context-menu rails, while lifecycle, target policy, and type
-- contracts become explicit owned files instead of hidden code regions.

update planning_query_store.frontend_component_local_components
set
  responsibility = 'Owns the Canvas context-menu presenter adapter and delegates browser lifecycle, target policy, and local port contracts to explicit child files.',
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'dbFirst', true,
    'fowlerSignal', 'responsibility_overload',
    'fileOwnershipModel', 'owned-files',
    'ownedSlices', jsonb_build_array(
      'presenter-adapter',
      'presenter-contract',
      'browser-lifecycle',
      'target-policy'
    ),
    'gapSourceOfTruth', 'planning_query_store.frontend_component_capability_gap_query',
    'evidenceSourceOfTruth', 'planning_query_store.frontend_component_validation_evidence_query'
  ),
  source_path = 'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
  source_content_sha256 = md5('web.component.canvas.CanvasContextMenuPresenter:srp-split:358'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasContextMenuPresenter';

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
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'hook',
    'useCanvasContextMenuPresenter',
    jsonb_build_object(
      'responsibility', 'Presenter adapter that maps Canvas/edge gestures to governed menu model callbacks.',
      'rail', 'ResolveCanvasContextMenu',
      'dispatchRails', jsonb_build_array('CreateCanvasAuthoringNode', 'RemoveCanvasEdgeFromContext'),
      'delegatesTo', jsonb_build_array(
        'useCanvasContextMenuLifecycle',
        'resolveCanvasViewportContextMenuRequest',
        'UseCanvasContextMenuPresenterArgs'
      )
    ),
    'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
    md5('file:useCanvasContextMenuPresenter.ts:358')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
    'contract',
    'UseCanvasContextMenuPresenterArgs',
    jsonb_build_object(
      'responsibility', 'Local presenter port and result contract shared by presenter, lifecycle, and viewport integration.',
      'exports', jsonb_build_array(
        'UseCanvasContextMenuPresenterArgs',
        'UseCanvasContextMenuPresenterResult',
        'ContextMenuEvent',
        'PaneClickEvent',
        'CanvasContextMenuPresenter'
      )
    ),
    'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
    md5('file:canvasContextMenuPresenter.types.ts:358')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
    'hook',
    'useCanvasContextMenuLifecycle',
    jsonb_build_object(
      'responsibility', 'Browser lifecycle hook for open/close state, outside-click handling, Escape handling, and context-menu echo suppression.',
      'ownedBehavior', jsonb_build_array(
        'close-on-outside-pointer',
        'close-on-escape',
        'pane-click-echo-suppression',
        'document-contextmenu-capture'
      )
    ),
    'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
    md5('file:useCanvasContextMenuLifecycle.ts:358')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/canvasContextMenuTargetPolicy.ts',
    'policy',
    'resolveCanvasViewportContextMenuRequest',
    jsonb_build_object(
      'responsibility', 'DOM target policy that decides whether a contextmenu event belongs to the Canvas background.',
      'excludes', jsonb_build_array(
        'context-menu-surface',
        'react-flow-node',
        'react-flow-edge',
        'react-flow-controls',
        'react-flow-minimap'
      )
    ),
    'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
    md5('file:canvasContextMenuTargetPolicy.ts:358')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'EV-CANVAS-CONTEXT-MENU-PRESENTER-SRP-ARCHITECTURE',
    'architecture-test',
    'current',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
    'ResolveCanvasContextMenu',
    'presenter',
    'The presenter imports explicit contract, lifecycle, and target-policy modules instead of owning DOM target policy or document listeners inline.',
    jsonb_build_object(
      'sourceFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'apps/web/src/app/views/canvas/canvasContextMenuPresenter.types.ts',
        'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts',
        'apps/web/src/app/views/canvas/canvasContextMenuTargetPolicy.ts'
      )
    ),
    'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
    md5('evidence:CanvasContextMenuPresenter:srp-architecture:358')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'EV-CANVAS-CONTEXT-MENU-PRESENTER-LIFECYCLE-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'ResolveCanvasContextMenu',
    'presenter',
    'Lifecycle tests prove open/close behavior and browser echo suppression after lifecycle extraction.',
    jsonb_build_object('sourceFile', 'apps/web/src/app/views/canvas/useCanvasContextMenuLifecycle.ts'),
    'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
    md5('evidence:CanvasContextMenuPresenter:lifecycle-presentation:358')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'EV-CANVAS-CONTEXT-MENU-PRESENTER-DISPATCH-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    'CreateCanvasAuthoringNode',
    'presenter',
    'Graph-action tests prove the presenter still dispatches node creation and edge command callbacks after SRP extraction.',
    jsonb_build_object(
      'relatedRails',
      jsonb_build_array('CreateCanvasAuthoringNode', 'RemoveCanvasEdgeFromContext')
    ),
    'tools/planning-db/migrations/358_canvas_context_menu_presenter_srp_split.sql',
    md5('evidence:CanvasContextMenuPresenter:dispatch-presentation:358')
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
