-- Complete the DB-first semantic profile for the already implemented Phase 3
-- import components. This migration introduces no product command or query.

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/695_dbt_project_import_phase3_semantic_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':phase3-semantic-closeout:695'), 2),
  revision = revision + 1
where component_id in (
  'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
  'SYS-API-RUNTIME-DBT-PROJECT-IMPORT'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'public_api',
    'ValidateDbtProjectImportUseCase.execute',
    0
  ),
  (
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'public_api',
    'ImportDbtProjectUseCase.execute',
    1
  ),
  (
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'transition',
    'Validation request -> accepted|rejected report; import command -> in_progress -> completed|failed with exact replay.',
    0
  ),
  (
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'consumer',
    'Protected dbt project import HTTP routes',
    0
  ),
  (
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'consumer',
    'buildDbtProjectImportRuntime',
    1
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'public_api',
    'IDbtProjectImportInspectorPort.inspect',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'transition',
    'Scoped project root -> bounded classified inventory plus deterministic diagnostics.',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'consumer',
    'ValidateDbtProjectImportUseCase',
    0
  ),
  (
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'public_api',
    'buildDbtProjectImportRuntime',
    0
  ),
  (
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'invariant',
    'Compose the analyzer, inspector, durable process store, authority policy, and three use cases exactly once without fallback adapters.',
    0
  ),
  (
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'transition',
    'Production dependencies -> project graph, validation, and import application services.',
    0
  ),
  (
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'consumer',
    'buildProtectedRuntimeModule',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
  'SYS-API-RUNTIME-DBT-PROJECT-IMPORT'
);

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
  'SYS-API-RUNTIME-DBT-PROJECT-IMPORT'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-DBT-IMPORT-USES-INSPECTOR',
  'REL-DBT-IMPORT-USES-IMPORT-CONTRACT',
  'REL-HTTP-WORKSPACE-ROUTES-CALLS-DBT-IMPORT',
  'REL-DBT-IMPORT-RUNTIME-COMPOSES-APPLICATION',
  'REL-DBT-IMPORT-RUNTIME-COMPOSES-INSPECTOR'
);

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-DBT-PROJECT-IMPORT-APPLICATION-OUTCOMES',
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'Typed validation, replay, conflict, in-progress, projection, and compensation outcomes are exposed to the protected HTTP boundary, which owns transport telemetry.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-DBT-PROJECT-IMPORT-INSPECTOR-DIAGNOSTICS',
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'The inspector returns a deterministic classified inventory and typed path, secret, file, byte, traversal, and parse diagnostics to its application caller.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-DBT-PROJECT-IMPORT-RUNTIME-COMPOSITION',
    'SYS-API-RUNTIME-DBT-PROJECT-IMPORT',
    'The composition owns no independent runtime decision; protected-runtime startup and command boundaries own readiness and outcome signals.',
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

do $$
declare
  duplicate_rail_count integer;
begin
  select count(*)
  into duplicate_rail_count
  from (
    select rail_name
    from planning_query_store.command_query_rail_query
    where rail_name in ('ValidateDbtProjectImport', 'ImportDbtProject')
    group by rail_name
    having count(*) <> 1
  ) invalid;

  if duplicate_rail_count <> 0 then
    raise exception 'Phase 3 closeout requires exactly one canonical validation and import rail';
  end if;
end;
$$;
