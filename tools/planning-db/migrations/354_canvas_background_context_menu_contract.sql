-- Tighten the Canvas background context-menu contract.
-- The background menu is a spatial root menu, not an unbounded node-type
-- catalog and not a run/preview or validation surface.

alter table planning_query_store.frontend_component_context_actions
  drop constraint if exists frontend_component_context_actions_status_check;

alter table planning_query_store.frontend_component_context_actions
  add constraint frontend_component_context_actions_status_check
  check (action_status in (
    'valid',
    'planned',
    'gap',
    'moved-to-add-node-catalog',
    'moved-to-run-preview',
    'retired'
  ));

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
values
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'CanvasAddNodeCatalog',
    'context-panel',
    'planned',
    'create',
    'Canvas workbench',
    'Own categorized and searchable node-component selection launched from Add... on the Canvas background context menu.',
    '@dvt/web',
    '/canvas',
    null,
    jsonb_build_array('Implement categorized search UI and connect selection to CreateCanvasAuthoringNode.'),
    '[]'::jsonb,
    jsonb_build_object(
      'parentComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'launchRail', 'OpenCanvasAddNodeCatalog',
      'creationRail', 'CreateCanvasAuthoringNode',
      'fileOwnershipModel', 'semantic-context-no-owned-files',
      'fileCountZeroIsValid', true,
      'componentFamily', jsonb_build_array(
        'web.component.canvas.CanvasContextMenu',
        'web.component.canvas.CanvasBackgroundContextMenu'
      )
    ),
    'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
    md5('web.component.canvas.CanvasAddNodeCatalog:planned:354')
  ),
  (
    'web.component.canvas.CanvasSettings',
    'CanvasSettings',
    'context-panel',
    'planned',
    'reuse',
    'Canvas workbench',
    'Own Canvas display and interaction settings opened from the Canvas background context menu.',
    '@dvt/web',
    '/canvas',
    null,
    jsonb_build_array('Promote the existing settings dialog into an owned component with files and tests.'),
    '[]'::jsonb,
    jsonb_build_object(
      'parentComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'launchRail', 'OpenCanvasSettings',
      'fileOwnershipModel', 'semantic-context-no-owned-files',
      'fileCountZeroIsValid', true,
      'componentFamily', jsonb_build_array(
        'web.component.canvas.CanvasContextMenu',
        'web.component.canvas.CanvasBackgroundContextMenu'
      )
    ),
    'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
    md5('web.component.canvas.CanvasSettings:planned:354')
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
    'web.component.canvas.CanvasBackgroundContextMenu',
    'OpenCanvasAddNodeCatalog',
    'local-command',
    'planned-local',
    jsonb_build_object(
      'kind', 'command',
      'context', 'canvas-background',
      'destinationComponentId', 'web.component.canvas.CanvasAddNodeCatalog',
      'reason', 'Add... opens a categorized/searchable catalog before CreateCanvasAuthoringNode can run.'
    ),
    'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
    md5('rail:CanvasBackgroundContextMenu:OpenCanvasAddNodeCatalog:354')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'OpenCanvasSettings',
    'local-command',
    'planned-local',
    jsonb_build_object(
      'kind', 'command',
      'context', 'canvas-background',
      'destinationComponentId', 'web.component.canvas.CanvasSettings',
      'reason', 'Canvas settings is the only non-authoring root action accepted for the background menu.'
    ),
    'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
    md5('rail:CanvasBackgroundContextMenu:OpenCanvasSettings:354')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_contexts
set
  responsibility = 'Owns valid actions for right-clicking Canvas background space with spatial coordinates, independent of whether the graph is empty.',
  raw_context = coalesce(raw_context, '{}'::jsonb) || jsonb_build_object(
    'spatial', true,
    'emptyCanvasOnly', false,
    'backgroundRootActions', jsonb_build_array('Add...', 'Canvas settings'),
    'componentFamily', jsonb_build_array(
      'web.component.canvas.CanvasContextMenu',
      'web.component.canvas.CanvasBackgroundContextMenu',
      'web.component.canvas.CanvasAddNodeCatalog',
      'web.component.canvas.CanvasNodeContextMenu',
      'web.component.canvas.CanvasEdgeContextMenu',
      'web.component.canvas.CanvasSelectionContextMenu'
    ),
    'externalRelations', jsonb_build_array(
      'web.component.canvas.CanvasSettings',
      'web.component.canvas.RunPreviewSurface'
    )
  ),
  source_path = 'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
  source_content_sha256 = md5('context:canvas-background:root-actions:354'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasBackgroundContextMenu'
  and context_id = 'canvas-background';

update planning_query_store.frontend_component_context_actions
set
  action_status = 'moved-to-add-node-catalog',
  action_order = 80,
  raw_action = coalesce(raw_action, '{}'::jsonb) || jsonb_build_object(
    'previousLabel', 'Add source',
    'replacementComponentId', 'web.component.canvas.CanvasAddNodeCatalog',
    'replacementAction', 'Add...',
    'driftReason', 'Concrete source/import actions do not belong in the Canvas background root menu.'
  ),
  source_path = 'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
  source_content_sha256 = md5('action:canvas-background:add-source:moved-to-catalog:354'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasBackgroundContextMenu'
  and context_id = 'canvas-background'
  and action_id = 'add-source';

update planning_query_store.frontend_component_context_actions
set
  action_id = 'open-add-node-catalog',
  action_label = 'Add...',
  action_kind = 'authoring',
  action_status = 'valid',
  rail_name = 'OpenCanvasAddNodeCatalog',
  action_order = 10,
  raw_action = coalesce(raw_action, '{}'::jsonb) || jsonb_build_object(
    'uiAction', 'open-add-node-catalog',
    'destinationComponentId', 'web.component.canvas.CanvasAddNodeCatalog',
    'creationRailAfterSelection', 'CreateCanvasAuthoringNode'
  ),
  source_path = 'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
  source_content_sha256 = md5('action:canvas-background:open-add-node-catalog:354'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasBackgroundContextMenu'
  and context_id = 'canvas-background'
  and action_id = 'create-authoring-node';

update planning_query_store.frontend_component_context_actions
set
  action_status = 'moved-to-run-preview',
  action_order = 85,
  raw_action = coalesce(raw_action, '{}'::jsonb) || jsonb_build_object(
    'driftReason', 'Validate graph is ambiguous on a multi-branch canvas; validation scope belongs to node, selection, or run/preview surfaces.',
    'candidateFutureAction', 'Validate entire canvas'
  ),
  source_path = 'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
  source_content_sha256 = md5('action:canvas-background:validate-graph:moved:354'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasBackgroundContextMenu'
  and context_id = 'canvas-background'
  and action_id = 'validate-graph';

update planning_query_store.frontend_component_context_actions
set
  rail_name = 'OpenCanvasSettings',
  action_order = 20,
  raw_action = coalesce(raw_action, '{}'::jsonb) || jsonb_build_object(
    'uiAction', 'open-canvas-settings',
    'destinationComponentId', 'web.component.canvas.CanvasSettings'
  ),
  source_path = 'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
  source_content_sha256 = md5('action:canvas-background:canvas-settings:354'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasBackgroundContextMenu'
  and context_id = 'canvas-background'
  and action_id = 'canvas-settings';

update planning_query_store.frontend_component_context_actions
set
  action_status = 'moved-to-run-preview',
  action_order = 90,
  raw_action = coalesce(raw_action, '{}'::jsonb) || jsonb_build_object(
    'previousLabel', 'Preview execution plan',
    'replacementComponentId', 'web.component.canvas.RunPreviewSurface',
    'driftReason', 'Run and Preview belong together; Canvas background must not own this action.'
  ),
  source_path = 'tools/planning-db/migrations/354_canvas_background_context_menu_contract.sql',
  source_content_sha256 = md5('action:canvas-background:preview-execution-plan:moved:354'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasBackgroundContextMenu'
  and context_id = 'canvas-background'
  and action_id = 'preview-execution-plan';
