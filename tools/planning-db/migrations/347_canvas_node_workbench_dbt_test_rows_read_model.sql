-- DB-first registration for the DBT test-row read model used by the contextual
-- Node Workbench. The existing InspectCanvasNodeProperties query remains the
-- owner; this migration records the Fowler extraction that keeps DBT test
-- semantics out of the broader node properties coordinator.

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
  'CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'Canvas node workbench DBT test rows read model',
  'Frontend / Canvas Node Workbench',
  'implemented',
  'nodePropertiesReadModel owned generic node sections plus DBT-specific test parsing, assertion wording, selection state and last-run projection. Extracting DBT test rows to a pure read model keeps the coordinator small, makes DBT test semantics directly testable, and preserves InspectCanvasNodeProperties as the owning query rail.',
  'responsibility_overload',
  'InspectCanvasNodeProperties',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627',
    'component',
    'web.component.canvas.NodeWorkbench',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627',
    'query',
    'InspectCanvasNodeProperties',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627',
    'path',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627',
    'path',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627',
    'path',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627',
    'path',
    'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.frontend_component_local_components
set
  reuse_decision = 'extract',
  responsibility = 'Owns the contextual Node Workbench read models and passive property sections for node metadata, columns, tests, code, lineage, keys, constraints and operational summary.',
  evidence_refs = (
    select coalesce(jsonb_agg(distinct evidence_ref), '[]'::jsonb)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL')
    ) as refs(evidence_ref)
  ),
  source_path = 'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
  source_content_sha256 = md5('web.component.canvas.NodeWorkbench:347'),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'responsibility_overload',
      'dbtTestRowsReadModel', 'buildDbtTestRows',
      'rail', 'InspectCanvasNodeProperties'
    ),
  updated_at = now()
where component_id = 'web.component.canvas.NodeWorkbench';

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'view-model',
    'buildNodePropertiesReadModel',
    jsonb_build_object(
      'role', 'Node Workbench properties read-model coordinator',
      'responsibility', 'assembles passive sections while delegating DBT test-row projection to dbtTestRowsReadModel',
      'rail', 'InspectCanvasNodeProperties',
      'delegates', jsonb_build_array('buildDbtTestRows')
    ),
    'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
    md5('nodePropertiesReadModel#buildDbtTestRows:347')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
    'read-model',
    'buildDbtTestRows',
    jsonb_build_object(
      'role', 'DBT test-row projection read model',
      'responsibility', 'projects manifest column tests, connected dbt:test nodes and fallback test-node metadata into passive Node Workbench table rows',
      'rail', 'InspectCanvasNodeProperties',
      'doesNotOwn', jsonb_build_array('JSX', 'route state', 'workspace mutation')
    ),
    'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
    md5('dbtTestRowsReadModel#buildDbtTestRows:347')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'DBT test-row projection covers manifest column tests, connected dbt:test nodes and fallback test-node metadata without JSX assertions',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
    md5('dbtTestRowsReadModel.test.ts:347')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'EV-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL',
  'web.component.canvas.NodeWorkbench',
  'test',
  'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/inspector/dbtTestRowsReadModel.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dbtTestSemanticsPresenter.test.ts',
  'passing',
  jsonb_build_object(
    'scope', 'DBT test semantics rows are projected outside the generic Node Workbench coordinator and remain integrated with nodePropertiesReadModel',
    'task', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'redGreenCycle', 'expected failure: dbtTestRowsReadModel.ts was absent and DBT test parsing lived inside nodePropertiesReadModel.ts'
  ),
  'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
  md5('EV-WEB-CANVAS-DBT-TEST-ROWS-READ-MODEL:347')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

with patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
      'apps/web/src/app/components/inspector/dbtTestSemanticsPresenter.test.ts',
      'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
      'docs/planning/status/generated-code-state.md'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#DbtTestTableRow',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#asRecord',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#buildColumnTestRows',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#buildConnectedTestRows',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#buildDbtTestRows',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#buildDbtTestSemanticsInput',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#buildFallbackTestNodeRows',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#buildMetadataTestRows',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#isRecord',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#normalizeTestType',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readBoolean',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readConnectedDbtTest',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readDbtTest',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readDbtTestExpression',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readFirstString',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readNumber',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readString',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#readStringArray',
      'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts#testSemanticCells'
    ) as symbol_refs,
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/inspector/dbtTestRowsReadModel.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dbtTestSemanticsPresenter.test.ts',
      'pnpm docs:feature-mechanization:implementation'
    ) as guards,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'node-workbench-dbt-test-rows-read-model',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/inspector/dbtTestRowsReadModel.test.ts',
        'expectedFailure', 'Failed to resolve ./dbtTestRowsReadModel because DBT test-row projection still lived inside nodePropertiesReadModel.ts.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
          'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
          'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
          'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/inspector/dbtTestRowsReadModel.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dbtTestSemanticsPresenter.test.ts'
      )
    ) as cycles,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'DbtTestTableRow',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('value_object'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'asRecord',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model_guard'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: pure metadata reader',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'isRecord',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model_guard'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: pure metadata reader',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readBoolean',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model_guard'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: pure metadata reader',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readConnectedDbtTest',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readDbtTest',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readDbtTestExpression',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildDbtTestRows',
        'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('extract_function', 'read_model', 'responsibility_boundary'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/inspector/dbtTestRowsReadModel.test.ts',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
      )
    ) as featured_symbols
),
target_rails as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.feature_id = 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604'
    and rail.normalized_rail_name = 'inspectcanvasnodeproperties'
),
helper_symbols as (
  select jsonb_build_array(
    jsonb_build_object('name', 'buildColumnTestRows', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'buildConnectedTestRows', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'buildDbtTestSemanticsInput', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'buildFallbackTestNodeRows', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'buildMetadataTestRows', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'normalizeTestType', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'readFirstString', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'readNumber', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'readString', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'readStringArray', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts'),
    jsonb_build_object('name', 'testSemanticCells', 'path', 'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts')
  ) as symbols
),
patch_symbols as (
  select
    (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'name', symbol->>'name',
          'path', symbol->>'path',
          'dddOwner', 'web.component.canvas.NodeWorkbench',
          'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
          'fowlerSignals', jsonb_build_array('extract_function', 'read_model'),
          'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
          'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
          'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts')
        )
        order by symbol->>'name'
      ), '[]'::jsonb)
      from jsonb_array_elements(helper_symbols.symbols) symbols(symbol)
    ) || patch.featured_symbols as symbols
  from patch
  cross join helper_symbols
),
merged_allowed_surfaces as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(coalesce(target_rails.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
  group by target_rails.rail_id
),
merged_symbol_refs as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.symbol_refs, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.symbol_refs)
  ) refs
  group by target_rails.rail_id
),
merged_implementation_refs as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.implementation_refs, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.symbol_refs)
    union
    select value
    from jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
  group by target_rails.rail_id
),
merged_guards as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.architecture_guards, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(coalesce(target_rails.raw_manifest->'architectureGuards', '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.guards)
  ) refs
  group by target_rails.rail_id
),
merged_completion_gate as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.completion_gate, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(coalesce(target_rails.raw_manifest->'completionGate', '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.guards)
  ) refs
  group by target_rails.rail_id
),
merged_cycles as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(cycle order by cycle->>'id'), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct on (cycle->>'id') cycle
    from (
      select cycle
      from jsonb_array_elements(coalesce(target_rails.raw_manifest->'redGreenCycles', '[]'::jsonb)) cycles(cycle)
      union all
      select cycle
      from jsonb_array_elements(patch.cycles) cycles(cycle)
    ) all_cycles
    order by cycle->>'id'
  ) cycles
  group by target_rails.rail_id
),
merged_symbols as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from target_rails
  cross join patch_symbols
  cross join lateral (
    select distinct on (symbol->>'path', symbol->>'name') symbol
    from (
      select symbol
      from jsonb_array_elements(coalesce(target_rails.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
      union all
      select symbol
      from jsonb_array_elements(patch_symbols.symbols) symbols(symbol)
    ) all_symbols
    order by symbol->>'path', symbol->>'name'
  ) symbols
  group by target_rails.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  rail_status = 'implemented',
  symbol_refs = merged_symbol_refs.value,
  implementation_refs = merged_implementation_refs.value,
  allowed_implementation_surfaces = merged_allowed_surfaces.value,
  architecture_guards = merged_guards.value,
  completion_gate = merged_completion_gate.value,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(rail.raw_manifest, '{}'::jsonb),
            '{allowedImplementationSurfaces}',
            merged_allowed_surfaces.value,
            true
          ),
          '{architectureGuards}',
          merged_guards.value,
          true
        ),
        '{completionGate}',
        merged_completion_gate.value,
        true
      ),
      '{redGreenCycles}',
      merged_cycles.value,
      true
    ),
    '{symbols}',
    merged_symbols.value,
    true
  ),
  source_path = 'tools/planning-db/migrations/347_canvas_node_workbench_dbt_test_rows_read_model.sql',
  source_content_sha256 = md5('CANVAS-NODE-WORKBENCH-DBT-TEST-ROWS-READ-MODEL-20260627:347'),
  revision = rail.revision + 1,
  updated_at = now()
from merged_allowed_surfaces
join merged_symbol_refs on merged_symbol_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_implementation_refs on merged_implementation_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_guards on merged_guards.rail_id = merged_allowed_surfaces.rail_id
join merged_completion_gate on merged_completion_gate.rail_id = merged_allowed_surfaces.rail_id
join merged_cycles on merged_cycles.rail_id = merged_allowed_surfaces.rail_id
join merged_symbols on merged_symbols.rail_id = merged_allowed_surfaces.rail_id
where rail.rail_id = merged_allowed_surfaces.rail_id;
