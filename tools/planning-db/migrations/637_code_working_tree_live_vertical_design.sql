-- Approve strict live evidence for the existing Code working-tree command.
-- The slice reuses the protected-runtime harness and workspace-file rails; it
-- does not add a second persistence path or mark evidence passing prematurely.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'CODE-WORKING-TREE-LIVE-VERTICAL-20260713',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Code working-tree strict live vertical',
  'Frontend / Project Workspace I/O / Delivery',
  'approved',
  'The stubbed browser test proves UI orchestration but not browser-to-API-to-filesystem persistence and reopen. Reuse the existing protected-runtime harness and prove the complete scoped CAS vertical without route intercepts or direct filesystem assertions.',
  'hidden_authority',
  'GetWorkspaceFileContent;SaveWorkspaceFileContent;RunDbtAuthorCodeRunLiveProof',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'decision', 'ADR-0060', 'must_prove', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'component', 'web.component.code.CodeWorkingTreeSync', 'may_update', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'component', 'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS', 'may_update', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'query', 'GetWorkspaceFileContent', 'must_prove', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'command', 'SaveWorkspaceFileContent', 'must_prove', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'command', 'RunDbtAuthorCodeRunLiveProof', 'may_create', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'path', 'scripts/run-selected-closure-live-proof.cjs', 'may_update', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'path', 'scripts/run-selected-closure-live-proof.test.cjs', 'may_update', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'may_update', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'path', 'apps/web/package.json', 'may_update', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'path', 'package.json', 'may_update', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'test', 'run-selected-closure-live-proof.test.cjs', 'must_prove', true),
  ('CODE-WORKING-TREE-LIVE-VERTICAL-20260713', 'test', 'canvas-dbt-author-code-run-live.cy.ts', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.frontend_component_local_components
set
  capability_gaps = jsonb_build_array('strict live browser persistence and reopen proof pending'),
  evidence_refs = (
    select jsonb_agg(distinct evidence_ref order by evidence_ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-CODE-WORKING-TREE-LIVE-VERTICAL')
    ) evidence(evidence_ref)
  ),
  source_path = 'tools/planning-db/migrations/637_code_working_tree_live_vertical_design.sql',
  source_content_sha256 = md5('CodeWorkingTreeSync:live-vertical:planned:637'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync';

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'EV-CODE-WORKING-TREE-LIVE-VERTICAL',
  'web.component.code.CodeWorkingTreeSync',
  'live-e2e-test',
  'pnpm test:web:e2e:dbt-author-code-run:live',
  'planned',
  jsonb_build_object(
    'scope', 'browser -> protected API -> CAS command -> scoped filesystem -> query -> browser reopen',
    'forbiddenProofs', jsonb_build_array(
      'workspace-file route intercepts',
      'direct edited-content seeding',
      'filesystem-only assertion',
      'fake Save action'
    )
  ),
  'tools/planning-db/migrations/637_code_working_tree_live_vertical_design.sql',
  md5('EV-CODE-WORKING-TREE-LIVE-VERTICAL:planned:637')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
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
values (
  'TEST-CODE-WORKING-TREE-LIVE-RUNNER',
  'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
  'scripts/run-selected-closure-live-proof.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/run-selected-closure-live-proof.test.cjs'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-CI-RUNTIME-PROOFS-GUARD-WEB-CODE-WORKING-TREE',
  'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
  'SYS-WEB-VIEWS-CODE',
  'guards',
  'outbound',
  'build_time',
  'A failed live proof blocks evidence promotion and PR closeout.',
  'Local protected-runtime tenant, project, and environment scope.',
  jsonb_build_array(
    'scripts/run-selected-closure-live-proof.cjs',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
  ),
  'approved'
)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update planning_query_store.governance_component_local_definitions
set
  cq_rails = concat_ws(
    ';',
    nullif(cq_rails, ''),
    case
      when position('RunDbtAuthorCodeRunLiveProof' in coalesce(cq_rails, '')) = 0
        then 'RunDbtAuthorCodeRunLiveProof'
      else null
    end
  ),
  source_path = 'tools/planning-db/migrations/637_code_working_tree_live_vertical_design.sql',
  source_content_sha256 = md5('runtime-proofs:dbt-code-live:637') || md5('RunDbtAuthorCodeRunLiveProof:637'),
  revision = revision + 1
where component_id = 'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS';
