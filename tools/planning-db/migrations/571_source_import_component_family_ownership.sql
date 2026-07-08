-- Complete the DB-first Source Import component family map.
--
-- The product flow already exists through SourceImportDialog,
-- SourceImportCatalogView, and SourceImportWizardSteps. This migration records
-- the remaining source/test artifacts that explain the family contract so DB
-- queries can detect drift without falling back to Markdown inventory.

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'componentFamily',
      jsonb_build_object(
        'rootComponentId', 'web.component.canvas.SourceImportDialog',
        'children', jsonb_build_array(
          jsonb_build_object(
            'componentId', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
            'rail', 'RenderSourceImportCatalogView',
            'responsibility', 'Catalog query projection, search, filters, table cards, metadata preview, and selection basket presentation.'
          ),
          jsonb_build_object(
            'componentId', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
            'rail', 'ImportWarehouseSources',
            'responsibility', 'Wizard step policy, selected-source review, grouping, options, and import submission composition.'
          )
        ),
        'evidence', 'EV-SOURCE-IMPORT-COMPONENT-FAMILY-OWNERSHIP'
      )
    ),
  evidence_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-SOURCE-IMPORT-COMPONENT-FAMILY-OWNERSHIP')
    ) as refs(ref)
  ),
  source_path = 'tools/planning-db/migrations/571_source_import_component_family_ownership.sql',
  source_content_sha256 = md5('component-family:web.component.canvas.SourceImportDialog:571'),
  updated_at = now()
where component_id = 'web.component.canvas.SourceImportDialog';

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
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
    'architecture-test',
    null,
    jsonb_build_object(
      'responsibility',
      'Guard SourceImportWizard shell/step separation, provider catalog vocabulary, and review-template delegation.',
      'rail',
      'OpenCanvasSourceImportDialog',
      'familyComponents',
      jsonb_build_array(
        'web.component.canvas.SourceImportDialog',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
      )
    ),
    'tools/planning-db/migrations/571_source_import_component_family_ownership.sql',
    md5('file:SourceImportWizard.architecture.test.tsx:571')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/SourceImportWizard.pluginOptions.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility',
      'Verify plugin-declared Source Import options and defaults are applied through the dialog controller before ImportWarehouseSources.',
      'rail',
      'ImportWarehouseSources',
      'usesHarness',
      'apps/web/src/app/components/SourceImportWizard.testHarness.tsx'
    ),
    'tools/planning-db/migrations/571_source_import_component_family_ownership.sql',
    md5('file:SourceImportWizard.pluginOptions.test.tsx:571')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'test-adapter',
    'createSourceImportWizardHarness',
    jsonb_build_object(
      'responsibility',
      'Provide SourceImportWizard presentation tests with an AppServicesProvider and governed IWarehouseSourceImportPort test double.',
      'rail',
      'OpenCanvasSourceImportDialog',
      'testOnly',
      true
    ),
    'tools/planning-db/migrations/571_source_import_component_family_ownership.sql',
    md5('file:SourceImportWizard.testHarness.tsx:571')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility',
      'Verify Add Source section tabs expose Connections, Browse, Metadata, and Selected as the wizard navigation contract.',
      'rail',
      'OpenCanvasSourceImportDialog',
      'componentUnderTest',
      'SourceImportSectionTabs'
    ),
    'tools/planning-db/migrations/571_source_import_component_family_ownership.sql',
    md5('file:SourceImportSectionTabs.test.tsx:571')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/constants.ts',
    'flow-contract',
    'WIZARD_STEPS',
    jsonb_build_object(
      'responsibility',
      'Declare the closed Source Import wizard step order shared by progress, section routing, and footer controls.',
      'rails',
      jsonb_build_array(
        'OpenCanvasSourceImportDialog',
        'RenderSourceImportCatalogView',
        'ImportWarehouseSources'
      ),
      'exports',
      jsonb_build_array('WIZARD_STEPS', 'WIZARD_PROGRESS_STEPS'),
      'valueType',
      'WizardStep'
    ),
    'tools/planning-db/migrations/571_source_import_component_family_ownership.sql',
    md5('file:sourceImportWizard/constants.ts:571')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
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
values (
  'web.component.canvas.SourceImportDialog',
  'EV-SOURCE-IMPORT-COMPONENT-FAMILY-OWNERSHIP',
  'architecture-test',
  'current',
  'pnpm planning:db:query component-profile --component web.component.canvas.SourceImportDialog --limit 120',
  'OpenCanvasSourceImportDialog',
  'source-import-component-family-ownership',
  'The Source Import component family is query-visible with host, catalog, wizard-step, harness, architecture, and live-proof ownership evidence before further Add Source product hardening.',
  jsonb_build_object(
    'componentQueries',
    jsonb_build_array(
      'pnpm planning:db:query frontend-component-files --component web.component.canvas.SourceImportDialog --limit 220',
      'pnpm planning:db:query frontend-component-files --component SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW --limit 220',
      'pnpm planning:db:query frontend-component-files --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 220',
      'pnpm planning:db:query frontend-component-rails --component web.component.canvas.SourceImportDialog --limit 80'
    ),
    'familyRails',
    jsonb_build_array(
      'OpenCanvasSourceImportDialog',
      'RenderSourceImportCatalogView',
      'ImportWarehouseSources'
    ),
    'demandingUserEvidence',
    jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'scripts/run-canvas-source-import-live-proof.cjs'
    )
  ),
  'tools/planning-db/migrations/571_source_import_component_family_ownership.sql',
  md5('evidence:source-import-component-family-ownership:571')
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
