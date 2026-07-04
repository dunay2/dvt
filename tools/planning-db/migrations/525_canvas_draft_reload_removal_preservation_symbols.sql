-- Reconcile helper symbols introduced by the remote-draft reload removal guard.
-- The existing command rail remains authoritative; this only extends its symbol evidence.

with symbol_patch(symbol_ref, symbol) as (
  values
    (
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#draftEdgeSignature',
      jsonb_build_object(
        'name', 'draftEdgeSignature',
        'path', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
        'dddOwner', 'CanvasDraftSessionMachine',
        'cqRails', jsonb_build_array('AdoptExternalCanvasDraftRevision'),
        'fowlerSignals', jsonb_build_array('merge_policy', 'graph_edge_identity'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasDraftSession.test.ts')
      )
    ),
    (
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#readBaselineWorkingSet',
      jsonb_build_object(
        'name', 'readBaselineWorkingSet',
        'path', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
        'dddOwner', 'CanvasDraftSessionMachine',
        'cqRails', jsonb_build_array('AdoptExternalCanvasDraftRevision'),
        'fowlerSignals', jsonb_build_array('merge_policy', 'local_removal_preservation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasDraftSession.test.ts')
      )
    )
),
target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-CANVAS-WORKFLOW-E2E-USABILITY-20260601#command#adoptexternalcanvasdraftrevision'
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
        || (select jsonb_agg(symbol_ref) from symbol_patch)
      ) as item(value)
    ) as symbol_refs,
    (
      select coalesce(jsonb_agg(existing.symbol order by existing.ordinal), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as existing(symbol, ordinal)
      where not exists (
        select 1
        from symbol_patch patch
        where patch.symbol->>'name' = existing.symbol->>'name'
          and patch.symbol->>'path' = existing.symbol->>'path'
      )
    ) || (select jsonb_agg(symbol) from symbol_patch) as symbols,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
          'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
          'tools/planning-db/migrations/525_canvas_draft_reload_removal_preservation_symbols.sql'
        )
      ) as item(value)
    ) as allowed_surfaces
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(coalesce(rail.raw_manifest, '{}'::jsonb), '{symbols}', merged.symbols, true),
    '{allowedImplementationSurfaces}',
    merged.allowed_surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/525_canvas_draft_reload_removal_preservation_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-WORKFLOW-E2E-USABILITY-20260601:local-removal-preservation:525'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
