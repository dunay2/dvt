-- Make the existing SourceObject catalog query self-describing on the wire and
-- make import selection uniqueness part of the shared contract. This evolves
-- the existing rails; it does not create a parallel query or command.

update architecture.design
set
  rationale = 'Source discovery returns a SourceObjectCatalogResponse v1 envelope. Import selections are non-empty, object-id-only, and unique. API and Web validate the same shared schemas, while ImportWarehouseSources repeats the uniqueness guard at the application boundary before side effects.',
  rail_ref = 'ListWarehouseConnectionSourceObjects;ImportWarehouseSources',
  updated_at = now()
where design_id = 'E-SOURCE-OBJECT-CATALOG-CONTRACT-20260710';

update architecture.component
set
  public_contract = 'SourceObjectCatalogResponse v1 with provider-neutral objects, discriminated locators, complete metric evidence, and unique objectId-only import selections',
  updated_at = now()
where component_id = 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG';

update architecture.contract
set
  contract_ref = 'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts#SourceObjectCatalogResponseSchema',
  validation_command = 'pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceObjectCatalog.v1.test.ts',
  updated_at = now()
where contract_id = 'CONTRACT-SOURCE-OBJECT-CATALOG-V1';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'invariant',
    'ListWarehouseConnectionSourceObjects returns SourceObjectCatalogResponseSchema with contractVersion 1; an unversioned array is invalid.',
    3
  ),
  (
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'invariant',
    'SourceObjectSelectionListSchema rejects empty or duplicate objectId selections before ImportWarehouseSources performs side effects.',
    4
  ),
  (
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'public_api',
    'SourceObjectCatalogResponseSchema and SourceObjectSelectionListSchema are the wire query and command-selection boundaries.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 = repeat(md5('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG:607'), 2),
  revision = revision + 1
where component_id = 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG';

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'name', 'ListWarehouseConnectionSourceObjects',
    'type', 'query',
    'readModel', 'SourceObjectCatalogResponse',
    'responseSchema', 'SourceObjectCatalogResponseSchema',
    'contractVersion', 1,
    'contract', 'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
    'selectionSchema', 'SourceObjectSelectionListSchema',
    'selectionAuthority', 'unique objectId-only selections resolved against the server catalog'
  ),
  source_path = 'tools/planning-db/migrations/607_source_object_catalog_versioned_response.sql',
  source_content_sha256 = repeat(md5(feature_id || ':ListWarehouseConnectionSourceObjects:607'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'ListWarehouseConnectionSourceObjects'
  and rail_type = 'query'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

with source_manifest as (
  select distinct on (feature_id)
    feature_id,
    raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
  order by feature_id, updated_at desc
),
retained_symbols as (
  select
    manifest.feature_id,
    symbol
  from source_manifest manifest
  cross join lateral jsonb_array_elements(coalesce(manifest.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(symbol)
  where symbol ->> 'name' <> 'SourceObjectMetricValue'
),
contract_symbols as (
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
    'SOURCE_OBJECT_CATALOG_CONTRACT_VERSION',
    'SourceObjectCatalogResponse',
    'SourceObjectCatalogResponseSchema',
    'SourceObjectRowCountMetric',
    'SourceObjectSelectionListSchema'
  ]) symbols(symbol_name)
),
deduplicated_symbols as (
  select distinct on (feature_id, symbol ->> 'path', symbol ->> 'name')
    feature_id,
    symbol
  from (
    select feature_id, symbol, 0 as priority from retained_symbols
    union all
    select feature_id, symbol, 10 as priority from contract_symbols
  ) candidates
  order by feature_id, symbol ->> 'path', symbol ->> 'name', priority desc
),
symbol_array as (
  select
    feature_id,
    jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name') as symbols
  from deduplicated_symbols
  group by feature_id
),
canonical_manifest as (
  select
    manifest.feature_id,
    manifest.raw_manifest || jsonb_build_object(
      'domainObjects', jsonb_build_array(
        'SourceObject',
        'SourceObjectCatalogResponse',
        'SourceObjectSelection',
        'SourceObjectMetricEvidence',
        'ImportWarehouseSourcesInput',
        'WorkspaceGraphAuthoringNode.metadata',
        'SourceImportTableViewModel'
      ),
      'symbols', symbols.symbols,
      'sourceObjectCatalogContract', jsonb_build_object(
        'version', 1,
        'responseSchema', 'SourceObjectCatalogResponseSchema',
        'selectionSchema', 'SourceObjectSelectionListSchema',
        'unversionedResponseAccepted', false,
        'duplicateSelectionAccepted', false,
        'queryRail', 'ListWarehouseConnectionSourceObjects',
        'commandRail', 'ImportWarehouseSources'
      )
    ) as raw_manifest
  from source_manifest manifest
  join symbol_array symbols using (feature_id)
),
reference_array as (
  select
    manifest.feature_id,
    jsonb_agg(to_jsonb(ref) order by ref) as refs
  from canonical_manifest manifest
  cross join lateral (
    select distinct ref
    from (
      select jsonb_array_elements_text(coalesce(manifest.raw_manifest -> 'implementationRefs', '[]'::jsonb)) as ref
      union all
      select symbol ->> 'path'
      from jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbols(symbol)
      union all
      select unit_test
      from jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbols(symbol)
      cross join lateral jsonb_array_elements_text(coalesce(symbol -> 'unitTests', '[]'::jsonb)) tests(unit_test)
      union all
      select 'tools/planning-db/migrations/607_source_object_catalog_versioned_response.sql'
    ) candidates
    where nullif(ref, '') is not null
  ) refs
  group by manifest.feature_id
),
final_manifest as (
  select
    manifest.feature_id,
    manifest.raw_manifest || jsonb_build_object(
      'implementationRefs', refs.refs,
      'allowedImplementationSurfaces', refs.refs
    ) as raw_manifest,
    refs.refs
  from canonical_manifest manifest
  join reference_array refs using (feature_id)
)
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = manifest.raw_manifest,
  implementation_refs = manifest.refs,
  allowed_implementation_surfaces = manifest.refs,
  symbol_refs = coalesce(
    (
      select jsonb_agg(
        to_jsonb((symbol ->> 'path') || '#' || (symbol ->> 'name'))
        order by symbol ->> 'path', symbol ->> 'name'
      )
      from jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbols(symbol)
      where coalesce(symbol -> 'cqRails', '[]'::jsonb) ? rails.rail_name
    ),
    '[]'::jsonb
  ),
  source_path = 'tools/planning-db/migrations/607_source_object_catalog_versioned_response.sql',
  source_content_sha256 = repeat(md5(rails.feature_id || ':' || rails.rail_name || ':versioned-source-object:607'), 2),
  revision = rails.revision + 1,
  updated_at = now()
from final_manifest manifest
where rails.feature_id = manifest.feature_id;
