-- Prove the Source Import live flow through the real CreateWarehouseConnection
-- rail. This does not introduce a new command/query: it records that the
-- browser proof creates a governed connection before testing, browsing, and
-- importing warehouse sources.

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
  'web.component.canvas.SourceImportDialog',
  'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
  'component',
  'WarehouseConnectionCreateForm',
  jsonb_build_object(
    'role', 'controlled presentation form',
    'rail', 'CreateWarehouseConnection',
    'credentialPosture', 'credentialRef only; no raw secret capture',
    'stableSelectors', jsonb_build_array(
      'source-import-create-connection-name',
      'source-import-create-connection-type',
      'source-import-create-connection-database',
      'source-import-create-connection-credential-ref'
    ),
    'localLiveCredentialRef', 'env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL'
  ),
  'tools/planning-db/migrations/549_source_import_create_connection_live_proof.sql',
  md5('SourceImportDialog:WarehouseConnectionCreateForm:live-proof:549')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
values
  (
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-CREATE-CONNECTION-LIVE-PROOF',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'CreateWarehouseConnection',
    'source-import-create-connection-live-proof',
    'The browser Source Import proof creates a real Postgres connection through CreateWarehouseConnection, then tests it, browses real metadata, imports a source, and verifies the imported graph card.',
    jsonb_build_object(
      'featureIds', jsonb_build_array(
        'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
      ),
      'railsExercisedInOrder', jsonb_build_array(
        'CreateWarehouseConnection',
        'TestWarehouseConnection',
        'ListWarehouseConnectionTables',
        'ImportWarehouseSources',
        'RenderCanvasGraphNodeCard'
      ),
      'stableSelectors', jsonb_build_array(
        'source-import-create-connection-name',
        'source-import-create-connection-type',
        'source-import-create-connection-database',
        'source-import-create-connection-credential-ref'
      ),
      'credentialRef', 'env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL',
      'forbidden', jsonb_build_array(
        'preselecting Local Postgres proof as the only browser evidence',
        'cy.intercept for /workspace/graph/draft',
        'direct database seeding inside the Cypress spec',
        'raw credential capture in the browser'
      )
    ),
    'tools/planning-db/migrations/549_source_import_create_connection_live_proof.sql',
    md5('evidence:source-import-create-connection-live-proof:549')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-CREATE-CONNECTION-SELECTORS',
    'presentation-test',
    'current',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'CreateWarehouseConnection',
    'source-import-create-connection-live-proof',
    'The Source Import presentation test protects the create-connection command fields and the local live credentialRef example used by the browser proof.',
    jsonb_build_object(
      'featureIds', jsonb_build_array('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1'),
      'asserts', jsonb_build_array(
        'CreateWarehouseConnection receives env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL as a credentialRef',
        'the credentialRef field exposes a stable selector',
        'missing command fields fail closed before invoking the port'
      )
    ),
    'tools/planning-db/migrations/549_source_import_create_connection_live_proof.sql',
    md5('evidence:source-import-create-connection-selectors:549')
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

with implementation_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx'),
    ('apps/web/src/app/components/SourceImportWizard.test.tsx'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('tools/planning-db/migrations/549_source_import_create_connection_live_proof.sql')
),
architecture_guards(ref) as (
  values
    ('apps/web/src/app/components/SourceImportWizard.test.tsx'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('pnpm docs:feature-mechanization:implementation')
),
target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id in (
    'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1',
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
  )
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.implementation_refs, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
        || (select jsonb_agg(ref) from architecture_guards)
      ) as item(value)
    ) as architecture_guards
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  architecture_guards = merged.architecture_guards,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rail.raw_manifest, '{}'::jsonb),
          '{implementationRefs}',
          merged.implementation_refs,
          true
        ),
        '{allowedImplementationSurfaces}',
        merged.allowed_surfaces,
        true
      ),
      '{architectureGuards}',
      merged.architecture_guards,
      true
    ),
    '{createConnectionLiveProof}',
    jsonb_build_object(
      'browserProof', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'presentationProof', 'apps/web/src/app/components/SourceImportWizard.test.tsx',
      'commandRail', 'CreateWarehouseConnection',
      'downstreamRails', jsonb_build_array(
        'TestWarehouseConnection',
        'ListWarehouseConnectionTables',
        'ImportWarehouseSources',
        'RenderCanvasGraphNodeCard'
      ),
      'credentialRef', 'env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL',
      'evidence', 'EV-SOURCE-IMPORT-CREATE-CONNECTION-LIVE-PROOF',
      'noStub', true
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/549_source_import_create_connection_live_proof.sql',
  source_content_sha256 = md5('source-import-create-connection-live-proof:549:' || rail.rail_id),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
