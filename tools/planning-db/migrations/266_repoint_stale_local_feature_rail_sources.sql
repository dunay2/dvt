-- Keep local feature-mechanization rails source-backed after local post-import
-- histories from earlier branches pointed at migrations that are not present in
-- the repository. Source-drift must resolve against versioned DB-first sources.

update planning_query_store.feature_mechanization_local_rails
set
  source_path = 'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
  source_content_sha256 =
    md5('246_retire_phantom_ci_governance_helper_components.sql')
    || md5('CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625:266'),
  allowed_implementation_surfaces = jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'
  ),
  implementation_refs = jsonb_build_array(
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'implementationPlan',
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
    'currentImplementationSourcePath',
    'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql',
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'tools/planning-db/migrations/246_retire_phantom_ci_governance_helper_components.sql'
    ),
    'postImportFeatureManifestReconciledBy',
    '266_repoint_stale_local_feature_rail_sources'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625#command#retirephantomgovernancecomponents'
  and source_path = 'tools/planning-db/migrations/256_repoint_phantom_governance_component_retirement_rail_source.sql';

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHostProps',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHost',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#CanvasSourceImportDialogState',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#useCanvasSourceImportDialogState',
    'scripts/planning-db-query.cjs#readFrontendComponentProfileRows'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db/frontend-component-inventory.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    'tools/planning-db/migrations/256_frontend_component_profile_query_indexes.sql',
    'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
    'tools/planning-db/migrations/265_restore_canvas_source_import_dialog_symbols_after_post_import_reconcile.sql',
    'tools/planning-db/migrations/266_repoint_stale_local_feature_rail_sources.sql'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db/frontend-component-inventory.cjs',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    'tools/planning-db/migrations/256_frontend_component_profile_query_indexes.sql',
    'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
    'tools/planning-db/migrations/265_restore_canvas_source_import_dialog_symbols_after_post_import_reconcile.sql',
    'tools/planning-db/migrations/266_repoint_stale_local_feature_rail_sources.sql',
    '.generated-docs/**',
    'docs/planning/status/**',
    'docs/planning/state/**'
  ),
  source_path = 'tools/planning-db/migrations/266_repoint_stale_local_feature_rail_sources.sql',
  source_content_sha256 =
    md5('DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog:266')
    || md5('web.component.canvas.SourceImportDialog'),
  raw_rail = raw_rail || jsonb_build_object(
    'status', 'implemented',
    'sourcePath', 'tools/planning-db/migrations/266_repoint_stale_local_feature_rail_sources.sql'
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'featureId', 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
    'mechanizationStatus', 'implemented',
    'implementationPlan',
    'tools/planning-db/migrations/266_repoint_stale_local_feature_rail_sources.sql',
    'currentImplementationSourcePath',
    'tools/planning-db/migrations/266_repoint_stale_local_feature_rail_sources.sql',
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
      'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
      'apps/web/src/app/views/canvas/CanvasShell.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db/frontend-component-inventory.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
      'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
      'tools/planning-db/migrations/256_frontend_component_profile_query_indexes.sql',
      'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
      'tools/planning-db/migrations/265_restore_canvas_source_import_dialog_symbols_after_post_import_reconcile.sql',
      'tools/planning-db/migrations/266_repoint_stale_local_feature_rail_sources.sql',
      '.generated-docs/**',
      'docs/planning/status/**',
      'docs/planning/state/**'
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHostProps',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('extract_component', 'typed_presentation_boundary'),
        'architectureGuard',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests',
        jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHost',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog', 'ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('extract_component', 'presentation_logic_separation'),
        'architectureGuard',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests',
        jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('extract_hook', 'state_boundary'),
        'architectureGuard',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests',
        jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'useCanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('extract_hook', 'permission_sensitive_state'),
        'architectureGuard',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests',
        jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'readFrontendComponentProfileRows',
        'path', 'scripts/planning-db-query.cjs',
        'dddOwner', 'Planning DB query',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('read_model_fast_path', 'avoid_heavy_view_traversal'),
        'architectureGuard', 'node --test scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_cli',
        'unitTests', jsonb_build_array('node --test scripts/planning-db-query.test.cjs')
      )
    ),
    'postImportFeatureManifestReconciledBy',
    '266_repoint_stale_local_feature_rail_sources'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#command#opencanvassourceimportdialog'
  and source_path = 'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql';
