-- DB-first delta for transform column metadata in the contextual Node
-- Workbench. The existing InspectCanvasNodeProperties rail remains the owner;
-- this migration records the DBT/DVT-generic transform column vocabulary that
-- replaced the DVT-only helper names in the workbench read model.

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
  'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
  'E-CANVAS-COLUMN-METADATA-SELECTION-1',
  'Canvas transform column metadata workbench projection',
  'Frontend / Canvas Node Workbench',
  'implemented',
  'DBT model nodes and DVT SQL transforms are both transform-role nodes. Their contextual workbench must project upstream source columns, types, nullability, source references and selected-column state when the node itself has not recorded output columns yet. The column projection therefore belongs to InspectCanvasNodeProperties instead of a DVT-only helper.',
  'boundary_drift',
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
    'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
    'component',
    'web.component.canvas.NodeWorkbench',
    'may_update',
    true
  ),
  (
    'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
    'query',
    'InspectCanvasNodeProperties',
    'may_update',
    true
  ),
  (
    'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
    'path',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
    'path',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
    'path',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
    'path',
    'scripts/planning-db-migrate.test.cjs',
    'may_update',
    true
  ),
  (
    'CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION-20260626',
    'path',
    'tools/planning-db/migrations/328_canvas_column_metadata_workbench_projection.sql',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'model',
    'buildTransformColumnOptions',
    jsonb_build_object(
      'role', 'transform-role upstream input-column read model',
      'responsibility', 'projects upstream source column metadata and selectedColumns state for DBT and DVT transform nodes without JSX ownership',
      'rail', 'InspectCanvasNodeProperties',
      'replacesLegacySymbol', 'buildDvtTransformColumnOptions',
      'selectionSource', 'metadata.config.selectedColumns',
      'negativePolicy', 'does not fabricate columns when upstream source metadata has no columns'
    ),
    'tools/planning-db/migrations/328_canvas_column_metadata_workbench_projection.sql',
    md5('dvtTransformColumnModel#buildTransformColumnOptions:328')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'view-model',
    'buildNodePropertiesReadModel',
    jsonb_build_object(
      'role', 'Node Workbench properties read model',
      'responsibility', 'surfaces explicit node columns when present and otherwise projects upstream input columns for transform-role nodes',
      'rail', 'InspectCanvasNodeProperties',
      'transformFallbackSymbol', 'buildTransformInputColumnRows'
    ),
    'tools/planning-db/migrations/328_canvas_column_metadata_workbench_projection.sql',
    md5('nodePropertiesReadModel#buildTransformInputColumnRows:328')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'projects dbt model input columns with source and selection state when catalog output is not recorded yet',
      'redGreenCycle', 'DBT model workbench had no Columns rows until transform-role fallback replaced the DVT-kind guard'
    ),
    'tools/planning-db/migrations/328_canvas_column_metadata_workbench_projection.sql',
    md5('nodePropertiesReadModel.test.ts#dbt-transform-input-columns:328')
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
  'EV-WEB-CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION',
  'web.component.canvas.NodeWorkbench',
  'test',
  'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts',
  'passing',
  jsonb_build_object(
    'scope', 'DBT and DVT transform-role nodes use the NodeWorkbench column projection rail for upstream source columns and selected-column state',
    'task', 'E-CANVAS-COLUMN-METADATA-SELECTION-1'
  ),
  'tools/planning-db/migrations/328_canvas_column_metadata_workbench_projection.sql',
  md5('EV-WEB-CANVAS-COLUMN-METADATA-WORKBENCH-PROJECTION:328')
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
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/328_canvas_column_metadata_workbench_projection.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#BuildTransformColumnOptionsArgs',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#DvtTransformColumnOption',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#TransformColumn',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#TransformColumnOption',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#buildDvtTransformColumnOptions',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#buildTransformColumnOptions',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readColumns',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readDvtSelectedColumnRefs',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readSelectedColumnRefs',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildTransformInputColumnRows'
    ) as symbol_refs,
    jsonb_build_array(
      'node --test --test-name-pattern "tracked migrations register transform column metadata workbench projection" scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts',
      'pnpm docs:feature-mechanization:implementation'
    ) as guards,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'BuildTransformColumnOptionsArgs',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench transform column reader',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('parameter_object'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'TransformColumnOption',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench transform column value object',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('value_object', 'ubiquitous_language'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'DvtTransformColumnOption',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench transform column compatibility alias',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('legacy_compatibility_adapter'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: compatibility type alias only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'TransformColumn',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench upstream column DTO',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('value_object'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: internal read-model DTO',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readColumns',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench source column metadata reader',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readSelectedColumnRefs',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench selected-column reader',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildTransformColumnOptions',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench transform column projection',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model', 'replace_conditional_with_polymorphism_candidate'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildDvtTransformColumnOptions',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench transform column compatibility alias',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('legacy_compatibility_adapter'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: compatibility export only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readDvtSelectedColumnRefs',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench selected-column compatibility alias',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('legacy_compatibility_adapter'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: compatibility export only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildTransformInputColumnRows',
        'path', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'dddOwner', 'CanvasNodeWorkbench properties read model',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model', 'role_policy'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'not_applicable: NodeWorkbench read-model projection only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts')
      )
    ) as symbols
),
target_rails as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.raw_manifest->>'featureId' = 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604'
    and exists (
      select 1
      from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
      where symbol->>'path' = 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts'
    )
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
merged_symbols as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct on (symbol->>'path', symbol->>'name') symbol
    from (
      select symbol
      from jsonb_array_elements(coalesce(target_rails.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
      union all
      select symbol
      from jsonb_array_elements(patch.symbols) symbols(symbol)
    ) all_symbols
    order by symbol->>'path', symbol->>'name'
  ) symbols
  group by target_rails.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'implemented',
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
      '{symbols}',
      merged_symbols.value,
      true
    ),
    '{redGreenCycles}',
    (
      select coalesce(jsonb_agg(cycle order by cycle->>'id'), '[]'::jsonb)
      from (
        select cycle
        from jsonb_array_elements(coalesce(rail.raw_manifest->'redGreenCycles', '[]'::jsonb)) cycles(cycle)
        union all
        select jsonb_build_object(
          'id', 'node-workbench-dbt-transform-input-columns',
          'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/components/inspector/nodePropertiesReadModel.test.ts',
          'expectedFailure', 'projects dbt model input columns with source and selection state when catalog output is not recorded yet',
          'patchSurfaces', patch.allowed_surfaces,
          'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/components/inspector/nodePropertiesReadModel.test.ts src/app/components/inspector/dvtTransformColumnModel.test.ts'
        )
      ) all_cycles
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/328_canvas_column_metadata_workbench_projection.sql',
  source_content_sha256 = repeat('9', 64),
  revision = rail.revision + 1,
  updated_at = now()
from merged_allowed_surfaces
join merged_symbol_refs on merged_symbol_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_implementation_refs on merged_implementation_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_guards on merged_guards.rail_id = merged_allowed_surfaces.rail_id
join merged_completion_gate on merged_completion_gate.rail_id = merged_allowed_surfaces.rail_id
join merged_symbols on merged_symbols.rail_id = merged_allowed_surfaces.rail_id
cross join patch
where rail.rail_id = merged_allowed_surfaces.rail_id;
