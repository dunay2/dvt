-- Align the Canvas component registry drift read model with the extracted graph
-- node presentation boundary. The guard uses an explicit Canvas UI vocabulary;
-- the new shared shell stylesheet and port handle must be part of that query.

create or replace view planning_query_store.canvas_component_registry_drift_query as
with canvas_component_registry_ui_surface_paths (
  file_path,
  surface_role,
  expected_component_id
) as (
  values
    (
      'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
      'node-card',
      'web.component.canvas.GraphNodeCard'
    ),
    (
      'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
      'node-card-style',
      'web.component.canvas.GraphNodeCard'
    ),
    (
      'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
      'node-card-port',
      'web.component.canvas.GraphNodeCard'
    ),
    (
      'apps/web/src/app/components/canvas/DbtNodeComponent.module.css',
      'retired-node-card-style',
      'web.component.canvas.DbtNodeCard'
    ),
    (
      'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
      'node-card',
      'web.component.canvas.DbtNodeCard'
    ),
    (
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'node-workbench',
      'web.component.canvas.NodeWorkbench'
    ),
    (
      'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
      'node-workbench',
      'web.component.canvas.NodeWorkbench'
    ),
    (
      'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
      'bottom-drawer',
      'web.component.shell.BottomOperationalDrawer'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/OptionsStep.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/ResultStep.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/WizardProgress.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
      'source-import',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
      'source-import-presenter',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts',
      'source-import-presenter',
      'web.component.canvas.SourceImportDialog'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
      'legacy-palette',
      'web.component.canvas.LegacyCanvasPalette'
    ),
    (
      'apps/web/src/app/views/canvas/canvasPalette.ts',
      'canvas-viewport-style',
      'web.component.canvas.CanvasViewport'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
      'shell-chrome',
      'web.component.canvas.CanvasShellChrome'
    ),
    (
      'apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts',
      'shell-chrome-presenter',
      'web.component.canvas.CanvasShellChrome'
    ),
    (
      'apps/web/src/app/views/canvas/canvasShellChromeStateBuilder.ts',
      'shell-chrome-presenter',
      'web.component.canvas.CanvasShellChrome'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx',
      'shell-chrome',
      'web.component.canvas.CanvasShellChrome'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.tsx',
      'shell-chrome',
      'web.component.canvas.CanvasShellChrome'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasWorkbenchTabStrip.tsx',
      'shell-chrome',
      'web.component.canvas.CanvasShellChrome'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
      'canvas-context-menu',
      'web.component.canvas.CanvasContextMenu'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
      'canvas-context-menu',
      'web.component.canvas.CanvasContextMenu'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      'canvas-context-menu',
      'web.component.canvas.CanvasContextMenu'
    ),
    (
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'canvas-context-menu-presenter',
      'web.component.canvas.CanvasContextMenuPresenter'
    ),
    (
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
      'node-context-menu',
      'web.component.canvas.CanvasNodeContextMenu'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'node-workbench',
      'web.component.canvas.CanvasNodeWorkbenchPanel'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'node-workbench',
      'web.component.canvas.CanvasNodeWorkbenchPanel'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx',
      'node-workbench',
      'web.component.canvas.CanvasNodeWorkbenchPanel'
    ),
    (
      'apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx',
      'node-workbench',
      'web.component.canvas.CanvasNodeWorkbenchPanel'
    ),
    (
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
      'node-workbench-presenter',
      'web.component.canvas.CanvasSurfaceStrategy'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasViewport.tsx',
      'canvas-viewport',
      'web.component.canvas.CanvasViewport'
    ),
    (
      'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
      'canvas-viewport',
      'web.component.canvas.CanvasViewport'
    ),
    (
      'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
      'canvas-viewport-presenter',
      'web.component.canvas.CanvasViewport'
    ),
    (
      'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
      'canvas-viewport-presenter',
      'web.component.canvas.CanvasViewport'
    ),
    (
      'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
      'authoring-fields',
      'web.component.canvas.DbtAuthoringFields'
    ),
    (
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
      'authoring-fields',
      'web.component.canvas.DvtAuthoringFields'
    )
),
canvas_candidate_files as materialized (
  select
    governed_file.path as file_path,
    surface.file_path as governed_surface_path,
    surface.surface_role,
    surface.expected_component_id,
    governed_file.source_path,
    governed_file.source_content_sha256
  from canvas_component_registry_ui_surface_paths surface
  join planning_query_store.governance_file_query governed_file
    on governed_file.path = surface.file_path
),
registered_file_owners as materialized (
  select
    file_ref.file_path,
    jsonb_agg(distinct file_ref.component_id order by file_ref.component_id) as registered_component_ids,
    count(distinct file_ref.component_id)::int as registered_component_count
  from planning_query_store.frontend_component_file_query file_ref
  group by file_ref.file_path
),
joined as materialized (
  select
    candidate.file_path,
    candidate.surface_role,
    candidate.expected_component_id,
    coalesce(owner.registered_component_ids, '[]'::jsonb) as registered_component_ids,
    coalesce(owner.registered_component_count, 0) as registered_component_count,
    candidate.source_path,
    candidate.source_content_sha256
  from canvas_candidate_files candidate
  left join registered_file_owners owner
    on owner.file_path = candidate.file_path
),
unmapped as (
  select
    'blocker'::text as severity,
    'unmapped_canvas_component_file'::text as drift_state,
    joined.file_path,
    joined.expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'Register the Canvas file in frontend_component_local_files before changing UI behavior.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'expectedComponentId', joined.expected_component_id,
      'registeredComponentCount', joined.registered_component_count
    ) as metadata
  from joined
  where joined.registered_component_count = 0
),
unexpected_owner as (
  select
    'error'::text as severity,
    'unexpected_canvas_component_owner'::text as drift_state,
    joined.file_path,
    joined.expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'Move the file mapping to the expected Canvas component or adjust the DB vocabulary before implementation.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'expectedComponentId', joined.expected_component_id,
      'registeredComponentIds', joined.registered_component_ids
    ) as metadata
  from joined
  where joined.registered_component_count > 0
    and not (joined.registered_component_ids ? joined.expected_component_id)
),
duplicate_owner as (
  select
    'error'::text as severity,
    'duplicate_canvas_component_file_owner'::text as drift_state,
    joined.file_path,
    joined.expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'A Canvas file must not be owned by more than one frontend component.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'expectedComponentId', joined.expected_component_id,
      'registeredComponentIds', joined.registered_component_ids
    ) as metadata
  from joined
  where joined.registered_component_count > 1
),
legacy_palette as (
  select
    'error'::text as severity,
    'legacy_canvas_palette_surface'::text as drift_state,
    joined.file_path,
    'web.component.canvas.LegacyCanvasPalette'::text as expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'Retire fixed palette surfaces after spatial context-menu insertion owns add-node behavior.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'legacyReason', 'TAREA.TXT requires insertion to originate from the canvas context, not a fixed palette.',
      'sentinelPath', 'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx'
    ) as metadata
  from joined
  where joined.surface_role = 'legacy-palette'
),
drift_rows as (
  select * from unmapped
  union all
  select * from unexpected_owner
  union all
  select * from duplicate_owner
  union all
  select * from legacy_palette
)
select *
from drift_rows
order by
  case severity
    when 'blocker' then 0
    when 'error' then 1
    when 'warning' then 2
    else 3
  end,
  drift_state,
  file_path;

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('tools/planning-db/migrations/314_canvas_node_shell_drift_guard_alignment.sql#CanvasNodeShellDriftGuardAlignment'),
        ('tools/planning-db/migrations/314_canvas_node_shell_drift_guard_alignment.sql#canvas_component_registry_ui_surface_paths')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/314_canvas_node_shell_drift_guard_alignment.sql'
    ) surfaces(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "Canvas node shell drift guard alignment" scripts/planning-db-migrate.test.cjs'
    ) guards(value)
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "Canvas node shell drift guard alignment" scripts/planning-db-migrate.test.cjs'
    ) gates(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'driftGuardAlignmentMigration', 'tools/planning-db/migrations/314_canvas_node_shell_drift_guard_alignment.sql',
      'allowedImplementationSurfaces',
      (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          select 'tools/planning-db/migrations/314_canvas_node_shell_drift_guard_alignment.sql'
        ) surfaces(value)
      ),
      'symbols',
      (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) as symbol_refs(value)
          union all
          select jsonb_build_object(
            'name', 'CanvasNodeShellDriftGuardAlignment',
            'path', 'tools/planning-db/migrations/314_canvas_node_shell_drift_guard_alignment.sql',
            'dddOwner', 'CanvasComponentRegistryDriftReadModel',
            'cqRails', jsonb_build_array('ListCanvasComponentRegistryDrift', 'RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array('published_language', 'drift_guard_alignment'),
            'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
            'cypressCoverage', 'not_applicable:dbfirst_registry_slice',
            'unitTests', jsonb_build_array(
              'node --test --test-name-pattern "Canvas node shell drift guard alignment" scripts/planning-db-migrate.test.cjs'
            )
          )
        ) symbols(value)
      )
    ),
  source_path = 'tools/planning-db/migrations/314_canvas_node_shell_drift_guard_alignment.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodeShellDriftGuardAlignment:314'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
