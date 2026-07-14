-- Close the modeled receipt-store component with exact implementation symbols,
-- tests, and feature-mechanization surfaces. No new product rail is introduced.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'public_api',
    'IDbtProjectImportReceiptStore.read',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'public_api',
    'IDbtProjectImportReceiptStore.record',
    1
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'transition',
    'No completed command receipt -> exact accepted import result persisted for replay',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'consumer',
    'ImportDbtProjectUseCase',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'non_goal',
    'Revalidate mutable dbt project files',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'non_goal',
    'Own HTTP telemetry or authorization',
    1
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'reason_to_change',
    'Completed import replay or PostgreSQL receipt persistence semantics change.',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'fowler_signal',
    'Gateway',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'fowler_signal',
    'Data Mapper',
    1
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'governance_ref',
    'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/681_dbt_project_import_receipt_implementation_closeout.sql',
  source_content_sha256 = repeat(md5('SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS:681'), 2),
  revision = revision + 1
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

update architecture.component
set status = 'implemented', updated_at = now()
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

update architecture.component_responsibility
set status = 'implemented'
where responsibility_id = 'RESP-DBT-PROJECT-IMPORT-RECEIPT-STORE';

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id = 'REL-DBT-IMPORT-PERSISTS-COMPLETED-RECEIPT';

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-DBT-PROJECT-IMPORT-RECEIPT-OUTCOME',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
  'The adapter returns typed deduplication and mismatch outcomes; the ImportDbtProject command and HTTP boundary own logs and metrics, while PostgreSQL failures fail the request.',
  'log',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

with symbol_group (
  path,
  ddd_owner,
  cq_rails,
  fowler_signals,
  architecture_guard,
  cypress_coverage,
  unit_tests,
  symbols
) as (
  values
    (
      'apps/api/src/application/ports/dbtProjectImport.ts',
      'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
      array['ImportDbtProject']::text[],
      array['Gateway', 'Separated Interface', 'Published Language']::text[],
      'pnpm --filter dvt-api exec vitest run test/application/dbtProjectImportReplay.test.ts',
      'not_applicable:strict_browser_import_remains_owned_by_the_proposed_web_component',
      array[
        'apps/api/test/application/dbtProjectImportReplay.test.ts',
        'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts'
      ]::text[],
      array[
        'DbtProjectImportReceiptKey',
        'DbtProjectImportReceiptRecordResult',
        'DbtProjectImportStoredReceipt',
        'IDbtProjectImportReceiptStore'
      ]::text[]
    ),
    (
      'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts',
      'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
      array['ImportDbtProject']::text[],
      array['Gateway', 'Data Mapper']::text[],
      'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts',
      'not_applicable:persistence_adapter_is_exercised_by_postgres_adapter_tests',
      array[
        'apps/api/test/application/dbtProjectImportReplay.test.ts',
        'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts'
      ]::text[],
      array[
        'Config',
        'PostgresDbtProjectImportReceiptStore',
        'ReceiptRow',
        'assertResultKey',
        'keyValues',
        'mapReceiptRow',
        'quoteIdentifier',
        'withTimeout'
      ]::text[]
    )
), extension as (
  select
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', symbol_name,
          'path', path,
          'dddOwner', ddd_owner,
          'cqRails', to_jsonb(cq_rails),
          'fowlerSignals', to_jsonb(fowler_signals),
          'architectureGuard', architecture_guard,
          'cypressCoverage', cypress_coverage,
          'unitTests', to_jsonb(unit_tests)
        ) order by path, symbol_name
      )
      from symbol_group
      cross join lateral unnest(symbols) symbol(symbol_name)
    ) as symbols,
    jsonb_build_array(
      'apps/api/src/application/ports/dbtProjectImport.ts',
      'apps/api/src/application/services/importDbtProjectUseCase.ts',
      'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts',
      'apps/api/src/modules/buildProtectedRuntimeModule.ts',
      'apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts',
      'apps/api/test/application/dbtProjectImportReplay.test.ts',
      'apps/api/test/application/dbtProjectImportUseCases.test.ts',
      'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts',
      'apps/api/test/modules/buildDbtProjectImportRuntime.test.ts',
      'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
      'tools/planning-db/migrations/680_dbt_project_import_result_receipt.sql',
      'tools/planning-db/migrations/681_dbt_project_import_receipt_implementation_closeout.sql'
    ) as surfaces
), target_symbols as (
  select
    rail.rail_id,
    (
      select jsonb_agg(item order by path, name)
      from (
        select distinct on (path, name) item, path, name
        from (
          select
            item,
            item ->> 'path' as path,
            coalesce(item ->> 'name', item ->> 'symbol') as name,
            0 as priority
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(item)
          union all
          select
            item,
            item ->> 'path' as path,
            item ->> 'name' as name,
            1 as priority
          from jsonb_array_elements(extension.symbols) symbols(item)
        ) candidates
        where path is not null and name is not null
        order by path, name, priority desc
      ) distinct_symbols
    ) as symbols,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
          || extension.surfaces
        ) surfaces(item)
      ) distinct_surfaces
    ) as surfaces
  from planning_query_store.feature_mechanization_local_rails rail
  cross join extension
  where rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
), target as (
  select
    target_symbols.rail_id,
    target_symbols.symbols,
    target_symbols.surfaces,
    (
      select jsonb_agg(
        to_jsonb((item ->> 'path') || '#' || (item ->> 'name'))
        order by item ->> 'path', item ->> 'name'
      )
      from jsonb_array_elements(target_symbols.symbols) symbols(item)
    ) as symbol_refs
  from target_symbols
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = target.symbol_refs,
  implementation_refs = target.surfaces,
  allowed_implementation_surfaces = target.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(rail.raw_manifest, '{symbols}', target.symbols, true),
    '{allowedImplementationSurfaces}',
    target.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/681_dbt_project_import_receipt_implementation_closeout.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':dbt-import-receipt:681'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from target
where rail.rail_id = target.rail_id;
