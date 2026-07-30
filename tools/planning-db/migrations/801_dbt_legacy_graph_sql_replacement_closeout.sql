-- Close the explicit replacement path for ambiguous pre-marker DBT model SQL
-- after unit, orchestration, and protected-browser evidence has passed.

update architecture.design
set
  status = 'implemented',
  rationale = rationale || E'\n\nPre-marker closeout: divergent unmarked SQL now requires a user decision bound to the exact observed file SHA-256 and proposed managed-content SHA-256. Cancellation performs no write, stale confirmation reopens the decision, malformed managed markers remain blocked, and the protected browser flow proves preservation followed by explicit adoption.',
  approved_at = coalesce(approved_at, now()),
  updated_at = now()
where design_id = 'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722';

update architecture.component
set
  status = 'implemented',
  maturity_score = 100,
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION';

update architecture.component_responsibility
set status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION';

update architecture.component_port
set status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION';

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-WEB-CANVAS-MODAL-HOST-CONTAINS-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'REL-WEB-CANVAS-GRAPH-SQL-CONFIRMATION-AUTHORIZES-PUBLISHER'
);

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values (
  'OBS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
  'The passive dialog emits no independent runtime signal; Canvas Preview feedback and the guarded workspace-file command own outcomes and audit evidence.',
  'log',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-ORCHESTRATION',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'apps/web/src/app/views/canvas/useCanvasExecutionActions.graphSqlReplacement.test.tsx',
  'integration',
  'boundary',
  true,
  'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.graphSqlReplacement.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, source_content_sha256
)
values
  (
    'EVIDENCE-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-PRESENTATION',
    'component',
    'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'test',
    'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx',
    'pass',
    repeat(md5('graph-sql-replacement:presentation:801'), 2)
  ),
  (
    'EVIDENCE-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-ORCHESTRATION',
    'component',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'test',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.graphSqlReplacement.test.tsx',
    'pass',
    repeat(md5('graph-sql-replacement:orchestration:801'), 2)
  ),
  (
    'EVIDENCE-WEB-DBT-GRAPH-SQL-AUTHORITY-LIVE',
    'component',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'test',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'pass',
    repeat(md5('dbt-graph-sql-authority:replacement-live:801'), 2)
  )
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  source_content_sha256 = excluded.source_content_sha256,
  recorded_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  (
    'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722',
    'evidence',
    'EVIDENCE-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-PRESENTATION',
    'must_prove',
    true
  ),
  (
    'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722',
    'evidence',
    'EVIDENCE-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-ORCHESTRATION',
    'must_prove',
    true
  ),
  (
    'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722',
    'evidence',
    'EVIDENCE-WEB-DBT-GRAPH-SQL-AUTHORITY-LIVE',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/801_dbt_legacy_graph_sql_replacement_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:801'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'public_api',
    'GraphSqlReplacementConfirmationDialog({ open, paths, busy, onCancel, onConfirm })',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'consumer',
    'CanvasModalHost through canvasModalHostPropsBuilder.',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION',
    'transition',
    'Supplied paths and busy state become one localized passive choice that emits confirm or cancel intent.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  reuse_decision = 'create',
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'implementationStatus', 'implemented',
    'presentationOnly', true,
    'strictBrowserProof', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/801_dbt_legacy_graph_sql_replacement_closeout.sql',
  source_content_sha256 = md5(component_id || ':current:801'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphSqlReplacementConfirmationDialog';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.GraphSqlReplacementConfirmationDialog',
    'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.tsx',
    'presentation',
    'GraphSqlReplacementConfirmationDialog',
    jsonb_build_object('ownership', 'exclusive', 'presentationOnly', true),
    'tools/planning-db/migrations/801_dbt_legacy_graph_sql_replacement_closeout.sql',
    md5('file:GraphSqlReplacementConfirmationDialog:source:801')
  ),
  (
    'web.component.canvas.GraphSqlReplacementConfirmationDialog',
    'apps/web/src/app/views/canvas/GraphSqlReplacementConfirmationDialog.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object('proves', 'localized paths, busy posture, cancellation, and explicit confirmation intent'),
    'tools/planning-db/migrations/801_dbt_legacy_graph_sql_replacement_closeout.sql',
    md5('file:GraphSqlReplacementConfirmationDialog:test:801')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.graphSqlReplacement.test.tsx',
    'integration-test',
    null,
    jsonb_build_object('proves', 'preview blocks before confirmation, cancellation preserves bytes, and exact confirmation resumes Preview'),
    'tools/planning-db/migrations/801_dbt_legacy_graph_sql_replacement_closeout.sql',
    md5('file:useCanvasExecutionActions:graph-sql-replacement-test:801')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

refresh materialized view planning_query_store.component_engineering_component_tree_projection;
refresh materialized view planning_query_store.component_engineering_file_ownership_projection;

do $$
declare
  mapped_dialog_file_count integer;
  false_leaf_rail_count integer;
  passing_evidence_count integer;
begin
  if not exists (
    select 1
    from architecture.design
    where design_id = 'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722'
      and status = 'implemented'
  ) then
    raise exception 'DBT model SQL authority containment design is not implemented';
  end if;

  if exists (
    select 1
    from architecture.component_maturity_query
    where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-CONFIRMATION'
      and coalesce(array_length(missing_reasons, 1), 0) > 0
  ) then
    raise exception 'Graph SQL replacement confirmation component remains immature';
  end if;

  select count(*) into mapped_dialog_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'web.component.canvas.GraphSqlReplacementConfirmationDialog';

  if mapped_dialog_file_count <> 2 then
    raise exception 'Graph SQL replacement confirmation file ownership is incomplete: % of 2', mapped_dialog_file_count;
  end if;

  select count(*) into false_leaf_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.GraphSqlReplacementConfirmationDialog';

  if false_leaf_rail_count <> 0 then
    raise exception 'Passive graph SQL replacement confirmation must not claim command/query rails';
  end if;

  select count(*) into passing_evidence_count
  from architecture.evidence
  where evidence_id in (
    'EVIDENCE-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-PRESENTATION',
    'EVIDENCE-WEB-CANVAS-DBT-GRAPH-SQL-REPLACEMENT-ORCHESTRATION',
    'EVIDENCE-WEB-DBT-GRAPH-SQL-AUTHORITY-LIVE'
  )
    and result_state = 'pass';

  if passing_evidence_count <> 3 then
    raise exception 'Graph SQL replacement evidence is incomplete: % of 3', passing_evidence_count;
  end if;
end
$$;
