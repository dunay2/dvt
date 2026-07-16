-- Close Phase 4 only after the revision-bound browser vertical has exercised
-- the real protected API, dbt CLI, persisted plan, Temporal worker, and run
-- history. No product rail is added: PreviewExecutionPlan and StartRun remain
-- the command authority, with ProjectDbtGraphFromFiles,
-- BuildDbtPlannerGraphSource, and ObservePlanRunReadiness as queries.

update architecture.design
set
  status = 'implemented',
  rationale = 'File-authoritative dbt Preview and StartRun reuse the canonical execution rails, derive the planner graph from the current analyzed project, revalidate project and analysis revisions server-side, resolve a server-owned target identity, and dispatch a secret-free bundle built from the same immutable source revision. The browser vertical proves no file regeneration and no graph-draft fallback.',
  updated_at = now()
where design_id = 'DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715';

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  source_path = 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql',
  source_content_sha256 = md5('frontend:dbt-file-execution:current:700'),
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'componentFamily', 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION',
    'phase', 4,
    'authority', 'dbt-project-files',
    'semanticMutation', false,
    'regeneratesProjectFiles', false,
    'implementationStatus', 'current',
    'liveProof', 'RT-006'
  ),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION';

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts', 'model', 'buildDbtProjectFileExecutionStrategy', jsonb_build_object('phase', 4, 'status', 'current', 'pure', true, 'regeneratesProjectFiles', false), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('file:dbtProjectFileExecutionStrategy:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/useDbtProjectFileExecution.ts', 'controller', 'useDbtProjectFileExecution', jsonb_build_object('phase', 4, 'status', 'current', 'authority', 'dbt-project-files'), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('file:useDbtProjectFileExecution:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 'unit-test', null, jsonb_build_object('phase', 4, 'status', 'current', 'scope', 'planner projection, provenance, readiness signature, and no regeneration'), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('file:dbtProjectFileExecutionStrategy-test:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts', 'unit-test', null, jsonb_build_object('phase', 4, 'status', 'current', 'scope', 'file-authority Preview request boundary'), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('file:canvasPlanAction-dbtProjectFiles-test:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 'architecture-test', null, jsonb_build_object('phase', 4, 'status', 'current', 'scope', 'single authority and execution composition boundaries'), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('file:dbtProjectFileProjection-architecture-phase4:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/cypress/support/dbtProjectLive.ts', 'e2e-gateway', 'adoptLiveDbtProjectFileAuthority', jsonb_build_object('phase', 4, 'status', 'current', 'realProtectedApi', true), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('file:dbtProjectLive:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'e2e-test', null, jsonb_build_object('phase', 4, 'status', 'current', 'proof', 'RT-006', 'noIntercept', true, 'noGraphDraftFallback', true, 'noFileRegeneration', true), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('file:dbt-project-preview-run-live:700'));

update planning_query_store.frontend_component_local_cq_rails
set
  rail_status = 'implemented',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'reuse', true,
    'phase4Verified', true
  ),
  source_path = 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql',
  source_content_sha256 = md5(component_id || ':' || rail_name || ':implemented:700'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION'
  and rail_name in (
    'BuildDbtPlannerGraphSource',
    'PreviewExecutionPlan',
    'ObservePlanRunReadiness',
    'StartRun'
  );

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id, component_id, evidence_kind, evidence_ref, evidence_status,
  raw_evidence, source_path, source_content_sha256
)
values
  ('EV-DBT-FILE-EXECUTION-STRATEGY', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'unit-test', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 'passing', jsonb_build_object('command', 'pnpm --filter @dvt/web test', 'proves', jsonb_build_array('planner projection from analysis', 'revision-bound provenance', 'no project file generation')), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('evidence:dbt-file-execution-strategy:700')),
  ('EV-DBT-FILE-EXECUTION-PLAN-ACTION', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'unit-test', 'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts', 'passing', jsonb_build_object('command', 'pnpm --filter @dvt/web test', 'proves', jsonb_build_array('file-authority Preview request', 'selection propagation')), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('evidence:dbt-file-execution-plan-action:700')),
  ('EV-DBT-FILE-EXECUTION-ARCHITECTURE', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'architecture-test', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 'passing', jsonb_build_object('command', 'pnpm --filter @dvt/web test', 'singleAuthorityBranch', true, 'noDraftFallback', true), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('evidence:dbt-file-execution-architecture:700')),
  ('EV-DBT-FILE-EXECUTION-RT006', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'e2e-test', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'passing', jsonb_build_object('command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'result', '1 passing', 'realAdapters', jsonb_build_array('protected API', 'PostgreSQL', 'dbt CLI', 'Temporal worker', 'persisted plan and run history'), 'noIntercept', true, 'noGraphDraftFallback', true, 'noFileRegeneration', true, 'provenanceVisibleAfterReload', true), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('evidence:dbt-file-execution-rt006:700'))
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'EV-DBT-FILE-EXECUTION-STRATEGY', 'unit-test', 'current', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 'BuildDbtPlannerGraphSource', 'dbt-file-execution-strategy', 'A current file projection becomes a planner graph and secret-free revision-bound provenance without generating project files.', jsonb_build_object('authority', 'dbt-project-files'), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('validation:dbt-file-execution-strategy:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'EV-DBT-FILE-EXECUTION-PLAN-ACTION', 'unit-test', 'current', 'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts', 'PreviewExecutionPlan', 'dbt-file-preview-action', 'The Canvas submits the selected file-authoritative resources through PreviewExecutionPlan with no graph-draft mutation.', jsonb_build_object('semanticMutation', false), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('validation:dbt-file-execution-plan-action:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'EV-DBT-FILE-EXECUTION-ARCHITECTURE', 'architecture-test', 'current', 'apps/web/src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts', 'ObservePlanRunReadiness', 'dbt-file-execution-architecture', 'File authority remains a single route branch and readiness is derived from the same projection and preview signature.', jsonb_build_object('singleAuthorityBranch', true), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('validation:dbt-file-execution-architecture:700')),
  ('SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'EV-DBT-FILE-EXECUTION-RT006', 'e2e-test', 'current', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'StartRun', 'dbt-file-preview-run-live', 'A demanding user can select a file-derived model, Preview its exact analyzed revision, run it through Temporal, and inspect persisted provenance after reload without file regeneration or draft fallback.', jsonb_build_object('result', '1 passing', 'strictBrowserProof', true), 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql', md5('validation:dbt-file-execution-rt006:700'))
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

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values (
  'OBS-WEB-DBT-FILE-EXECUTION-POSTURE',
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'Freshness, preview readiness, typed rejection, running, and persisted provenance states remain visible through the Canvas execution and run-detail surfaces.',
  'log',
  true,
  'implemented'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update architecture.component_test
set validation_command = 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
where test_id = 'TEST-DBT-PROJECT-ROUNDTRIP-RT006';

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, source_content_sha256
)
values
  ('EVIDENCE-DBT-FILE-EXECUTION-WEB', 'component', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'test', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 'pass', repeat(md5('dbt-file-execution-web:700'), 2)),
  ('EVIDENCE-DBT-FILE-EXECUTION-PREVIEW-AUTHORITY', 'component', 'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'test', 'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts', 'pass', repeat(md5('dbt-file-execution-preview-authority:700'), 2)),
  ('EVIDENCE-DBT-FILE-EXECUTION-RUN-ADMISSION', 'component', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'test', 'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts', 'pass', repeat(md5('dbt-file-execution-run-admission:700'), 2)),
  ('EVIDENCE-DBT-FILE-EXECUTION-BUNDLE', 'component', 'SYS-API-INFRA-DBT-PROJECT-BUNDLE', 'test', 'apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts', 'pass', repeat(md5('dbt-file-execution-bundle:700'), 2)),
  ('EVIDENCE-DBT-FILE-EXECUTION-RT006', 'decision', 'DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715', 'test', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'pass', repeat(md5('dbt-file-execution-rt006:700'), 2))
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  source_content_sha256 = excluded.source_content_sha256,
  recorded_at = now();

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/700_dbt_project_file_execution_phase4_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':phase4-closeout:700'), 2),
  status = 'canonical',
  revision = revision + 1
where component_id in (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
  'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
  'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
  'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
  'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE',
  'SYS-API-INFRA-DBT-PROJECT-BUNDLE',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER',
  'SYS-API-INFRA-DBT-RUN-CONTEXT-FILES',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
);

do $$
declare
  mapped_file_count integer;
  implemented_rail_count integer;
  current_evidence_count integer;
begin
  select count(*) into mapped_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION';

  select count(*) into implemented_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION'
    and rail_status = 'implemented';

  select count(*) into current_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION'
    and evidence_status = 'current';

  if mapped_file_count <> 7 then
    raise exception 'Phase 4 closeout requires seven owned frontend files, found %', mapped_file_count;
  end if;

  if implemented_rail_count <> 4 then
    raise exception 'Phase 4 closeout requires four reused implemented rails, found %', implemented_rail_count;
  end if;

  if current_evidence_count <> 4 then
    raise exception 'Phase 4 closeout requires four relational validation records, found %', current_evidence_count;
  end if;
end $$;
