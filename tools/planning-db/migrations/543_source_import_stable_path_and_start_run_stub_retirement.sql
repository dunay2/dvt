-- Harden source import path identity and retire the unused StartRun placeholder.
-- This reuses the canonical ImportWarehouseSources command rail; it does not
-- introduce a second source-import rail.

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION'
  and pattern_kind = 'owns'
  and pattern = 'apps/api/src/application/services/notImplementedStartRunUseCase.ts';

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
  and file_path = 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'
  and file_role = 'read-model';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
  'transition',
  'apps/api/src/application/services/notImplementedStartRunUseCase.ts was removed because protected start-run runtime composition now uses EngineStartRunUseCase, PlannerBackedStartRunUseCase, and BackpressureAwareStartRunUseCase instead of a throw-only placeholder.',
  0
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'owns',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'owns',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    1
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'owns',
    'apps/web/src/testing/workspacePortDoubles.ts',
    2
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'model',
    'toStableSourceImportIdentifierPart',
    jsonb_build_object(
      'responsibility',
      'Normalize dbt source registry file path segments for Source Import review previews before ImportWarehouseSources runs.',
      'rail',
      'ImportWarehouseSources',
      'exports',
      jsonb_build_array('buildSourceImportRegistryPath', 'toStableSourceImportIdentifierPart'),
      'invariant',
      'Registry file paths use stable lower-case underscore path segments and never raw warehouse schema or database strings.',
      'fowlerSignal',
      'shared_path_policy_read_model'
    ),
    'tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql',
    md5('file:source-import-stable-registry-path-model:543')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'model',
    'canEnterSourceImportSection',
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership',
      true,
      'reassignedToComponent',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      'reassignedRail',
      'ImportWarehouseSources',
      'reason',
      'SourceImportWizardModel owns wizard-step and review path policy; the retired SourceImportDialog aggregate must not own the active model file.'
    ),
    'tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql',
    md5('retire:SourceImportDialog:sourceImportWizardModel:543')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership',
      true,
      'reassignedToComponent',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      'reassignedRail',
      'ImportWarehouseSources',
      'reason',
      'sourceImportWizardModel tests now validate the wizard-step/read-model policy, not the retired SourceImportDialog aggregate.'
    ),
    'tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql',
    md5('retire:SourceImportDialog:sourceImportWizardModel.test:543')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'selection-model',
    'toggleSourceImportDatabaseSelection',
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership',
      true,
      'reassignedToComponent',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      'reassignedRail',
      'ImportWarehouseSources',
      'reason',
      'Database/schema selection toggles are wizard step state transitions; the catalog view owns sourceImportCatalogModel.ts instead.'
    ),
    'tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql',
    md5('retire:CatalogView:sourceImportWizardModel-selection:543')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/testing/workspacePortDoubles.ts',
    'test-adapter',
    'createMockWorkspacePorts',
    jsonb_build_object(
      'responsibility',
      'Keep the workspace source-import test adapter aligned with the production Source Import registry path and imported node id policy.',
      'rail',
      'ImportWarehouseSources',
      'uses',
      jsonb_build_array('buildSourceImportRegistryPath', 'toStableSourceImportIdentifierPart'),
      'invariant',
      'Mock source import must not accept a path or node id shape that production would reject or normalize differently.',
      'fowlerSignal',
      'test_double_policy_alignment'
    ),
    'tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql',
    md5('file:source-import-workspace-double-path-alignment:543')
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
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-STABLE-REGISTRY-PATH-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'ImportWarehouseSources',
    'source-import-stable-registry-path',
    'The Source Import wizard model normalizes schema and database identifiers before rendering dbt source registry paths.',
    jsonb_build_object(
      'asserts',
      jsonb_build_array(
        'models/sources/src_sales_erp_ops.yml',
        'models/sources/src_raw_lake.yml'
      ),
      'redGreen',
      true
    ),
    'tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql',
    md5('evidence:source-import-stable-registry-path-unit:543')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-WORKSPACE-DOUBLE-PATH-ALIGNMENT',
    'unit-test',
    'current',
    'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
    'ImportWarehouseSources',
    'source-import-test-adapter-path-alignment',
    'The web workspace test adapter returns the same normalized source registry paths and node ids as the production import policy.',
    jsonb_build_object(
      'asserts',
      jsonb_build_array(
        'models/sources/src_sales_erp_ops.yml',
        'src_sales_erp_ops_open_orders'
      ),
      'redGreen',
      true
    ),
    'tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql',
    md5('evidence:source-import-workspace-double-path-alignment:543')
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

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_manifest, '{}'::jsonb),
        '{symbols}',
        (
          select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
          from (
            select distinct on (symbol ->> 'path', symbol ->> 'name') symbol
            from (
              select existing.symbol
              from jsonb_array_elements(coalesce(raw_manifest -> 'symbols', '[]'::jsonb)) existing(symbol)
              union all
              select jsonb_build_object(
                'name',
                'toStableSourceImportIdentifierPart',
                'path',
                'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
                'dddOwner',
                'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
                'cqRails',
                jsonb_build_array('ImportWarehouseSources'),
                'fowlerSignals',
                jsonb_build_array('deterministic_read_model', 'stable_path_identity_policy'),
                'architectureGuard',
                'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
                'cypressCoverage',
                'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
                'unitTests',
                jsonb_build_array(
                  'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
                  'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts'
                )
              )
            ) symbols
            order by symbol ->> 'path', symbol ->> 'name'
          ) unique_symbols
        ),
        true
      ),
      '{implementationRefs}',
      (
        select jsonb_agg(to_jsonb(ref) order by ref)
        from (
          select distinct existing.ref
          from jsonb_array_elements_text(coalesce(raw_manifest -> 'implementationRefs', '[]'::jsonb)) existing(ref)
          union
          select new_ref.ref
          from (
            values
              ('apps/api/src/application/services/warehouseSourceYamlDescriptor.ts'),
              ('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
              ('apps/api/test/application/services/warehouseSourceYaml.test.ts'),
              ('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'),
              ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'),
              ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
              ('apps/web/src/app/services/workspace/workspacePorts.imports.test.ts'),
              ('apps/web/src/testing/workspacePortDoubles.ts'),
              ('tools/planning-db/migrations/543_source_import_stable_path_and_start_run_stub_retirement.sql')
          ) new_ref(ref)
        ) refs
      ),
      true
    ),
    '{architectureNotes}',
    coalesce(raw_manifest -> 'architectureNotes', '[]'::jsonb) || jsonb_build_array(
      'Source Import registry paths and imported graph node ids are normalized by governed path-policy helpers; raw warehouse identifiers are not used as repository path segments.'
    ),
    true
  ),
  source_content_sha256 = md5(
    'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1:stable-registry-path-policy-and-start-run-stub-retirement:543'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1'
  and rail_id = 'local#E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1#command#importwarehousesources';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
