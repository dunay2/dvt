-- Complete component maturity without inventing duplicate telemetry. Pure
-- contracts, adapters, and passive views delegate operational signals to
-- their executing boundary; stateful browser components expose visible state.

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  ('OBS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'The pure contract emits no runtime signal; protected route decoding and transaction receipts expose rejection and success.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-EDIT', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'Typed proposal, apply, analysis, conflict, and revert receipts are exposed by the protected HTTP boundary.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'The pure CST adapter emits no signal; its transaction caller exposes typed parse, identity, and mutation failures.', 'log', true, 'not_applicable'),
  ('OBS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'The browser gateway emits no independent signal; validated receipts and adapted API errors feed the editor state.', 'log', true, 'not_applicable'),
  ('OBS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'The selected-node workbench exposes proposing, reviewing, applying, applied, conflict, reverting, and receipt posture.', 'dashboard', true, 'implemented'),
  ('OBS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'The passive view owns no independent telemetry; it renders the controller state and immutable receipts.', 'dashboard', true, 'not_applicable'),
  ('OBS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'The host owns no independent telemetry; canonical CodeView renders file loading, synchronization, conflict, and failure state.', 'dashboard', true, 'not_applicable'),
  ('OBS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'The target adapter owns no independent telemetry; CodeView and the DBT project query expose file and re-analysis failures.', 'dashboard', true, 'not_applicable'),
  ('OBS-WEB-CODE-WORKING-TREE-SYNC', 'SYS-WEB-CODE-WORKING-TREE-SYNC', 'CodeWorkingTreeStatus exposes modified, syncing, synchronized, conflict, and failed posture while the DBT query exposes post-save re-analysis failure.', 'dashboard', true, 'implemented')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, source_content_sha256
)
values
  ('EVIDENCE-DBT-YAML-DESCRIPTION-STRICT-LIVE', 'component', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'test', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts', 'pass', 'dcd354679a3263a303c7d8fd9a68f5187ab33595de600d9ca3c2592f3d95c126'),
  ('EVIDENCE-DBT-CODE-SAVE-REANALYSIS-LIVE', 'component', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'test', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts', 'pass', 'dcd354679a3263a303c7d8fd9a68f5187ab33595de600d9ca3c2592f3d95c126'),
  ('EVIDENCE-CODE-WORKING-TREE-POST-SAVE-CONSUMER', 'component', 'SYS-WEB-CODE-WORKING-TREE-SYNC', 'test', 'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx', 'pass', '34b36d9acee8dce4d5bae5b22f03d757186248ac630f973803d76b8c2b3330fa'),
  ('EVIDENCE-DBT-CODE-TARGET-ADAPTER', 'component', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'test', 'apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx', 'pass', '24566be376a33de7750361791bf5eca8b694d317fdd873ee7f932c12d21e06dd')
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  source_content_sha256 = excluded.source_content_sha256,
  recorded_at = now();

do $$
declare
  incomplete_count integer;
begin
  select count(*) into incomplete_count
  from architecture.component_maturity_query maturity
  where maturity.component_id in (
    'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
    'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
    'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'SYS-WEB-CODE-WORKING-TREE-SYNC'
  )
    and coalesce(array_length(maturity.missing_reasons, 1), 0) > 0;

  if incomplete_count <> 0 then
    raise exception 'DBT YAML description closeout left % immature components', incomplete_count;
  end if;
end
$$;
