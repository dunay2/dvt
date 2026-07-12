-- Reconcile the provider-neutral SourceObject hard cut with the component,
-- contract, rail, test, and feature-mechanization read models. Metric evidence
-- is part of the shared published language; API and Web no longer pretend to
-- own parallel value objects or validation components.

update architecture.design
set
  status = 'implemented',
  rationale = 'Source discovery uses the shared versioned SourceObject contract for relation, file, endpoint, and stream locators. Postgres remains one relation adapter. ImportWarehouseSources resolves objectId against the server catalog and rejects unsupported non-relational objects before draft or file mutation.',
  updated_at = now()
where design_id = 'E-SOURCE-OBJECT-CATALOG-CONTRACT-20260710';

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  revision = revision + 1
where component_id = 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG';

update architecture.component
set
  status = 'implemented',
  public_contract = 'Versioned SourceObject identity, locator, column, metric-evidence, list, and objectId-only selection schemas',
  updated_at = now()
where component_id = 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG';

update architecture.contract
set
  status = 'implemented',
  validation_command = 'pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceObjectCatalog.v1.test.ts',
  updated_at = now()
where contract_id = 'CONTRACT-SOURCE-OBJECT-CATALOG-V1';

-- Keep the application-service component exhaustive after the filename hard
-- cut. The old path is deleted from source and must not survive in ownership.
delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES'
  and pattern = 'apps/api/src/application/services/listWarehouseConnectionTablesUseCase.ts';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
  'owns',
  'apps/api/src/application/services/listWarehouseConnectionSourceObjectsUseCase.ts',
  3
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.governance_component_local_definitions
set
  cq_rails = 'ReadWorkspaceGraphDraft;SubmitWorkspaceGraphDraft;ReadWorkspaceFiles;ReadWorkspaceDiff;ListWarehouseConnectionSourceObjects;ImportWarehouseSources',
  revision = revision + 1
where component_id = 'SYS-WEB-SERVICES-WORKSPACE';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'public_api',
    'packages/@dvt/contracts/src/index.ts re-exports the source-import contract through packages/@dvt/contracts/src/contracts/source-import/index.ts.',
    0
  ),
  (
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'reason_to_change',
    'The provider-neutral source discovery vocabulary or compatibility contract changes.',
    0
  ),
  (
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'transition',
    'Review becomes canonical only after API, provider adapter, Web boundary, contract tests, and active feature manifests consume the same SourceObject v1 language.',
    0
  ),
  (
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'consumer',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES;SYS-API-INFRA-WAREHOUSE-SOURCES;SYS-WEB-SERVICES-WORKSPACE',
    0
  ),
  (
    'SYS-WEB-SERVICES-WORKSPACE',
    'consumer',
    'Validate SourceObject HTTP payloads through CONTRACT-SOURCE-OBJECT-CATALOG-V1 and expose the existing workspace query and command ports.',
    10
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

-- Replace local metric evidence components with the shared contract owner and
-- the existing workspace adapter. A schema and a one-function boundary parser
-- are not independent deployable or independently changing components.
delete from planning_query_store.governance_component_local_definitions
where component_id in (
  'api.component.sourceImport.SourceObjectMetricEvidence',
  'web.component.workspace.SourceObjectMetricEvidenceModel'
);

delete from architecture.component_test
where test_id in (
  'TEST-SOURCE-OBJECT-METRIC-EVIDENCE',
  'TEST-WEB-SOURCE-OBJECT-METRIC-EVIDENCE'
);

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-SOURCE-OBJECT-CATALOG-CONTRACT',
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'packages/@dvt/contracts/test/source-import/SourceObjectCatalog.v1.test.ts',
    'contract',
    'boundary',
    true,
    'pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceObjectCatalog.v1.test.ts'
  ),
  (
    'TEST-WEB-SOURCE-OBJECT-CATALOG-BOUNDARY',
    'SYS-WEB-SERVICES-WORKSPACE',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts',
    'unit',
    'negative',
    true,
    'pnpm --filter @dvt/web exec vitest run src/app/services/workspace/sourceObjectMetricEvidence.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

delete from architecture.component_port
where port_id in (
  'PORT-SOURCE-OBJECT-METRIC-EVIDENCE-VALIDATE',
  'PORT-WEB-SOURCE-METRIC-EVIDENCE-READ'
);

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
values (
  'PORT-WEB-SOURCE-OBJECT-CATALOG-READ',
  'SYS-WEB-SERVICES-WORKSPACE',
  'ListWarehouseConnectionSourceObjects',
  'query',
  'inbound',
  'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
  'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
  array[
    'reject malformed source object locators',
    'reject partial metric evidence',
    'reject negative or unsafe metric values'
  ],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

delete from architecture.component_observability
where observability_id in (
  'OBS-SOURCE-OBJECT-METRIC-EVIDENCE-TESTS',
  'OBS-WEB-SOURCE-METRIC-EVIDENCE-TESTS'
);

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-SOURCE-OBJECT-CATALOG-CONTRACT-TESTS',
  'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
  'Contract validity is observable through the focused schema contract test; runtime telemetry is owned by provider adapters and consumers.',
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

delete from architecture.component_responsibility
where responsibility_id in (
  'RESP-SOURCE-OBJECT-METRIC-EVIDENCE-INVARIANT',
  'RESP-WEB-SOURCE-METRIC-EVIDENCE-VALIDATION'
);

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SOURCE-OBJECT-CATALOG-PUBLISHED-LANGUAGE',
  'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
  'Own one versioned provider-neutral SourceObject language including stable identity, discriminated locators, columns, complete metric evidence, list payloads, and objectId-only selections.',
  'The source discovery language or its compatibility policy changes.',
  'SourceObjectCatalogContract',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

-- Preserve the graph projection relation but point it at the actual boundary
-- parser owner before removing the over-modelled Web child component.
update architecture.component_relation
set
  target_component_id = 'SYS-WEB-SERVICES-WORKSPACE',
  contract_id = 'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
  failure_mode = 'Graph node volume projection receives malformed or incomplete source object metric evidence',
  source_refs = jsonb_build_array(
    'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts',
    'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts'
  ),
  updated_at = now()
where relation_id = 'REL-GRAPH-VOLUME-PROJECTION-USES-SOURCE-EVIDENCE';

delete from architecture.component_relation
where relation_id in (
  'REL-API-ROOT-CONTAINS-SOURCE-OBJECT-METRIC-EVIDENCE',
  'REL-IMPORT-SOURCES-PERSISTS-SOURCE-METRIC-EVIDENCE',
  'REL-WAREHOUSE-PROBE-USES-SOURCE-METRIC-EVIDENCE',
  'REL-WEB-VALIDATES-SOURCE-METRIC-EVIDENCE',
  'REL-WEB-WORKSPACE-CONTAINS-SOURCE-METRIC-MODEL'
);

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-SOURCE-OBJECT-CATALOG-CONTRACT-TO-INFRA',
  'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
  'SYS-API-INFRA-WAREHOUSE-SOURCES',
  'exposes_api',
  'outbound',
  'sync',
  'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
  'Provider adapter emits an object locator or metric evidence shape outside the published language',
  'workspace',
  jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts'
  ),
  'implemented'
)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update architecture.component_relation
set
  source_refs = source_refs || jsonb_build_array('packages/@dvt/contracts/src/index.ts'),
  updated_at = now()
where relation_id in (
  'REL-SOURCE-OBJECT-CATALOG-CONTRACT-TO-API',
  'REL-SOURCE-OBJECT-CATALOG-CONTRACT-TO-WEB'
)
and not source_refs ? 'packages/@dvt/contracts/src/index.ts';

delete from architecture.contract
where contract_id = 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE';

delete from architecture.component
where component_id in (
  'api.component.sourceImport.SourceObjectMetricEvidence',
  'web.component.workspace.SourceObjectMetricEvidenceModel'
);

-- Rebuild the affected feature manifests from actual symbols. Historical
-- migration rows remain immutable, but deleted source files, local DTO names,
-- and retired component owners must not remain in active read models.
create temporary table source_object_manifest_reconciliation (
  feature_id text not null,
  raw_manifest jsonb not null,
  primary key (feature_id)
) on commit drop;

insert into source_object_manifest_reconciliation (feature_id, raw_manifest)
select distinct on (feature_id)
  feature_id,
  replace(
    replace(
      replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    raw_manifest::text,
                    'buildWarehouseTableIdentityKey',
                    'buildSourceObjectIdentityKey'
                  ),
                  'buildWarehouseTableKey',
                  'buildRelationalSourceObjectName'
                ),
                'buildSourceImportTestTable',
                'buildSourceImportTestObject'
              ),
              'toWarehouseTable',
              'toPostgresSourceObject'
            ),
            'WarehouseTableDefinition',
            'SourceObject'
          ),
          'WarehouseTableRef',
          'SourceObjectSelection'
        ),
        'WarehouseTable',
        'RelationalSourceObject'
      ),
        'api.component.sourceImport.SourceObjectMetricEvidence',
        'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG'
      ),
      'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts',
      'packages/@dvt/contracts/test/source-import/SourceObjectCatalog.v1.test.ts'
    ),
    'web.component.workspace.SourceObjectMetricEvidenceModel',
    'SYS-WEB-SERVICES-WORKSPACE'
  )::jsonb
from planning_query_store.feature_mechanization_local_rails
where feature_id in (
  'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1',
  'E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1',
  'E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1',
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1'
)
order by feature_id, updated_at desc;

with cleaned_symbols as (
  select
    manifests.feature_id,
    case
      when symbol ->> 'path' = 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts'
        then jsonb_set(
          jsonb_set(
            jsonb_set(
              symbol,
              '{path}',
              to_jsonb('packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts'::text)
            ),
            '{dddOwner}',
            to_jsonb('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG'::text)
          ),
          '{unitTests}',
          jsonb_build_array('packages/@dvt/contracts/test/source-import/SourceObjectCatalog.v1.test.ts')
        )
      when symbol ->> 'path' in (
        'apps/api/src/application/ports/warehouseSourceImport.ts',
        'apps/web/src/app/ports/workspace.ts'
      )
      and symbol ->> 'name' in ('SourceObject', 'SourceObjectSelection')
        then jsonb_set(
          jsonb_set(
            jsonb_set(
              symbol,
              '{path}',
              to_jsonb('packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts'::text)
            ),
            '{dddOwner}',
            to_jsonb('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG'::text)
          ),
          '{unitTests}',
          jsonb_build_array('packages/@dvt/contracts/test/source-import/SourceObjectCatalog.v1.test.ts')
        )
      else symbol
    end as symbol
  from source_object_manifest_reconciliation manifests
  cross join lateral jsonb_array_elements(coalesce(manifests.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(symbol)
  where not (
    symbol ->> 'path' = 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts'
    and symbol ->> 'name' in ('assertMetricSemantics', 'assertMetricValue')
  )
  and symbol ->> 'path' <> 'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts'
  and not (
    symbol ->> 'path' = 'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts'
    and symbol ->> 'name' <> 'readSourceObjectMetricEvidence'
  )
),
additional_contract_symbols as (
  select
    'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'::text as feature_id,
    jsonb_build_object(
      'path', 'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts',
      'name', symbol_name,
      'dddOwner', 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
      'cqRails', jsonb_build_array('ImportWarehouseSources', 'ListWarehouseConnectionSourceObjects'),
      'fowlerSignals', jsonb_build_array('Published Language', 'Value Object', 'Gateway contract'),
      'unitTests', jsonb_build_array('packages/@dvt/contracts/test/source-import/SourceObjectCatalog.v1.test.ts')
    ) as symbol
  from unnest(array[
    'SourceObjectSchema',
    'SourceObjectSelectionSchema',
    'SourceObjectMetricEvidenceSchema',
    'RelationalSourceObjectLocatorSchema',
    'SourceObject',
    'SourceObjectSelection',
    'createSourceObjectMetricEvidence',
    'buildRelationalSourceObjectId',
    'isRelationalSourceObject'
  ]) symbols(symbol_name)
),
deduplicated_symbols as (
  select distinct on (feature_id, symbol ->> 'path', symbol ->> 'name')
    feature_id,
    symbol
  from (
    select feature_id, symbol, 0 as priority from cleaned_symbols
    union all
    select feature_id, symbol, 10 as priority from additional_contract_symbols
  ) candidates
  where nullif(symbol ->> 'path', '') is not null
    and nullif(symbol ->> 'name', '') is not null
  order by feature_id, symbol ->> 'path', symbol ->> 'name', priority desc
),
symbol_arrays as (
  select
    feature_id,
    jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name') as symbols
  from deduplicated_symbols
  group by feature_id
),
canonical_manifests as (
  select
    manifests.feature_id,
    manifests.raw_manifest || jsonb_build_object(
      'domainObjects', case manifests.feature_id
        when 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1' then jsonb_build_array(
          'RelationalSourceObject',
          'SourceImportCatalogViewModel',
          'SourceImportDatabaseGroupViewModel',
          'SourceImportSelectionBasket'
        )
        when 'E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1' then jsonb_build_array(
          'RelationalSourceObject',
          'SourceImportCatalogViewModel',
          'SourceImportActiveTableMetadata',
          'SourceImportWizardState'
        )
        when 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1' then jsonb_build_array(
          'SourceObject',
          'SourceObjectSelection',
          'SourceObjectMetricEvidence',
          'ImportWarehouseSourcesInput',
          'WorkspaceGraphAuthoringNode.metadata',
          'SourceImportTableViewModel'
        )
        when 'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1' then jsonb_build_array(
          'WorkspaceWarehouseConnectionProbe',
          'SourceObject',
          'SourceObjectColumn',
          'WarehouseConnectionCatalogEntry'
        )
        else coalesce(manifests.raw_manifest -> 'domainObjects', '[]'::jsonb)
      end,
      'symbols', coalesce(symbols.symbols, '[]'::jsonb),
      'semanticOwnership', jsonb_build_object(
        'status', 'canonical',
        'source', 'tools/planning-db/migrations/606_source_object_catalog_component_reconciliation.sql',
        'publishedLanguageOwner', 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
        'consumerValidationOwner', 'SYS-WEB-SERVICES-WORKSPACE',
        'providerAcquisitionOwner', 'SYS-API-INFRA-WAREHOUSE-SOURCES',
        'localMetricComponentsRetired', true
      )
    ) as raw_manifest
  from source_object_manifest_reconciliation manifests
  left join symbol_arrays symbols using (feature_id)
),
reference_arrays as (
  select
    manifests.feature_id,
    jsonb_agg(to_jsonb(ref) order by ref) as refs
  from canonical_manifests manifests
  cross join lateral (
    select distinct ref
    from (
      select jsonb_array_elements_text(coalesce(manifests.raw_manifest -> 'implementationRefs', '[]'::jsonb)) as ref
      union all
      select symbol ->> 'path'
      from jsonb_array_elements(coalesce(manifests.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(symbol)
      union all
      select unit_test
      from jsonb_array_elements(coalesce(manifests.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(symbol)
      cross join lateral jsonb_array_elements_text(coalesce(symbol -> 'unitTests', '[]'::jsonb)) tests(unit_test)
      union all
      select 'tools/planning-db/migrations/606_source_object_catalog_component_reconciliation.sql'
    ) candidates
    where nullif(ref, '') is not null
      and ref not in (
        'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
        'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts',
        'apps/api/src/application/services/listWarehouseConnectionTablesUseCase.ts'
      )
  ) refs
  group by manifests.feature_id
),
final_manifests as (
  select
    manifests.feature_id,
    manifests.raw_manifest || jsonb_build_object(
      'implementationRefs', refs.refs,
      'allowedImplementationSurfaces', refs.refs
    ) as raw_manifest,
    refs.refs
  from canonical_manifests manifests
  join reference_arrays refs using (feature_id)
)
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = manifests.raw_manifest,
  implementation_refs = manifests.refs,
  allowed_implementation_surfaces = manifests.refs,
  symbol_refs = coalesce(
    (
      select jsonb_agg(
        to_jsonb((symbol ->> 'path') || '#' || (symbol ->> 'name'))
        order by symbol ->> 'path', symbol ->> 'name'
      )
      from jsonb_array_elements(manifests.raw_manifest -> 'symbols') symbols(symbol)
      where coalesce(symbol -> 'cqRails', '[]'::jsonb) ? rails.rail_name
    ),
    '[]'::jsonb
  ),
  source_path = 'tools/planning-db/migrations/606_source_object_catalog_component_reconciliation.sql',
  source_content_sha256 = repeat(md5(rails.feature_id || ':' || rails.rail_name || ':source-object-reconciliation:606'), 2),
  revision = rails.revision + 1,
  updated_at = now()
from final_manifests manifests
where rails.feature_id = manifests.feature_id;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
