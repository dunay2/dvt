-- Restore the DB-first feature-mechanization manifest for the contextual
-- SourceImportDialog rail. Some local histories repointed this rail to
-- retired phantom migration sources and dropped raw_manifest.featureId, which
-- hides the implemented rail from feature-mechanization query read models.

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
  'local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#command#opencanvassourceimportdialog',
  'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
  'implemented',
  'OpenCanvasSourceImportDialog',
  'opencanvassourceimportdialog',
  'command',
  'SourceImportDialog',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHostProps',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHost',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#CanvasSourceImportDialogState',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#useCanvasSourceImportDialogState',
    'scripts/planning-db-query.cjs#readFrontendComponentProfileRows'
  ),
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
    'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/architecture/components/web/frontend-command-query-rail-inventory.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
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
    'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-query.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
  md5('DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog:262')
    || md5('web.component.canvas.SourceImportDialog'),
  jsonb_build_object(
    'componentId', 'web.component.canvas.SourceImportDialog',
    'railName', 'OpenCanvasSourceImportDialog',
    'railType', 'command',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.SourceImportDialog',
      'docs/adr/ADR-0058-warehouse-source-import-rails.md'
    ),
    'userStories', jsonb_build_array(
      'Canvas opens source import as a contextual dialog instead of owning wizard state inside CanvasShell.',
      'Planning DB profile queries can inspect the SourceImportDialog component without traversing heavy component-engineering views.',
      'Feature-mechanization exposes the contextual source import command rail from DB-local state after governance imports.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/adr/ADR-0058-warehouse-source-import-rails.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
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
      '.generated-docs/**',
      'docs/planning/status/**',
      'docs/planning/state/**'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'buzon/**',
      'apps/web/src/app/components/SourceImportWizard.tsx#business_logic',
      'apps/web/src/app/views/canvas/CanvasShell.tsx#source_import_wizard_state_reintroduction'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'OpenCanvasSourceImportDialog',
        'type', 'command',
        'dddOwner', 'SourceImportDialog',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ImportWarehouseSources',
        'type', 'command',
        'dddOwner', 'SourceImportDialog',
        'status', 'implemented-api'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHost',
        'type', 'presentation host',
        'owner', 'SourceImportDialog'
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogState',
        'type', 'UI command state',
        'owner', 'SourceImportDialog'
      ),
      jsonb_build_object(
        'name', 'FrontendComponentProfileReadModel',
        'type', 'Planning DB query read model',
        'owner', 'Planning DB query'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'extract_component',
      'extract_hook',
      'read_model_fast_path',
      'db_local_overlay'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'Canvas source dialog host boundary',
        'command', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx'
      ),
      jsonb_build_object(
        'name', 'Planning DB feature mechanization implementation',
        'command', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:component_boundary',
        'command', 'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-source-import-dialog-host-boundary',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'New Canvas source import host and Planning DB profile symbols are rejected until DB-local feature mechanization declares them.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
          'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
          'scripts/planning-db-query.cjs',
          'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHostProps',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('extract_component', 'typed_presentation_boundary'),
        'architectureGuard', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHost',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog', 'ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('extract_component', 'presentation_logic_separation'),
        'architectureGuard', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('extract_hook', 'state_boundary'),
        'architectureGuard', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'useCanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog'),
        'fowlerSignals', jsonb_build_array('extract_hook', 'permission_sensitive_state'),
        'architectureGuard', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:component_boundary',
        'unitTests', jsonb_build_array(
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
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test scripts/planning-db-query.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    )
  ),
  1,
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
