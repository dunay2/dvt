-- Declare the provider-neutral SourceObject catalog hard cut before changing
-- presentation code. RenderSourceImportCatalogView remains the sole query rail;
-- importability is presentation policy derived from the existing import rail.

update planning_query_store.governance_component_local_definitions
set
  source_path = 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:source-object-hardcut:612'), 2),
  status = 'review',
  owned_concern = 'Project every discovered SourceObject into a categorized, searchable catalog while exposing importability without hiding unsupported locator kinds.',
  ddd_owner = 'SourceImportCatalogViewPresentation',
  cq_rails = 'RenderSourceImportCatalogView',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
  and item_kind in ('responsibility', 'invariant', 'public_api', 'transition');

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'responsibility',
    'Project the SourceObject catalog into categorized search, inspection, evidence, and explicit selection controls without owning provider discovery or import mutation.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'invariant',
    'Every SourceObject returned by ListWarehouseConnectionSourceObjects remains visible; unsupported locator kinds are disabled with an explicit importability reason and are never silently filtered.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'invariant',
    'State, presentation models, callbacks, and generic copy use SourceObject vocabulary; table and schema terms are confined to the relational locator projection.',
    1
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'invariant',
    'Search covers display name, opaque object identity, locator fields, column names, and column types for every locator kind.',
    2
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'public_api',
    'buildSourceImportCatalogViewModel returns categorized SourceObject models with metric evidence, metadata, selection state, and importability.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'transition',
    'The hard cut is complete when no TableInfo or table-only catalog state remains and demanding-user tests exercise relational plus non-relational discovery.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
  public_contract = 'Provider-neutral SourceObject catalog presentation model and categorized selection view',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

update architecture.component_responsibility
set
  responsibility = 'Render categorized SourceObjects, metric evidence, metadata previews, and capability-aware selection callbacks from the source import catalog read model.',
  reason_to_change = 'SourceObject catalog presentation, locator categorization, metric evidence, or importability policy changes.',
  ddd_owner = 'SourceImportCatalogViewPresentation',
  status = 'proposed'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

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
  'REL-SOURCE-IMPORT-CATALOG-USES-SOURCE-OBJECT-CONTRACT',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG',
  'consumes',
  'outbound',
  'sync',
  'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
  'Catalog hides locator kinds or invents table-only identities outside the shared contract',
  'workspace_catalog_read',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
    'apps/web/src/app/components/sourceImportWizard/types.ts'
  ),
  'proposed'
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

update planning_query_store.command_query_rails
set raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
  'catalogVocabulary', 'SourceObject',
  'locatorKinds', jsonb_build_array('relation', 'file', 'endpoint', 'stream'),
  'visibilityPolicy', 'never-hide-discovered-objects',
  'selectionPolicy', 'capability-aware'
)
where rail_name = 'RenderSourceImportCatalogView'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'catalogVocabulary', 'SourceObject',
    'locatorKinds', jsonb_build_array('relation', 'file', 'endpoint', 'stream'),
    'visibilityPolicy', 'never-hide-discovered-objects',
    'selectionPolicy', 'capability-aware'
  ),
  source_content_sha256 = repeat(md5(rail_id || ':source-object-catalog-hardcut:612'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'RenderSourceImportCatalogView'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');
