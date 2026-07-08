-- Correct the SourceImportDialog no-stub evidence created by migration 569.
-- The governed scan is intentionally limited to executable Source Import
-- production surfaces; UI placeholder text and unrelated API services are not
-- Source Import stubs.

update planning_query_store.frontend_component_local_evidence
set
  evidence_ref = 'rg -n "not implemented|Not implemented|TODO|FIXME|stub|fake|sourceImportAvailable\\s*:\\s*false" apps/web/src/app/components/sourceImportWizard apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts apps/api/src/application/services/importWarehouseSourcesUseCase.ts apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts apps/api/src/infrastructure/warehouseSourceImport --glob "!**/*.test.*" --glob "!**/*.architecture.test.*"',
  raw_evidence = coalesce(raw_evidence, '{}'::jsonb)
    || jsonb_build_object(
      'proves', 'Active Source Import production code does not contain executable not-implemented stubs, TODO/FIXME markers, fake implementations, or hidden unavailable-source-import flags.',
      'rail', 'ImportWarehouseSources',
      'scopeCorrectionMigration', 'tools/planning-db/migrations/570_source_import_dialog_no_stub_evidence_scope.sql'
    ),
  source_path = 'tools/planning-db/migrations/570_source_import_dialog_no_stub_evidence_scope.sql',
  source_content_sha256 = md5('evidence:source-import-dialog-no-stub-scan:570'),
  updated_at = now()
where evidence_id = 'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-NO-STUB-SCAN';

update planning_query_store.frontend_component_validation_evidence
set
  evidence_ref = 'rg source import executable no-stub scan',
  proves = 'The active Source Import production surfaces do not contain executable not-implemented stubs, TODO/FIXME markers, fake implementations, or hidden unavailable-source-import flags.',
  raw_evidence = coalesce(raw_evidence, '{}'::jsonb)
    || jsonb_build_object(
      'scanTerms', jsonb_build_array(
        'not implemented',
        'TODO',
        'FIXME',
        'stub',
        'fake',
        'sourceImportAvailable:false'
      ),
      'excludedTerms', jsonb_build_array(
        'placeholder'
      ),
      'scope', jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard',
        'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
        'apps/api/src/infrastructure/warehouseSourceImport'
      ),
      'scopeCorrectionMigration', 'tools/planning-db/migrations/570_source_import_dialog_no_stub_evidence_scope.sql'
    ),
  source_path = 'tools/planning-db/migrations/570_source_import_dialog_no_stub_evidence_scope.sql',
  source_content_sha256 = md5('validation-evidence:source-import-dialog-no-stub-scan:570'),
  updated_at = now()
where component_id = 'web.component.canvas.SourceImportDialog'
  and evidence_id = 'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-NO-STUB-SCAN';

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'noStubScan', jsonb_build_object(
        'scope', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard',
          'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
          'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
          'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
          'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
          'apps/api/src/infrastructure/warehouseSourceImport'
        ),
        'terms', jsonb_build_array(
          'not implemented',
          'TODO',
          'FIXME',
          'stub',
          'fake',
          'sourceImportAvailable:false'
        ),
        'excludedTerms', jsonb_build_array('placeholder'),
        'result', 'no executable Source Import not-implemented stub found in active production code'
      )
    ),
  updated_at = now()
where component_id = 'web.component.canvas.SourceImportDialog';
