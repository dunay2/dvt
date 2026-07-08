-- Reconcile the SourceImportDialog connection-step ownership after the live
-- proof exposed a real UX issue: the connection created through
-- CreateWarehouseConnection must remain visible and operable inside the Add
-- Source dialog before TestWarehouseConnection is invoked.

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
  'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
  'component',
  'ConnectionStep',
  jsonb_build_object(
    'role', 'connection-step presentation composition',
    'rails', jsonb_build_array(
      'CreateWarehouseConnection',
      'TestWarehouseConnection',
      'ListWarehouseConnectionTables'
    ),
    'selectedConnectionPosture', 'center selected connection option after creation or selection',
    'stableSelector', 'source-import-connection-option',
    'userFlowRiskRemoved', 'created connection hidden by dialog scroll before Test connection'
  ),
  'tools/planning-db/migrations/550_source_import_selected_connection_visibility.sql',
  md5('SourceImportDialog:ConnectionStep:selected-connection-visibility:550')
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
values (
  'web.component.canvas.SourceImportDialog',
  'EV-SOURCE-IMPORT-CREATED-CONNECTION-VISIBLE',
  'presentation-test',
  'current',
  'apps/web/src/app/components/SourceImportWizard.test.tsx',
  'CreateWarehouseConnection',
  'source-import-selected-connection-visibility',
  'After CreateWarehouseConnection succeeds, the selected connection option is centered in the dialog before the user tests or browses it.',
  jsonb_build_object(
    'featureIds', jsonb_build_array(
      'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1',
      'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
    ),
    'asserts', jsonb_build_array(
      'selected connection option receives scrollIntoView with block center',
      'credentialRef remains env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL',
      'ListWarehouseConnectionTables still uses the created connection id'
    ),
    'noStub', true
  ),
  'tools/planning-db/migrations/550_source_import_selected_connection_visibility.sql',
  md5('evidence:source-import-created-connection-visible:550')
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
    ('apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx'),
    ('apps/web/src/app/components/SourceImportWizard.test.tsx'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('tools/planning-db/migrations/550_source_import_selected_connection_visibility.sql')
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
    '{selectedConnectionVisibility}',
    jsonb_build_object(
      'component', 'ConnectionStep',
      'file', 'apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx',
      'commandRail', 'CreateWarehouseConnection',
      'downstreamRails', jsonb_build_array(
        'TestWarehouseConnection',
        'ListWarehouseConnectionTables'
      ),
      'proof', 'EV-SOURCE-IMPORT-CREATED-CONNECTION-VISIBLE',
      'noStub', true
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/550_source_import_selected_connection_visibility.sql',
  source_content_sha256 = md5('source-import-selected-connection-visibility:550:' || rail.rail_id),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
