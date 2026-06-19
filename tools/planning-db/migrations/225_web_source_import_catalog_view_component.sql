-- Map the active SourceImportCatalogView files and retire the duplicate local
-- ListWarehouseConnectionTables rail projection. The canonical rail remains the
-- implemented warehouse table catalog query governed by ADR-0058 and the
-- command/query rail inventory.

drop table if exists pg_temp.web_source_import_catalog_view_map;

create temporary table web_source_import_catalog_view_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  validation_command text not null,
  port_name text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null
);

insert into web_source_import_catalog_view_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  validation_command,
  port_name,
  negative_tests,
  maturity_score,
  criticality
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'Canvas source import catalog view',
  'SourceImportCatalogViewPresentation',
  'ListWarehouseConnections;ListWarehouseConnectionTables',
  'Owns the source import catalog presentation and its focused jsdom test.',
  'Render warehouse schemas, table metrics, column previews, and table/schema selection callbacks from the source import catalog read model without owning warehouse table discovery or import command semantics.',
  'Source import catalog presentation, schema grouping display, table card rendering, column metric display, or selection callback behavior changes.',
  'The catalog view is a presentation adapter over SourceImportCatalogViewModel; it must not declare a second ListWarehouseConnectionTables rail implementation.',
  'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
  'Source import catalog presentation contract.',
  'presentation_model',
  array['SourceImportCatalogView']::text[],
  array[
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'
  ]::text[],
  array[
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
  ]::text[],
  'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx && pnpm --filter @dvt/web test:unit:run -- src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
  'RenderSourceImportCatalogView',
  array['duplicate warehouse table query rail', 'selection callback bypasses model identity', 'catalog view owns import command']::text[],
  82,
  'medium'
);

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
  'PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Map Web source import catalog view component and retire duplicate rail',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The contextual source import branch added SourceImportCatalogView.tsx and SourceImportCatalogView.test.tsx. After integration both files resolved only to SYS-WEB-ROOT while the same slice also left a feature-local ListWarehouseConnectionTables projection that duplicates the canonical implemented warehouse table query. This design maps the active presentation files to a leaf component and retires only the duplicate rail projection.',
  'boundary_drift',
  'CreateArchitectureDesign;CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;CheckRailVocabulary;CheckPlanningDbComponentIntegrity',
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

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'may_reference', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CORE', 'may_reference', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS', 'may_reference', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'may_create', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'query', 'ListWarehouseConnectionTables', 'may_update', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-CATALOG-VIEW', 'may_create', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW-DEPENDS-ON-CORE', 'may_create', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-STEPS-DEPENDS-ON-CATALOG-VIEW', 'may_create', true),
  ('PLANNING-DB-WEB-SOURCE-IMPORT-CATALOG-VIEW-20260619', 'test', 'TEST-SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW-1', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
select
  component_id,
  'tools/planning-db/migrations/225_web_source_import_catalog_view_component.sql',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = web_source_import_catalog_view_map.repo_path
      limit 1
    ),
    md5(component_id || ':225') || md5(repo_path || cq_rails || ':web-source-import-catalog-view')
  ),
  0,
  name,
  'component',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_source_import_catalog_view_map
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
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  owned.path,
  owned.path_order - 1
from web_source_import_catalog_view_map
cross join lateral unnest(owns) with ordinality as owned(path, path_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select item.component_id, item.item_kind, item.item_value, item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from web_source_import_catalog_view_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_source_import_catalog_view_map
  union all
  select component_id, 'invariant', invariant, 0
  from web_source_import_catalog_view_map
  union all
  select component_id, 'non_goal', 'Do not own ListWarehouseConnectionTables execution, ImportWarehouseSources execution, or source import wizard step orchestration.', 0
  from web_source_import_catalog_view_map
  union all
  select component_id, 'transition', 'review -> implemented after component-profile shows catalog view files, tests, relations, port, and rail-duplicates returns zero exact duplicates.', 0
  from web_source_import_catalog_view_map
  union all
  select component_id, 'consumer', 'SourceImportWizard selection and review steps', 0
  from web_source_import_catalog_view_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/frontend-command-query-rail-inventory.md', 0
  from web_source_import_catalog_view_map
  union all
  select component_id, 'governance_ref', 'docs/adr/ADR-0058-warehouse-source-import-rails.md', 1
  from web_source_import_catalog_view_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 2
  from web_source_import_catalog_view_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_source_import_catalog_view_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_source_import_catalog_view_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
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
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'ui-view',
  'ui',
  ddd_owner,
  repo_path,
  public_contract,
  'browser',
  criticality,
  'review',
  maturity_score,
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD'
from web_source_import_catalog_view_map
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
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from web_source_import_catalog_view_map
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-SURFACE',
  'type',
  component_id,
  repo_path || '#SourceImportCatalogView',
  'internal',
  'implemented',
  validation_command
from web_source_import_catalog_view_map
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
select
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  'outbound',
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  'implemented'
from (
  select
    'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-CATALOG-VIEW' as relation_id,
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD' as source_component_id,
    component_id as target_component_id,
    'contains' as relation_type,
    'build_time' as sync_async,
    null::text as contract_id,
    'Component profile becomes incomplete if SourceImportCatalogView is removed or remapped without a governed Planning DB component update.' as failure_mode,
    'repo-local Web source import governance' as authorization_scope,
    jsonb_build_array(
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      repo_path
    ) as source_refs
  from web_source_import_catalog_view_map
  union all
  select
    'REL-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW-DEPENDS-ON-CORE',
    component_id,
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CORE',
    'depends_on',
    'sync',
    'CONTRACT-' || component_id || '-SURFACE',
    'Catalog view imports SourceImportCatalogViewModel and must stay aligned with the source import wizard core read model.',
    'browser-local source import presentation',
    jsonb_build_array(
      repo_path,
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'
    )
  from web_source_import_catalog_view_map
  union all
  select
    'REL-WEB-CANVAS-SOURCE-IMPORT-STEPS-DEPENDS-ON-CATALOG-VIEW',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    component_id,
    'depends_on',
    'sync',
    'CONTRACT-' || component_id || '-SURFACE',
    'SelectionStep and ReviewStep render the catalog view; moving it without updating step ownership breaks source import presentation.',
    'browser-local source import presentation',
    jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
      repo_path
    )
  from web_source_import_catalog_view_map
) relation
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
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  'CONTRACT-' || component_id || '-SURFACE',
  negative_tests,
  'implemented'
from web_source_import_catalog_view_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  'TEST-' || component_id || '-' || test_path.path_order,
  component_id,
  test_path.path,
  case when test_path.path like '%planning-db-query.test.cjs' then 'architecture' else 'unit' end,
  case when test_path.path like '%planning-db-query.test.cjs' then 'boundary' else 'behavior' end,
  true,
  validation_command
from web_source_import_catalog_view_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, path_order)
union all
select
  'TEST-SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW-COMPONENT-PROFILE',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW --no-refresh --limit 80 && pnpm planning:db:query rail-duplicates --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-COMPONENT-PROFILE',
  component_id,
  name || ' is observable through component-profile, filesystem ownership, focused jsdom tests, and rail-duplicates.',
  'dashboard',
  true,
  'implemented'
from web_source_import_catalog_view_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update planning_query_store.feature_mechanization_local_rails rail
set
  ddd_owner = 'Warehouse source import catalog read model',
  mechanization_status = 'closed',
  rail_status = 'retired',
  implementation_refs = jsonb_build_array(
    'apps/api/src/application/services/listWarehouseConnectionTablesUseCase.ts#ListWarehouseConnectionTablesUseCase',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts#listWarehouseTables',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportCatalogViewModel'
  ),
  documentation_refs = jsonb_build_array(
    'docs/adr/ADR-0058-warehouse-source-import-rails.md#ListWarehouseConnectionTables',
    'docs/architecture/components/web/frontend-command-query-rail-inventory.md#ListWarehouseConnectionTables',
    'docs/architecture/components/web/frontend-component-inventory.md#SourceImportDialog'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md',
    'docs/architecture/components/web/frontend-command-query-rail-inventory.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'GET /workspace/warehouse/connections/:connectionId/tables',
    'IWarehouseSourceImportPort.listWarehouseTables',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW consumes the read model only'
  ),
  architecture_guards = jsonb_build_array(
    'pnpm planning:db:query rail-duplicates --no-refresh --limit 20 must return no ListWarehouseConnectionTables row',
    'pnpm planning:db:integrity:check must report zero exact_duplicate rail_vocabulary errors'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:query rail-duplicates --no-refresh --limit 20',
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = (
    coalesce(rail.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'retired',
      'retirementReason', 'Duplicate local frontend component projection of the canonical implemented ListWarehouseConnectionTables query rail. The active UI consumer is SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW.',
      'canonicalRailSources', jsonb_build_array(
        'docs/adr/ADR-0058-warehouse-source-import-rails.md',
        'docs/architecture/components/web/frontend-command-query-rail-inventory.md',
        'apps/api/src/application/services/listWarehouseConnectionTablesUseCase.ts'
      ),
      'retiredBy', '225_web_source_import_catalog_view_component'
    )
  ),
  raw_manifest = (
    coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'mechanizationStatus', 'closed',
      'commandQueryRails', jsonb_build_array(
        jsonb_build_object(
          'name', 'ListWarehouseConnectionTables',
          'type', 'query',
          'status', 'retired',
          'dddOwner', 'Warehouse source import catalog read model',
          'retirementReason', 'Duplicate local frontend component projection; canonical rail stays implemented.'
        )
      ),
      'activePresentationComponent', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'retiredBy', '225_web_source_import_catalog_view_component'
    )
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
where rail.feature_id = 'WEB-SOURCE-IMPORT-CONTEXTUAL-CATALOG-20260619'
  and rail.rail_type = 'query'
  and rail.normalized_rail_name = 'listwarehouseconnectiontables'
  and rail.source_path = 'docs/architecture/components/web/frontend-component-inventory.md';

drop table if exists pg_temp.web_source_import_catalog_view_map;
