-- Register NodeFloatingToolbar freeze as an explicit unavailable posture.
-- This does not add a freeze command. The toolbar may show the action only as
-- disabled copy while the owning freeze rail/policy remains absent.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'actionProjectionPolicy',
      jsonb_build_object(
        'operableActions', jsonb_build_array('code'),
        'visibleUnavailableActions', jsonb_build_array('freeze'),
        'omittedUntilRailExists', jsonb_build_array('more'),
        'emptyModelHandling', 'CanvasViewport does not mount a toolbar when no operable action exists',
        'noFreezeCommandAdded', true
      )
    ),
  source_path = 'tools/planning-db/migrations/446_node_floating_toolbar_freeze_posture.sql',
  source_content_sha256 = md5('file:canvasNodeFloatingToolbarModel:freeze-posture:446'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'freezeUnavailableRendering',
      jsonb_build_object(
        'actionId', 'freeze',
        'label', 'Congelar',
        'state', 'unavailable',
        'ariaDisabled', true,
        'noActionHandler', true
      )
    ),
  source_path = 'tools/planning-db/migrations/446_node_floating_toolbar_freeze_posture.sql',
  source_content_sha256 = md5('file:CanvasNodeFloatingToolbarView:freeze-posture:446'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx';

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
  'EV-CANVAS-NODE-FLOATING-TOOLBAR-FREEZE-UNAVAILABLE-POSTURE',
  'presentation-test',
  'current',
  'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts;apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx;apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
  'RenderCanvasNodeFloatingToolbar',
  'node-left-click',
  'NodeFloatingToolbar renders Congelar as an explicit unavailable posture when the toolbar has an operable code action, without adding a freeze command or mounting a dead toolbar.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected Congelar to be rendered as unavailable but it was absent',
    'operableActions', jsonb_build_array('code'),
    'visibleUnavailableActions', jsonb_build_array('freeze'),
    'omittedUntilRailExists', jsonb_build_array('more'),
    'noFreezeCommandAdded', true,
    'commands',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'
    )
  ),
  'tools/planning-db/migrations/446_node_floating_toolbar_freeze_posture.sql',
  md5('evidence:NodeFloatingToolbar:freeze-unavailable-posture:446')
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
      values ('EV-CANVAS-NODE-FLOATING-TOOLBAR-FREEZE-UNAVAILABLE-POSTURE')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'freezeUnavailablePosture',
      jsonb_build_object(
        'rail', 'RenderCanvasNodeFloatingToolbar',
        'doesNotCreateFreezeCommand', true,
        'visibleUnavailableActions', jsonb_build_array('freeze')
      )
    ),
  source_path = 'tools/planning-db/migrations/446_node_floating_toolbar_freeze_posture.sql',
  source_content_sha256 = md5('component:NodeFloatingToolbar:freeze-posture:446'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'nodeFloatingToolbarFreezeUnavailablePosture',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.NodeFloatingToolbar',
        'rail', 'RenderCanvasNodeFloatingToolbar',
        'operableActions', jsonb_build_array('code'),
        'visibleUnavailableActions', jsonb_build_array('freeze'),
        'noFreezeCommandAdded', true
      )
    ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('tools/planning-db/migrations/446_node_floating_toolbar_freeze_posture.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/446_node_floating_toolbar_freeze_posture.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:freeze-posture:446'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
