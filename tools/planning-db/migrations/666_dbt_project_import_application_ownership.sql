-- Complete the planned ownership map for the phase-three application slice
-- before its files exist. Rail status remains unchanged until implementation
-- and negative evidence are green.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'owns', 'apps/api/src/infrastructure/dbt/dbtProjectWorkspaceBoundary.ts', 2),
  ('SYS-API-APPLICATION-DBT-PROJECT-IMPORT', 'owns', 'apps/api/test/application/dbtProjectImportUseCases.test.ts', 4)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values (
  'REL-DBT-IMPORT-USES-AUTHORITY-POLICY',
  'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
  'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
  'calls', 'outbound', 'async',
  'Import trusts caller-selected authority or bypasses the canonical graph-draft default.',
  'tenant/project/environment/canvas',
  jsonb_build_array('apps/api/src/application/services/importDbtProjectUseCase.ts'),
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
