-- Replace the relational-only catalog DTO with one provider-neutral SourceObject
-- contract. The existing catalog query evolves in place; Postgres remains the
-- first relation adapter and ImportWarehouseSources stays explicitly relation-only.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'E-SOURCE-OBJECT-CATALOG-CONTRACT-20260710',
  'E-SOURCE-OBJECT-METRICS-PROD-1',
  'Provider-neutral source object catalog contract hard cut',
  'Contracts / API / Web Source Import',
  'implementing',
  'Source discovery must describe relation, file, endpoint, and stream objects through one contract while provider adapters retain locator-specific acquisition. Postgres emits relation locators. ImportWarehouseSources resolves selections by objectId and rejects an unsupported non-relational object before any draft or file mutation.',
  'published_language',
  'ListWarehouseConnectionSourceObjects;ImportWarehouseSources',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
  'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts',
  repeat(md5('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG:605'), 2),
  0,
  'Source object catalog contract',
  'component',
  'SYS-CONTRACTS-ROOT',
  'SYS-DVT',
  'SYS-CONTRACTS',
  'review',
  false,
  'Own the shared versioned SourceObject identity, locator, metric-evidence, column and selection schemas consumed by API and Web.',
  'SourceObjectCatalogContract',
  'ListWarehouseConnectionSourceObjects;ImportWarehouseSources',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'owns', 'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts', 0),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'owns', 'packages/@dvt/contracts/src/contracts/source-import/index.ts', 1),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'owns', 'packages/@dvt/contracts/test/source-import/SourceObjectCatalog.v1.test.ts', 2)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'responsibility', 'Validate one provider-neutral SourceObject transport language shared by API and Web.', 0),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'invariant', 'SourceObjectSchema always includes a stable objectId, a discriminated locator, complete SourceObjectMetricEvidence and optional columns.', 0),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'invariant', 'SourceObjectSelectionSchema carries only objectId; authoritative locator and metrics are resolved server-side.', 1),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'invariant', 'Reject malformed locators, partial metric evidence and unsupported non-relational object import.', 2),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'fowler_signal', 'Published Language', 0),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'fowler_signal', 'Gateway', 1)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values (
  'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
  'Source object catalog contract',
  'port',
  'contracts',
  'SourceObjectCatalogContract',
  'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts',
  'Versioned SourceObject catalog, locator, metric evidence and objectId-only selection schemas',
  'node',
  'high',
  'review',
  'SYS-CONTRACTS-ROOT'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
values (
  'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
  'type',
  'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
  'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts',
  'breaking',
  'proposed',
  'pnpm --filter @dvt/contracts test -- SourceObjectCatalog.v1.test.ts'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

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
values
  (
    'REL-SOURCE-OBJECT-CATALOG-CONTRACT-TO-API',
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'exposes_api',
    'outbound',
    'sync',
    'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
    'API and Web drift onto different source object DTOs',
    'workspace',
    jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts',
      'apps/api/src/application/ports/warehouseSourceImport.ts'
    ),
    'implemented'
  ),
  (
    'REL-SOURCE-OBJECT-CATALOG-CONTRACT-TO-WEB',
    'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
    'SYS-WEB-SERVICES-WORKSPACE',
    'exposes_api',
    'outbound',
    'sync',
    'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
    'Web accepts an unvalidated or table-shaped source discovery payload',
    'workspace',
    jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts',
      'apps/web/src/app/ports/workspace.ts'
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

-- Evolve the existing query identity in place. Its opaque rail_id is stable so
-- existing DB relations retain identity while the public vocabulary changes.
update planning_query_store.feature_mechanization_local_rails
set
  rail_name = 'ListWarehouseConnectionSourceObjects',
  normalized_rail_name = 'listwarehouseconnectionsourceobjects',
  ddd_owner = 'SYS-API-INFRA-WAREHOUSE-SOURCES',
  raw_rail = replace(
    coalesce(raw_rail, '{}'::jsonb)::text,
    'ListWarehouseConnectionTables',
    'ListWarehouseConnectionSourceObjects'
  )::jsonb || jsonb_build_object(
    'name', 'ListWarehouseConnectionSourceObjects',
    'readModel', 'SourceObject',
    'contract', 'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
    'selectionAuthority', 'objectId-only selection resolved against the server catalog'
  ),
  raw_manifest = replace(
    coalesce(raw_manifest, '{}'::jsonb)::text,
    'ListWarehouseConnectionTables',
    'ListWarehouseConnectionSourceObjects'
  )::jsonb,
  source_path = 'tools/planning-db/migrations/605_source_object_catalog_contract_hard_cut.sql',
  source_content_sha256 = repeat(md5('ListWarehouseConnectionSourceObjects:605'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'ListWarehouseConnectionTables'
  and rail_type = 'query'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

-- Keep all already-mechanized consumers on the evolved catalog query name.
update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = replace(
    coalesce(raw_manifest, '{}'::jsonb)::text,
    'ListWarehouseConnectionTables',
    'ListWarehouseConnectionSourceObjects'
  )::jsonb,
  raw_rail = replace(
    coalesce(raw_rail, '{}'::jsonb)::text,
    'ListWarehouseConnectionTables',
    'ListWarehouseConnectionSourceObjects'
  )::jsonb,
  source_path = 'tools/planning-db/migrations/605_source_object_catalog_contract_hard_cut.sql',
  source_content_sha256 = repeat(md5(feature_id || ':' || rail_name || ':source-object-contract:605'), 2),
  revision = revision + 1,
  updated_at = now()
where (
  coalesce(raw_manifest, '{}'::jsonb)::text like '%ListWarehouseConnectionTables%'
  or coalesce(raw_rail, '{}'::jsonb)::text like '%ListWarehouseConnectionTables%'
)
and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update planning_query_store.governance_component_local_definitions
set
  cq_rails = replace(cq_rails, 'ListWarehouseConnectionTables', 'ListWarehouseConnectionSourceObjects'),
  revision = revision + 1
where cq_rails like '%ListWarehouseConnectionTables%';

update architecture.component_relation
set
  source_refs = replace(
    coalesce(source_refs, '[]'::jsonb)::text,
    'ListWarehouseConnectionTables',
    'ListWarehouseConnectionSourceObjects'
  )::jsonb,
  updated_at = now()
where coalesce(source_refs, '[]'::jsonb)::text like '%ListWarehouseConnectionTables%';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
