-- Materialize the Temporal dbt plugin adapter unit and close the last direct
-- adapter-root file claims left by migration 147.

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
  'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'planning_query_store.governance_component_local_definitions',
  repeat('b', 64),
  0,
  'Temporal dbt plugin adapter package',
  'component',
  'SYS-ADAPTERS-ROOT',
  'SYS-DVT',
  'SYS-ADAPTERS',
  'review',
  false,
  'Owns the Temporal dbt plugin package, CLI runner, dbt step activity, plugin manifest, process/materializer helpers, package config, and plugin tests.',
  'TemporalDbtPluginAdapter',
  'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
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
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'owns',
    'packages/@dvt/temporal-dbt-plugin/**',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
    'owns',
    'packages/@dvt/adapter-temporal/src/WorkflowMapper.ts',
    100
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'responsibility',
    'Run dbt steps from Temporal through an explicit plugin package instead of coupling the Temporal adapter runtime to dbt CLI internals.',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'reason_to_change',
    'Temporal dbt plugin runner, dbt CLI argument/failure policy, project materializer, step activity, manifest, package config, or plugin tests change.',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'invariant',
    'Temporal dbt plugin files must resolve to SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN, not to SYS-ADAPTERS-ROOT.',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'transition',
    'review -> implemented after component-quality shows zero direct Temporal dbt plugin files owned by SYS-ADAPTERS-ROOT and plugin tests remain green.',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'consumer',
    'Temporal adapter activity dispatch, Temporal workflow runtime, and dbt project execution flows',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    1
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'fowler_signal',
    'plugin_boundary',
    0
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'public_api',
    'RunTemporalDbtPlugin',
    0
  )
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
  'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'Temporal dbt plugin adapter package',
  'adapter',
  'adapter',
  'Architecture / Adapters',
  'packages/@dvt/temporal-dbt-plugin/src/DbtCliPluginRunner.ts',
  'Temporal dbt plugin runner and dbt step activity boundary.',
  'node',
  'high',
  'review',
  'SYS-ADAPTERS-ROOT'
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
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'Own Temporal dbt plugin runner, materializer, CLI failure policy, dbt step activity, and package tests.',
  'Temporal dbt plugin package, runner, materializer, CLI policy, manifest, or tests change.',
  'TemporalDbtPluginAdapter',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  negative_tests,
  status
)
values (
  'PORT-SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN-PRIMARY',
  'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'RunTemporalDbtPlugin',
  'command',
  'inbound',
  array[
    'packages/@dvt/temporal-dbt-plugin/test/DbtCliPluginRunner.test.ts',
    'packages/@dvt/temporal-dbt-plugin/test/dbtCliProjectMaterializer.test.ts'
  ]::text[],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
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
values (
  'TEST-SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN-PRIMARY',
  'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'packages/@dvt/temporal-dbt-plugin/test/DbtCliPluginRunner.test.ts',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/temporal-dbt-plugin test -- DbtCliPluginRunner.test.ts dbtCliProjectMaterializer.test.ts'
)
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
values (
  'OBS-SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN-PRIMARY',
  'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'Temporal dbt plugin has no independent runtime loop; Temporal activity and workflow components own operational telemetry.',
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
  'REL-ADAPTERS-ROOT-CONTAINS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'SYS-ADAPTERS-ROOT',
  'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if the Temporal dbt plugin package is remapped without a governed Planning DB component update.',
  'repo-local component governance',
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'packages/@dvt/temporal-dbt-plugin/src/DbtCliPluginRunner.ts'
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
