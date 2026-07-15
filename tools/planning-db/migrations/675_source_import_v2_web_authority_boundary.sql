-- Bind the existing Source Import dialog and wizard family to the V2 command
-- contract. This extends ImportWarehouseSources; it does not create a parallel
-- command or a second source-import capability.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS', 'owns', 'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.ts', 20),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS', 'owns', 'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.test.ts', 21),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'owns', 'apps/web/src/testing/sourceImportTestFixtures.ts', 20)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.ts',
    'command-model',
    'buildSourceImportCommand',
    jsonb_build_object(
      'rail', 'ImportWarehouseSources',
      'responsibility', 'Build one authority-bound V2 command and retain its idempotency identity across equivalent retries.',
      'pure', true
    ),
    'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
    md5('file:sourceImportCommandModel:675')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'rail', 'ImportWarehouseSources',
      'scope', 'V2 envelope, active Canvas identity, stable retry identity, and semantic identity rotation.'
    ),
    'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
    md5('file:sourceImportCommandModel.test:675')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/testing/sourceImportTestFixtures.ts',
    'test-fixture',
    'buildGraphDraftSourceImportResult',
    jsonb_build_object(
      'rail', 'ImportWarehouseSources',
      'responsibility', 'Provide one shared V2 command/result fixture vocabulary for web component and adapter tests.'
    ),
    'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
    md5('file:sourceImportTestFixtures:675')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
  and item_value in (
    'Every import command carries the active Canvas identity and the shared source-import-request.v2 discriminator.',
    'Equivalent retries reuse one idempotency key; changing Canvas, selection, grouping, or options creates a new command identity.'
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'invariant',
    'Every import command carries the active Canvas identity and the shared source-import-request.v2 discriminator.',
    20
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'invariant',
    'Equivalent retries reuse one idempotency key; changing Canvas, selection, grouping, or options creates a new command identity.',
    21
  );

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'ImportWarehouseSources',
    'command',
    'implemented-ui',
    jsonb_build_object(
      'kind', 'command',
      'dddObject', 'ImportSourceObjectsRequestV2',
      'applicationPort', 'IWarehouseSourceImportPort.importSources',
      'adapterSurface', 'createApiWarehouseSourceImportPort',
      'authorizationScope', 'server-granted workspace scope plus active Canvas identity',
      'negativeTests', jsonb_build_array(
        'request without source-import-request.v2 is rejected',
        'request without an active Canvas identity is not constructible by the dialog',
        'incomplete V2 receipt is rejected before Canvas reconciliation',
        'changed command intent cannot reuse the previous idempotency key'
      )
    ),
    'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
    md5('rail:SourceImportWizardSteps:ImportWarehouseSources:675')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'ImportWarehouseSources',
    'command',
    'implemented-ui',
    jsonb_build_object(
      'kind', 'command',
      'dddObject', 'ImportSourceObjectsRequestV2',
      'applicationPort', 'IWarehouseSourceImportPort.importSources',
      'adapterSurface', 'createApiWarehouseSourceImportPort',
      'result', 'ImportSourceObjectsResultV2 discriminated by persisted Canvas authoring authority'
    ),
    'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
    md5('rail:SourceImportDialog:ImportWarehouseSources:675')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-V2-COMMAND-IDENTITY',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.test.ts',
    'ImportWarehouseSources',
    'source-import-v2-command-identity',
    'The web command carries Canvas authority context and preserves idempotency only for equivalent retries.',
    jsonb_build_object(
      'command', 'pnpm --filter @dvt/web exec vitest run src/app/components/sourceImportWizard/sourceImportCommandModel.test.ts'
    ),
    'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
    md5('evidence:source-import-v2-command-identity:675')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-V2-WEB-BOUNDARY',
    'integration-test',
    'current',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'ImportWarehouseSources',
    'source-import-v2-dialog-adapter-boundary',
    'The dialog submits the shared V2 request, retries with stable identity, and hands a discriminated V2 result to Canvas reconciliation.',
    jsonb_build_object(
      'command', 'pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.test.tsx src/app/services/workspace/workspacePorts.api.test.ts'
    ),
    'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
    md5('evidence:source-import-v2-web-boundary:675')
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

with symbol_group (
  path,
  ddd_owner,
  cq_rails,
  fowler_signals,
  architecture_guard,
  cypress_coverage,
  unit_tests,
  symbols
) as (
  values
    (
      'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.ts',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      array['ImportWarehouseSources']::text[],
      array['Service Layer', 'Value Object']::text[],
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array[
        'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.test.ts',
        'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx'
      ]::text[],
      array[
        'CreateIdempotencyKey',
        'SourceImportCommandDraft',
        'SourceImportCommandIdentity',
        'buildCommandSignature',
        'buildSourceImportCommand',
        'createSourceImportIdempotencyKey',
        'resolveSourceImportCommandIdentity'
      ]::text[]
    ),
    (
      'apps/web/src/app/ports/workspace.ts',
      'SYS-WEB-SERVICES-WORKSPACE',
      array['ImportWarehouseSources']::text[],
      array['Separated Interface', 'Published Language']::text[],
      'pnpm --filter @dvt/web test:architecture:run',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array[
        'apps/web/src/app/services/workspace/workspacePorts.api.test.ts',
        'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts'
      ]::text[],
      array['ImportSourcesInput', 'ImportSourcesResult', 'SourceImportGrouping']::text[]
    ),
    (
      'apps/web/src/testing/sourceImportTestFixtures.ts',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS',
      array['ImportWarehouseSources']::text[],
      array['Test Data Builder', 'Published Language']::text[],
      'pnpm --filter @dvt/web test:canvas-architecture:run',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      array[
        'apps/web/src/app/components/SourceImportWizard.test.tsx',
        'apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.test.tsx'
      ]::text[],
      array[
        'SourceImportOptions',
        'buildGraphDraftSourceImportResult',
        'buildSourceImportCommandInput'
      ]::text[]
    )
), extension as (
  select
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', symbol_name,
          'path', path,
          'dddOwner', ddd_owner,
          'cqRails', to_jsonb(cq_rails),
          'fowlerSignals', to_jsonb(fowler_signals),
          'architectureGuard', architecture_guard,
          'cypressCoverage', cypress_coverage,
          'unitTests', to_jsonb(unit_tests)
        ) order by path, symbol_name
      )
      from symbol_group
      cross join lateral unnest(symbols) symbol(symbol_name)
    ) as symbols,
    jsonb_build_array(
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'apps/web/src/app/components/SourceImportWizard.test.tsx',
      'apps/web/src/app/components/SourceImportWizard.testHarness.tsx',
      'apps/web/src/app/components/SourceImportWizard.tsx',
      'apps/web/src/app/components/sourceImportWizard/ResultStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.ts',
      'apps/web/src/app/components/sourceImportWizard/types.ts',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
      'apps/web/src/app/ports/workspace.ts',
      'apps/web/src/app/services/AppServicesContext.test.tsx',
      'apps/web/src/app/services/composition/appServices.test.ts',
      'apps/web/src/app/services/workspace/workspacePorts.api.test.ts',
      'apps/web/src/app/services/workspace/workspacePorts.api.ts',
      'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
      'apps/web/src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.testHarness.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.tsx',
      'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.activeDraftSourceImport.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.autosaveRace.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts',
      'apps/web/src/testing/sourceImportTestFixtures.ts',
      'apps/web/src/testing/workspacePortDoubles.ts',
      'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql'
    ) as surfaces
), target_symbols as (
  select
    rail.rail_id,
    (
      select jsonb_agg(item order by path, name)
      from (
        select distinct on (path, name)
          item,
          path,
          name
        from (
          select
            item,
            item ->> 'path' as path,
            coalesce(item ->> 'name', item ->> 'symbol') as name,
            0 as priority
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(item)
          union all
          select
            item,
            item ->> 'path' as path,
            item ->> 'name' as name,
            1 as priority
          from jsonb_array_elements(extension.symbols) symbols(item)
        ) candidates
        where path is not null and name is not null
        order by path, name, priority desc
      ) distinct_symbols
    ) as symbols,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) || extension.surfaces) surfaces(item)
      ) distinct_surfaces
    ) as surfaces
  from planning_query_store.feature_mechanization_local_rails rail
  cross join extension
  where rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
), target as (
  select
    target_symbols.rail_id,
    target_symbols.symbols,
    target_symbols.surfaces,
    (
      select jsonb_agg(
        to_jsonb((item ->> 'path') || '#' || (item ->> 'name'))
        order by item ->> 'path', item ->> 'name'
      )
      from jsonb_array_elements(target_symbols.symbols) symbols(item)
    ) as symbol_refs
  from target_symbols
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = target.symbol_refs,
  implementation_refs = target.surfaces,
  allowed_implementation_surfaces = target.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(rail.raw_manifest, '{symbols}', target.symbols, true),
    '{allowedImplementationSurfaces}',
    target.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/675_source_import_v2_web_authority_boundary.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':source-import-v2-web:675'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from target
where rail.rail_id = target.rail_id;
