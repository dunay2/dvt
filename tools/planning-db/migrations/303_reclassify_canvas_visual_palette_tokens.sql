-- Reclassify canvasPalette.ts as visual viewport tokens, not a fixed add-node
-- palette. The fixed add-node palette sentinel remains CanvasAddNodePalette.tsx;
-- if that file returns, the drift query will report legacy insertion UI again.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'WEB-CANVAS-VISUAL-PALETTE-TOKEN-CLASSIFICATION-20260626',
  'E-CANVAS-LEGACY-PALETTE-RETIRE-1',
  'Canvas visual palette token classification',
  'Frontend / Canvas',
  'implemented',
  'The component registry drift guard incorrectly classified canvasPalette.ts as a legacy fixed add-node palette. The file contains visual color tokens consumed by CanvasViewport and ShellMenu, while the fixed add-node palette path is CanvasAddNodePalette.tsx and is already absent. This migration keeps the legacy sentinel for CanvasAddNodePalette.tsx while mapping visual palette tokens to CanvasViewport.',
  'published_language',
  'ClassifyCanvasPaletteSurface',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

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

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.LegacyCanvasPalette'
  and file_path = 'apps/web/src/app/views/canvas/canvasPalette.ts';

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
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/canvasPalette.ts',
    'presenter',
    'deriveCanvasPaletteTokens',
    jsonb_build_object(
      'role', 'Canvas viewport visual palette token presenter',
      'rail', 'RenderCanvasViewport',
      'legacyAddNodePalette', false
    ),
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    md5('canvasPalette.ts:303')
  ),
  (
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    'migration',
    'canvas_visual_palette_token_classification',
    jsonb_build_object('role', 'Planning DB migration that reclassifies visual palette tokens outside fixed add-node palette retirement'),
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    md5('canvas-visual-palette-token-classification:303')
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
values
  (
    'EV-WEB-CANVAS-VISUAL-PALETTE-TOKEN-CLASSIFICATION',
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'test',
    'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs',
    'passing',
    jsonb_build_object('scope', 'canvasPalette.ts is classified as CanvasViewport visual tokens, while CanvasAddNodePalette.tsx remains the fixed-palette legacy sentinel'),
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    md5('EV-WEB-CANVAS-VISUAL-PALETTE-TOKEN-CLASSIFICATION:303')
  ),
  (
    'EV-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-ABSENT',
    'web.component.canvas.LegacyCanvasPalette',
    'test',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'CanvasAddNodePalette.tsx is absent and CanvasShell does not mount fixed add-node palette UI'
    ),
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    md5('EV-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-ABSENT:303')
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
    'visualPaletteClassificationMigration', 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    'legacySentinelPath', 'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
    'visualPaletteOwner', 'web.component.canvas.CanvasViewport'
  ),
  source_path = 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
  source_content_sha256 = md5('CanvasComponentRegistryDriftGuard:ListCanvasComponentRegistryDrift:303'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasComponentRegistryDriftGuard'
  and rail_name = 'ListCanvasComponentRegistryDrift';

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#E-CANVAS-LEGACY-PALETTE-RETIRE-1#query#classifycanvaspalettesurface',
  'E-CANVAS-LEGACY-PALETTE-RETIRE-1',
  'implemented',
  'ClassifyCanvasPaletteSurface',
  'classifycanvaspalettesurface',
  'query',
  'FrontendComponentRegistry',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql#canvas_component_registry_ui_surface_paths',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx#LEGACY_CANVAS_ADD_NODE_PALETTE_PATH'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    'scripts/planning-db-migrate.test.cjs',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
    'scripts/planning-db-migrate.test.cjs',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm planning:db:query canvas-component-registry-drift --limit 80'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm planning:db:query canvas-component-registry-drift --limit 80',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
  md5('E-CANVAS-LEGACY-PALETTE-RETIRE-1:ClassifyCanvasPaletteSurface:303'),
  jsonb_build_object(
    'name', 'ClassifyCanvasPaletteSurface',
    'type', 'query',
    'dddOwner', 'FrontendComponentRegistry',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-LEGACY-PALETTE-RETIRE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Classify visual Canvas palette tokens separately from fixed add-node palette insertion surfaces. CanvasAddNodePalette.tsx remains the legacy sentinel and is absent from the codebase.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.CanvasViewport',
      'web.component.canvas.LegacyCanvasPalette',
      'web.component.canvas.CanvasComponentRegistryDriftGuard'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
      'scripts/planning-db-migrate.test.cjs',
      'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
      'apps/**#fake_canvas_success'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasComponentRegistryDriftReadModel',
      'CanvasViewportVisualPalette',
      'LegacyCanvasAddNodePaletteSentinel'
    ),
    'fowlerSignals', jsonb_build_array(
      'published_language',
      'false_positive_legacy_classification'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'pnpm planning:db:query canvas-component-registry-drift --limit 80',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:dbfirst_vocabulary_slice'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'pnpm planning:db:query canvas-component-registry-drift --limit 80',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ClassifyCanvasPaletteSurface',
        'type', 'query',
        'dddOwner', 'FrontendComponentRegistry',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ListCanvasComponentRegistryDrift',
        'type', 'query',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'visual-palette-token-reclassification',
        'redTest', 'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs',
        'expectedFailure', 'Migration 303 and visual palette token classification were absent.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest', 'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'canvas_component_registry_ui_surface_paths',
        'path', 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'cqRails', jsonb_build_array('ClassifyCanvasPaletteSurface', 'ListCanvasComponentRegistryDrift'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:dbfirst_vocabulary_slice',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs'
        )
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql'
    ) refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql'
    ) surfaces
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs'
    ) guards
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "visual Canvas palette tokens outside legacy" scripts/planning-db-migrate.test.cjs'
    ) gates
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'visualPaletteClassificationMigration', 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
      'legacySentinelPath', 'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx',
      'allowedImplementationSurfaces', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          select 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql'
        ) raw_surfaces
      )
    ),
  source_path = 'tools/planning-db/migrations/303_reclassify_canvas_visual_palette_tokens.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-REGISTRY-DRIFT-1:visual-palette:303'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1'
  and rail_name = 'ListCanvasComponentRegistryDrift';
