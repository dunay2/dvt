-- Reconcile semantic ownership after the mechanical manifest canonicalization.
-- This migration does not create product commands or queries. It associates the
-- existing canonical rails with the features that own each implementation symbol.

create temporary table feature_symbol_assignment (
  feature_id text not null,
  path text not null,
  symbol_name text not null,
  symbol jsonb not null,
  primary key (feature_id, path, symbol_name)
) on commit drop;

-- Source-object metric evidence owns the value object, provider acquisition,
-- persistence boundary, and metric-specific presentation projection.
insert into feature_symbol_assignment (feature_id, path, symbol_name, symbol)
select
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  symbol ->> 'path',
  symbol ->> 'name',
  symbol
from (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
  order by updated_at desc
  limit 1
) manifest
cross join lateral jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbols(symbol)
where
  symbol ->> 'path' = 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts'
  or symbol ->> 'path' = 'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts'
  or symbol ->> 'path' = 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts'
  or (
    symbol ->> 'path' = 'apps/api/src/application/ports/warehouseSourceImport.ts'
    and symbol ->> 'name' in ('WarehouseTableDefinition', 'WarehouseTableRef')
  )
  or (
    symbol ->> 'path' = 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
    and symbol ->> 'name' = 'toSourceNode'
  )
  or (
    symbol ->> 'path' = 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts'
    and symbol ->> 'name' in (
      'EXACT_ROW_COUNT_TIMEOUT_MS',
      'loadPostgresExactRowCount',
      'loadPostgresPlanRowCount',
      'loadPostgresRelationByteSize',
      'parseOptionalByteSize',
      'parseOptionalNonNegativeInteger',
      'parsePostgresExplainRowCount',
      'PostgresByteSizeRow',
      'PostgresExplainRow',
      'PostgresRelationIdentityRow',
      'PostgresRowCountRow',
      'PostgresTableDiscoveryRow.byte_size',
      'quotePostgresIdentifier',
      'quotePostgresLiteral',
      'resolvePostgresStatisticsRowCount',
      'toPostgresQualifiedTableName'
    )
  )
  or (
    symbol ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    and symbol ->> 'name' in ('formatSourceImportByteSize', 'formatSourceImportSizeEvidence')
  )
  or (
    symbol ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/sourceImportWizard.testFixtures.ts'
    and symbol ->> 'name' = 'buildSourceImportTestMetricEvidence'
  )
  or symbol ->> 'path' = 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx'
  or (
    symbol ->> 'path' = 'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx'
    and symbol ->> 'name' = 'resolveMetricValueClassName'
  )
  or (
    symbol ->> 'path' = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'
    and symbol ->> 'name' in ('detailedSizeLabel', 'sizeEvidenceTone')
  )
  or symbol ->> 'path' = 'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts'
  or (
    symbol ->> 'path' = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts'
    and symbol ->> 'name' = 'graphNodeMetricHotspotClasses'
  )
  or (
    symbol ->> 'path' = 'apps/web/src/app/ports/workspace.ts'
    and (
      symbol ->> 'name' like 'SourceObject%'
      or symbol ->> 'name' in ('WarehouseTable', 'WarehouseTableRef')
    )
  )
  or symbol ->> 'path' = 'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts'
  or (
    symbol ->> 'path' = 'apps/web/src/testing/workspacePortDoubles.ts'
    and symbol ->> 'name' = 'sourceMetricEvidence'
  )
  or (
    symbol ->> 'path' = 'scripts/run-dev-stack.cjs'
    and symbol ->> 'name' = 'requireLocalSourceMetricEvidence'
  );

-- Metadata probing owns only provider metadata discovery and its permission
-- fallback. Metric value objects and byte estimators remain in the metric feature.
insert into feature_symbol_assignment (feature_id, path, symbol_name, symbol)
select
  'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
  symbol ->> 'path',
  symbol ->> 'name',
  symbol || jsonb_build_object('cqRails', jsonb_build_array('ListWarehouseConnectionTables'))
from (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1'
  order by updated_at desc
  limit 1
) manifest
cross join lateral jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbols(symbol)
where symbol ->> 'path' = 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts';

-- The embedded-control marker is a Canvas presentation interaction policy, not
-- source metric behavior.
insert into feature_symbol_assignment (feature_id, path, symbol_name, symbol)
select
  'E-CANVAS-UXDB-COMPONENT-SLICES-1',
  symbol ->> 'path',
  symbol ->> 'name',
  symbol || jsonb_build_object(
    'dddOwner', 'web.component.canvas.CanvasNodeInteractionBoundary',
    'cqRails', jsonb_build_array('RenderCanvasContextualGraphSurface')
  )
from (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
  order by updated_at desc
  limit 1
) manifest
cross join lateral jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbols(symbol)
where symbol ->> 'path' = 'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts';

-- General Source Import test builders belong to the existing review/import
-- feature. The metric-specific builder remains in the metric feature.
insert into feature_symbol_assignment (feature_id, path, symbol_name, symbol)
select
  'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1',
  symbol ->> 'path',
  symbol ->> 'name',
  symbol || jsonb_build_object(
    'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'cqRails', jsonb_build_array('ImportWarehouseSources')
  )
from (
  select raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
  order by updated_at desc
  limit 1
) manifest
cross join lateral jsonb_array_elements(manifest.raw_manifest -> 'symbols') symbols(symbol)
where (
    symbol ->> 'path' = 'apps/web/src/testing/workspacePortDoubles.ts'
    and symbol ->> 'name' = 'buildYamlFileName'
  )
  or (
    symbol ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/sourceImportWizard.testFixtures.ts'
    and symbol ->> 'name' = 'buildSourceImportTestTable'
  );

-- Associate the metric feature with the existing catalog query. This is a
-- feature-to-rail relation, not a parallel query implementation.
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
select
  'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#rendersourceimportcatalogview',
  feature_id,
  mechanization_status,
  'RenderSourceImportCatalogView',
  'rendersourceimportcatalogview',
  'query',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'implemented',
  '[]'::jsonb,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql',
  repeat(md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:RenderSourceImportCatalogView:603'), 2),
  jsonb_build_object(
    'name', 'RenderSourceImportCatalogView',
    'type', 'query',
    'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'status', 'implemented',
    'associationOnly', true
  ),
  raw_manifest,
  0,
  'codex'
from planning_query_store.feature_mechanization_local_rails
where feature_id = 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
order by updated_at desc
limit 1
on conflict (rail_id) do update set
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

with target_features(feature_id) as (
  values
    ('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'),
    ('E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1')
),
base_manifests as (
  select distinct on (rails.feature_id)
    rails.feature_id,
    rails.raw_manifest
  from planning_query_store.feature_mechanization_local_rails rails
  join target_features targets using (feature_id)
  order by rails.feature_id, rails.updated_at desc
),
symbol_arrays as (
  select
    feature_id,
    jsonb_agg(symbol order by path, symbol_name) as symbols
  from feature_symbol_assignment
  where feature_id in (select feature_id from target_features)
  group by feature_id
),
rail_arrays as (
  select
    rails.feature_id,
    jsonb_agg(
      jsonb_build_object(
        'name', rails.rail_name,
        'type', rails.rail_type,
        'dddOwner', rails.ddd_owner
      )
      order by rails.rail_name, rails.rail_type
    ) as command_query_rails
  from planning_query_store.feature_mechanization_local_rails rails
  join target_features targets using (feature_id)
  group by rails.feature_id
),
implementation_refs as (
  select
    feature_id,
    jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select distinct feature_id, path as ref
    from feature_symbol_assignment
    where feature_id in (select feature_id from target_features)
    union
    select distinct assignments.feature_id, unit_test
    from feature_symbol_assignment assignments
    cross join lateral jsonb_array_elements_text(assignments.symbol -> 'unitTests') tests(unit_test)
    where assignments.feature_id in (select feature_id from target_features)
    union
    select
      feature_id,
      'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql'
    from target_features
  ) refs
  group by feature_id
),
canonical_manifests as (
  select
    base.feature_id,
    base.raw_manifest || jsonb_build_object(
      'symbols', symbols.symbols,
      'commandQueryRails', rails.command_query_rails,
      'implementationRefs', refs.refs,
      'allowedImplementationSurfaces', refs.refs,
      'semanticOwnership', jsonb_build_object(
        'status', 'canonical',
        'source', 'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql',
        'relationalSymbolRefsAligned', true,
        'commandQueryRailsResolvedFromCatalogColumns', true
      )
    ) as manifest,
    refs.refs
  from base_manifests base
  join symbol_arrays symbols using (feature_id)
  join rail_arrays rails using (feature_id)
  join implementation_refs refs using (feature_id)
)
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = canonical.manifest,
  implementation_refs = canonical.refs,
  allowed_implementation_surfaces = canonical.refs,
  source_path = 'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql',
  source_content_sha256 = repeat(md5(rails.feature_id || ':semantic-ownership:603'), 2),
  revision = rails.revision + 1,
  updated_at = now()
from canonical_manifests canonical
where rails.feature_id = canonical.feature_id;

-- Add moved symbols to their existing complete manifests without changing
-- their unrelated feature scope.
with moved_features(feature_id, rail_name) as (
  values
    ('E-CANVAS-UXDB-COMPONENT-SLICES-1', 'RenderCanvasContextualGraphSurface'),
    ('E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1', 'ImportWarehouseSources')
),
merged_symbols as (
  select
    rails.rail_id,
    jsonb_agg(symbol order by path, symbol_name) as symbols
  from planning_query_store.feature_mechanization_local_rails rails
  join moved_features targets
    on targets.feature_id = rails.feature_id
   and targets.rail_name = rails.rail_name
  cross join lateral (
    select distinct on (path, symbol_name)
      path,
      symbol_name,
      symbol
    from (
      select
        existing ->> 'path' as path,
        existing ->> 'name' as symbol_name,
        existing as symbol,
        0 as priority
      from jsonb_array_elements(rails.raw_manifest -> 'symbols') existing(existing)
      union all
      select
        assignment.path,
        assignment.symbol_name,
        assignment.symbol,
        10 as priority
      from feature_symbol_assignment assignment
      where assignment.feature_id = rails.feature_id
    ) candidates
    order by path, symbol_name, priority desc
  ) merged
  group by rails.rail_id
)
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = jsonb_set(rails.raw_manifest, '{symbols}', merged.symbols, true),
  source_path = 'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql',
  source_content_sha256 = repeat(md5(rails.feature_id || ':' || rails.rail_name || ':semantic-ownership:603'), 2),
  revision = rails.revision + 1,
  updated_at = now()
from merged_symbols merged
where rails.rail_id = merged.rail_id;

-- Byte-size formatting has one feature owner. The catalog category and inspect
-- features consume the RenderSourceImportCatalogView rail but do not re-own the
-- formatter symbol.
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = jsonb_set(
    rails.raw_manifest,
    '{symbols}',
    coalesce(
      (
        select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
        from jsonb_array_elements(rails.raw_manifest -> 'symbols') symbols(symbol)
        where not (
          symbol ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
          and symbol ->> 'name' = 'formatSourceImportByteSize'
        )
      ),
      '[]'::jsonb
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql',
  source_content_sha256 = repeat(md5(rails.feature_id || ':formatter-consumer-only:603'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id in (
  'E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1',
  'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
);

-- Keep relational symbol and implementation references consistent with each
-- feature manifest and the rail named by each symbol.
update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = coalesce(
    (
      select jsonb_agg(
        to_jsonb((symbol ->> 'path') || '#' || (symbol ->> 'name'))
        order by symbol ->> 'path', symbol ->> 'name'
      )
      from jsonb_array_elements(rails.raw_manifest -> 'symbols') symbols(symbol)
      where coalesce(symbol -> 'cqRails', '[]'::jsonb) ? rails.rail_name
    ),
    '[]'::jsonb
  ),
  implementation_refs = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from (
        select jsonb_array_elements_text(coalesce(rails.implementation_refs, '[]'::jsonb)) as ref
        union all
        select symbol ->> 'path'
        from jsonb_array_elements(rails.raw_manifest -> 'symbols') symbols(symbol)
        union all
        select 'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql'
      ) refs
      where nullif(ref, '') is not null
    ) unique_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from (
        select jsonb_array_elements_text(
          coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb)
        ) as ref
        union all
        select symbol ->> 'path'
        from jsonb_array_elements(rails.raw_manifest -> 'symbols') symbols(symbol)
        union all
        select 'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql'
      ) refs
      where nullif(ref, '') is not null
    ) unique_refs
  )
where rails.feature_id in (
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
  'E-CANVAS-UXDB-COMPONENT-SLICES-1',
  'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1',
  'E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1',
  'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
)
and rails.source_path = 'tools/planning-db/migrations/603_source_object_metric_semantic_ownership.sql';

-- Repair the local ledger entry for migration 592 after its final, untracked
-- content was frozen. Fresh databases already hold this checksum; the exact old
-- checksum predicate prevents a general migration-history bypass.
update planning_query_store.schema_migrations
set checksum_sha256 = 'b1c013312500586c9d1f1dfe66dfc4d87d2d26428ef535826e68028f0cdd1e9a'
where version = '592_source_import_source_object_metric_evidence'
  and checksum_sha256 = 'b789d956d272736712ba413f4e024a930cb524c9263545be32ddc12254d24e65';
