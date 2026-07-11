-- Close the SourceObject catalog presentation hard cut after implementation.
-- The catalog component owns only its read model and presentation family; the
-- dialog owns orchestration/copy/E2E and WizardSteps owns flow policy.

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:implemented:613'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts', 1),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts', 2),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts', 3),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx', 4),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx', 5),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx', 6),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts', 7),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.tsx', 8),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.test.tsx', 9),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx', 10),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx', 11)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  responsibility = 'Project every discovered SourceObject into categorized search, inspection, governed metric evidence, and explicit capability-aware selection controls.',
  capability_gaps = '[]'::jsonb,
  evidence_refs = jsonb_build_array(
    'EV-SOURCE-IMPORT-CATALOG-SOURCE-OBJECT-MODEL',
    'EV-SOURCE-IMPORT-CATALOG-LOCATOR-KINDS',
    'EV-SOURCE-IMPORT-CATALOG-PRESENTATION',
    'EV-SOURCE-IMPORT-CATALOG-ACTIVE-OBJECT'
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'catalogVocabulary', 'SourceObject',
    'locatorKinds', jsonb_build_array('relation', 'file', 'endpoint', 'stream'),
    'visibilityPolicy', 'never-hide-discovered-objects',
    'selectionPolicy', 'relational-import-capability',
    'presentationBoundary', 'read-model-plus-template',
    'hardCutStatus', 'implemented'
  ),
  source_path = 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql',
  source_content_sha256 = md5('frontend-component:source-import-catalog:613'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

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
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx', 'composition', 'SelectionStep', jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'responsibility', 'Compose catalog search, categorized results, active-object metadata, and selected-source basket.'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SelectionStep:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts', 'read-model', 'buildSourceImportCatalogViewModel', jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'pure', true, 'providerNeutral', true), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:sourceImportCatalogModel:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts', 'unit-test', null, jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'scope', 'relational identity, grouping, metrics, search, and filters'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:sourceImportCatalogModel.test:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts', 'unit-test', null, jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'scope', 'relation, file, endpoint, and stream visibility/search/importability'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:sourceImportCatalogSourceObjects.test:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx', 'presentation-primitives', 'SourceImportObjectCard', jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'presentationOnly', true, 'tokenized', true), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportCatalogPrimitives:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx', 'presentation-template', 'SourceImportCatalogView', jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'presentationOnly', true), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportCatalogView:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx', 'presentation-test', null, jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'scope', 'accessible inspection and selection interactions'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportCatalogView.test:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts', 'architecture-test', null, jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'scope', 'template delegates primitives and read-model policy'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportCatalogView.architecture.test:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.tsx', 'presentation', 'SourceImportActiveObjectMetadata', jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'responsibility', 'Present active SourceObject metrics, columns, constraints, and importability.'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportActiveObjectMetadata:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.test.tsx', 'presentation-test', null, jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'scope', 'relational metadata and non-relational importability'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportActiveObjectMetadata.test:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx', 'presentation', 'SourceImportSelectionBasket', jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'responsibility', 'Present the governed set of selected importable source objects.'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportSelectionBasket:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx', 'presentation-test', null, jsonb_build_object('rail', 'RenderSourceImportCatalogView', 'scope', 'selected object metrics, columns, and removal affordance'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('file:SourceImportSelectionBasket.test:613'));

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.SourceImportDialog',
  'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
  'e2e-test',
  null,
  jsonb_build_object(
    'rails', jsonb_build_array('OpenCanvasSourceImportDialog', 'ListWarehouseConnectionSourceObjects', 'ImportWarehouseSources'),
    'scope', 'Live protected Add Source flow with no draft seeding or HTTP interception.'
  ),
  'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql',
  md5('file:canvas-source-import-live-clean:613')
)
on conflict (component_id, file_path, file_role) do update set
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_local_cq_rails
where component_id = 'web.component.canvas.SourceImportDialog'
  and rail_name = 'ListWarehouseConnectionTables';

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
  'web.component.canvas.SourceImportDialog',
  'ListWarehouseConnectionSourceObjects',
  'query',
  'implemented-api',
  jsonb_build_object(
    'kind', 'query',
    'dddObject', 'SourceObjectCatalogResponse',
    'applicationPort', 'IWarehouseSourceImportPort.listSourceObjects',
    'adapterSurface', 'createApiWarehouseSourceImportPort',
    'negativeTests', jsonb_build_array(
      'scope must resolve before the request',
      'response must pass SourceObjectCatalogResponseSchema',
      'unsupported locator kinds must not be hidden by the dialog'
    )
  ),
  'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql',
  md5('rail:SourceImportDialog:ListWarehouseConnectionSourceObjects:613')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  raw_component = jsonb_set(
    coalesce(raw_component, '{}'::jsonb),
    '{componentFamily,children}',
    jsonb_build_array(
      jsonb_build_object(
        'componentId', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'rail', 'RenderSourceImportCatalogView',
        'responsibility', 'Provider-neutral SourceObject catalog read model and presentation.'
      ),
      jsonb_build_object(
        'componentId', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'rail', 'ImportWarehouseSources',
        'responsibility', 'Wizard flow policy, review, grouping, options, and import submission.'
      )
    ),
    true
  ),
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-SOURCE-IMPORT-CATALOG-LIVE-SOURCE-OBJECT-FLOW')
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql',
  source_content_sha256 = md5('frontend-component:SourceImportDialog:source-object-hardcut:613'),
  updated_at = now()
where component_id = 'web.component.canvas.SourceImportDialog';

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
values
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'EV-SOURCE-IMPORT-CATALOG-SOURCE-OBJECT-MODEL', 'unit-test', 'current', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts', 'RenderSourceImportCatalogView', 'source-import-catalog-model', 'Relational identities, metric evidence, categorization, filters, and selection are projected by a pure read model.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('evidence:source-import-catalog-model:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'EV-SOURCE-IMPORT-CATALOG-LOCATOR-KINDS', 'unit-test', 'current', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts', 'RenderSourceImportCatalogView', 'source-import-catalog-locator-kinds', 'Relation, file, endpoint, and stream objects remain visible/searchable while unsupported imports remain disabled and explicit.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('evidence:source-import-catalog-locator-kinds:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'EV-SOURCE-IMPORT-CATALOG-PRESENTATION', 'presentation-test', 'current', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx', 'RenderSourceImportCatalogView', 'source-import-catalog-presentation', 'Inspection and selection are separate accessible controls; all locator categories and metric evidence render.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('evidence:source-import-catalog-presentation:613')),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'EV-SOURCE-IMPORT-CATALOG-ACTIVE-OBJECT', 'presentation-test', 'current', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.test.tsx', 'RenderSourceImportCatalogView', 'source-import-active-object', 'Active metadata presents governed evidence and explains unsupported importability without table-only assumptions.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.test.tsx'), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('evidence:source-import-active-object:613')),
  ('web.component.canvas.SourceImportDialog', 'EV-SOURCE-IMPORT-CATALOG-LIVE-SOURCE-OBJECT-FLOW', 'e2e-test', 'current', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts', 'ImportWarehouseSources', 'source-import-live-protected-flow', 'A user discovers a live SourceObject, inspects metadata/evidence, selects it by objectId, imports it, connects it, and previews without draft seeding or network stubs.', jsonb_build_object('command', 'pnpm test:web:e2e:source-import:live', 'noIntercept', true, 'noDraftSeeding', true), 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql', md5('evidence:source-import-live-source-object:613'))
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

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  ('TEST-SOURCE-IMPORT-CATALOG-MODEL', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
  ('TEST-SOURCE-IMPORT-CATALOG-LOCATOR-KINDS', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts'),
  ('TEST-SOURCE-IMPORT-CATALOG-PRESENTATION', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
  ('TEST-SOURCE-IMPORT-CATALOG-ARCHITECTURE', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

update architecture.component
set
  repo_path = 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
  public_contract = 'Provider-neutral SourceObject catalog read model with categorized accessible presentation',
  status = 'implemented',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

update architecture.component_responsibility
set status = 'implemented'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-SOURCE-IMPORT-CATALOG-USES-SOURCE-OBJECT-CONTRACT',
  'REL-SOURCE-CATALOG-USES-METRIC-PRESENTER',
  'REL-SOURCE-CATALOG-USES-METRIC-HOTSPOT'
);

update architecture.component_relation
set
  source_refs = jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx'
  ),
  updated_at = now()
where relation_id = 'REL-SOURCE-CATALOG-USES-METRIC-HOTSPOT';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      where value not like '%buildWarehouseTableIdentityKey%'
        and value not like '%SourceImportActiveTableMetadata%'
      union all
      values
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceImportCatalogViewModel'),
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceObjectIdentityKey'),
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#isSourceObjectImportable'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx#SourceImportCatalogView'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportObjectCard'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.tsx#SourceImportActiveObjectMetadata')
    ) canonical_refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      where value not like '%SourceImportActiveTableMetadata%'
      union all
      values
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'),
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.test.tsx')
    ) canonical_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      where value not like '%SourceImportActiveTableMetadata%'
      union all
      values
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'),
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
        ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogSourceObjects.test.ts'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.tsx'),
        ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveObjectMetadata.test.tsx')
    ) canonical_refs(value)
  ),
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'catalogVocabulary', 'SourceObject',
    'locatorKinds', jsonb_build_array('relation', 'file', 'endpoint', 'stream'),
    'visibilityPolicy', 'never-hide-discovered-objects',
    'selectionPolicy', 'relational-import-capability',
    'implementationStatus', 'implemented'
  ),
  source_path = 'tools/planning-db/migrations/613_source_import_catalog_source_object_implementation_closeout.sql',
  source_content_sha256 = repeat(md5(rail_id || ':implemented-source-object-catalog:613'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'RenderSourceImportCatalogView'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update planning_query_store.command_query_rails
set raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
  'catalogVocabulary', 'SourceObject',
  'locatorKinds', jsonb_build_array('relation', 'file', 'endpoint', 'stream'),
  'visibilityPolicy', 'never-hide-discovered-objects',
  'selectionPolicy', 'relational-import-capability',
  'implementationStatus', 'implemented'
)
where rail_name = 'RenderSourceImportCatalogView'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');
