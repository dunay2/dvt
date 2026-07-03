-- Keep Add Source connection creation honest about the warehouse adapters that
-- are executable today. The API contract reserves future warehouse types, but
-- the protected runtime create/test implementation only supports Postgres.

with target_rail as (
  select 'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection'::text as rail_id
),
new_symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx#supportedWarehouseConnectionTypes'),
    ('apps/web/src/app/components/SourceImportWizard.testHarness.tsx#buildWarehouseSourceImportPort'),
    ('apps/web/src/testing/workspacePortDoubles.ts#mockConnections')
),
new_surfaces(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx'),
    ('apps/web/src/app/components/SourceImportWizard.test.tsx'),
    ('apps/web/src/app/components/SourceImportWizard.testHarness.tsx'),
    ('apps/web/src/testing/workspacePortDoubles.ts'),
    ('tools/planning-db/migrations/518_source_import_supported_adapter_posture.sql')
),
new_guards(ref) as (
  values
    ('apps/web/src/app/components/SourceImportWizard.test.tsx')
),
new_symbols(value) as (
  values
    (
      jsonb_build_object(
        'name', 'supportedWarehouseConnectionTypes',
        'path', 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('bounded_option_set', 'fail_closed_presentation'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'buildWarehouseSourceImportPort',
        'path', 'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS',
        'cqRails', jsonb_build_array('CreateWarehouseConnection', 'ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('test_fixture_truthfulness', 'no_fake_success_path'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/components/SourceImportWizard.test.tsx',
          'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
          'apps/web/src/app/components/SourceImportWizard.pluginOptions.test.tsx'
        )
      )
    ),
    (
      jsonb_build_object(
        'name', 'mockConnections',
        'path', 'apps/web/src/testing/workspacePortDoubles.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ListWarehouseConnections'),
        'fowlerSignals', jsonb_build_array('test_fixture_truthfulness', 'supported_adapter_posture'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    )
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from new_symbol_refs
      ) refs
    ) as symbol_refs,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from new_surfaces
      ) refs
    ) as implementation_refs,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) existing(ref)
        union
        select ref from new_surfaces
      ) refs
    ) as allowed_implementation_surfaces,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.architecture_guards, '[]'::jsonb)) existing(ref)
        union
        select ref from new_guards
      ) refs
    ) as architecture_guards,
    (
      select jsonb_agg(value order by value ->> 'path', value ->> 'name')
      from (
        select distinct on (value ->> 'path', value ->> 'name') value
        from (
          select existing.value
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(value)
          union all
          select new_symbols.value
          from new_symbols
        ) combined
        order by value ->> 'path', value ->> 'name'
      ) deduped
    ) as manifest_symbols
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rail on target_rail.rail_id = rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = patched.symbol_refs,
  implementation_refs = patched.implementation_refs,
  allowed_implementation_surfaces = patched.allowed_implementation_surfaces,
  architecture_guards = patched.architecture_guards,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{symbols}',
      coalesce(patched.manifest_symbols, '[]'::jsonb),
      true
    ),
    '{supportedAdapterPosture}',
    jsonb_build_object(
      'currentlySupportedForCreateConnection', jsonb_build_array('postgres'),
      'reservedContractTypes', jsonb_build_array('snowflake', 'bigquery', 'redshift'),
      'rule', 'Presentation creation options must not advertise adapters rejected by the protected runtime create/test implementation.'
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/518_source_import_supported_adapter_posture.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:supported-adapter-posture:518'),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;

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
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
    'presentation',
    'supportedWarehouseConnectionTypes',
    jsonb_build_object(
      'responsibility', 'Expose only warehouse adapter options supported by CreateWarehouseConnection today.',
      'rail', 'CreateWarehouseConnection',
      'supportedAdapterTypes', jsonb_build_array('postgres')
    ),
    'tools/planning-db/migrations/518_source_import_supported_adapter_posture.sql',
    md5('supportedWarehouseConnectionTypes:518')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS',
    'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
    'test-harness',
    'buildWarehouseSourceImportPort',
    jsonb_build_object(
      'responsibility', 'Provide truthful supported-adapter source import defaults for presentation tests.',
      'rail', 'ListWarehouseConnections',
      'defaultAdapterType', 'postgres'
    ),
    'tools/planning-db/migrations/518_source_import_supported_adapter_posture.sql',
    md5('buildWarehouseSourceImportPort:postgres:518')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
    'EV-SOURCE-IMPORT-SUPPORTED-ADAPTER-POSTURE',
    'presentation-test',
    'current',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'CreateWarehouseConnection',
    'source-import-connections',
    'Add Source creation UI offers only the Postgres adapter currently accepted by the protected runtime create/test rail.',
    jsonb_build_object('supportedAdapterTypes', jsonb_build_array('postgres')),
    'tools/planning-db/migrations/518_source_import_supported_adapter_posture.sql',
    md5('EV-SOURCE-IMPORT-SUPPORTED-ADAPTER-POSTURE:518')
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
