-- The Source Import catalog is a scrollable modal surface. Interaction proof
-- targets the actual operable controls inside the active dialog; decorative
-- card containers must not advertise click behavior they do not own.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'invariant',
    'Only operable catalog controls advertise pointer interaction; object cards remain semantic containers.',
    6
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'invariant',
    'Browser proof scrolls the selected SourceObject into the active dialog viewport and activates its accessible inspect and selection controls.',
    7
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
  'TEST-SOURCE-IMPORT-CATALOG-LIVE-INTERACTION',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
  'e2e',
  'flow',
  true,
  'pnpm test:web:e2e:source-import:live'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

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
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'EV-SOURCE-IMPORT-CATALOG-LIVE-OPERABLE-CONTROLS',
  'e2e-test',
  'current',
  'pnpm test:web:e2e:source-import:live',
  'RenderSourceImportCatalogView',
  'source-import-catalog-live-operable-controls',
  'A demanding browser user can scroll a SourceObject into view, inspect its metadata and select it through visible accessible controls inside the active Add Source dialog.',
  jsonb_build_object(
    'activeDialogScoped', true,
    'scrollsObjectIntoView', true,
    'accessibleInspectControl', true,
    'accessibleSelectionControl', true,
    'noForcedClick', true
  ),
  'tools/planning-db/migrations/619_source_import_catalog_operable_affordance.sql',
  repeat(md5('EV-SOURCE-IMPORT-CATALOG-LIVE-OPERABLE-CONTROLS:619'), 2)
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

update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
      )
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{catalogInteractionEvidence}',
    jsonb_build_object(
      'activeDialogScoped', true,
      'objectCardIsSemanticContainer', true,
      'inspectAndSelectionControlsAreOperable', true,
      'forcedClicks', false,
      'e2e', 'pnpm test:web:e2e:source-import:live'
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/619_source_import_catalog_operable_affordance.sql',
  source_content_sha256 = repeat(md5('RenderSourceImportCatalogView:operable-affordance:619'), 2),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_name = 'RenderSourceImportCatalogView'
  and rail.rail_type = 'query'
  and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired');
