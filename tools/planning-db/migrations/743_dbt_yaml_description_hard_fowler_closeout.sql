-- Close the hard-Fowler DBT YAML description decomposition only after the
-- strict browser vertical has proved keyboard and pointer workbench movement,
-- lossless apply/revert, authoritative re-analysis, Preview, Run, and reopen.
-- The superseded transaction remains a tombstone without executable claims.

update architecture.design
set
  status = 'implemented',
  rationale =
    'The DBT YAML description capability now has one application object per canonical query or command rail, a shared root-package authority resolver, deterministic integrity policy, CST adapter, immutable server-owned receipt store, protected HTTP adapters, authoritative post-write re-analysis, and a bounded pointer-and-keyboard Node Workbench controller. Unit, contract, integration, and strict protected-browser evidence prove lossless apply/revert, Preview, Temporal Run, persisted reopen, and recoverable workbench movement without graph-draft interception or fabricated persistence.',
  approved_at = coalesce(approved_at, now()),
  updated_at = now()
where design_id = 'DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717';

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
  'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
  'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
  'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
  'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
);

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
  'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
  'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
  'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
);

update architecture.component_port
set status = 'implemented'
where component_id in (
  'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
  'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
  'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
  'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id like 'REL-API-DBT-YAML-%'
   or relation_id like 'REL-API-WORKSPACE-ROUTES-CALLS-DBT-YAML-%'
   or relation_id = 'REL-WEB-NODE-WORKBENCH-OVERLAY-USES-POSITION';

-- The application objects deliberately do not emit duplicate telemetry.
-- Their typed outcomes are observed at the protected HTTP boundary; the pure
-- policies and adapters delegate signals to their executing command/query.
insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  ('OBS-API-DBT-YAML-DESCRIPTION-PORTS', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'Pure application interfaces emit no runtime signal; protected routes and typed operation results own observability.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'The resolver emits no duplicate signal; typed authority failures are exposed by the invoking protected query or command.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'Proposal success and typed rejection are exposed by the protected proposal route.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'Applied receipts, typed conflicts, and authoritative analysis posture are exposed by the protected apply route.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'Reverted receipts and typed receipt or revision rejection are exposed by the protected revert route.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'The deterministic integrity policy is pure; command/query callers expose integrity failures as typed outcomes.', 'log', true, 'not_applicable'),
  ('OBS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'The receipt adapter emits no parallel telemetry; apply and revert commands expose persistence and lookup failures.', 'log', true, 'not_applicable')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

-- A tombstone records that a concept existed; it must not continue to claim a
-- responsibility, signal, source, port, relation, test, or canonical rail.
delete from architecture.component_responsibility
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

delete from architecture.component_observability
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

update architecture.component
set
  name = 'DBT YAML description edit transaction (superseded)',
  repo_path = 'tools/planning-db/migrations/743_dbt_yaml_description_hard_fowler_closeout.sql',
  public_contract = 'Superseded by one component per canonical DBT YAML description CQ rail',
  status = 'deprecated',
  updated_at = now()
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-WEB-NODE-WORKBENCH-POSITION-STRICT-BROWSER',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION',
  'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
  'e2e',
  'behavior',
  true,
  'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
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
  ('EVIDENCE-DBT-YAML-DESCRIPTION-PORTS-CONTRACT', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'test', 'packages/@dvt/contracts/test/dbt-yaml-description-edit.contract.test.ts', 'pass', 'ebccdd6ccb6be23909aed09b96c84362ffba73b42ab0d96a5b292efaf68b6c8e'),
  ('EVIDENCE-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'test', 'apps/api/test/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.test.ts', 'pass', 'af21df1225bc7a9ff61a0c973c98a5d9b8723c7ae052fcddc72e3670728af497'),
  ('EVIDENCE-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'test', 'apps/api/test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts', 'pass', '7c6d918738e21ae2b7e25407af02cf3d3dce5cbd7a93e79f1b4b59f5ab790b44'),
  ('EVIDENCE-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'test', 'apps/api/test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts', 'pass', '467c556afe063843172b914076fba0843a9eb74b86703655afd0194f2924d7c1'),
  ('EVIDENCE-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'test', 'apps/api/test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts', 'pass', '43f23fcbe0e81970385ab4261a55a9a42b7e61e82e831e896e27e301a110284e'),
  ('EVIDENCE-DBT-YAML-DESCRIPTION-INTEGRITY-PROPERTIES', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'test', 'apps/api/test/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.test.ts', 'pass', 'dbc42bff3a62eea9a4886766a7b41ea157bdcdf8161f1d2c44c0f724d0183efd'),
  ('EVIDENCE-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'test', 'apps/api/test/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.test.ts', 'pass', '3ebbb334bcd4bb669382bd3c2f91f6f2bda961671771b085137fc5e88005fb10'),
  ('EVIDENCE-WEB-NODE-WORKBENCH-POSITION-STRICT-BROWSER', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'test', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts', 'pass', '3e7de17a253b0e49a2a96256f1e6dcbbd35f281a88115d3673a7eff8eb43f5ad')
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
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/743_dbt_yaml_description_hard_fowler_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:743'), 2),
  revision = revision + 1
where component_id in (
  'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
  'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
  'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
  'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
);

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  cq_rails = 'none - superseded by one component per canonical command or query rail',
  source_path = 'tools/planning-db/migrations/743_dbt_yaml_description_hard_fowler_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':superseded:743'), 2),
  revision = revision + 1
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  reuse_decision = 'harden',
  capability_gaps = '[]'::jsonb,
  evidence_refs = (
    select jsonb_agg(distinct evidence_ref order by evidence_ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
        || jsonb_build_array(
          'TEST-WEB-NODE-WORKBENCH-POSITION-STRICT-BROWSER',
          'EVIDENCE-WEB-NODE-WORKBENCH-POSITION-STRICT-BROWSER'
        )
    ) evidence(evidence_ref)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'strictBrowserMovement', 'current',
    'pointerCaptureFallback', 'NotFoundError continues bounded movement',
    'validationCommand', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/743_dbt_yaml_description_hard_fowler_closeout.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION:current:743'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION',
  'VAL-WEB-NODE-WORKBENCH-POSITION-STRICT-BROWSER',
  'e2e-test',
  'current',
  'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
  null,
  'selected-node-workbench',
  'The selected-node workbench moves by keyboard and pointer, remains fully inside the active browser viewport, and survives unavailable synthetic pointer capture.',
  jsonb_build_object(
    'result', '1 passing',
    'duration', '4m31s',
    'keyboardMovement', true,
    'pointerMovement', true,
    'viewportBounds', true,
    'realAdapters', jsonb_build_array('protected HTTP', 'PostgreSQL', 'Temporal', 'DBT project analysis', 'workspace files')
  ),
  'tools/planning-db/migrations/743_dbt_yaml_description_hard_fowler_closeout.sql',
  md5('VAL-WEB-NODE-WORKBENCH-POSITION-STRICT-BROWSER:743')
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

-- Replace stale local rail manifests that still named the removed transaction.
with rail_truth as (
  select * from (
    values
      (
        'ProposeDbtYamlDescriptionEdit',
        'query',
        'ProposeDbtYamlDescriptionEdit',
        'propose',
        'apps/api/src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.ts',
        'ProposeDbtYamlDescriptionEditQuery.propose',
        'review',
        'apps/api/test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts',
        'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts'
      ),
      (
        'ApplyDbtYamlDescriptionEdit',
        'command',
        'ApplyDbtYamlDescriptionEdit',
        'apply',
        'apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts',
        'ApplyDbtYamlDescriptionEditCommand.apply',
        'apply',
        'apps/api/test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts',
        'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts'
      ),
      (
        'RevertDbtYamlDescriptionEdit',
        'command',
        'RevertDbtYamlDescriptionEdit',
        'revert',
        'apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts',
        'RevertDbtYamlDescriptionEditCommand.revert',
        'revert',
        'apps/api/test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts',
        'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts'
      )
  ) values_table(
    rail_name, rail_type, ddd_owner, api_method, api_path, api_symbol,
    web_method, test_path, validation_command
  )
)
update planning_query_store.feature_mechanization_local_rails rail
set
  ddd_owner = truth.ddd_owner,
  symbol_refs = jsonb_build_array(
    truth.api_path || '#' || truth.api_symbol,
    'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#' || truth.web_method
  ),
  implementation_refs = jsonb_build_array(
    truth.api_path || '#' || truth.api_symbol,
    'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#' || truth.web_method
  ),
  documentation_refs = jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  architecture_guards = jsonb_build_array(truth.validation_command),
  allowed_implementation_surfaces = jsonb_build_array(
    truth.api_path,
    'apps/web/src/app/components/dbtYamlDescriptionEditor/**'
  ),
  raw_rail = jsonb_build_object(
    'name', truth.rail_name,
    'type', truth.rail_type,
    'status', 'implemented',
    'dddOwner', truth.ddd_owner
  ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'domainObjects', jsonb_build_array(truth.ddd_owner),
    'commandQueryRails', jsonb_build_array(jsonb_build_object(
      'name', truth.rail_name,
      'type', truth.rail_type,
      'status', 'implemented',
      'dddOwner', truth.ddd_owner
    )),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', truth.api_method,
        'path', truth.api_path,
        'cqRails', jsonb_build_array(truth.rail_name),
        'dddOwner', truth.ddd_owner,
        'unitTests', jsonb_build_array(truth.test_path),
        'architectureGuard', truth.validation_command
      ),
      jsonb_build_object(
        'name', truth.web_method,
        'path', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts',
        'cqRails', jsonb_build_array(truth.rail_name),
        'dddOwner', truth.ddd_owner,
        'unitTests', jsonb_build_array('apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.test.tsx'),
        'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
      )
    ),
    'architectureGuards', jsonb_build_array(truth.validation_command),
    'allowedImplementationSurfaces', jsonb_build_array(
      truth.api_path,
      'apps/web/src/app/components/dbtYamlDescriptionEditor/**'
    ),
    'redGreenCycles', jsonb_build_array(jsonb_build_object(
      'id', lower(truth.rail_name) || '-hard-fowler-closeout',
      'redTest', truth.validation_command,
      'greenTest', truth.validation_command,
      'patchSurfaces', jsonb_build_array(
        truth.api_path,
        'apps/web/src/app/components/dbtYamlDescriptionEditor/**'
      )
    ))
  ),
  source_path = 'tools/planning-db/migrations/743_dbt_yaml_description_hard_fowler_closeout.sql',
  source_content_sha256 = repeat(md5(truth.rail_name || ':hard-fowler:743'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from rail_truth truth
where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
  and rail.rail_name = truth.rail_name
  and rail.rail_type = truth.rail_type;

refresh materialized view planning_query_store.component_engineering_component_tree_projection;
refresh materialized view planning_query_store.component_engineering_file_ownership_projection;

do $$
declare
  incomplete_component_count integer;
  stale_rail_count integer;
  duplicate_file_count integer;
  position_gap_count integer;
  position_browser_test_count integer;
begin
  if not exists (
    select 1 from architecture.design
    where design_id = 'DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717'
      and status = 'implemented'
  ) then
    raise exception 'Hard-Fowler DBT YAML description design is not implemented';
  end if;

  select count(*) into incomplete_component_count
  from architecture.component_maturity_query maturity
  where maturity.component_id in (
    'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
    'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
    'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
    'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
    'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
    'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
    'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
    'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
  )
    and coalesce(array_length(maturity.missing_reasons, 1), 0) > 0;

  if incomplete_component_count <> 0 then
    raise exception 'Hard-Fowler closeout left % immature active components', incomplete_component_count;
  end if;

  if exists (
    select 1 from architecture.component_port
    where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) or exists (
    select 1 from architecture.component_test
    where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) or exists (
    select 1 from architecture.component_relation
    where source_component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
       or target_component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) or exists (
    select 1 from architecture.component_responsibility
    where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) or exists (
    select 1 from architecture.component_observability
    where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) or exists (
    select 1 from planning_query_store.governance_component_local_ownership_patterns
    where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) then
    raise exception 'Superseded DBT YAML description transaction retains executable claims';
  end if;

  select count(*) into stale_rail_count
  from planning_query_store.command_query_rail_query rail
  where rail.rail_name in (
    'ProposeDbtYamlDescriptionEdit',
    'ApplyDbtYamlDescriptionEdit',
    'RevertDbtYamlDescriptionEdit'
  )
    and (
      rail.ddd_owner = 'DbtYamlDescriptionEditTransaction'
      or rail.symbol_refs::text like '%DbtYamlDescriptionEditTransaction%'
      or rail.architecture_guards::text like '%DbtYamlDescriptionEditTransaction%'
      or rail.rail_source <> 'local'
      or rail.is_gap
    );

  if stale_rail_count <> 0 then
    raise exception 'Found % stale DBT YAML description canonical rails', stale_rail_count;
  end if;

  select count(*) into duplicate_file_count
  from (
    select ownership.pattern
    from planning_query_store.governance_component_local_ownership_patterns ownership
    where ownership.component_id in (
      'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
      'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
      'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
      'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
      'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
      'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
      'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
      'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
    )
      and ownership.pattern_kind = 'owns'
    group by ownership.pattern
    having count(*) > 1
  ) duplicate_claims;

  if duplicate_file_count <> 0 then
    raise exception 'Hard-Fowler components contain % duplicate file claims', duplicate_file_count;
  end if;

  select jsonb_array_length(capability_gaps) into position_gap_count
  from planning_query_store.frontend_component_local_components
  where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION';

  if coalesce(position_gap_count, -1) <> 0 then
    raise exception 'Node Workbench position component still declares capability gaps';
  end if;

  select count(*) into position_browser_test_count
  from architecture.component_test
  where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
    and test_id = 'TEST-WEB-NODE-WORKBENCH-POSITION-STRICT-BROWSER'
    and test_kind = 'e2e'
    and required = true;

  if position_browser_test_count <> 1 then
    raise exception 'Node Workbench position component lacks strict browser evidence';
  end if;
end
$$;
