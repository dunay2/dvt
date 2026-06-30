-- Register CanvasAddNodeCatalog as its own feature-mechanized local rail.
-- Migration 362 owns component inventory; this migration owns the implementation
-- manifest because the presenter SRP manifest is intentionally retired.

with add_catalog_symbols as (
  select *
  from (
    values
      (
        'CanvasAddNodeCatalogView',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CanvasAddNodeCatalogViewProps',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATALOG_EMPTY_CLASS_NAME',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATALOG_HEADER_CLASS_NAME',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATALOG_ITEM_CATEGORY_CLASS_NAME',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATALOG_ITEM_DESCRIPTION_CLASS_NAME',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATALOG_ITEM_META_CLASS_NAME',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATALOG_SEARCH_CLASS_NAME',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATALOG_TITLE_CLASS_NAME',
        'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'BuildCanvasAddNodeCatalogItemsArgs',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CATEGORY_ORDER',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CanvasAddNodeCatalogCategory',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'CanvasAddNodeCatalogItem',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'buildCanvasAddNodeCatalogItems',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'categoryIndex',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'filterCanvasAddNodeCatalogItems',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'inferCanvasAddNodeCatalogCategory',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'resolveCanvasAddNodeCatalogActionLabel',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'resolveCanvasAddNodeCatalogCategoryLabel',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      ),
      (
        'resolveCanvasAddNodeCatalogDescription',
        'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
        jsonb_build_array('ResolveCanvasAddNodeCatalog'),
        'web.component.canvas.CanvasAddNodeCatalog'
      )
  ) as row(symbol_name, symbol_path, cq_rails, ddd_owner)
),
add_catalog_symbol_manifest as (
  select
    jsonb_agg(symbol_path || '#' || symbol_name order by symbol_path, symbol_name) as symbol_refs,
    jsonb_agg(
      jsonb_build_object(
        'name', symbol_name,
        'path', symbol_path,
        'cqRails', cq_rails,
        'dddOwner', ddd_owner,
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx'
        ),
        'fowlerSignals', jsonb_build_array(
          'separate_presentation_from_policy',
          'extract_component',
          'replace_flat_catalog_with_query_model'
        ),
        'cypressCoverage', 'pending:browser_evidence_after_component_green',
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
      )
      order by symbol_path, symbol_name
    ) as symbols
  from add_catalog_symbols
),
add_catalog_surfaces as (
  select jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
    'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
    'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
    'docs/superpowers/plans/2026-06-28-canvas-context-menu-qa-backlog.md',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/363_canvas_add_node_catalog_feature_manifest.sql'
  ) as surfaces
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
  created_by
)
select
  'local#CANVAS-ADD-NODE-CATALOG-20260628#query#resolvecanvasaddnodecatalog',
  'CANVAS-ADD-NODE-CATALOG-20260628',
  'implemented',
  'ResolveCanvasAddNodeCatalog',
  'resolvecanvasaddnodecatalog',
  'query',
  'web.component.canvas.CanvasAddNodeCatalog',
  'implemented',
  add_catalog_symbol_manifest.symbol_refs,
  add_catalog_surfaces.surfaces,
  jsonb_build_array('docs/superpowers/plans/2026-06-28-canvas-context-menu-qa-backlog.md'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  add_catalog_surfaces.surfaces,
  jsonb_build_array(
    'node --test --test-name-pattern "Canvas add-node catalog" scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
    'pnpm --filter @dvt/web typecheck',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/363_canvas_add_node_catalog_feature_manifest.sql',
  md5('CANVAS-ADD-NODE-CATALOG-20260628:ResolveCanvasAddNodeCatalog:363'),
  jsonb_build_object(
    'name', 'ResolveCanvasAddNodeCatalog',
    'type', 'query',
    'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CANVAS-ADD-NODE-CATALOG-20260628',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Promote CanvasAddNodeCatalog to an owned searchable categorized catalog component launched from Add... on the Canvas background menu.',
    'componentGuides', jsonb_build_array(
      'planning-db:component/web.component.canvas.CanvasAddNodeCatalog'
    ),
    'userStories', jsonb_build_array(
      'As a Canvas user, I can open Add... and search categorized node components instead of reading an unbounded flat root menu.',
      'As a maintainer, I can query the DB for the model, view, tests, and rail that own Canvas add-node catalog behavior.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', add_catalog_surfaces.surfaces,
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'buzon/**#primary-specification',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveCanvasAddNodeCatalog',
        'type', 'query',
        'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'CreateCanvasAuthoringNode',
        'type', 'command',
        'dddOwner', 'Canvas authoring aggregate',
        'status', 'implemented',
        'relationship', 'catalog selection delegates final creation'
      )
    ),
    'domainObjects', jsonb_build_array(
      'CanvasAddNodeCatalogModel',
      'CanvasAddNodeCatalogItem',
      'CanvasAddNodeCatalogView'
    ),
    'symbols', add_catalog_symbol_manifest.symbols,
    'fowlerSignals', jsonb_build_array(
      'separate_presentation_from_policy',
      'extract_component',
      'replace_flat_catalog_with_query_model'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('pending:browser_evidence_after_component_green'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  1,
  'codex'
from add_catalog_symbol_manifest
cross join add_catalog_surfaces
on conflict (rail_id) do update set
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
  revision = excluded.revision,
  updated_at = now();
