-- Keep Source Import grouping strategies aligned with the implemented
-- ImportWarehouseSources rail. "custom" is intentionally not exposed until a
-- governed custom grouping value object exists.

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'groupingStrategyContract',
      jsonb_build_object(
        'supported', jsonb_build_array('schema', 'database'),
        'unsupported', jsonb_build_array('custom'),
        'invariant', 'Source Import grouping is a closed strategy set; unsupported strategies must not be presented or accepted as schema aliases.',
        'rail', 'ImportWarehouseSources'
      )
    ),
  evidence_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array(
        'EV-SOURCE-IMPORT-GROUPING-STRATEGY-PRESENTATION',
        'EV-SOURCE-IMPORT-GROUPING-STRATEGY-MODEL',
        'EV-SOURCE-IMPORT-GROUPING-STRATEGY-HTTP'
      )
    ) as refs(ref)
  ),
  source_path = 'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS:grouping-strategy-contract:580'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS';

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
    'apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx',
    'presentation-template',
    'GroupingStep',
    jsonb_build_object(
      'responsibility', 'Render only grouping strategies backed by ImportWarehouseSources; it must not advertise unavailable custom grouping semantics.',
      'rail', 'ImportWarehouseSources',
      'supportedGroupingStrategies', jsonb_build_array('schema', 'database'),
      'unsupportedGroupingStrategies', jsonb_build_array('custom')
    ),
    'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
    md5('file:GroupingStep:grouping-strategy-contract:580')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage', 'Grouping presentation exposes only schema and database strategies and excludes Custom Grouping.',
      'rail', 'ImportWarehouseSources',
      'asserts', jsonb_build_array(
        'data-source-import-grouping-option=schema',
        'data-source-import-grouping-option=database',
        'Custom Grouping is not rendered'
      )
    ),
    'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
    md5('file:GroupingStep.test:grouping-strategy-contract:580')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'presentation-model',
    'buildSourceImportRegistryPath',
    jsonb_build_object(
      'responsibility', 'Build selected-source registry preview paths from the same supported grouping strategy set as ImportWarehouseSources.',
      'rail', 'ImportWarehouseSources',
      'supportedGroupingStrategies', jsonb_build_array('schema', 'database'),
      'unsupportedGroupingStrategies', jsonb_build_array('custom')
    ),
    'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
    md5('file:sourceImportWizardModel:grouping-strategy-contract:580')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'presentation-model-test',
    null,
    jsonb_build_object(
      'coverage', 'Registry preview path model rejects unsupported grouping strategies instead of aliasing them to schema grouping.',
      'rail', 'ImportWarehouseSources',
      'asserts', jsonb_build_array('custom grouping throws')
    ),
    'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
    md5('file:sourceImportWizardModel.test:grouping-strategy-contract:580')
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
    'EV-SOURCE-IMPORT-GROUPING-STRATEGY-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
    'ImportWarehouseSources',
    'source-import-grouping-strategy-contract',
    'The Source Import grouping step exposes only strategies implemented by ImportWarehouseSources.',
    jsonb_build_object(
      'redBehavior', 'Custom Grouping was presented in the UI.',
      'greenBehavior', 'The UI offers schema/database only.',
      'noNewRail', true,
      'supportedGroupingStrategies', jsonb_build_array('schema', 'database')
    ),
    'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
    md5('evidence:source-import-grouping-strategy-presentation:580')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-GROUPING-STRATEGY-MODEL',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'ImportWarehouseSources',
    'source-import-grouping-strategy-contract',
    'The Source Import review path model rejects unsupported grouping strategies instead of aliasing them to schema.',
    jsonb_build_object(
      'redBehavior', 'Unsupported grouping strategies fell back to schema path selection.',
      'greenBehavior', 'Unsupported grouping strategies throw before a registry path is produced.',
      'noNewRail', true,
      'unsupportedGroupingStrategies', jsonb_build_array('custom')
    ),
    'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
    md5('evidence:source-import-grouping-strategy-model:580')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-GROUPING-STRATEGY-HTTP',
    'integration-test',
    'current',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
    'ImportWarehouseSources',
    'source-import-grouping-strategy-contract',
    'The Source Import HTTP route rejects groupingStrategy=custom before invoking workspace writes.',
    jsonb_build_object(
      'redBehavior', 'POST /workspace/sources/import accepted groupingStrategy=custom.',
      'greenBehavior', 'POST /workspace/sources/import returns invalid_body and skips file/draft writes.',
      'noNewRail', true,
      'unsupportedGroupingStrategies', jsonb_build_array('custom')
    ),
    'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
    md5('evidence:source-import-grouping-strategy-http:580')
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

update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/api/src/application/ports/warehouseSourceImport.ts',
        'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
        'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
        'apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx',
        'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'apps/web/src/app/components/sourceImportWizard/types.ts',
        'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql'
      )
    ) as refs(ref)
  ),
  architecture_guards = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.architecture_guards, '[]'::jsonb)
      || jsonb_build_array(
        'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
        'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'scripts/planning-db-migrate.test.cjs'
      )
    ) as refs(ref)
  ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'groupingStrategyContract',
      jsonb_build_object(
        'supported', jsonb_build_array('schema', 'database'),
        'unsupported', jsonb_build_array('custom'),
        'invariant', 'Unsupported source grouping strategies fail closed instead of falling back to schema semantics.'
      ),
      'noNewRail', true
    ),
  source_path = 'tools/planning-db/migrations/580_source_import_grouping_strategy_contract.sql',
  source_content_sha256 = md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:ImportWarehouseSources:grouping-strategy-contract:580'),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_name = 'ImportWarehouseSources'
  and rail.rail_type = 'command'
  and rail.ddd_owner = 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase';
