-- Make the Source Import live proof inspectable from Planning DB instead of
-- relying on the frontend-component inventory Markdown as the authority. The
-- Cypress spec remains owned by the catalog view; this migration adds the
-- runner and architecture guard to the SourceImportDialog component and records
-- the live Cypress spec as validation evidence.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.SourceImportDialog',
    'scripts/run-canvas-source-import-live-proof.cjs',
    'live-proof-runner',
    'CanvasSourceImportLiveProofRunner',
    jsonb_build_object(
      'responsibility',
      'Boot the protected-runtime Source Import browser proof with local Postgres, Temporal, API, web, and Cypress Docker wiring.',
      'rail',
      'AttachWarehouseSourceFromCanvasContext',
      'ownedAs',
      'validation-runner',
      'cypressSpec',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'noStubAuthority',
      true
    ),
    'tools/planning-db/migrations/559_source_import_live_proof_db_first_ownership.sql',
    md5('file:SourceImportDialog:live-proof-runner:559')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object(
      'responsibility',
      'Guard the Add Source live proof against draft-boundary stubs and require DB-first component ownership evidence.',
      'rail',
      'AttachWarehouseSourceFromCanvasContext',
      'ownedAs',
      'architecture-guard',
      'cypressSpec',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'forbiddenShortcuts',
      jsonb_build_array(
        'cy.intercept',
        'stubE2eApi',
        'stubE2eJsonApi',
        'stubCanvasDraft',
        'seedLiveSelectedClosureDraft'
      )
    ),
    'tools/planning-db/migrations/559_source_import_live_proof_db_first_ownership.sql',
    md5('file:SourceImportDialog:live-proof-architecture-test:559')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
  'web.component.canvas.SourceImportDialog',
  'EV-SOURCE-IMPORT-LIVE-PROOF-DB-FIRST-OWNERSHIP',
  'architecture-test',
  'current',
  'pnpm planning:db:query frontend-component-files --component web.component.canvas.SourceImportDialog --limit 120',
  'AttachWarehouseSourceFromCanvasContext',
  'source-import-live-proof-db-first-ownership',
  'The Source Import live proof runner and architecture guard are inspectable through Planning DB ownership, while the live Cypress proof remains the browser evidence for the Add Source flow.',
  jsonb_build_object(
    'componentId',
    'web.component.canvas.SourceImportDialog',
    'ownedFiles',
    jsonb_build_array(
      'scripts/run-canvas-source-import-live-proof.cjs',
      'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts'
    ),
    'browserEvidence',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'dbQueries',
    jsonb_build_array(
      'pnpm planning:db:query frontend-component-files --path scripts/run-canvas-source-import-live-proof.cjs --limit 40',
      'pnpm planning:db:query frontend-component-files --path apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts --limit 40',
      'pnpm planning:db:query component-integrity --component web.component.canvas.SourceImportDialog --limit 80'
    ),
    'noStubAuthority',
    true
  ),
  'tools/planning-db/migrations/559_source_import_live_proof_db_first_ownership.sql',
  md5('EV-SOURCE-IMPORT-LIVE-PROOF-DB-FIRST-OWNERSHIP:559')
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

