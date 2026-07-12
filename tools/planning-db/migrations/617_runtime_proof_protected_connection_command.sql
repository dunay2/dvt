-- Runtime proof setup may seed provider data, but it must create workspace
-- connection state through the existing protected CreateWarehouseConnection
-- command. The dedicated Source Import browser proof remains clean and creates
-- its own uniquely named connection through the UI.

update planning_query_store.governance_component_local_definitions
set
  source_path = 'scripts/run-dev-stack.cjs',
  source_content_sha256 = repeat(md5('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS:protected-connection-command:617'), 2),
  owned_concern = 'Own local protected-runtime and browser proof orchestration, including real provider data setup and command-rail creation of workspace warehouse connections without direct catalog writes.',
  cq_rails = 'RunCanvasFirstAuthoringLiveProof;RunFullCiCodeBaseline;WebVitestSuitePartition;CreateWarehouseConnection',
  revision = revision + 1
where component_id = 'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-dev-stack.cjs', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-dev-stack.test.cjs', 1),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-canvas-source-import-live-proof.cjs', 2),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-selected-closure-live-proof.cjs', 3),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-selected-closure-live-proof.test.cjs', 4)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'invariant', 'Runtime proof setup may create provider data directly, but workspace connection catalog state is created only through the protected CreateWarehouseConnection command.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'invariant', 'The dedicated Source Import browser proof begins without a precreated connection and creates its unique connection through the product UI.', 1),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'fowler_signal', 'Service Layer test adapter reuses the production command boundary instead of a parallel fixture writer.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  public_contract = 'Local protected-runtime and browser proof orchestration with real provider data, protected command-rail setup, and no direct workspace catalog seeding',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS';

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
  'REL-CI-RUNTIME-PROOFS-INVOKES-CREATE-WAREHOUSE-CONNECTION',
  'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
  'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
  'depends_on',
  'outbound',
  'sync',
  'CONTRACT-SOURCE-IMPORT-OPERATIONS-V1',
  'Runtime proof bypasses authorization or writes the workspace connection catalog directly',
  'workspace',
  jsonb_build_array(
    'scripts/run-dev-stack.cjs',
    'scripts/run-selected-closure-live-proof.cjs',
    'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
    'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts'
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

with implementation_refs(ref) as (
  values
    ('scripts/run-dev-stack.cjs'),
    ('scripts/run-dev-stack.test.cjs'),
    ('scripts/run-selected-closure-live-proof.cjs'),
    ('scripts/run-selected-closure-live-proof.test.cjs'),
    ('tools/planning-db/migrations/617_runtime_proof_protected_connection_command.sql')
),
architecture_guards(ref) as (
  values
    ('node --test scripts/run-dev-stack.test.cjs scripts/run-selected-closure-live-proof.test.cjs'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('scripts/run-dev-stack.test.cjs'),
    ('scripts/run-selected-closure-live-proof.test.cjs')
),
target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1'
    and rail_name = 'CreateWarehouseConnection'
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.implementation_refs, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
        || (select jsonb_agg(ref) from architecture_guards)
      ) as item(value)
    ) as architecture_guards
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  architecture_guards = merged.architecture_guards,
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'runtimeProofSetup', jsonb_build_object(
      'providerDataSetup', 'scripts/run-dev-stack.cjs#seedLocalPostgresProofData',
      'connectionCommand', 'scripts/run-dev-stack.cjs#ensureLocalWarehouseConnectionViaApi',
      'selectedClosureConsumer', 'scripts/run-selected-closure-live-proof.cjs',
      'sourceImportBrowserProofCreatesOwnConnection', true,
      'directCatalogSeeding', false,
      'authorizationRequired', true
    )
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(rail.raw_manifest, '{}'::jsonb),
        '{implementationRefs}',
        merged.implementation_refs,
        true
      ),
      '{allowedImplementationSurfaces}',
      merged.allowed_surfaces,
      true
    ),
    '{architectureGuards}',
    merged.architecture_guards,
    true
  ),
  source_path = 'tools/planning-db/migrations/617_runtime_proof_protected_connection_command.sql',
  source_content_sha256 = repeat(md5(rail.rail_id || ':runtime-proof-protected-command:617'), 2),
  revision = revision + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
