-- Register the visible-draft plugin port-map policy on the existing
-- AuthorCanvasGraphEdge rail. Runtime capabilities gate add/import surfaces;
-- they must not remove port semantics from already-visible draft nodes.

with imported_target_rail as (
  select
    rail_id,
    feature_id,
    mechanization_status,
    rail_name,
    normalized_rail_name,
    rail_type,
    ddd_owner,
    rail_status,
    symbol_refs,
    implementation_refs,
    documentation_refs,
    governing_sources,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    source_path,
    source_content_sha256,
    raw_rail,
    raw_manifest
  from planning_query_store.command_query_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md#CANVAS-AUTHORING-GRAPH-LAB-20260603#command#001#authorcanvasgraphedge'
),
existing_local_target_rail as (
  select
    rail_id,
    feature_id,
    mechanization_status,
    rail_name,
    normalized_rail_name,
    rail_type,
    ddd_owner,
    rail_status,
    symbol_refs,
    implementation_refs,
    documentation_refs,
    governing_sources,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    source_path,
    source_content_sha256,
    raw_rail,
    raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md#CANVAS-AUTHORING-GRAPH-LAB-20260603#command#001#authorcanvasgraphedge'
),
target_rail as (
  select *
  from existing_local_target_rail
  union all
  select *
  from imported_target_rail
  where not exists (select 1 from existing_local_target_rail)
),
patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts',
      'apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx',
      'tools/planning-db/migrations/397_visible_draft_plugin_port_map_authoring.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'resolveVisibleDraftPluginPortMap',
        'path', 'apps/web/src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts',
        'dddOwner', 'CanvasNodeEdgeAuthoring',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy', 'Published Interface'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx',
        'cypressCoverage', 'N/A - edge authoring policy is covered by the hook contract test',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx'
        ),
        'sourceKind', 'manifest_symbol',
        'policy',
          'Visible draft nodes keep static plugin port semantics for edge authoring even when runtime capabilities hide add/import surfaces.'
      )
    ) as implementation_refs
),
merged_allowed_surfaces as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value
    from patch,
      jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
),
merged_implementation_refs as (
  select coalesce(jsonb_agg(ref order by ref->>'path', ref->>'name'), '[]'::jsonb) as value
  from (
    select ref
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.implementation_refs, '[]'::jsonb)) refs(ref)
    union all
    select ref
    from patch,
      jsonb_array_elements(patch.implementation_refs) refs(ref)
    union all
    select jsonb_build_object(
      'name', 'Visible draft plugin port-map manifest',
      'path', 'tools/planning-db/migrations/397_visible_draft_plugin_port_map_authoring.sql',
      'sourceKind', 'planning_db_overlay'
    )
  ) all_refs
),
merged_symbols as (
  select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from (
    select symbol
      || case
        when symbol ? 'architectureGuard' then '{}'::jsonb
        else jsonb_build_object(
          'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx'
        )
      end
      || case
        when symbol ? 'cypressCoverage' then '{}'::jsonb
        else jsonb_build_object('cypressCoverage', 'N/A - hook policy contract')
      end as symbol
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
    union all
    select ref as symbol
    from patch,
      jsonb_array_elements(patch.implementation_refs) refs(ref)
  ) all_symbols
)
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by,
  created_at,
  updated_at
)
select
  target_rail.rail_id,
  target_rail.feature_id,
  target_rail.mechanization_status,
  target_rail.rail_name,
  target_rail.normalized_rail_name,
  target_rail.rail_type,
  target_rail.ddd_owner,
  'implemented',
  target_rail.symbol_refs,
  merged_implementation_refs.value,
  target_rail.documentation_refs,
  target_rail.governing_sources,
  merged_allowed_surfaces.value,
  target_rail.architecture_guards,
  target_rail.completion_gate,
  'tools/planning-db/migrations/397_visible_draft_plugin_port_map_authoring.sql',
  md5('AuthorCanvasGraphEdge:visible-draft-plugin-port-map:397'),
  target_rail.raw_rail,
  jsonb_set(
    jsonb_set(
      coalesce(target_rail.raw_manifest, '{}'::jsonb),
      '{allowedImplementationSurfaces}',
      merged_allowed_surfaces.value,
      true
    ),
    '{symbols}',
    merged_symbols.value,
    true
  ),
  0,
  'codex',
  now(),
  now()
from target_rail
cross join merged_allowed_surfaces
cross join merged_implementation_refs
cross join merged_symbols
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision),
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
    'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
    'apps/web/src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts',
    'hook',
    'useCanvasEdgeAuthoringHandlers',
    jsonb_build_object(
      'role', 'edge authoring gesture handler and visible-draft plugin port-map policy',
      'rail', 'AuthorCanvasGraphEdge',
      'ownedPolicies', jsonb_build_array('resolveVisibleDraftPluginPortMap')
    ),
    'tools/planning-db/migrations/397_visible_draft_plugin_port_map_authoring.sql',
    md5('useCanvasEdgeAuthoringHandlers.ts:397')
  ),
  (
    'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'visible draft source nodes retain plugin ports for DBT model edge authoring',
      'rail', 'AuthorCanvasGraphEdge',
      'regression', 'runtime capability filtering must not remove ports from visible draft nodes'
    ),
    'tools/planning-db/migrations/397_visible_draft_plugin_port_map_authoring.sql',
    md5('useCanvasGraphHandlers.edgeAuthoring.test.tsx:397')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
  'AuthorCanvasGraphEdge',
  'command',
  'implemented',
  jsonb_build_object(
    'scope', 'Canvas edge authoring between visible draft nodes',
    'applicationPort', 'useCanvasEdgeAuthoringHandlers.onConnect',
    'adapterSurface', 'React Flow onConnect gesture',
    'negativeTests', jsonb_build_array('missing plugin bridge still rejects unknown plugin pairs'),
    'positiveTests', jsonb_build_array('visible dvt.warehouse-source draft node connects to dbt:model')
  ),
  'tools/planning-db/migrations/397_visible_draft_plugin_port_map_authoring.sql',
  md5('SYS-WEB-CANVAS-NODE-EDGE-AUTHORING:AuthorCanvasGraphEdge:397')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = coalesce(planning_query_store.frontend_component_local_cq_rails.raw_rail, '{}'::jsonb)
    || excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
  'EV-WEB-CANVAS-EDGE-AUTHORING-VISIBLE-DRAFT-PORTS',
  'unit-test',
  'current',
  'apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx',
  'AuthorCanvasGraphEdge',
  'visible-draft-plugin-ports',
  'A visible dvt.warehouse-source draft node can propose an edge to a dbt:model even when runtime capabilities omit the source-import plugin.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx',
    'redGreen', 'red before resolveVisibleDraftPluginPortMap, green after static visible-node port fallback'
  ),
  'tools/planning-db/migrations/397_visible_draft_plugin_port_map_authoring.sql',
  md5('EV-WEB-CANVAS-EDGE-AUTHORING-VISIBLE-DRAFT-PORTS:397')
)
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
