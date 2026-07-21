-- Record the real red/green cycles exercised by the run operational truth
-- slice without changing its existing query rails or implementation surfaces.

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{redGreenCycles}',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'shared-run-operational-truth',
        'redTest', 'pnpm --filter dvt-api exec vitest run test/application/services/runOperationalTruth.test.ts test/application/services/listRunsUseCase.test.ts test/application/services/getRunStatusUseCase.test.ts',
        'expectedFailure', 'ListRuns and GetRunStatus disagree or fabricate lifecycle evidence instead of projecting one canonical operational truth.',
        'patchSurfaces', jsonb_build_array(
          'apps/api/src/application/ports/runtime.ts',
          'apps/api/src/application/services/runOperationalTruth.ts',
          'apps/api/src/application/services/listRunsUseCase.ts',
          'apps/api/src/application/services/getRunStatusUseCase.ts'
        ),
        'greenTest', 'pnpm --filter dvt-api exec vitest run test/application/services/runOperationalTruth.test.ts test/application/services/listRunsUseCase.test.ts test/application/services/getRunStatusUseCase.test.ts'
      ),
      jsonb_build_object(
        'id', 'web-run-operational-presentation',
        'redTest', 'pnpm --filter @dvt/web test:unit:run -- src/app/services/runs/runsApiSnapshotMapper.test.ts src/app/views/runs/runOperationalTableModel.test.ts',
        'expectedFailure', 'The browser mapper or presentation model replaces absent evidence with synthetic timestamps, duration, or status.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/ports/runs.ts',
          'apps/web/src/app/queries/runsQueries.ts',
          'apps/web/src/app/services/runs/runsApiDecoders.ts',
          'apps/web/src/app/views/RunsView.tsx',
          'apps/web/src/app/views/runs/runOperationalTableModel.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/RunsView.test.tsx src/app/views/runs/RunStates.workspaceBasics.test.tsx src/app/views/runs/useRunWorkspace.test.tsx'
      ),
      jsonb_build_object(
        'id', 'protected-runtime-live-proof',
        'redTest', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
        'expectedFailure', 'A protected Canvas run or contextual warehouse-source import cannot complete through the real API, Postgres, Temporal, and browser stack.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'apps/web/cypress/support/canvasExecutionSelection.ts',
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts'
        ),
        'greenTest', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
      )
    ),
    true
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        rail.allowed_implementation_surfaces || jsonb_build_array(
          'tools/planning-db/migrations/796_run_operational_truth_red_green_cycles.sql'
        )
      ) value(ref)
    ) refs
  ),
  source_path = 'tools/planning-db/migrations/796_run_operational_truth_red_green_cycles.sql',
  source_content_sha256 = repeat(md5('E-RUN-OPERATIONAL-TRUTH-1:red-green-cycles:796'), 2),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_id = 'local#E-RUN-OPERATIONAL-TRUTH-1#query#listruns';

do $$
begin
  if (
    select jsonb_array_length(coalesce(raw_manifest -> 'redGreenCycles', '[]'::jsonb))
    from planning_query_store.feature_mechanization_local_rails
    where rail_id = 'local#E-RUN-OPERATIONAL-TRUTH-1#query#listruns'
  ) <> 3 then
    raise exception 'Run operational truth red/green evidence is incomplete';
  end if;

  if exists (
    select 1
    from planning_query_store.command_query_rail_query
    where lower(rail_name) in ('listruns', 'getrunstatus')
      and is_duplicate
  ) then
    raise exception 'Red/green evidence update introduced a duplicate run query rail';
  end if;
end
$$;
