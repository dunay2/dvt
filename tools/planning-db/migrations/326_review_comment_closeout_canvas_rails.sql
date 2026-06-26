-- Close actionable review feedback from the Canvas DB-first slices without
-- relying on resolved GitHub thread state as planning truth.

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
  'CANVAS-REVIEW-COMMENT-CLOSEOUT-RAIL-ALIGNMENT-20260626',
  'E-CANVAS-UX-DBFIRST-MAP-1',
  'Canvas review comment closeout rail alignment',
  'Governance / Planning DB',
  'implemented',
  'Review feedback identified two DB-first read-model drifts: duplicate canonical command/query rail sources were hidden by same-owner counting, and AuthorCanvasGraphEdge local overlays could be rebuilt from imported rails instead of the active DB-local rail. The fix keeps canonical duplicates visible while preserving local feature overlays as the active authority.',
  'hidden_authority',
  'ListCanvasCqRailVocabularyNormalization',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

create or replace view planning_query_store.command_query_rail_query as
with manifest_rails as (
  select
    rail.*,
    rail.rail_type || ':' || rail.normalized_rail_name || ':' || coalesce(nullif(rail.ddd_owner, ''), '-') as canonical_declaration_key,
    case
      when rail.source_path like 'docs/archive/%' then 5
      when rail.rail_source = 'local' then 0
      when rail.feature_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG' then 1
      when rail.source_path like 'docs/architecture/components/%command-query-catalog.md' then 1
      when rail.source_path like 'docs/architecture/components/%' then 2
      when rail.mechanization_status in ('implemented', 'closed') then 3
      else 4
    end as authority_priority
  from planning_query_store.command_query_rail_manifest_query rail
),
rail_group as (
  select
    rail_type,
    normalized_rail_name,
    bool_or(
      lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
      and not is_gap
    ) as has_active_non_gap,
    bool_or(
      rail_source = 'local'
      and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
      and not is_gap
    ) as has_active_local_non_gap
  from manifest_rails
  group by rail_type, normalized_rail_name
),
reference_rollup as materialized (
  select
    rail.rail_type,
    rail.normalized_rail_name,
    count(*)::int as reference_count,
    count(distinct case
      when rail.rail_source = 'local' then rail.canonical_declaration_key
      else rail.canonical_declaration_key || ':' || rail.rail_id
    end) filter (
      where rail.authority_priority <= 2
        and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
        and not (rail_group.has_active_non_gap and rail.is_gap)
        and not (rail_group.has_active_local_non_gap and rail.rail_source <> 'local')
    )::int as canonical_candidate_count,
    jsonb_agg(distinct rail.feature_id order by rail.feature_id) as related_feature_ids,
    jsonb_agg(distinct rail.source_path order by rail.source_path) as related_source_paths
  from manifest_rails rail
  join rail_group
    on rail_group.rail_type = rail.rail_type
   and rail_group.normalized_rail_name = rail.normalized_rail_name
  group by rail.rail_type, rail.normalized_rail_name
),
ranked_canonical_rails as (
  select
    rail.*,
    row_number() over (
      partition by rail.rail_type, rail.normalized_rail_name
      order by
        case
          when not rail_group.has_active_non_gap
            and rail.rail_source = 'local'
            and lower(coalesce(rail.rail_status, '')) in ('deprecated', 'retired')
            then 0
          when lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            and not rail.is_gap
            then 1
          when rail.rail_source = 'local'
            and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            then 2
          when lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            then 3
          else 4
        end,
        case when rail.rail_source = 'local' then 0 else 1 end,
        rail.is_gap,
        rail.authority_priority,
        rail.implementation_ref_count desc,
        rail.documentation_ref_count desc,
        rail.imported_at desc,
        rail.rail_id
    ) as canonical_rank
  from manifest_rails rail
  join rail_group
    on rail_group.rail_type = rail.rail_type
   and rail_group.normalized_rail_name = rail.normalized_rail_name
)
select
  rail.rail_id,
  rail.feature_id,
  rail.mechanization_status,
  rail.rail_name,
  rail.normalized_rail_name,
  rail.rail_type,
  rail.ddd_owner,
  rail.rail_status,
  rail.symbol_refs,
  rail.implementation_refs,
  rail.documentation_refs,
  rail.implementation_ref_count,
  rail.documentation_ref_count,
  rail.governing_sources,
  rail.allowed_implementation_surfaces,
  rail.architecture_guards,
  rail.completion_gate,
  rail.is_gap,
  rollup.reference_count,
  rollup.canonical_candidate_count as duplicate_count,
  rollup.canonical_candidate_count > 1 as is_duplicate,
  rollup.related_feature_ids,
  rollup.related_source_paths,
  rail.source_path,
  rail.source_content_sha256,
  rail.raw_rail,
  rail.raw_manifest,
  rail.rail_source,
  rail.imported_at
from ranked_canonical_rails rail
join reference_rollup rollup
  on rollup.rail_type = rail.rail_type
 and rollup.normalized_rail_name = rail.normalized_rail_name
where rail.canonical_rank = 1;

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
  select * from existing_local_target_rail
  union all
  select *
  from imported_target_rail
  where not exists (select 1 from existing_local_target_rail)
),
patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasConnectionAggregate.ts',
      'apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts',
      'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'AUTHORING_ROLE_TARGETS',
      'canConnectAuthoringRoles',
      'CONNECTION_RULES',
      'canConnectNodeRoles'
    ) as retired_symbol_names,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'rejectCrossPluginIncomingInputEdge',
        'path', 'apps/web/src/app/views/canvas/canvasConnectionAggregate.ts',
        'dddOwner', 'CanvasConnectionAggregate',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy', 'Guard Clause'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasConnectionAggregate.test.ts',
        'cypressCoverage', 'N/A - pure aggregate policy',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts'),
        'sourceKind', 'manifest_symbol'
      )
    ) as symbols
),
merged_allowed_surfaces as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value
    from patch, jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
),
merged_symbols as (
  select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from (
    select symbol
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
    where not exists (
      select 1
      from patch, jsonb_array_elements_text(patch.retired_symbol_names) retired(name)
      where retired.name = symbol->>'name'
    )
    union all
    select symbol
    from patch, jsonb_array_elements(patch.symbols) symbols(symbol)
  ) all_symbols
),
merged_implementation_refs as (
  select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from (
    select symbol
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.implementation_refs, '[]'::jsonb)) symbols(symbol)
    where not exists (
      select 1
      from patch, jsonb_array_elements_text(patch.retired_symbol_names) retired(name)
      where retired.name = symbol->>'name'
    )
    union all
    select symbol
    from patch, jsonb_array_elements(patch.symbols) symbols(symbol)
    union all
    select jsonb_build_object(
      'name', 'Canvas review comment closeout rail alignment',
      'path', 'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql',
      'sourceKind', 'planning_db_overlay'
    )
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
  merged_symbols.value,
  merged_implementation_refs.value,
  target_rail.documentation_refs,
  target_rail.governing_sources,
  merged_allowed_surfaces.value,
  target_rail.architecture_guards,
  target_rail.completion_gate,
  'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql',
  repeat('7', 64),
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
cross join merged_symbols
cross join merged_implementation_refs
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
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

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#003#getworkspacegraphdraft'
),
patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#BuildDvtTransformColumnOptionsArgs',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#DvtTransformColumn',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#DvtTransformColumnOption',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#buildDvtTransformColumnOptions',
      'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts#readDvtSelectedColumnRefs'
    ) as symbol_refs,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'buildDvtTransformColumnOptions',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench',
        'cqRails', jsonb_build_array('GetWorkspaceGraphDraft', 'InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'N/A - read model',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'readDvtSelectedColumnRefs',
        'path', 'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
        'dddOwner', 'CanvasNodeWorkbench selected-column reader',
        'cqRails', jsonb_build_array('GetWorkspaceGraphDraft', 'InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'N/A - read model',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts')
      )
    ) as symbols
),
merged_allowed_surfaces as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value from patch, jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
),
merged_symbol_refs as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.symbol_refs, '[]'::jsonb))
    union
    select value from patch, jsonb_array_elements_text(patch.symbol_refs)
  ) refs
),
merged_implementation_refs as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.implementation_refs, '[]'::jsonb))
    union
    select value from patch, jsonb_array_elements_text(patch.symbol_refs)
  ) refs
),
merged_symbols as (
  select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from (
    select symbol
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
    union all
    select symbol
    from patch, jsonb_array_elements(patch.symbols) symbols(symbol)
  ) all_symbols
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged_symbol_refs.value,
  implementation_refs = merged_implementation_refs.value,
  allowed_implementation_surfaces = merged_allowed_surfaces.value,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{allowedImplementationSurfaces}',
      merged_allowed_surfaces.value,
      true
    ),
    '{symbols}',
    merged_symbols.value,
    true
  ),
  source_path = 'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql',
  source_content_sha256 = repeat('8', 64),
  revision = rail.revision + 1,
  updated_at = now()
from target_rail
cross join merged_allowed_surfaces
cross join merged_symbol_refs
cross join merged_implementation_refs
cross join merged_symbols
where rail.rail_id = target_rail.rail_id;

with patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#isNearPosition'
    ) as symbol_refs,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('Guard Clause', 'Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'unitTests',
          jsonb_build_array('apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx')
      ),
      jsonb_build_object(
        'name', 'isNearPosition',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'CanvasContextMenuReadModel',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('Extract Function', 'Guard Clause'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'unitTests',
          jsonb_build_array('apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx')
      )
    ) as symbols
),
target_rails as (
  select rail_id
  from planning_query_store.feature_mechanization_local_rails
  where normalized_rail_name = 'resolvecanvascontextmenu'
    and raw_manifest ? 'featureId'
),
merged as (
  select
    rail.rail_id,
    (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb))
        union
        select value
        from patch, jsonb_array_elements_text(patch.allowed_surfaces)
      ) refs
    ) as allowed_surfaces,
    (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb))
        union
        select value
        from patch, jsonb_array_elements_text(patch.symbol_refs)
      ) refs
    ) as symbol_refs,
    (
      select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb))
        union
        select value
        from patch, jsonb_array_elements_text(patch.allowed_surfaces)
        union
        select value
        from patch, jsonb_array_elements_text(patch.symbol_refs)
      ) refs
    ) as implementation_refs,
    (
      select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb)
      from (
        select distinct symbol
        from (
          select symbol
          from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
          union all
          select symbol
          from patch, jsonb_array_elements(patch.symbols) symbols(symbol)
        ) all_symbols
      ) distinct_symbols
    ) as symbols
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rails on target_rails.rail_id = rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = merged.allowed_surfaces,
  symbol_refs = merged.symbol_refs,
  implementation_refs = merged.implementation_refs,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{allowedImplementationSurfaces}',
      merged.allowed_surfaces,
      true
    ),
    '{symbols}',
    merged.symbols,
    true
  ),
  source_path = 'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql',
  source_content_sha256 = repeat('9', 64),
  revision = rail.revision + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;

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
  where source_path =
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-tabs-placement-design-plan-20260503.md'
    and feature_id = 'CANVAS-WORKBENCH-TABS-PLACEMENT'
    and rail_name = 'ResolveCanvasWorkbenchContext'
  order by imported_at desc
  limit 1
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
  where rail_id in (select rail_id from imported_target_rail)
),
target_rail as (
  select * from existing_local_target_rail
  union all
  select *
  from imported_target_rail
  where not exists (select 1 from existing_local_target_rail)
),
patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/bootstrap/usePublishedRouteBootstrap.ts',
      'apps/web/src/app/views/CodeView.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
    ) as guards
),
merged_allowed_surfaces as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value from patch, jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
),
merged_implementation_refs as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.implementation_refs, '[]'::jsonb))
    union
    select value from patch, jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
),
merged_architecture_guards as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.architecture_guards, '[]'::jsonb))
    union
    select value from patch, jsonb_array_elements_text(patch.guards)
  ) refs
),
merged_completion_gate as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.completion_gate, '[]'::jsonb))
    union
    select value from patch, jsonb_array_elements_text(patch.guards)
  ) refs
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
  merged_architecture_guards.value,
  merged_completion_gate.value,
  'tools/planning-db/migrations/326_review_comment_closeout_canvas_rails.sql',
  repeat('a', 64),
  target_rail.raw_rail,
  jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(target_rail.raw_manifest, '{}'::jsonb),
        '{allowedImplementationSurfaces}',
        merged_allowed_surfaces.value,
        true
      ),
      '{architectureGuards}',
      merged_architecture_guards.value,
      true
    ),
    '{completionGate}',
    merged_completion_gate.value,
    true
  ),
  0,
  'codex',
  now(),
  now()
from target_rail
cross join merged_allowed_surfaces
cross join merged_implementation_refs
cross join merged_architecture_guards
cross join merged_completion_gate
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
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
