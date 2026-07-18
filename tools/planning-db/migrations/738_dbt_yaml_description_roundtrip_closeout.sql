-- Close Phase 5.1 only after the protected browser proof has exercised the
-- lossless description transaction, exact Code targets, post-save DBT
-- re-analysis, Preview, Temporal Run, and authoritative reopen.

update architecture.design
set
  status = 'implemented',
  rationale = case design_id
    when 'DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717' then
      'The protected browser vertical proves proposal, lossless conditional apply, exact hash receipts, conditional revert, authoritative DBT re-analysis, exact selected-node and project Code targets, Preview, Temporal Run, and browser reopen without graph-draft interception or fabricated persistence.'
    else
      'A successful revision-guarded Code save now settles the existing ProjectDbtGraphFromFiles query before synchronized posture is exposed, so Preview cannot consume the preceding DBT project revision and no parallel mutation rail exists.'
  end,
  approved_at = coalesce(approved_at, now()),
  updated_at = now()
where design_id in (
  'DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717',
  'DBT-CODE-SAVE-REANALYSIS-20260718'
);

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
  'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
  'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
  'SYS-WEB-CODE-WORKING-TREE-SYNC'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id = 'REL-WEB-DBT-CODE-ADAPTER-REFRESHES-PROJECTION-AFTER-SAVE';

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:738'), 2),
  revision = revision + 1
where component_id in (
  'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
  'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
  'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
  'SYS-WEB-CODE-WORKING-TREE-SYNC'
);

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  capability_gaps = '[]'::jsonb,
  evidence_refs = (
    select jsonb_agg(distinct evidence_ref order by evidence_ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
        || jsonb_build_array('VAL-WEB-DBT-YAML-DESCRIPTION-LIVE')
    ) evidence(evidence_ref)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'strictLiveEvidenceStatus', 'current',
    'strictLiveEvidenceCommand', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR:current:738'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values (
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
  'e2e-test',
  null,
  jsonb_build_object(
    'status', 'implemented',
    'coverage', 'lossless description apply and revert, exact Code targets, post-save DBT re-analysis, Preview, Temporal Run, and authoritative reopen',
    'noGraphDraftIntercept', true,
    'noFakePersistence', true
  ),
  'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql',
  md5('dbt-project-yaml-description-edit-live:738')
)
on conflict (component_id, file_path, file_role) do update set
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
  'ProjectDbtGraphFromFiles',
  'query',
  'implemented',
  jsonb_build_object(
    'ownership', 'consumed',
    'afterCommand', 'SaveWorkspaceFileContent',
    'purpose', 'Reconcile the authoritative DBT projection before synchronized posture.'
  ),
  'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql',
  md5('rail:dbt-code-target:project-graph:738')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_validation_evidence
set
  evidence_status = 'current',
  raw_evidence = coalesce(raw_evidence, '{}'::jsonb) || jsonb_build_object(
    'executedCommand', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
    'result', '1 passing',
    'realAdapters', jsonb_build_array('protected HTTP', 'PostgreSQL', 'Temporal', 'dbt project analysis', 'scoped workspace files'),
    'exactNodeCode', true,
    'projectCode', true,
    'postSaveReanalysis', true,
    'previewAndRun', true,
    'browserReopen', true
  ),
  source_path = 'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql',
  source_content_sha256 = md5('VAL-WEB-DBT-YAML-DESCRIPTION-LIVE:current:738'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR'
  and evidence_id = 'VAL-WEB-DBT-YAML-DESCRIPTION-LIVE';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'VAL-WEB-DBT-CODE-SAVE-REANALYSIS',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
    'ProjectDbtGraphFromFiles',
    'canvas-contextual-code-workbench',
    'An authoritative SQL save is followed by DBT project re-analysis before Preview, and Preview succeeds against the edited revision.',
    jsonb_build_object('parallelRail', false, 'duplicateWrite', false, 'previewStatus', 200),
    'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql',
    md5('VAL-WEB-DBT-CODE-SAVE-REANALYSIS:738')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'EV-CODE-WORKING-TREE-DBT-REANALYSIS',
    'integration-test',
    'current',
    'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx',
    'SaveWorkspaceFileContent',
    'dbt-contextual-code-workbench',
    'One revision-guarded save occurs and synchronized posture waits for the supplied post-save consumer without a duplicate write.',
    jsonb_build_object('saveCount', 1, 'consumerSettlesBeforeSynchronized', true),
    'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql',
    md5('EV-CODE-WORKING-TREE-DBT-REANALYSIS:738')
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

-- The old generic fields component remains retired; no alpha compatibility
-- alias is retained now that typed contributions own presentation.
update architecture.component
set status = 'deprecated', updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS';

do $$
declare
  description_rail_count integer;
begin
  select count(*) into description_rail_count
  from planning_query_store.command_query_rail_query
  where (rail_name, rail_type) in (
    ('ProposeDbtYamlDescriptionEdit', 'query'),
    ('ApplyDbtYamlDescriptionEdit', 'command'),
    ('RevertDbtYamlDescriptionEdit', 'command')
  );

  if description_rail_count <> 3 then
    raise exception 'Expected exactly the three canonical DBT description rails, found %', description_rail_count;
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_validation_evidence
    where component_id = 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR'
      and evidence_status = 'gap'
  ) then
    raise exception 'DBT YAML description editor still has validation gaps';
  end if;

  if not exists (
    select 1
    from architecture.component_relation
    where relation_id = 'REL-WEB-DBT-CODE-ADAPTER-REFRESHES-PROJECTION-AFTER-SAVE'
      and status = 'implemented'
  ) then
    raise exception 'DBT post-save projection reconciliation is not implemented';
  end if;

  if not exists (
    select 1
    from architecture.component
    where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS'
      and status = 'deprecated'
  ) then
    raise exception 'The superseded generic Node Workbench fields component is not deprecated';
  end if;
end
$$;
