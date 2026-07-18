-- Replace accumulated NodeWorkbench/Panel declarations with one clean query
-- rail owned by the passive NodePropertiesReadModel. Historical declarations
-- remain as retired evidence and cannot compete with the canonical intent.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'status', 'retired',
    'canonicalReplacementRailId', 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#inspectcanvasnodeproperties',
    'retirementReason', 'CanvasNodeWorkbenchPanel is an adapter surface; NodePropertiesReadModel owns the query intent.'
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'mechanizationStatus', 'closed',
    'noHumanDecisionsRemaining', true,
    'canonicalReplacementRailId', 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#inspectcanvasnodeproperties'
  ),
  source_path = 'tools/planning-db/migrations/748_inspect_canvas_node_properties_rail_reconcile.sql',
  source_content_sha256 = repeat(md5(rail_id || ':retired-by-748'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_type = 'query'
  and normalized_rail_name = 'inspectcanvasnodeproperties'
  and rail_id <> 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#inspectcanvasnodeproperties'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
values (
  'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#inspectcanvasnodeproperties',
  'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
  'implemented',
  'InspectCanvasNodeProperties',
  'inspectcanvasnodeproperties',
  'query',
  'NodePropertiesReadModel',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#NodePropertiesReadModel',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildNodePropertiesReadModel'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.ts',
    'apps/web/src/app/components/inspector/dbtTestRowsReadModel.test.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.ts',
    'apps/web/src/app/components/inspector/dvtTransformColumnModel.test.ts',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'tools/planning-db/migrations/748_inspect_canvas_node_properties_rail_reconcile.sql'
  ),
  jsonb_build_array(
    'pnpm test:planning:db:migrations',
    'pnpm planning:db:integrity:check',
    'pnpm --filter @dvt/web test:canvas-unit:run'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web lint',
    'pnpm --filter @dvt/web typecheck',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/748_inspect_canvas_node_properties_rail_reconcile.sql',
  repeat(md5('InspectCanvasNodeProperties:NodePropertiesReadModel:748'), 2),
  jsonb_build_object(
    'name', 'InspectCanvasNodeProperties',
    'type', 'query',
    'boundedContext', 'Canvas selected-node inspection',
    'dddObject', 'NodePropertiesReadModel',
    'applicationPort', 'buildNodePropertiesReadModel',
    'adapterSurface', 'CanvasNodeWorkbenchPanel;NodePropertiesTabs',
    'scopeAndAuthorization', 'one selected node from an already-authorized visible Canvas graph',
    'negativeTests', jsonb_build_array(
      'do not fabricate absent node metadata',
      'do not mutate graph or workspace state',
      'do not render JSX inside the read model',
      'do not make the panel the semantic owner'
    )
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Keep one passive NodePropertiesReadModel query rail and treat CanvasNodeWorkbenchPanel and NodePropertiesTabs as adapter and presentation consumers.',
    'componentGuides', jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
    ),
    'userStories', jsonb_build_array(
      'A selected node exposes one coherent property projection regardless of the rendering surface.',
      'The workbench cannot redefine column, code, test, or metric facts independently of the read model.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'InspectCanvasNodeProperties',
        'type', 'query',
        'dddOwner', 'NodePropertiesReadModel',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array('NodePropertiesReadModel'),
    'fowlerSignals', jsonb_build_array('separated interface', 'presentation model', 'single responsibility'),
    'forbiddenImplementationSurfaces', jsonb_build_array('buzon/**', 'apps/web/cypress/fixtures/**')
  ),
  0,
  'codex'
)
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  created_by = excluded.created_by,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'canonicalRailId', 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#inspectcanvasnodeproperties',
    'canonicalOwner', 'NodePropertiesReadModel',
    'participationOnly', component_id <> 'web.component.canvas.NodePropertiesReadModel'
  ),
  source_path = 'tools/planning-db/migrations/748_inspect_canvas_node_properties_rail_reconcile.sql',
  source_content_sha256 = md5(component_id || ':InspectCanvasNodeProperties:748'),
  updated_at = now()
where rail_name = 'InspectCanvasNodeProperties';

do $$
declare
  active_count integer;
  projected_count integer;
  projected_duplicate boolean;
begin
  select count(*) into active_count
  from planning_query_store.feature_mechanization_local_rails
  where rail_type = 'query'
    and normalized_rail_name = 'inspectcanvasnodeproperties'
    and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

  if active_count <> 1 then
    raise exception 'Expected one active InspectCanvasNodeProperties query rail, found %', active_count;
  end if;

  if not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where rail_id = 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#inspectcanvasnodeproperties'
      and ddd_owner = 'NodePropertiesReadModel'
      and rail_status = 'implemented'
      and jsonb_array_length(symbol_refs) = 2
  ) then
    raise exception 'Canonical InspectCanvasNodeProperties rail is missing or polluted';
  end if;

  select count(*), bool_or(is_duplicate)
  into projected_count, projected_duplicate
  from planning_query_store.command_query_rail_query
  where rail_type = 'query'
    and normalized_rail_name = 'inspectcanvasnodeproperties';

  if projected_count <> 1 or coalesce(projected_duplicate, false) then
    raise exception 'InspectCanvasNodeProperties query projection remains duplicated';
  end if;
end
$$;
