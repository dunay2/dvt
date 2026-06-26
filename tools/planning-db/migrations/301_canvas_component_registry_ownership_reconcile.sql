-- Reconcile Canvas component ownership backlog exposed by the DB-first drift
-- guard. This keeps the Fowler vocabulary in Planning DB before UI behavior
-- changes continue: node cards, source import, workbench, shell chrome and
-- legacy palette surfaces have one declared component owner.

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
  'CANVAS-COMPONENT-REGISTRY-OWNERSHIP-RECONCILE-20260626',
  'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1',
  'Canvas component registry ownership reconciliation',
  'Frontend / Planning DB',
  'implemented',
  'The Canvas component drift query exposed UI files whose owners were either absent or duplicated. This migration fixes the Planning DB vocabulary before further TAREA.TXT implementation changes by registering node card owners, mapping presentation files to their existing components, and deleting the stale DVT SQL transform ownership over the DVT authoring selector.',
  'boundary_drift',
  'ListCanvasComponentRegistryDrift',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

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
  source_path,
  source_content_sha256,
  raw_component
)
values
  (
    'web.component.canvas.GraphNodeCard',
    'GraphNodeCard',
    'state-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Owns the shared Canvas graph node card shell used by DBT and DVT cards so card layout, handles, status badges and metric slots are not reimplemented inside flow-specific renderers.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    jsonb_build_array(
      'NiFi-style metric slots must continue to be supplied by DBT/DVT node-card strategies instead of hard-coded inside the shell.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-COMPONENT-REGISTRY-OWNERSHIP-RECONCILE'
    ),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('web.component.canvas.GraphNodeCard:301'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'shared_presentation_shell',
      'governingRail', 'RenderCanvasGraphNodeCard',
      'strategyBoundary', 'DBT/DVT-specific card data remains outside the shell.'
    )
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'DbtNodeCard',
    'state-view',
    'current',
    'harden',
    'Frontend / Canvas',
    'Owns DBT-specific Canvas node card rendering, including model/test/source badges, runtime metrics and metadata summaries projected into the shared graph node shell.',
    '@dvt/web',
    '/canvas',
    'dbt',
    jsonb_build_array(
      'DBT tests still need richer target and column semantics before the product P0 flow can close.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-COMPONENT-REGISTRY-OWNERSHIP-RECONCILE'
    ),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('web.component.canvas.DbtNodeCard:301'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'strategy_specific_card_renderer',
      'governingRail', 'RenderDbtCanvasNodeCard',
      'strategyBoundary', 'DBT card semantics are separated from the generic graph node shell.'
    )
  ),
  (
    'web.component.canvas.LegacyCanvasPalette',
    'LegacyCanvasPalette',
    'canvas-explorer',
    'retire',
    'retire',
    'Frontend / Canvas',
    'Represents fixed add-node palette assets kept only as a tracked legacy owner until spatial canvas context-menu insertion fully replaces palette-driven insertion.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    jsonb_build_array(
      'TAREA.TXT requires insertion to originate from canvas context menus, so fixed palette remnants must stay visible as retirement work.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-COMPONENT-REGISTRY-OWNERSHIP-RECONCILE'
    ),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('web.component.canvas.LegacyCanvasPalette:301'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'legacy_surface_retirement',
      'governingRail', 'ResolveCanvasContextMenu',
      'legacyDisposition', 'Retire after canvas context-menu insertion owns add-node behavior.'
    )
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
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.GraphNodeCard',
    'web.canvas.graph',
    '/canvas',
    'graph-node-card-shell',
    31,
    jsonb_build_object('surfaceRole', 'shared graph node card shell'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('GraphNodeCard:web.canvas.graph:301')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'web.canvas.graph',
    '/canvas',
    'dbt-node-card-renderer',
    32,
    jsonb_build_object('surfaceRole', 'DBT strategy node card renderer'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('DbtNodeCard:web.canvas.graph:301')
  ),
  (
    'web.component.canvas.LegacyCanvasPalette',
    'web.canvas.graph',
    '/canvas',
    'legacy-fixed-palette',
    99,
    jsonb_build_object('surfaceRole', 'legacy palette retirement marker'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('LegacyCanvasPalette:web.canvas.graph:301')
  )
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'component',
    'CanvasNodeShell',
    jsonb_build_object('role', 'shared graph node card shell', 'rail', 'RenderCanvasGraphNodeCard'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('CanvasNodeShell.tsx:301')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    'component',
    'DbtNodeComponent',
    jsonb_build_object('role', 'DBT graph node card renderer', 'rail', 'RenderDbtCanvasNodeCard'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('DbtNodeComponent.tsx:301')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'apps/web/src/app/components/canvas/DbtNodeComponent.module.css',
    'style',
    null,
    jsonb_build_object('role', 'DBT graph node card styling', 'rail', 'RenderDbtCanvasNodeCard'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('DbtNodeComponent.module.css:301')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'component',
    'NodePropertySectionView',
    jsonb_build_object('role', 'node property section presentation template', 'rail', 'InspectCanvasNodeProperties'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('NodePropertySectionView.tsx:301')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
    'component',
    'OperationalDrawerPanelSurface',
    jsonb_build_object('role', 'bottom operational drawer primitive templates', 'rail', 'ResolveOperationalDrawerContribution'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('OperationalDrawerPanelPrimitives.tsx:301')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx',
    'presenter',
    'renderCanvasWorkbenchSurface',
    jsonb_build_object('role', 'center-surface node workbench presenter', 'rail', 'InspectCanvasNodeProperties'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('canvasCenterSurfaceWorkbench.tsx:301')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx',
    'component',
    'CanvasContextualWorkbenchPanel',
    jsonb_build_object('role', 'contextual node workbench panel template', 'rail', 'InspectCanvasNodeProperties'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('CanvasContextualWorkbenchPanel.tsx:301')
  ),
  (
    'web.component.canvas.LegacyCanvasPalette',
    'apps/web/src/app/views/canvas/canvasPalette.ts',
    'presenter',
    'deriveCanvasPaletteTokens',
    jsonb_build_object('role', 'legacy palette token helper', 'rail', 'ResolveCanvasContextMenu', 'legacy', true),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('canvasPalette.ts:301')
  ),
  (
    'web.component.canvas.CanvasShellChrome',
    'apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.tsx',
    'component',
    'CanvasWorkspaceMenuControls',
    jsonb_build_object('role', 'workspace menu chrome controls', 'rail', 'ResolveCanvasShellChrome'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('CanvasWorkspaceMenuControls.tsx:301')
  ),
  (
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
    'component',
    'DbtAuthoringFields',
    jsonb_build_object('role', 'DBT authoring fields template', 'rail', 'ConfigureCanvasDbtNode'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('DbtAuthoringFields.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
    'component',
    'ConnectionStep',
    jsonb_build_object('role', 'source import connection step', 'rail', 'ListWarehouseConnections'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('ConnectionStep.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx',
    'component',
    'GroupingStep',
    jsonb_build_object('role', 'source import grouping step', 'rail', 'ImportWarehouseSources'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('GroupingStep.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/OptionsStep.tsx',
    'component',
    'OptionsStep',
    jsonb_build_object('role', 'source import options step', 'rail', 'ImportWarehouseSources'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('OptionsStep.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/ResultStep.tsx',
    'component',
    'ResultStep',
    jsonb_build_object('role', 'source import result step', 'rail', 'ImportWarehouseSources'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('ResultStep.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'component',
    'ReviewStep',
    jsonb_build_object('role', 'source import review step', 'rail', 'ImportWarehouseSources'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('ReviewStep.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'component',
    'SelectionStep',
    jsonb_build_object('role', 'source import table selection step', 'rail', 'ListWarehouseConnectionTables'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('SelectionStep.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx',
    'component',
    'SourceImportMetadataPanel',
    jsonb_build_object('role', 'source import metadata panel', 'rail', 'ListWarehouseConnectionTables'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('SourceImportMetadataPanel.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/WizardProgress.tsx',
    'component',
    'WizardProgress',
    jsonb_build_object('role', 'source import progress indicator', 'rail', 'OpenCanvasSourceImportDialog'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('WizardProgress.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'component',
    'WizardStepContent',
    jsonb_build_object('role', 'source import step router', 'rail', 'OpenCanvasSourceImportDialog'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('WizardStepContent.tsx:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'hook',
    'useSourceImportWizard',
    jsonb_build_object('role', 'source import wizard presenter state', 'rail', 'OpenCanvasSourceImportDialog'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('useSourceImportWizard.ts:301')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts',
    'hook',
    'useConnectionsLoader',
    jsonb_build_object('role', 'source import wizard data loaders', 'rail', 'ListWarehouseConnectionTables'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('useSourceImportWizardDataLoaders.ts:301')
  ),
  (
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    'migration',
    'canvas_component_registry_ownership_reconcile',
    jsonb_build_object('role', 'Planning DB migration that reconciles Canvas component ownership backlog'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('canvas-component-registry-ownership-reconcile:301')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.DvtSqlTransformAuthoringSection'
  and file_path = 'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx';

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
    'web.component.canvas.GraphNodeCard',
    'RenderCanvasGraphNodeCard',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Render shared graph-node shell slots without DBT/DVT strategy logic.',
      'owner', 'GraphNodeCard'
    ),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('GraphNodeCard:RenderCanvasGraphNodeCard:301')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'RenderDbtCanvasNodeCard',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Render DBT-specific Canvas node-card semantics through the shared graph-node shell.',
      'owner', 'DbtNodeCard'
    ),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('DbtNodeCard:RenderDbtCanvasNodeCard:301')
  ),
  (
    'web.component.canvas.LegacyCanvasPalette',
    'ResolveCanvasContextMenu',
    'local-query',
    'deprecated-local',
    jsonb_build_object(
      'purpose', 'Track legacy fixed-palette code until context-menu insertion fully replaces it.',
      'owner', 'LegacyCanvasPalette',
      'retirementCondition', 'No fixed palette insertion surface remains in the Canvas route.'
    ),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('LegacyCanvasPalette:ResolveCanvasContextMenu:301')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
    'EV-WEB-CANVAS-COMPONENT-REGISTRY-OWNERSHIP-RECONCILE',
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'test',
    'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs',
    'passing',
    jsonb_build_object('scope', 'migration registers missing component owners and deletes duplicate DVT authoring ownership'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('EV-WEB-CANVAS-COMPONENT-REGISTRY-OWNERSHIP-RECONCILE:301')
  ),
  (
    'EV-WEB-CANVAS-COMPONENT-REGISTRY-OWNERSHIP-DRIFT-QUERY',
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'query',
    'pnpm planning:db:query canvas-component-registry-drift --limit 80',
    'passing',
    jsonb_build_object('scope', 'query no longer reports unmapped or duplicate Canvas component ownership rows after migration 301'),
    'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    md5('EV-WEB-CANVAS-COMPONENT-REGISTRY-OWNERSHIP-DRIFT-QUERY:301')
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
    'ownershipReconciliationMigration', 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
    'ownershipPolicy', 'Every listed Canvas UI surface has one frontend component owner; legacy palette ownership is explicit retirement work.'
  ),
  source_path = 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
  source_content_sha256 = md5('CanvasComponentRegistryDriftGuard:ListCanvasComponentRegistryDrift:301'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasComponentRegistryDriftGuard'
  and rail_name = 'ListCanvasComponentRegistryDrift';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql#GraphNodeCard'),
        ('tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql#DbtNodeCard'),
        ('tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql#LegacyCanvasPalette'),
        ('tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql#canvas_component_registry_ownership_reconcile')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql'
    ) refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      select 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql'
    ) surfaces
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
      union all
      select 'pnpm planning:db:query canvas-component-registry-drift --limit 80'
    ) guards
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      select 'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
      union all
      select 'pnpm planning:db:query canvas-component-registry-drift --limit 80'
    ) gates
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'ownershipPolicy', 'Canvas UI surfaces listed by the drift guard must have exactly one DB-owned frontend component owner before product UI changes continue.',
      'allowedImplementationSurfaces', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
          union all
          select 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql'
        ) raw_surfaces
      ),
      'architectureGuards', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'architectureGuards', '[]'::jsonb))
          union all
          select 'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
          union all
          select 'pnpm planning:db:query canvas-component-registry-drift --limit 80'
        ) raw_guards
      ),
      'completionGate', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'completionGate', '[]'::jsonb))
          union all
          select 'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
          union all
          select 'pnpm planning:db:query canvas-component-registry-drift --limit 80'
        ) raw_gates
      ),
      'redGreenCycles', coalesce(raw_manifest->'redGreenCycles', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'id', 'canvas-component-registry-ownership-reconcile',
            'redTest', 'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs',
            'expectedFailure', 'Migration 301 and the DB-first ownership reconciliation were absent.',
            'patchSurfaces', jsonb_build_array(
              'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
              'scripts/planning-db-migrate.test.cjs'
            ),
            'greenTest', 'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
          )
        ),
      'symbols', coalesce(raw_manifest->'symbols', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'name', 'GraphNodeCard',
            'path', 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
            'dddOwner', 'FrontendComponentRegistry',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard', 'ListCanvasComponentRegistryDrift'),
            'fowlerSignals', jsonb_build_array('shared_presentation_shell'),
            'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
            'cypressCoverage', 'not_applicable:planning_db_registry_slice',
            'unitTests', jsonb_build_array(
              'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
            )
          ),
          jsonb_build_object(
            'name', 'DbtNodeCard',
            'path', 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
            'dddOwner', 'FrontendComponentRegistry',
            'cqRails', jsonb_build_array('RenderDbtCanvasNodeCard', 'ListCanvasComponentRegistryDrift'),
            'fowlerSignals', jsonb_build_array('strategy_specific_card_renderer'),
            'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
            'cypressCoverage', 'not_applicable:planning_db_registry_slice',
            'unitTests', jsonb_build_array(
              'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
            )
          ),
          jsonb_build_object(
            'name', 'LegacyCanvasPalette',
            'path', 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
            'dddOwner', 'FrontendComponentRegistry',
            'cqRails', jsonb_build_array('ResolveCanvasContextMenu', 'ListCanvasComponentRegistryDrift'),
            'fowlerSignals', jsonb_build_array('legacy_surface_retirement'),
            'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
            'cypressCoverage', 'not_applicable:planning_db_registry_slice',
            'unitTests', jsonb_build_array(
              'node --test --test-name-pattern "Canvas component registry ownership backlog" scripts/planning-db-migrate.test.cjs'
            )
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/301_canvas_component_registry_ownership_reconcile.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-REGISTRY-DRIFT-1:ListCanvasComponentRegistryDrift:301'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1'
  and rail_name = 'ListCanvasComponentRegistryDrift';
