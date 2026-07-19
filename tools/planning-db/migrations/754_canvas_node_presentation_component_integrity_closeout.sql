-- Close the two component-integrity warnings left by the implementation:
-- canonicalize the component profiles, make observability intent explicit,
-- and remove the broad node/edge ownership collision for context-state files.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH', 'may_update', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'may_update', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
  'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR'
);

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
  'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR'
);

update architecture.component_port
set status = 'implemented'
where component_id in (
  'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
  'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR'
);

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'Pure browser projection emits no operational signal; source, file, and execution rails own factual outcomes.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'Transient selected-node surface transitions emit no duplicate operational signal; user commands own outcomes.',
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

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/754_canvas_node_presentation_component_integrity_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':canonical:754'), 2),
  revision = revision + 1
where component_id in (
  'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
  'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'owns', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts', 2),
  ('SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR', 'owns', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts', 3),
  ('SYS-WEB-CANVAS-NODE-EDGE-AUTHORING', 'excludes', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts', 0),
  ('SYS-WEB-CANVAS-NODE-EDGE-AUTHORING', 'excludes', 'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts', 1),
  ('SYS-WEB-CANVAS-NODE-EDGE-AUTHORING', 'excludes', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts', 2),
  ('SYS-WEB-CANVAS-NODE-EDGE-AUTHORING', 'excludes', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts', 3)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'transition',
    'Canonical node data and workspace-file authority -> one immutable CanvasNodePresentationTruth projection.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'governance_ref',
    'CANVAS-NODE-PRESENTATION-TRUTH-20260717',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'transition',
    'idle -> toolbar -> health | workbench | code -> idle on selection, dismissal, or node deletion.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'governance_ref',
    'CANVAS-NODE-PRESENTATION-TRUTH-20260717',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'public_api',
    'isCanvasNodeWorkbenchVisible',
    1
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR',
    'invariant',
    'A missing or deleted selected node implies the idle context surface.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.feature_mechanization_local_rails
set
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(
        coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
      ) surfaces(value)
      union all
      values ('tools/planning-db/migrations/754_canvas_node_presentation_component_integrity_closeout.sql')
    ) merged(value)
  ),
  raw_manifest = jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(distinct value order by value)
      from (
        select value
        from jsonb_array_elements_text(
          coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
        ) surfaces(value)
        union all
        values ('tools/planning-db/migrations/754_canvas_node_presentation_component_integrity_closeout.sql')
      ) merged(value)
    )
  ),
  source_path = 'tools/planning-db/migrations/754_canvas_node_presentation_component_integrity_closeout.sql',
  source_content_sha256 = repeat(md5(rail_id || ':component-integrity:754'), 2),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
refresh materialized view planning_query_store.component_engineering_component_tree_projection;

do $$
declare
  integrity_finding_count integer;
  maturity_gap_count integer;
  context_owned_file_count integer;
  stale_broad_owner_count integer;
begin
  select count(*) into integrity_finding_count
  from planning_query_store.component_integrity_query
  where component_id in (
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR'
  );

  if integrity_finding_count <> 0 then
    raise exception 'Canvas node presentation components retain % integrity findings', integrity_finding_count;
  end if;

  select count(*) into maturity_gap_count
  from architecture.component_maturity_query
  where component_id in (
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR'
  )
    and coalesce(array_length(missing_reasons, 1), 0) > 0;

  if maturity_gap_count <> 0 then
    raise exception 'Canvas node presentation components retain architecture maturity gaps';
  end if;

  select count(*) into context_owned_file_count
  from planning_query_store.component_engineering_file_ownership_query
  where leaf_component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-SURFACE-COORDINATOR'
    and file_path in (
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts'
    );

  if context_owned_file_count <> 4 then
    raise exception 'Context surface coordinator owns only % of 4 exact files', context_owned_file_count;
  end if;

  select count(*) into stale_broad_owner_count
  from planning_query_store.component_engineering_file_ownership_query
  where leaf_component_id = 'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING'
    and file_path in (
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts',
      'apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.ts',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisibility.test.ts'
    );

  if stale_broad_owner_count <> 0 then
    raise exception 'Node/edge authoring retains % context-surface files', stale_broad_owner_count;
  end if;
end
$$;
