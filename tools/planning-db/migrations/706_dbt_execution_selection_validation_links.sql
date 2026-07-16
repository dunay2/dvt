-- Relate existing DBT execution-selection evidence to the exact canonical
-- rail and boundary it proves. No new test semantics are introduced here.

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SCOPE-POLICY',
    'unit-test', 'current',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'CollectCanvasExecutionSelection',
    'dbt-explicit-selection',
    'Absent selection defaults to executable workspace scope; source-only explicit selection rejects; dependency closure is deterministic and cycle-safe.',
    jsonb_build_object('assertions', 4),
    'tools/planning-db/migrations/706_dbt_execution_selection_validation_links.sql',
    md5('validation:dbt-scope-policy:706')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SCOPE-PREVIEW',
    'integration-test', 'current',
    'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts',
    'PreviewExecutionPlan',
    'dbt-explicit-selection',
    'A source-only explicit selection returns actionable rejection and does not invoke the Preview port.',
    jsonb_build_object('requestCount', 0),
    'tools/planning-db/migrations/706_dbt_execution_selection_validation_links.sql',
    md5('validation:dbt-scope-preview:706')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SCOPE-READINESS',
    'integration-test', 'current',
    'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
    'ObservePlanRunReadiness',
    'dbt-explicit-selection',
    'Readiness consumes the same projection and disables Preview for a source-only explicit selection.',
    jsonb_build_object('sharedProjection', 'buildCanvasDbtExecutionProjection'),
    'tools/planning-db/migrations/706_dbt_execution_selection_validation_links.sql',
    md5('validation:dbt-scope-readiness:706')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-API-DBT-SCOPE-AUTHORITY',
    'integration-test', 'current',
    'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts',
    'PreviewExecutionPlan',
    'dbt-project-files-server-authority',
    'Server authority independently rejects a selected DBT source because it is not executable.',
    jsonb_build_object('rejectionCause', 'dbt_project_selected_resource_not_executable'),
    'tools/planning-db/migrations/706_dbt_execution_selection_validation_links.sql',
    md5('validation:dbt-scope-server:706')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SCOPE-STRICT-BROWSER',
    'e2e-test', 'current',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
    'PreviewExecutionPlan',
    'dbt-project-files-demanding-user',
    'The real browser shows actionable blocked readiness and emits no POST /plans/preview for a source-only explicit selection.',
    jsonb_build_object('result', '2 passing', 'noIntercept', true, 'noPreviewRequest', true),
    'tools/planning-db/migrations/706_dbt_execution_selection_validation_links.sql',
    md5('validation:dbt-scope-live:706')
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

do $$
declare
  validation_count integer;
  rail_count integer;
begin
  select count(*) into validation_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_status = 'current';

  select count(distinct rail_name) into rail_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_status = 'current';

  if validation_count <> 5 then
    raise exception 'Canvas execution selection requires five relational validation records, found %', validation_count;
  end if;

  if rail_count <> 3 then
    raise exception 'Canvas execution selection validation must cover three canonical rails, found %', rail_count;
  end if;
end $$;
