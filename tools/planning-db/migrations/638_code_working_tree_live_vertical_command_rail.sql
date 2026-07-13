-- Register the repository command that runs the strict Code working-tree live
-- vertical. This is a delivery proof command, not a second product persistence
-- rail: the browser continues to use GetWorkspaceFileContent and
-- SaveWorkspaceFileContent through the protected API.

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof',
  'E-DBT-CODE-WORKING-TREE-SYNC-20260712',
  'implemented',
  'RunDbtAuthorCodeRunLiveProof',
  'rundbtauthorcoderunliveproof',
  'command',
  'DeliveryRuntimeProofs',
  'planned',
  jsonb_build_array(
    'scripts/run-selected-closure-live-proof.cjs#resolveLiveProofSpecPath',
    'scripts/run-selected-closure-live-proof.cjs#main'
  ),
  jsonb_build_array(
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-live-proof.test.cjs',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'apps/web/package.json',
    'package.json',
    'tools/planning-db/migrations/638_code_working_tree_live_vertical_command_rail.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/code-workbench-workspace-files-component.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/guides/ai-work-protocol.md'
  ),
  jsonb_build_array(
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-live-proof.test.cjs',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'apps/web/package.json',
    'package.json',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/638_code_working_tree_live_vertical_command_rail.sql'
  ),
  jsonb_build_array(
    'node --test scripts/run-selected-closure-live-proof.test.cjs',
    'pnpm test:web:e2e:dbt-author-code-run:live',
    'no workspace-file route intercepts',
    'no direct edited-content seeding',
    'no filesystem-only persistence assertion'
  ),
  jsonb_build_array(
    'node --test scripts/run-selected-closure-live-proof.test.cjs',
    'pnpm test:web:e2e:dbt-author-code-run:live',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/638_code_working_tree_live_vertical_command_rail.sql',
  repeat(md5('RunDbtAuthorCodeRunLiveProof:planned:638'), 2),
  jsonb_build_object(
    'name', 'RunDbtAuthorCodeRunLiveProof',
    'type', 'command',
    'dddObject', 'CodeWorkingTreeLiveProofRun',
    'applicationPort', 'run-selected-closure-live-proof CLI --spec',
    'adapterSurface', 'Docker Compose protected runtime and Cypress Electron',
    'scopeAndAuthorization', 'local protected API tenant, project, and environment scope',
    'reusesProductRails', jsonb_build_array(
      'GetWorkspaceFileContent',
      'SaveWorkspaceFileContent'
    ),
    'negativeTests', jsonb_build_array(
      'reject a spec outside apps/web/cypress/e2e',
      'reject a non-Cypress TypeScript spec',
      'fail when protected API authorization is unavailable',
      'fail when persisted content differs from the browser edit',
      'fail when the browser cannot reopen the persisted content'
    ),
    'createsProductPersistencePath', false
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-CODE-WORKING-TREE-SYNC-20260712',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Prove the existing Code working-tree query and command rails through one protected browser-to-filesystem-to-browser vertical.',
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
      'docs/architecture/command-query-rail-governance.md'
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
