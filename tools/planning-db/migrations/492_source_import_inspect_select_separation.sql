-- DB-first authority for separating source catalog inspection from selection.
-- Reuses RenderSourceImportCatalogView; the import command remains unchanged.

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
  'local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview',
  'E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1',
  'implemented',
  'RenderSourceImportCatalogView',
  'rendersourceimportcatalogview',
  'query',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#SourceImportTableViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportTableViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#canEnterSourceImportSection',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx#SourceImportCatalogView',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportTableCard',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx#SelectionStep',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx#WizardStepContent',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx#createSourceImportWizardHarness'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/492_source_import_inspect_select_separation.sql'
  ),
  jsonb_build_array('planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'tools/planning-db/migrations/492_source_import_inspect_select_separation.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/492_source_import_inspect_select_separation.sql',
  md5('E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1:rendersourceimportcatalogview:492'),
  jsonb_build_object(
    'purpose', 'Render Add Source catalog interactions so table inspection does not imply source selection.',
    'owner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Keep table-card click as metadata inspection and move import selection to the explicit checkbox so demanding users can explore before choosing origins.',
    'userStories', jsonb_build_array(
      'As a DVT/Raven author, I can inspect a source table metadata card before deciding whether to import it.',
      'As a demanding Canvas user, source selection requires an explicit checkbox action instead of an accidental metadata click.'
    ),
    'componentGuides', jsonb_build_array('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
      'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'tools/planning-db/migrations/492_source_import_inspect_select_separation.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/api/**#source_import_selection_semantics',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'docs/planning/**#manual_primary_source'
    ),
    'domainObjects', jsonb_build_array(
      'SourceImportCatalogViewModel',
      'SourceImportTableViewModel',
      'SourceImportActiveTable',
      'SourceImportSelectionBasket'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderSourceImportCatalogView',
        'type', 'query',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
      ),
      jsonb_build_object(
        'name', 'ImportWarehouseSources',
        'type', 'command',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
        'role', 'unchanged downstream command consuming explicit selection'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'duplicate_semantics_removed',
      'explicit_interface',
      'presentation_model',
      'single_responsibility'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-INSPECT-SELECT-PRESENTATION-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'expectedFailure', 'Table card click still toggles import selection instead of inspecting metadata.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'
      ),
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-METADATA-GATING-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx',
        'expectedFailure', 'Metadata tab is blocked unless the active table is also selected.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
          'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
          'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'SourceImportTableViewModel',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_contract', 'explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildSourceImportTableViewModel',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_model', 'pure_function'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'canEnterSourceImportSection',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('policy_function', 'explicit_state_transition'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'SourceImportCatalogView',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportTableCard',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'useSourceImportWizard',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView', 'ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('application_presenter', 'separate_command_from_query'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SelectionStep',
        'path', 'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_composition', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'WizardStepContent',
        'path', 'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_router', 'explicit_state_transition'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      ),
      jsonb_build_object(
        'name', 'createSourceImportWizardHarness',
        'path', 'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('test_driver', 'semantic_interaction'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.metadata.test.tsx')
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-INSPECT-SELECT-SEPARATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Source catalog card activation inspects metadata, while the checkbox toggles import selection.',
    jsonb_build_object('selectionRequiresCheckbox', true, 'inspectionUsesTableCard', true),
    'tools/planning-db/migrations/492_source_import_inspect_select_separation.sql',
    md5('EV-SOURCE-IMPORT-INSPECT-SELECT-SEPARATION:492')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-METADATA-WITHOUT-SELECTION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-metadata',
    'Metadata can be inspected for the active table before the user commits that table to the selected-source basket.',
    jsonb_build_object('metadataRequiresActiveTable', true, 'metadataRequiresSelectedTable', false),
    'tools/planning-db/migrations/492_source_import_inspect_select_separation.sql',
    md5('EV-SOURCE-IMPORT-METADATA-WITHOUT-SELECTION:492')
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
