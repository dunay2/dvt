-- Govern the protected runtime and HTTP ownership for phase-three dbt project
-- import before those adapters are implemented. The product rails remain
-- retired until their application, HTTP, browser, and negative evidence close.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-RUNTIME-DBT-PROJECT-IMPORT', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
  'tools/planning-db/migrations/667_dbt_project_import_runtime_design.sql',
  repeat(md5('SYS-API-RUNTIME-DBT-PROJECT-IMPORT:667'), 2),
  0,
  'dbt project import protected runtime',
  'component',
  'SYS-API-RUNTIME-COMPOSITION',
  'SYS-DVT',
  'SYS-API-ROOT',
  'review',
  false,
  'Compose one analyzer, import inspector, authority policy, graph projection, validator, and import command for protected HTTP routes.',
  'DbtProjectImportRuntime',
  'ValidateDbtProjectImport;ImportDbtProject;ProjectDbtGraphFromFiles',
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
where component_id = 'SYS-API-RUNTIME-DBT-PROJECT-IMPORT';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-RUNTIME-DBT-PROJECT-IMPORT', 'owns', 'apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts', 0),
  ('SYS-API-RUNTIME-DBT-PROJECT-IMPORT', 'owns', 'apps/api/test/modules/buildDbtProjectImportRuntime.test.ts', 1),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts', 42),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/src/entrypoints/http/dbtProjectImportRouteGroup.ts', 43),
  ('SYS-API-HTTP-ENTRYPOINT-TESTS-WORKSPACE-ROUTES', 'owns', 'apps/api/test/entrypoints/http/dbtProjectImportRoutes.test.ts', 42)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
  'dbt project import protected runtime',
  'module',
  'infra',
  'dbt Project Authoring',
  'apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts',
  'DbtProjectImportRuntime',
  'node',
  'critical',
  'proposed',
  'SYS-API-RUNTIME-COMPOSITION'
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

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values (
  'RESP-DBT-PROJECT-IMPORT-RUNTIME',
  'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
  'Bind phase-three dbt import application services to production adapters exactly once.',
  'Protected dbt project import composition changes.',
  'DbtProjectImportRuntime',
  'proposed'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-DBT-IMPORT-RUNTIME-COMPOSES-APPLICATION',
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'depends_on', 'outbound', 'sync',
    'HTTP routes construct duplicate import services or bypass validation.',
    'not_applicable',
    jsonb_build_array('apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts'),
    'proposed'
  ),
  (
    'REL-DBT-IMPORT-RUNTIME-COMPOSES-INSPECTOR',
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'depends_on', 'outbound', 'sync',
    'Import validation bypasses workspace containment and file policy.',
    'not_applicable',
    jsonb_build_array('apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts'),
    'proposed'
  ),
  (
    'REL-DBT-IMPORT-RUNTIME-COMPOSES-AUTHORITY',
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'SYS-API-RUNTIME-CANVAS-AUTHORITY',
    'depends_on', 'outbound', 'sync',
    'Import and projection disagree about persisted Canvas authority.',
    'tenant/project/environment/canvas',
    jsonb_build_array('apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts'),
    'proposed'
  ),
  (
    'REL-HTTP-WORKSPACE-ROUTES-CALLS-DBT-IMPORT',
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'calls', 'outbound', 'async',
    'Transport performs import policy or returns success without a command receipt.',
    'workspace:files:view for validation; workspace:files:save for import',
    jsonb_build_array(
      'apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts',
      'apps/api/src/entrypoints/http/dbtProjectImportRouteGroup.ts'
    ),
    'proposed'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-DBT-PROJECT-IMPORT-RUNTIME',
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'apps/api/test/modules/buildDbtProjectImportRuntime.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter dvt-api exec vitest run test/modules/buildDbtProjectImportRuntime.test.ts'
  ),
  (
    'TEST-DBT-PROJECT-IMPORT-HTTP',
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'apps/api/test/entrypoints/http/dbtProjectImportRoutes.test.ts',
    'integration', 'negative', true,
    'pnpm --filter dvt-api exec vitest run test/entrypoints/http/dbtProjectImportRoutes.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
