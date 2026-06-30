-- DB-first alignment for the DVT sink workbench section. The surface strategy
-- now names Sink as a real node-workbench section, and InspectCanvasNodeProperties
-- exposes the passive sink target/write-policy read model that the workbench renders.

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
  'CANVAS-SURFACE-STRATEGY-SINK-WORKBENCH-SECTION-20260627',
  'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1',
  'Canvas surface strategy sink workbench section',
  'Frontend / Canvas Surface Strategy',
  'implemented',
  'DVT declared a sink workbench section in the canvas surface strategy, but the section translator dropped it and the editable sink target lived inside the generic General section. This migration records the explicit section vocabulary, the InspectCanvasNodeProperties sink read model, and the component evidence proving DVT sink target editing lives in a dedicated contextual workbench tab.',
  'published_language',
  'ResolveCanvasSurfaceStrategy',
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
    'CANVAS-SURFACE-STRATEGY-SINK-WORKBENCH-SECTION-20260627',
    'component',
    'web.component.canvas.CanvasSurfaceStrategy',
    'may_update',
    true
  ),
  (
    'CANVAS-SURFACE-STRATEGY-SINK-WORKBENCH-SECTION-20260627',
    'component',
    'web.component.canvas.NodeWorkbench',
    'may_update',
    true
  ),
  (
    'CANVAS-SURFACE-STRATEGY-SINK-WORKBENCH-SECTION-20260627',
    'query',
    'ResolveCanvasSurfaceStrategy',
    'may_update',
    true
  ),
  (
    'CANVAS-SURFACE-STRATEGY-SINK-WORKBENCH-SECTION-20260627',
    'query',
    'InspectCanvasNodeProperties',
    'may_update',
    true
  ),
  (
    'CANVAS-SURFACE-STRATEGY-SINK-WORKBENCH-SECTION-20260627',
    'path',
    'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'EV-WEB-CANVAS-DVT-SINK-WORKBENCH-SECTION',
  'web.component.canvas.NodeWorkbench',
  'test',
  'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts && pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
  'passing',
  jsonb_build_object(
    'task', 'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1',
    'scope', 'DVT sink workbench strategy maps to a dedicated Sink section; the passive read model projects destination/write policy; the component renders editable sink fields only in the Sink tab',
    'redGreenCycle', 'expected failure: sink was declared by dvtCanvasSurfaceStrategy but dropped by canvasNodeWorkbenchSectionStrategy and not represented by nodePropertiesReadModel'
  ),
  'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql',
  md5('EV-WEB-CANVAS-DVT-SINK-WORKBENCH-SECTION:348')
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
    'web.component.canvas.CanvasSurfaceStrategy',
    'apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts',
    'contract',
    'CanvasNodeWorkbenchSectionPolicyId',
    jsonb_build_object(
      'role', 'Canvas surface strategy vocabulary',
      'responsibility', 'types the allowed contextual node-workbench section names so DBT/DVT strategies cannot drift through arbitrary strings',
      'rail', 'ResolveCanvasSurfaceStrategy'
    ),
    'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql',
    md5('canvasSurfaceStrategyContracts#CanvasNodeWorkbenchSectionPolicyId:348')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
    'presenter',
    'resolveNodeWorkbenchPrimarySectionIds',
    jsonb_build_object(
      'role', 'Surface strategy to Node Workbench section translator',
      'responsibility', 'maps product strategy sections such as sink/sql/tests into passive node property sections without route-level ad hoc branching',
      'rail', 'ResolveCanvasSurfaceStrategy'
    ),
    'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql',
    md5('canvasNodeWorkbenchSectionStrategy#sink:348')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'read-model',
    'buildNodePropertiesReadModel',
    jsonb_build_object(
      'role', 'Node Workbench passive properties read model',
      'responsibility', 'exposes a dedicated Sink section for DVT destination target, materialization, write mode and partition strategy',
      'rail', 'InspectCanvasNodeProperties',
      'privateSymbols', jsonb_build_array('buildSinkRows')
    ),
    'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql',
    md5('nodePropertiesReadModel#buildSinkRows:348')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'view',
    'CanvasNodeWorkbenchPanel',
    jsonb_build_object(
      'role', 'Contextual Node Workbench panel',
      'responsibility', 'renders section-owned authoring slots, including DVT Sink, through the shared NodePropertiesTabs presentation component',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql',
    md5('CanvasNodeWorkbenchPanel#sink-slot:348')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

with patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts',
      'apps/web/src/app/plugins/dbt/dbtCanvasSurfaceStrategy.ts',
      'apps/web/src/app/plugins/dvt/dvtCanvasSurfaceStrategy.ts',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
      'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts#CanvasNodeWorkbenchSectionPolicyId',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts#resolveNodeWorkbenchPrimarySectionIds',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildSinkRows',
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildNodePropertiesReadModel',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanel',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx#DvtAuthoringFields',
      'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx#CanvasInspectorAuthoringSection',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx#DVT_SINK_NODE'
    ) as symbol_refs,
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts src/app/components/inspector/nodePropertiesReadModel.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'pnpm docs:feature-mechanization:implementation'
    ) as guards
),
target_rails as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where (
      rail.feature_id = 'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1'
      and rail.normalized_rail_name = 'resolvecanvassurfacestrategy'
    )
    or (
      rail.feature_id = 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604'
      and rail.normalized_rail_name = 'inspectcanvasnodeproperties'
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
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.allowed_implementation_surfaces, '[]'::jsonb)) = 'array'
          then coalesce(target_rails.allowed_implementation_surfaces, '[]'::jsonb)
        else '[]'::jsonb
      end
    )
    union
    select value
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)) = 'array'
          then coalesce(target_rails.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
        else '[]'::jsonb
      end
    )
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
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.symbol_refs, '[]'::jsonb)) = 'array'
          then coalesce(target_rails.symbol_refs, '[]'::jsonb)
        else '[]'::jsonb
      end
    )
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
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.implementation_refs, '[]'::jsonb)) = 'array'
          then coalesce(target_rails.implementation_refs, '[]'::jsonb)
        else '[]'::jsonb
      end
    )
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
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.architecture_guards, '[]'::jsonb)) = 'array'
          then coalesce(target_rails.architecture_guards, '[]'::jsonb)
        else '[]'::jsonb
      end
    )
    union
    select value
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.raw_manifest->'architectureGuards', '[]'::jsonb)) = 'array'
          then coalesce(target_rails.raw_manifest->'architectureGuards', '[]'::jsonb)
        else '[]'::jsonb
      end
    )
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
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.completion_gate, '[]'::jsonb)) = 'array'
          then coalesce(target_rails.completion_gate, '[]'::jsonb)
        else '[]'::jsonb
      end
    )
    union
    select value
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(coalesce(target_rails.raw_manifest->'completionGate', '[]'::jsonb)) = 'array'
          then coalesce(target_rails.raw_manifest->'completionGate', '[]'::jsonb)
        else '[]'::jsonb
      end
    )
    union
    select value
    from jsonb_array_elements_text(patch.guards)
  ) refs
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
    '{implementationRefs}',
    merged_implementation_refs.value,
    true
  ),
  source_path = 'tools/planning-db/migrations/348_canvas_surface_strategy_sink_workbench_section.sql',
  source_content_sha256 = md5('CANVAS-SURFACE-STRATEGY-SINK-WORKBENCH-SECTION-20260627:348:' || rail.rail_id::text),
  revision = rail.revision + 1,
  updated_at = now()
from merged_allowed_surfaces
join merged_symbol_refs on merged_symbol_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_implementation_refs on merged_implementation_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_guards on merged_guards.rail_id = merged_allowed_surfaces.rail_id
join merged_completion_gate on merged_completion_gate.rail_id = merged_allowed_surfaces.rail_id
where rail.rail_id = merged_allowed_surfaces.rail_id;
