-- Keep the Source Import browser proof deterministic: start the API entrypoint
-- directly so the readiness budget measures server startup instead of an
-- implicit package lifecycle that rebuilds the complete dependency graph.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-dev-stack.cjs', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-dev-stack.test.cjs', 1),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-canvas-source-import-live-proof.cjs', 2),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-canvas-source-import-live-proof.test.cjs', 3),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-selected-closure-live-proof.cjs', 4),
  ('SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'owns', 'scripts/run-selected-closure-live-proof.test.cjs', 5)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
  'invariant',
  'Live proof readiness budgets begin with the runtime entrypoint and never include an implicit package predev dependency build.',
  2
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-CANVAS-SOURCE-IMPORT-LIVE-PROOF-RUNNER',
  'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
  'scripts/run-canvas-source-import-live-proof.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/run-canvas-source-import-live-proof.test.cjs'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
    and rail_name = 'AttachWarehouseSourceFromCanvasContext'
    and rail_type = 'command'
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
        || jsonb_build_array(
          'scripts/run-canvas-source-import-live-proof.cjs#buildApiProcessArgs'
        )
      ) as item(value)
    ) as symbol_refs,
    (
      select coalesce(jsonb_agg(symbol order by ordinal), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as existing(symbol, ordinal)
      where not (
        symbol->>'name' = 'buildApiProcessArgs'
        and symbol->>'path' = 'scripts/run-canvas-source-import-live-proof.cjs'
      )
    ) || jsonb_build_array(
      jsonb_build_object(
        'name', 'buildApiProcessArgs',
        'path', 'scripts/run-canvas-source-import-live-proof.cjs',
        'dddOwner', 'CanvasSourceImportLiveProofRunner',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('explicit_runtime_entrypoint', 'test_orchestration_boundary'),
        'architectureGuard', 'scripts/run-canvas-source-import-live-proof.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array(
          'node --test scripts/run-canvas-source-import-live-proof.test.cjs'
        )
      )
    ) as symbols,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || jsonb_build_array(
          'scripts/run-canvas-source-import-live-proof.test.cjs',
          'tools/planning-db/migrations/618_source_import_live_proof_direct_api_start.sql'
        )
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
        || jsonb_build_array(
          'node --test scripts/run-canvas-source-import-live-proof.test.cjs'
        )
      ) as item(value)
    ) as architecture_guards
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  architecture_guards = merged.architecture_guards,
  raw_manifest = jsonb_set(
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
  source_path = 'tools/planning-db/migrations/618_source_import_live_proof_direct_api_start.sql',
  source_content_sha256 = repeat(md5('E-CANVAS-ADD-SOURCE-LIVE-FLOW-1:direct-api-start:618'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
