-- Register NodeFloatingToolbar freeze as a real UI-local command. The command
-- toggles workspace-local interaction state and projects frozen nodes as
-- non-draggable in the viewport; it does not mutate graph draft, backend
-- state, run scope, or execution policy.

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
  'web.component.canvas.NodeFloatingToolbar',
  'ToggleCanvasNodeFreeze',
  'local-command',
  'implemented-local',
  jsonb_build_object(
    'kind', 'command',
    'context', 'node-left-click',
    'dddObject', 'CanvasInteractionStore.frozenNodeIds',
    'applicationPort', 'CanvasViewport.onToggleFrozenNode',
    'adapterSurface', 'CanvasNodeFloatingToolbarView',
    'stateScope', 'workspace-local-canvas-interaction',
    'doesNotMutateDraft', true,
    'doesNotStartRun', true,
    'projection', 'frozenNodeIds -> mapCanonicalNodeToCanvasNode draggable=false',
    'collaborators', jsonb_build_array(
      'apps/web/src/app/stores/canvasInteractionStore.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
      'apps/web/src/app/views/canvas/canvasNodeMapper.ts'
    ),
    'negativeTests', jsonb_build_array(
      'toggle command does not change node positions',
      'frozen viewport nodes project to draggable=false',
      'toolbar does not mount an unavailable freeze action',
      'freeze action does not create or persist graph draft edits'
    )
  ),
  'tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql',
  md5('rail:NodeFloatingToolbar:ToggleCanvasNodeFreeze:483')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_context_actions (
  component_id,
  context_id,
  action_id,
  action_label,
  action_kind,
  action_status,
  rail_name,
  action_order,
  raw_action,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeFloatingToolbar',
  'node-left-click',
  'freeze-node',
  'Congelar / Descongelar',
  'selection-operation',
  'valid',
  'ToggleCanvasNodeFreeze',
  20,
  jsonb_build_object(
    'commandRail', 'ToggleCanvasNodeFreeze',
    'stateScope', 'workspace-local-canvas-interaction',
    'toggles', 'frozenNodeIds',
    'availableWhen', 'CanvasViewport supplies onToggleFrozenNode',
    'labels', jsonb_build_array('Congelar', 'Descongelar'),
    'doesNotMutateDraft', true,
    'projectsViewportNodeDraggableFalse', true
  ),
  'tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql',
  md5('action:NodeFloatingToolbar:freeze-node:483')
)
on conflict (component_id, context_id, action_id) do update set
  action_label = excluded.action_label,
  action_kind = excluded.action_kind,
  action_status = excluded.action_status,
  rail_name = excluded.rail_name,
  action_order = excluded.action_order,
  raw_action = excluded.raw_action,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'actionProjectionPolicy',
      jsonb_build_object(
        'onlyOperableActions', true,
        'operableActions', jsonb_build_array('code', 'freeze', 'more'),
        'freezeCommandRail', 'ToggleCanvasNodeFreeze',
        'freezeStateScope', 'workspace-local-canvas-interaction',
        'emptyModelHandling', 'CanvasViewport does not mount an empty toolbar'
      )
    ),
  source_path = 'tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql',
  source_content_sha256 = md5('file:canvasNodeFloatingToolbarModel:freeze-command:483'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'freezeCommandHost',
      jsonb_build_object(
        'commandRail', 'ToggleCanvasNodeFreeze',
        'stateScope', 'workspace-local-canvas-interaction',
        'callback', 'onToggleFrozenNode',
        'selectedNodeProjection', 'frozenNodeIds.has(node.id)',
        'noDraftMutation', true
      )
    ),
  source_path = 'tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql',
  source_content_sha256 = md5('file:CanvasViewport:freeze-command-host:483'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/CanvasViewport.tsx';

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
  'web.component.canvas.NodeFloatingToolbar',
  'EV-CANVAS-NODE-FLOATING-TOOLBAR-FREEZE-COMMAND',
  'integration-test',
  'current',
  'apps/web/src/app/stores/canvasInteractionStore.test.ts;apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts;apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx;apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
  'ToggleCanvasNodeFreeze',
  'node-left-click',
  'NodeFloatingToolbar toggles workspace-local frozen node state and projects frozen viewport nodes as draggable=false without mutating graph draft state.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'freeze action was unavailable and no toggleFrozenCanvasNode command existed',
    'stateScope', 'workspace-local-canvas-interaction',
    'commands',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/stores/canvasInteractionStore.test.ts src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'
    ),
    'noDraftMutation', true,
    'nodeProjection', 'draggable=false'
  ),
  'tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql',
  md5('evidence:NodeFloatingToolbar:freeze-command:483')
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

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-NODE-FLOATING-TOOLBAR-FREEZE-COMMAND')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'freezeCommand',
      jsonb_build_object(
        'rail', 'ToggleCanvasNodeFreeze',
        'renderRail', 'RenderCanvasNodeFloatingToolbar',
        'stateScope', 'workspace-local-canvas-interaction',
        'collaborators', jsonb_build_array(
          'web.component.canvas.CanvasViewport',
          'CanvasInteractionStore',
          'useCanvasViewportGraphModel'
        ),
        'doesNotOwnDraftPersistence', true,
        'doesNotOwnRunSemantics', true
      )
    ),
  source_path = 'tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql',
  source_content_sha256 = md5('component:NodeFloatingToolbar:freeze-command:483'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'nodeFloatingToolbarFreezeCommand',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.NodeFloatingToolbar',
        'commandRail', 'ToggleCanvasNodeFreeze',
        'renderRail', 'RenderCanvasNodeFloatingToolbar',
        'stateScope', 'workspace-local-canvas-interaction',
        'doesNotMutateDraft', true,
        'nodeProjection', 'draggable=false'
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/stores/canvasInteractionStore.ts'),
        ('apps/web/src/app/stores/canvasInteractionStore.test.ts'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'),
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts'),
        ('apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'),
        ('apps/web/src/app/views/canvas/canvasNodeMapper.ts'),
        ('tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/483_node_floating_toolbar_freeze_command.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:freeze-command:483'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
