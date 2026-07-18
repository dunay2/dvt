-- Close the executable integrity-policy evidence and refresh the component
-- projections after the Fowler ownership split in migration 741.

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level,
  required, validation_command
)
values (
  'TEST-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'apps/api/test/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.test.ts',
  'property',
  'boundary',
  true,
  'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

update architecture.component_test
set validation_command = replace(validation_command, '--filter @dvt/api', '--filter dvt-api')
where test_id like 'TEST-API-DBT-YAML-DESCRIPTION-%'
  and validation_command like '%--filter @dvt/api%';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values (
  'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'owns',
  'apps/api/test/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.test.ts',
  1
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
    'invariant',
    'Semantically equal JSON command inputs have one canonical identity independent of object key insertion order.',
    1
  ),
  (
    'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
    'non_goal',
    'Accept non-JSON runtime objects or derive identity from incidental JavaScript property order.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

refresh materialized view planning_query_store.component_engineering_component_tree_projection;
refresh materialized view planning_query_store.component_engineering_file_ownership_projection;

do $$
declare
  old_claim_count integer;
  integrity_claim_count integer;
  invalid_validation_count integer;
begin
  select count(*) into old_claim_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

  if old_claim_count <> 0 then
    raise exception 'Superseded DBT YAML description transaction still owns % file claims', old_claim_count;
  end if;

  select count(*) into integrity_claim_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY'
    and pattern_kind = 'owns'
    and pattern in (
      'apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts',
      'apps/api/test/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.test.ts'
    );

  if integrity_claim_count <> 2 then
    raise exception 'Expected two integrity-policy file claims, found %', integrity_claim_count;
  end if;

  select count(*) into invalid_validation_count
  from architecture.component_test
  where test_id like 'TEST-API-DBT-YAML-DESCRIPTION-%'
    and validation_command like '%--filter @dvt/api%';

  if invalid_validation_count <> 0 then
    raise exception 'Found % DBT description tests with a nonexistent API package filter', invalid_validation_count;
  end if;
end
$$;
