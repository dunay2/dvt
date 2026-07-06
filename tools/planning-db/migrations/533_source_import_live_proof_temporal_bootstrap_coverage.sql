-- Register the Source Import live proof Temporal bootstrap seam and its
-- dedicated runner test. This keeps the live proof DB-first and makes the
-- local Temporal binary dependency explicit for offline validation.

with symbol_patch(symbol_ref, symbol) as (
  values
    (
      'scripts/run-canvas-source-import-live-proof.cjs#buildTemporalTimeSkippingOptions',
      jsonb_build_object(
        'name', 'buildTemporalTimeSkippingOptions',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportLiveProofRunner',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('environment_boundary', 'test_server_bootstrap'),
        'architectureGuard', 'scripts/run-canvas-source-import-live-proof.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array(
          'node --test scripts/run-canvas-source-import-live-proof.test.cjs'
        )
      )
    ),
    (
      'scripts/run-canvas-source-import-live-proof.cjs#createTemporalEnvironment',
      jsonb_build_object(
        'name', 'createTemporalEnvironment',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportLiveProofRunner',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('environment_boundary', 'actionable_failure'),
        'architectureGuard', 'scripts/run-canvas-source-import-live-proof.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array(
          'node --test scripts/run-canvas-source-import-live-proof.test.cjs'
        )
      )
    )
),
target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-CANVAS-ADD-SOURCE-LIVE-FLOW-1#command#attachwarehousesourcefromcanvascontext'
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
          'scripts/run-canvas-source-import-live-proof.test.cjs',
          'tools/planning-db/migrations/533_source_import_live_proof_temporal_bootstrap_coverage.sql'
        )
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
        || jsonb_build_array(
          'node --test scripts/run-canvas-source-import-live-proof.test.cjs',
          'pnpm docs:feature-mechanization:implementation'
        )
      ) as item(value)
    ) as architecture_guards,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.completion_gate, '[]'::jsonb)
        || jsonb_build_array(
          'node --test scripts/run-canvas-source-import-live-proof.test.cjs',
          'pnpm docs:feature-mechanization:implementation',
          'pnpm verify:prepush'
        )
      ) as item(value)
    ) as completion_gate
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  architecture_guards = merged.architecture_guards,
  completion_gate = merged.completion_gate,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rail.raw_manifest, '{}'::jsonb),
          '{symbols}',
          merged.symbols,
          true
        ),
        '{allowedImplementationSurfaces}',
        merged.allowed_surfaces,
        true
      ),
      '{architectureGuards}',
      merged.architecture_guards,
      true
    ),
    '{completionGate}',
    merged.completion_gate,
    true
  ),
  source_path = 'tools/planning-db/migrations/533_source_import_live_proof_temporal_bootstrap_coverage.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-LIVE-FLOW-1:source-import-live-proof-temporal-bootstrap-coverage:533:DVT_TEMPORAL_TEST_SERVER_PATH'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
