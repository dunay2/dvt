-- Record the hard-QA findings discovered by the strict run/source-import proof.
-- This migration strengthens existing rails; it does not create parallel
-- commands, queries, components, or product capabilities.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-API-INFRA-WAREHOUSE-SOURCES',
    'invariant',
    'ListWarehouseConnections projects an explicit public allow-list and never returns credentialRef, sourceObjects, or future catalog-internal fields.',
    30
  ),
  (
    'SYS-WEB-VIEWS-RUNS',
    'invariant',
    'Focused active-run detail refreshes more frequently than the broad run list; both stop refreshing once their observed status is terminal.',
    30
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.command_query_rails
set raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
  'publicProjection', 'WarehouseConnectionSchema allow-list',
  'credentialRefExcluded', true,
  'sourceObjectsExcluded', true,
  'negativeTest', 'WorkspaceWarehouseConnectionCatalog.listConnections excludes persisted credential and source-object internals'
)
where rail_name = 'ListWarehouseConnections'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'publicProjection', 'WarehouseConnectionSchema allow-list',
    'credentialRefExcluded', true,
    'sourceObjectsExcluded', true,
    'negativeTest', 'WorkspaceWarehouseConnectionCatalog.listConnections excludes persisted credential and source-object internals'
  ),
  source_path = 'tools/planning-db/migrations/794_run_operational_truth_live_closeout.sql',
  source_content_sha256 = repeat(md5(rail_id || ':public-projection:794'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'ListWarehouseConnections'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update architecture.component_test
set
  test_kind = 'unit',
  coverage_level = 'boundary',
  validation_command = 'pnpm --filter dvt-api exec vitest run test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts'
where test_id = 'TEST-SYS-API-INFRA-WAREHOUSE-SOURCES-3';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-RUN-OPERATIONAL-TRUTH-POLLING',
    'SYS-WEB-VIEWS-RUNS',
    'apps/web/src/app/views/runs/useRunWorkspace.test.tsx',
    'unit', 'behavior', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/runs/useRunWorkspace.test.tsx'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-RESULT-SEMANTIC-PRESENTATION-20260719',
    'integration-test', 'current',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'ImportWarehouseSources', 'source-import-result-presentation',
    'The result step exposes persisted object evidence through stable semantic slots and section changes do not retain stale scroll position.',
    jsonb_build_object(
      'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx',
      'result', '8 passed'
    ),
    'tools/planning-db/migrations/794_run_operational_truth_live_closeout.sql',
    md5('source-import-result-presentation:794')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-RUN-STRICT-LIVE-20260719',
    'e2e-test', 'current',
    'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
    'ImportWarehouseSources', 'source-import-run-live',
    'A protected browser imports a real scoped source object and a separate SQL-first Canvas reaches terminal run truth without API interception.',
    jsonb_build_object(
      'command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
      'result', '2 passed',
      'apiIntercept', false,
      'runtime', 'Temporal plus Postgres'
    ),
    'tools/planning-db/migrations/794_run_operational_truth_live_closeout.sql',
    md5('source-import-run-strict-live:794')
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

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, recorded_at
)
values
  (
    'EV-API-WAREHOUSE-CONNECTION-PUBLIC-PROJECTION-20260719',
    'component', 'SYS-API-INFRA-WAREHOUSE-SOURCES', 'test',
    'WorkspaceWarehouseConnectionCatalog.test.ts: 8 passed; persisted credentialRef is absent from ListWarehouseConnections',
    'pass', now()
  ),
  (
    'EV-RUN-OPERATIONAL-TRUTH-STRICT-LIVE-20260719',
    'component', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL', 'test',
    'canvas-preview-run-live.cy.ts: 2 passed against Temporal, Postgres, protected API, and browser UI',
    'pass', now()
  )
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;

do $$
begin
  if not exists (
    select 1
    from planning_query_store.governance_component_local_semantic_items
    where component_id = 'SYS-API-INFRA-WAREHOUSE-SOURCES'
      and item_kind = 'invariant'
      and item_value like 'ListWarehouseConnections projects an explicit public allow-list%'
  ) then
    raise exception 'Warehouse connection public projection invariant is missing';
  end if;

  if (
    select count(*)
    from planning_query_store.command_query_rail_query
    where rail_name = 'ListWarehouseConnections'
      and rail_status not in ('deprecated', 'retired')
      and coalesce((raw_rail ->> 'credentialRefExcluded')::boolean, false)
      and coalesce((raw_rail ->> 'sourceObjectsExcluded')::boolean, false)
  ) <> 1 then
    raise exception 'Canonical ListWarehouseConnections does not fail closed on catalog internals';
  end if;

  if (
    select count(*)
    from architecture.component_test
    where test_id in (
      'TEST-SYS-API-INFRA-WAREHOUSE-SOURCES-3',
      'TEST-WEB-RUN-OPERATIONAL-TRUTH-POLLING'
    )
      and required
  ) <> 2 then
    raise exception 'Hard-QA component evidence is incomplete';
  end if;

  if exists (
    select 1
    from planning_query_store.command_query_rail_query
    where lower(rail_name) in (
      'listpublicwarehouseconnections',
      'refreshactiverundetail',
      'rendersourceimportresult'
    )
  ) then
    raise exception 'Hard-QA closeout introduced a parallel product rail';
  end if;
end
$$;
