-- Complete the DB-first feature mechanization manifest for the
-- SourceImportDialog CreateWarehouseConnection UI slice after implementation
-- symbol discovery.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx#WarehouseConnectionCreateFormProps',
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx#warehouseConnectionTypes',
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx#WarehouseConnectionCreateForm',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#normalizeCreateConnectionInput',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#isCreateConnectionInputComplete',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#upsertWarehouseConnection',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard',
    'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx#ConnectionStep',
    'apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx#WizardStepContent',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx#createSourceImportWizardHarness',
    'apps/web/src/app/components/SourceImportWizard.test.tsx#SourceImportWizard'
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'userStories',
    jsonb_build_array(
      'As a Canvas author, I can register a governed database connection from Add Source before browsing source tables.',
      'As an operator, CreateWarehouseConnection receives only a credentialRef and fails closed when required command fields are missing.'
    ),
    'architectureGuards',
    jsonb_build_array(
      'apps/web/src/app/components/SourceImportWizard.test.tsx',
      'node --test --test-name-pattern "source import create connection flow" scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows',
    jsonb_build_array(
      'not_applicable: this slice adds the presentation command handoff; backend-backed source import Cypress proof remains in canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx',
      'node --test --test-name-pattern "source import create connection flow" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:migrate',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'WarehouseConnectionCreateFormProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('explicit_interface', 'presentation_contract'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: presentation props contract covered by SourceImportWizard presentation test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'warehouseConnectionTypes',
        'path', 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('value_catalog', 'bounded_option_set'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: option projection covered by presentation command handoff test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'WarehouseConnectionCreateForm',
        'path', 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: command handoff covered by SourceImportWizard presentation-port integration test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'normalizeCreateConnectionInput',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('value_normalization', 'fail_closed_validation'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: command input normalization covered by presentation-port integration test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'isCreateConnectionInputComplete',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('policy_function', 'fail_closed_validation'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: negative command path covered by SourceImportWizard presentation test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'upsertWarehouseConnection',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection', 'ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('collection_policy', 'no_duplicate_connection_rows'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: created connection selection covered by SourceImportWizard presentation test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'useSourceImportWizard',
        'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection', 'ImportWarehouseSources', 'TestWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('application_presenter', 'state_coordinator', 'fail_closed_validation'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: command handoff covered by SourceImportWizard presentation-port integration test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      ),
      jsonb_build_object(
        'name', 'ConnectionStep',
        'path', 'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('CreateWarehouseConnection', 'TestWarehouseConnection', 'ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('presentation_composition', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'cypressCoverage', 'not_applicable: presentation composition covered by SourceImportWizard presentation-port integration test',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/502_source_import_create_connection_manifest_completion.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:manifest-completion:502'),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection';
