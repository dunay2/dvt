-- Promote the strict Code working-tree vertical only after the protected
-- browser-to-API-to-filesystem-to-browser proof has passed. The delivery proof
-- command remains separate from the product query and mutation rails.

update architecture.design
set
  status = 'implemented',
  rationale = 'The governed live runner now proves DBT authoring, persisted preview, Start Run, Monaco autosynchronization through SaveWorkspaceFileContent, authoritative GetWorkspaceFileContent reads, and browser reopen without workspace-file intercepts, direct edited-content seeding, or a Save UI.',
  updated_at = now()
where design_id = 'CODE-WORKING-TREE-LIVE-VERTICAL-20260713';

update planning_query_store.feature_mechanization_local_rails rails
set
  rail_status = 'implemented',
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
          'scripts/run-selected-closure-live-proof.cjs',
          'scripts/run-selected-closure-live-proof.test.cjs',
          'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql'
        )
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{liveEvidence}',
    jsonb_build_object(
      'status', 'current',
      'command', 'pnpm test:web:e2e:dbt-author-code-run:live',
      'spec', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
      'proves', jsonb_build_array(
        'DBT source and model authoring persists through the protected graph-draft API',
        'persisted preview generates executable DBT workspace artifacts',
        'Start Run reaches the live Temporal adapter and exposes run snapshot and events',
        'Monaco edits autosynchronize through the revision-guarded workspace-file command',
        'the edited content survives authoritative API reads and browser reopen'
      ),
      'forbiddenProofsAbsent', jsonb_build_array(
        'workspace-file route intercepts',
        'direct edited-content seeding',
        'filesystem-only assertions',
        'visible Save action'
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql',
  source_content_sha256 = repeat(md5('RunDbtAuthorCodeRunLiveProof:implemented:639'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_id = 'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';

update planning_query_store.frontend_component_local_components component
set
  capability_gaps = '[]'::jsonb,
  evidence_refs = (
    select jsonb_agg(distinct evidence_ref order by evidence_ref)
    from jsonb_array_elements_text(
      coalesce(component.evidence_refs, '[]'::jsonb)
        || jsonb_build_array('EV-CODE-WORKING-TREE-LIVE-VERTICAL')
    ) evidence(evidence_ref)
  ),
  raw_component = coalesce(component.raw_component, '{}'::jsonb) || jsonb_build_object(
    'strictLiveEvidenceStatus', 'current',
    'strictLiveEvidenceCommand', 'pnpm test:web:e2e:dbt-author-code-run:live'
  ),
  source_path = 'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql',
  source_content_sha256 = md5('CodeWorkingTreeSync:live-vertical:implemented:639'),
  updated_at = now()
where component.component_id = 'web.component.code.CodeWorkingTreeSync';

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
  'e2e-test',
  null,
  jsonb_build_object(
    'status', 'implemented',
    'coverage', 'protected DBT authoring, preview, run, Monaco autosync, authoritative API read, and browser reopen'
  ),
  'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql',
  md5('file:canvas-dbt-author-code-run-live:CodeWorkingTreeSync:639')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_evidence
set
  evidence_status = 'passing',
  raw_evidence = coalesce(raw_evidence, '{}'::jsonb) || jsonb_build_object(
    'executedCommand', 'pnpm test:web:e2e:dbt-author-code-run:live',
    'result', '1 passing',
    'realAdapters', jsonb_build_array('protected API', 'PostgreSQL', 'Temporal', 'dbt', 'scoped filesystem'),
    'browserReopenVerified', true
  ),
  source_path = 'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql',
  source_content_sha256 = md5('EV-CODE-WORKING-TREE-LIVE-VERTICAL:passing:639'),
  updated_at = now()
where evidence_id = 'EV-CODE-WORKING-TREE-LIVE-VERTICAL';

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
values (
  'web.component.code.CodeWorkingTreeSync',
  'EV-CODE-WORKING-TREE-LIVE-VERTICAL',
  'e2e-test',
  'current',
  'pnpm test:web:e2e:dbt-author-code-run:live',
  'SaveWorkspaceFileContent',
  'code-working-tree-live-vertical',
  'A demanding user can author and execute a DBT graph, edit generated project code in Monaco, and observe the exact edit after protected persistence and browser reopen.',
  jsonb_build_object(
    'queryRail', 'GetWorkspaceFileContent',
    'mutationRail', 'SaveWorkspaceFileContent',
    'deliveryProofRail', 'RunDbtAuthorCodeRunLiveProof',
    'noIntercept', true,
    'noFakeSave', true,
    'browserReopen', true
  ),
  'tools/planning-db/migrations/639_code_working_tree_live_vertical_closeout.sql',
  md5('evidence:CodeWorkingTreeSync:strict-live:639')
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
  'TEST-CODE-WORKING-TREE-STRICT-LIVE-VERTICAL',
  'SYS-WEB-VIEWS-CODE',
  'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
  'e2e',
  'behavior',
  true,
  'pnpm test:web:e2e:dbt-author-code-run:live'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

update architecture.component_relation
set
  status = 'implemented',
  failure_mode = 'Any failure in protected authoring, preview, run, autosync, authoritative read, or browser reopen blocks evidence promotion and PR closeout.',
  source_refs = jsonb_build_array(
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-live-proof.test.cjs',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
  ),
  updated_at = now()
where relation_id = 'REL-CI-RUNTIME-PROOFS-GUARD-WEB-CODE-WORKING-TREE';
