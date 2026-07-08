-- Expose the Source Import wizard steps as a DB-first frontend component.
-- Earlier migrations recorded files, rails, and evidence against this owner,
-- but without a local frontend component row the frontend-component queries
-- could not show the component. This migration declares the missing component
-- and keeps the existing ImportWarehouseSources rail as the sole product rail.

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'SourceImportWizardSteps',
  'form',
  'current',
  'harden',
  'Frontend / Canvas',
  'Owns the Add Source wizard step composition, including selected-source review presentation, without owning warehouse discovery adapters or canvas graph mutation.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array(
    'EV-SOURCE-IMPORT-WIZARD-STEPS-COMPONENT-QUERY',
    'EV-SOURCE-IMPORT-REVIEW-METRICS-MODEL',
    'EV-SOURCE-IMPORT-REVIEW-METRICS-PRESENTATION'
  ),
  'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
  md5('component:SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS:555'),
  jsonb_build_object(
    'dbFirst', true,
    'parentComponentIds', jsonb_build_array(
      'web.component.canvas.SourceImportDialog',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD'
    ),
    'architectureRelations', jsonb_build_array(
      'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-STEPS',
      'REL-WEB-CANVAS-SOURCE-IMPORT-STEPS-DEPENDS-ON-CATALOG-VIEW'
    ),
    'fowlerSignals', jsonb_build_array(
      'missing_component_identity',
      'query_visibility_drift',
      'container_presentation_split'
    ),
    'componentQueries', jsonb_build_array(
      'pnpm planning:db:query frontend-components --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 20',
      'pnpm planning:db:query frontend-component-files --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 100',
      'pnpm planning:db:query frontend-component-rails --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 100'
    )
  )
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = coalesce(planning_query_store.frontend_component_local_components.raw_component, '{}'::jsonb)
    || excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'web.canvas.graph',
  '/canvas',
  'source-import-wizard-steps',
  76,
  jsonb_build_object(
    'parentComponentId', 'web.component.canvas.SourceImportDialog',
    'surfaceRole', 'modal step composition for contextual Add Source'
  ),
  'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
  md5('surface:SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS:web.canvas.graph:555')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'presentation-template',
    'SourceImportReviewView',
    jsonb_build_object(
      'responsibility',
      'Render selected-source review rows from the review read model as part of the Source Import wizard steps component.',
      'rail',
      'ImportWarehouseSources',
      'stableSelectors',
      jsonb_build_array('data-source-import-registry-path', 'data-source-import-review-table'),
      'parentComponentId',
      'web.component.canvas.SourceImportDialog'
    ),
    'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
    md5('file:SourceImportReviewView:555')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
    'read-model',
    'buildSourceImportReviewPreviewGroups',
    jsonb_build_object(
      'responsibility',
      'Project selected warehouse source tables into review groups with registry path, table count, row count, byte size, and column labels.',
      'rail',
      'ImportWarehouseSources',
      'exports',
      jsonb_build_array(
        'SourceImportReviewPreviewGroupViewModel',
        'buildSourceImportReviewPreviewGroups'
      )
    ),
    'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
    md5('file:sourceImportReviewModel:555')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'scripts/planning-db-migrate.test.cjs',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage',
      'Guards that SourceImportWizardSteps remains query-visible as a frontend component.',
      'rail',
      'ImportWarehouseSources',
      'asserts',
      jsonb_build_array(
        'frontend_component_local_components',
        'SourceImportWizardSteps',
        'frontend-component-files --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
      )
    ),
    'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
    md5('file:planning-db-migrate-source-import-wizard-steps-test:555')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'ImportWarehouseSources',
  'command',
  'implemented-ui',
  jsonb_build_object(
    'kind', 'command',
    'dddObject', 'WarehouseSourceImportSelection',
    'applicationPort', 'IWarehouseSourceImportPort.importSources',
    'adapterSurface', 'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'scope', 'canvas_add_source_dialog_selected_review',
    'authorization', 'inherits_workspace_source_import_permissions',
    'parentComponentId', 'web.component.canvas.SourceImportDialog',
    'negativeTests', jsonb_build_array(
      'review step cannot proceed with zero selected tables',
      'selected source review metrics come from a read model instead of JSX recomputation',
      'frontend-component queries expose the wizard steps component and its review files'
    )
  ),
  'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
  md5('rail:SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS:ImportWarehouseSources:555')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = coalesce(planning_query_store.frontend_component_local_cq_rails.raw_rail, '{}'::jsonb)
    || excluded.raw_rail,
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
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'EV-SOURCE-IMPORT-WIZARD-STEPS-COMPONENT-QUERY',
  'architecture-test',
  'current',
  'scripts/planning-db-migrate.test.cjs',
  'ImportWarehouseSources',
  'source-import-wizard-steps-component-query',
  'The Source Import wizard steps owner is declared as a frontend component and can be inspected through frontend-component queries.',
  jsonb_build_object(
    'redGreen', true,
    'commands',
    jsonb_build_array(
      'node --test --test-name-pattern "source import wizard steps as a frontend component" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query frontend-component-files --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 100'
    )
  ),
  'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
  md5('evidence:source-import-wizard-steps-component-query:555')
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

with target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id in (
    'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1',
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
  )
),
implementation_refs(ref) as (
  values
    ('tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql'),
    ('scripts/planning-db-migrate.test.cjs')
),
guard_refs(ref) as (
  values
    ('scripts/planning-db-migrate.test.cjs')
),
completion_tests(ref) as (
  values
    ('node --test --test-name-pattern "source import wizard steps as a frontend component" scripts/planning-db-migrate.test.cjs'),
    ('pnpm planning:db:query frontend-components --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 20'),
    ('pnpm planning:db:query frontend-component-files --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 100')
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from implementation_refs
      ) refs
    ) as implementation_refs,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) existing(ref)
        union
        select ref from implementation_refs
      ) refs
    ) as allowed_implementation_surfaces,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.architecture_guards, '[]'::jsonb)) existing(ref)
        union
        select ref from guard_refs
      ) refs
    ) as architecture_guards,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.completion_gate -> 'tests', '[]'::jsonb)) existing(ref)
        union
        select ref from completion_tests
      ) refs
    ) as completion_tests
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = patched.implementation_refs,
  allowed_implementation_surfaces = patched.allowed_implementation_surfaces,
  architecture_guards = patched.architecture_guards,
  completion_gate = jsonb_set(
    case
      when jsonb_typeof(coalesce(rail.completion_gate, '{}'::jsonb)) = 'object'
        then coalesce(rail.completion_gate, '{}'::jsonb)
      else jsonb_build_object('legacyCompletionGate', rail.completion_gate)
    end,
    '{tests}',
    coalesce(patched.completion_tests, '[]'::jsonb),
    true
  ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'sourceImportWizardStepsFrontendComponent',
      jsonb_build_object(
        'componentId', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'componentName', 'SourceImportWizardSteps',
        'parentComponentId', 'web.component.canvas.SourceImportDialog',
        'rail', 'ImportWarehouseSources',
        'queryVisible', true
      )
    ),
  source_path = 'tools/planning-db/migrations/555_source_import_wizard_steps_frontend_component.sql',
  source_content_sha256 = md5('source-import-wizard-steps-frontend-component:555:' || rail.rail_id),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
