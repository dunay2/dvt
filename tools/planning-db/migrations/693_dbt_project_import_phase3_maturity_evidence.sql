-- Restore concrete implementation paths and maturity evidence that were
-- intentionally removed while the phase-three Web components were planned.

update architecture.component
set
  repo_path = case component_id
    when 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT'
      then 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.tsx'
    when 'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT'
      then 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.ts'
    when 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER'
      then 'apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts'
    when 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION'
      then 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx'
    when 'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY'
      then 'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
  'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION',
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY'
);

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  ('TEST-WEB-DBT-PROJECT-IMPORT-GATEWAY', 'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'apps/web/src/app/services/dbtProject/dbtProjectImport.api.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web exec vitest run src/app/services/dbtProject/dbtProjectImport.api.test.ts'),
  ('TEST-WEB-DBT-PROJECT-IMPORT-CONTROLLER', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx', 'integration', 'flow', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/dbtProjectImport/DbtProjectImportDialog.test.tsx'),
  ('TEST-WEB-DBT-PROJECT-IMPORT-PRESENTATION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/dbtProjectImport/DbtProjectImportDialogView.test.tsx')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  ('OBS-WEB-DBT-PROJECT-IMPORT-COMPOSITION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 'Busy state prevents close while typed failures and completed receipts remain visible through the dialog presentation.', 'log', true, 'implemented'),
  ('OBS-WEB-DBT-PROJECT-IMPORT-GATEWAY', 'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT', 'Protected API errors and contract parse failures propagate to the interaction controller without synthesized fallback.', 'log', true, 'implemented'),
  ('OBS-WEB-DBT-PROJECT-IMPORT-CONTROLLER', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER', 'Validation, import, failure, and stale-operation states are explicit in the interaction model.', 'log', true, 'implemented'),
  ('OBS-WEB-DBT-PROJECT-IMPORT-PRESENTATION', 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION', 'Busy, rejected, failed, and imported states are exposed through visible status and accessible live presentation.', 'log', true, 'implemented'),
  ('OBS-WEB-BROWSER-IDEMPOTENCY-IDENTITY', 'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'Entropy absence fails the caller synchronously; the opaque identity itself is intentionally not logged.', 'log', true, 'not_applicable')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = (
    select jsonb_agg(item order by item #>> '{}')
    from (
      select distinct item
      from jsonb_array_elements(
        coalesce(rail.implementation_refs, '[]'::jsonb)
        || jsonb_build_array(
          'tools/planning-db/migrations/693_dbt_project_import_phase3_maturity_evidence.sql'
        )
      ) refs(item)
    ) distinct_refs
  ),
  source_path = 'tools/planning-db/migrations/693_dbt_project_import_phase3_maturity_evidence.sql',
  source_content_sha256 = repeat(md5('ImportDbtProject:phase3-maturity:693'), 2),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_name = 'ImportDbtProject';

