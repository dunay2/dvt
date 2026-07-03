-- Align the CreateWarehouseConnection feature manifest with the current
-- Source Import wizard component family. Older symbols still referenced the
-- broad SourceImportDialog alias after the wizard was split into leaf owners.

update planning_query_store.feature_mechanization_local_rails rail
set
  documentation_refs = jsonb_build_array(
    'planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CORE',
    'planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS',
    'planning-db:rail/CreateWarehouseConnection'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{componentGuides}',
      jsonb_build_array(
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CORE',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS'
      ),
      true
    ),
    '{symbols}',
    (
      select jsonb_agg(
        case
          when value ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx'
            then jsonb_set(value, '{dddOwner}', to_jsonb('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'::text), true)
          when value ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx'
            then jsonb_set(value, '{dddOwner}', to_jsonb('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'::text), true)
          when value ->> 'path' = 'apps/web/src/testing/workspacePortDoubles.ts'
            then jsonb_set(value, '{dddOwner}', to_jsonb('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'::text), true)
          when value ->> 'path' = 'apps/web/src/app/components/SourceImportWizard.testHarness.tsx'
            then jsonb_set(value, '{dddOwner}', to_jsonb('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS'::text), true)
          when value ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
            then jsonb_set(value, '{dddOwner}', to_jsonb('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CORE'::text), true)
          else value
        end
        order by value ->> 'path', value ->> 'name'
      )
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(value)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/522_source_import_create_connection_symbol_owner_reconcile.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:symbol-owner-reconcile:522'),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_id = 'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection';
