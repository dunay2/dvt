-- Promote SourceImportDialog component ownership from imported Markdown inventory
-- to a DB-first local component overlay. Files and rails already remain
-- relationally owned; this migration changes the component source of truth.

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
values (
  'web.component.canvas.SourceImportDialog',
  'SourceImportDialog',
  'modal',
  'current',
  'harden',
  'Frontend / Canvas',
  'Owns the contextual Add Source dialog shell that opens from the canvas, delegates catalog rendering to SourceImportCatalogView, delegates step composition to SourceImportWizardSteps, and invokes the governed warehouse source-import command/query rails without defining backend semantics.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array(
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-DBFIRST-COMPONENT',
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-NO-STUB-SCAN'
  ),
  'tools/planning-db/migrations/569_source_import_dialog_dbfirst_component_source.sql',
  md5('component:web.component.canvas.SourceImportDialog:569'),
  jsonb_build_object(
    'dbFirst', true,
    'sourceOfTruth', 'planning_query_store.frontend_component_local_components',
    'supersedesSourcePath', 'docs/architecture/components/web/frontend-component-inventory.md',
    'childComponentIds', jsonb_build_array(
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
    ),
    'governingRails', jsonb_build_array(
      'OpenCanvasSourceImportDialog',
      'ListWarehouseConnections',
      'ListWarehouseConnectionTables',
      'CreateWarehouseConnection',
      'TestWarehouseConnection',
      'ImportWarehouseSources'
    ),
    'fowlerSignals', jsonb_build_array(
      'documentation_drift',
      'component_source_of_truth_drift',
      'dialog_container_owns_shell_not_catalog_or_backend'
    ),
    'noStubScan', jsonb_build_object(
      'scope', jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard',
        'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'apps/api/src/application/services/*Warehouse*',
        'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts'
      ),
      'result', 'no executable Source Import not-implemented stub found in active production code'
    )
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
  raw_component = coalesce(planning_query_store.frontend_component_local_components.raw_component, '{}'::jsonb)
    || excluded.raw_component,
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
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-DBFIRST-COMPONENT',
    'web.component.canvas.SourceImportDialog',
    'test',
    'node --test --test-name-pattern "Canvas source import dialog component DB-first" scripts/planning-db-migrate.test.cjs',
    'passing',
    jsonb_build_object(
      'proves', 'SourceImportDialog component source is DB-first and no longer authored from frontend-component-inventory.md.',
      'rail', 'OpenCanvasSourceImportDialog'
    ),
    'tools/planning-db/migrations/569_source_import_dialog_dbfirst_component_source.sql',
    md5('evidence:source-import-dialog-dbfirst-component:569')
  ),
  (
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-NO-STUB-SCAN',
    'web.component.canvas.SourceImportDialog',
    'test',
    'rg -n "not implemented|Not implemented|TODO|FIXME|stub|placeholder|fake|sourceImportAvailable\\s*:\\s*false" apps/web/src/app apps/api/src --glob "!**/*.test.*"',
    'passing',
    jsonb_build_object(
      'proves', 'Active Source Import production code does not contain executable not-implemented stubs or hidden unavailable flags.',
      'rail', 'ImportWarehouseSources'
    ),
    'tools/planning-db/migrations/569_source_import_dialog_dbfirst_component_source.sql',
    md5('evidence:source-import-dialog-no-stub-scan:569')
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
values
  (
    'web.component.canvas.SourceImportDialog',
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-DBFIRST-COMPONENT',
    'architecture-test',
    'current',
    'scripts/planning-db-migrate.test.cjs',
    'OpenCanvasSourceImportDialog',
    'source-import-dialog-dbfirst-component-source',
    'The SourceImportDialog component is query-visible as DB-first local component metadata while preserving existing files and command/query rails.',
    jsonb_build_object(
      'commands', jsonb_build_array(
        'node --test --test-name-pattern "Canvas source import dialog component DB-first" scripts/planning-db-migrate.test.cjs',
        'pnpm planning:db:query component-profile --component web.component.canvas.SourceImportDialog'
      )
    ),
    'tools/planning-db/migrations/569_source_import_dialog_dbfirst_component_source.sql',
    md5('validation-evidence:source-import-dialog-dbfirst-component:569')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-NO-STUB-SCAN',
    'architecture-test',
    'current',
    'rg source import no-stub scan',
    'ImportWarehouseSources',
    'source-import-dialog-no-executable-stub-scan',
    'The active source import production surfaces do not contain executable not-implemented stubs or hidden unavailable-source-import flags.',
    jsonb_build_object(
      'scanTerms', jsonb_build_array(
        'not implemented',
        'TODO',
        'FIXME',
        'stub',
        'placeholder',
        'fake',
        'sourceImportAvailable:false'
      )
    ),
    'tools/planning-db/migrations/569_source_import_dialog_dbfirst_component_source.sql',
    md5('validation-evidence:source-import-dialog-no-stub-scan:569')
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
