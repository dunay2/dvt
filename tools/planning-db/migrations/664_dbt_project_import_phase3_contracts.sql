-- Record the implemented phase-three published languages without claiming
-- that their API or browser consumers are complete.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'owns', 'packages/@dvt/contracts/src/contracts/dbt-project/**', 0),
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'owns', 'packages/@dvt/contracts/test/dbt-project-import.contract.test.ts', 1),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'owns', 'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts', 2),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'owns', 'packages/@dvt/contracts/test/source-import/SourceImportOperations.v2.test.ts', 3)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS'
  and item_kind in ('invariant', 'public_api');

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'public_api', 'DbtProjectImport.v1 publishes the read-only validation query, content-addressed validation receipt, explicit import command, and file-authority import result.', 0),
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'invariant', 'Only normalized workspace-relative project roots and internally consistent file inventories can cross the import boundary.', 0),
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'invariant', 'ImportDbtProject accepts only require-unbound-canvas and returns only dbt-project-files authority.', 1),
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'transition', 'The contract remains transport-only; API services own validation, authority persistence, and projection orchestration.', 0),
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'consumer', 'SYS-API-APPLICATION-DBT-PROJECT-IMPORT;SYS-WEB-CANVAS-DBT-PROJECT-IMPORT', 0),
  ('SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'fowler_signal', 'Published Language', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'public_api', 'SourceImportOperations.v2 adds Canvas identity, idempotency, persisted authority, and disjoint graph-draft or dbt-project-files outcomes to the existing connection operation vocabulary.', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'invariant', 'ImportSourceObjectsRequestV2 never accepts client-selected authority; the server resolves authority from the Canvas binding.', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'invariant', 'ImportSourceObjectsResultV2 returns evidence for exactly one semantic authority and keeps file-backed YAML inside the bound project root.', 1)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  public_contract = 'DbtProjectImport.v1 validation report, validation receipt, import command, and import result',
  status = 'implemented',
  updated_at = now()
where component_id = 'SYS-CONTRACTS-DBT-PROJECT-IMPORT';

update architecture.component
set
  public_contract = 'SourceImportOperations.v1 connection operations and SourceImportOperations.v2 authority-aware import command/result',
  updated_at = now()
where component_id = 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS';

update architecture.component_responsibility
set
  responsibility = 'Version dbt project import validation and command transport contracts.',
  status = 'implemented'
where responsibility_id = 'RESP-DBT-PROJECT-IMPORT-CONTRACT';

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
values
  ('CONTRACT-DBT-PROJECT-IMPORT-V1', 'api', 'SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts', 'breaking', 'implemented', 'pnpm --filter @dvt/contracts exec vitest run test/dbt-project-import.contract.test.ts'),
  ('CONTRACT-SOURCE-IMPORT-OPERATIONS-V2', 'api', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts', 'breaking', 'implemented', 'pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceImportOperations.v2.test.ts')
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

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
  ('TEST-DBT-PROJECT-IMPORT-CONTRACT', 'SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'packages/@dvt/contracts/test/dbt-project-import.contract.test.ts', 'contract', 'negative', true, 'pnpm --filter @dvt/contracts exec vitest run test/dbt-project-import.contract.test.ts'),
  ('TEST-SOURCE-IMPORT-OPERATIONS-V2-CONTRACT', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'packages/@dvt/contracts/test/source-import/SourceImportOperations.v2.test.ts', 'contract', 'boundary', true, 'pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceImportOperations.v2.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

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
  ('REL-DBT-IMPORT-CONTRACT-USES-AUTHORITY-BINDING', 'SYS-CONTRACTS-DBT-PROJECT-IMPORT', 'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'depends_on', 'outbound', 'sync', 'CONTRACT-DBT-PROJECT-IMPORT-V1', 'Import vocabulary creates a second or ambiguous Canvas authority shape.', 'not_applicable', jsonb_build_array('packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts', 'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts'), 'implemented'),
  ('REL-SOURCE-IMPORT-V2-USES-AUTHORITY-BINDING', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING', 'depends_on', 'outbound', 'sync', 'CONTRACT-SOURCE-IMPORT-OPERATIONS-V2', 'Source Import invents or accepts client-selected Canvas authority.', 'not_applicable', jsonb_build_array('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts', 'packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts'), 'implemented')
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
  contract_id = 'CONTRACT-DBT-PROJECT-IMPORT-V1',
  source_refs = jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts',
    'apps/api/src/application/services/validateDbtProjectImportUseCase.ts',
    'apps/api/src/application/services/importDbtProjectUseCase.ts'
  ),
  updated_at = now()
where relation_id = 'REL-DBT-IMPORT-USES-IMPORT-CONTRACT';
