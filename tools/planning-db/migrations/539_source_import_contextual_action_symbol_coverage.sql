-- Reconcile the contextual Source Import action selectors introduced for the
-- live browser proof. These are presentation/test-support symbols for the
-- existing AttachWarehouseSourceFromCanvasContext command rail, not new rails.

with symbol_patch(symbol_ref, symbol) as (
  values
    (
      'apps/web/cypress/support/canvasExecutionSelection.ts#clickCanvasContextMenuAction',
      jsonb_build_object(
        'name', 'clickCanvasContextMenuAction',
        'path', 'apps/web/cypress/support/canvasExecutionSelection.ts',
        'dddOwner', 'CanvasSourceImportLiveProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array(
          'stable_user_flow_selector',
          'i18n_resistant_browser_proof'
        ),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx'
        )
      )
    ),
    (
      'apps/web/cypress/support/canvasExecutionSelection.ts#clickCanvasAddCatalogAction',
      jsonb_build_object(
        'name', 'clickCanvasAddCatalogAction',
        'path', 'apps/web/cypress/support/canvasExecutionSelection.ts',
        'dddOwner', 'CanvasSourceImportLiveProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array(
          'catalog_action_contract',
          'registration_kind_selector'
        ),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx'
        )
      )
    ),
    (
      'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#resolveCanvasAddNodeCatalogActionId',
      jsonb_build_object(
        'name', 'resolveCanvasAddNodeCatalogActionId',
        'path', 'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
        'dddOwner', 'CanvasAddNodeCatalogView',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array(
          'presentation_contract',
          'semantic_action_projection'
        ),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx'
        )
      )
    )
),
implementation_refs(ref) as (
  values
    ('apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('apps/web/cypress/support/canvasExecutionSelection.ts'),
    ('apps/web/cypress/support/test/canvasPreviewRunPersisted.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts'),
    ('apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx'),
    ('apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx'),
    ('apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx'),
    ('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx'),
    ('apps/web/src/app/views/canvas/CanvasContextMenuView.tsx'),
    ('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts'),
    ('tools/planning-db/migrations/539_source_import_contextual_action_symbol_coverage.sql')
),
architecture_guards(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts'),
    ('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts'),
    ('pnpm docs:feature-mechanization:implementation')
),
completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('pnpm --filter @dvt/web test:canvas-presentation:run -- CanvasContextMenuView.test.tsx CanvasAddNodeCatalogView.test.tsx'),
    ('pnpm --filter @dvt/web test:architecture:run -- SourceImportCatalogView.architecture.test.ts CanvasSourceImportLiveProof.architecture.test.ts'),
    ('pnpm docs:feature-mechanization:implementation'),
    ('pnpm verify:prepush')
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
        coalesce(rail.implementation_refs, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
        || (select jsonb_agg(ref) from architecture_guards)
      ) as item(value)
    ) as architecture_guards,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(coalesce(rail.completion_gate, '[]'::jsonb)) = 'array'
            then coalesce(rail.completion_gate, '[]'::jsonb)
          else coalesce(rail.completion_gate->'tests', '[]'::jsonb)
        end
        || (select jsonb_agg(ref) from completion_tests)
      ) as item(value)
    ) as completion_gate
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  architecture_guards = merged.architecture_guards,
  completion_gate = merged.completion_gate,
  raw_manifest = jsonb_set(
    jsonb_set(
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
        '{implementationRefs}',
        merged.implementation_refs,
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
  source_path = 'tools/planning-db/migrations/539_source_import_contextual_action_symbol_coverage.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-LIVE-FLOW-1:source-import-contextual-action-symbol-coverage:539'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
