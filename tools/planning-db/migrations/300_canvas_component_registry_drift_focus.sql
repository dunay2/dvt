-- Focus the Canvas component registry drift guard on UI/component surfaces.
-- Migration 299 intentionally exposed a broad first read model; this follow-up
-- keeps the query actionable by listing presentation, presenter, contextual
-- menu, source import, drawer and workbench surfaces explicitly.

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
      'apps/web/src/app/components/canvas/DbtNodeComponent.module.css',
      'node-card-style',
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
      'legacy-palette',
      'web.component.canvas.LegacyCanvasPalette'
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
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'canvas-context-menu-presenter',
      'web.component.canvas.CanvasContextMenuPresenter'
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
      'legacyReason', 'TAREA.TXT requires insertion to originate from the canvas context, not a fixed palette.'
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
  'web.component.canvas.CanvasComponentRegistryDriftGuard',
  'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
  'migration',
  'canvas_component_registry_drift_query',
  jsonb_build_object(
    'role', 'Planning DB migration that focuses Canvas component registry drift on UI surfaces'
  ),
  'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
  md5('canvas-component-registry-drift-focus:300')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
values (
  'EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-FOCUS',
  'web.component.canvas.CanvasComponentRegistryDriftGuard',
  'test',
  'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs',
  'passing',
  jsonb_build_object('scope', 'migration narrows registry drift to UI surfaces'),
  'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
  md5('EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-FOCUS:300')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'focusMigration', 'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
    'focusPolicy', 'Only UI component, presenter, menu, drawer, source import and workbench surfaces are registry drift candidates.'
  ),
  source_path = 'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
  source_content_sha256 = md5('CanvasComponentRegistryDriftGuard:ListCanvasComponentRegistryDrift:300'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasComponentRegistryDriftGuard'
  and rail_name = 'ListCanvasComponentRegistryDrift';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql'
    ) refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql'
    ) surfaces
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs'
    ) guards
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs'
    ) gates
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'focusPolicy', 'Canvas component registry drift candidates are DB-listed UI surfaces, not every Canvas lifecycle or repository file.',
      'allowedImplementationSurfaces', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          select 'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql'
        ) raw_surfaces
      ),
      'architectureGuards', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'architectureGuards', '[]'::jsonb))
          union all
          select 'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs'
        ) raw_guards
      ),
      'completionGate', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'completionGate', '[]'::jsonb))
          union all
          select 'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs'
        ) raw_gates
      ),
      'redGreenCycles', coalesce(raw_manifest->'redGreenCycles', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'id', 'canvas-component-registry-drift-focus',
            'redTest', 'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs',
            'expectedFailure', 'Migration 300 and the focused UI-surface candidate list were absent.',
            'patchSurfaces', jsonb_build_array(
              'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
              'scripts/planning-db-migrate.test.cjs'
            ),
            'greenTest', 'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs'
          )
        ),
      'symbols', coalesce(raw_manifest->'symbols', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'name', 'canvas_component_registry_ui_surface_paths',
            'path', 'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
            'dddOwner', 'CanvasComponentRegistryDriftReadModel',
            'cqRails', jsonb_build_array('ListCanvasComponentRegistryDrift'),
            'fowlerSignals', jsonb_build_array('boundary_drift', 'legacy_surface'),
            'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
            'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
            'unitTests', jsonb_build_array(
              'node --test --test-name-pattern "Canvas component registry drift on UI surfaces" scripts/planning-db-migrate.test.cjs'
            )
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/300_canvas_component_registry_drift_focus.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-REGISTRY-DRIFT-1:ListCanvasComponentRegistryDrift:300'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1'
  and rail_name = 'ListCanvasComponentRegistryDrift';
