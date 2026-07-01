-- Align NodeFloatingToolbar with the no-stub product rule: the left-click
-- toolbar only renders actions backed by an operable callback/rail.

update planning_query_store.frontend_component_local_files
set
  raw_file = raw_file
    || jsonb_build_object(
      'actionProjectionPolicy',
      jsonb_build_object(
        'onlyOperableActions', true,
        'omittedUntilRailExists', jsonb_build_array('freeze', 'more'),
        'emptyModelHandling', 'CanvasViewport does not mount an empty toolbar'
      )
    ),
  source_path = 'tools/planning-db/migrations/423_node_floating_toolbar_operable_actions.sql',
  source_content_sha256 = md5('file:canvasNodeFloatingToolbarModel:operable-actions:423'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = raw_file
    || jsonb_build_object(
      'emptyToolbarGuard', true,
      'mountsOnlyWhenActionsExist', true,
      'rail', 'RenderCanvasNodeFloatingToolbar'
    ),
  source_path = 'tools/planning-db/migrations/423_node_floating_toolbar_operable_actions.sql',
  source_content_sha256 = md5('file:CanvasViewport:operable-toolbar-actions:423'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeFloatingToolbar'
  and file_path = 'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx';

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
  'EV-CANVAS-NODE-FLOATING-TOOLBAR-OPERABLE-ACTIONS-ONLY',
  'integration-test',
  'current',
  'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts;apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx;apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx',
  'RenderCanvasNodeFloatingToolbar',
  'node-left-click',
  'NodeFloatingToolbar omits freeze/more until an owning rail exists and does not mount an empty toolbar.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected only code action but received code, freeze, more',
    'commands',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'
    ),
    'noStubActions', true
  ),
  'tools/planning-db/migrations/423_node_floating_toolbar_operable_actions.sql',
  md5('evidence:NodeFloatingToolbar:operable-actions-only:423')
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
      'nodeFloatingToolbarOperableActionsOnly',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.NodeFloatingToolbar',
        'rail', 'RenderCanvasNodeFloatingToolbar',
        'rule', 'visible toolbar actions must be backed by an operable component callback and governing rail',
        'omittedUntilRailExists', jsonb_build_array('freeze', 'more')
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
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'),
        ('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('tools/planning-db/migrations/423_node_floating_toolbar_operable_actions.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/423_node_floating_toolbar_operable_actions.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:operable-actions:423'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
