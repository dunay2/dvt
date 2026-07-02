-- Reconcile Source Import catalog-model ownership after splitting the catalog
-- read model out of sourceImportWizardModel.ts. The dialog owns wizard flow and
-- orchestration; SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW owns the catalog
-- query/read model and catalog presentation tests.

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
    'model',
    'buildSourceImportCatalogViewModel',
    jsonb_build_object(
      'responsibility', 'Project warehouse tables into the categorized Source Import catalog read model.',
      'rail', 'RenderSourceImportCatalogView',
      'fowlerSignal', 'separate_query_model_from_wizard_flow',
      'exports', jsonb_build_array(
        'buildWarehouseTableKey',
        'buildSourceImportTableViewModel',
        'buildSourceImportCatalogViewModel',
        'formatSourceImportByteSize'
      )
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('file:sourceImportCatalogModel:505')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage', 'Catalog model projects canonical keys, metrics, search, database/schema grouping, and selected totals.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('file:sourceImportCatalogModel.test:505')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'model',
    'canEnterSourceImportSection',
    jsonb_build_object(
      'responsibility', 'Own Source Import wizard flow policy, section gating, selected-table aggregation, grouping preview, and option defaults.',
      'rails', jsonb_build_array('OpenCanvasSourceImportDialog', 'ImportWarehouseSources'),
      'doesNotOwnCatalogReadModel', true
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('file:SourceImportDialog:sourceImportWizardModel:505')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
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
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'component',
    'SourceImportCatalogView',
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership', true,
      'reassignedToComponent', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'reassignedRail', 'RenderSourceImportCatalogView',
      'reason', 'Catalog view rendering belongs to the Source Import catalog query-view component, not the dialog host.'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('retire:SourceImportDialog:SourceImportCatalogView:505')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership', true,
      'reassignedToComponent', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'reassignedRail', 'RenderSourceImportCatalogView',
      'reason', 'Catalog presentation behavior is tested under the catalog query-view component.'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('retire:SourceImportDialog:SourceImportCatalogView.test:505')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
    'component',
    'SelectionStep',
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership', true,
      'reassignedToComponent', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'reassignedRail', 'RenderSourceImportCatalogView',
      'reason', 'The Browse/Selected surface composes the catalog query-view and selection basket.'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('retire:SourceImportDialog:SelectionStep:505')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'presentation',
    'SourceImportCatalogView',
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership', true,
      'reassignedToComponent', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'retainedRole', 'component',
      'reassignedRail', 'RenderSourceImportCatalogView',
      'reason', 'SourceImportCatalogView.tsx must have one effective role under the catalog component.'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('retire:CatalogView:presentation-duplicate:505')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'model',
    'buildSourceImportCatalogViewModel',
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership', true,
      'reassignedToComponent', 'web.component.canvas.SourceImportDialog',
      'replacementFile', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'reassignedRail', 'RenderSourceImportCatalogView',
      'reason', 'sourceImportWizardModel.ts no longer owns the catalog read model after the SRP split.'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('retire:CatalogView:sourceImportWizardModel:505')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'retiredForSourceImportCatalogOwnership', true,
      'reassignedToComponent', 'web.component.canvas.SourceImportDialog',
      'retainedAsValidationEvidence', true,
      'reason', 'The metadata test exercises the integrated dialog; catalog coverage lives in SourceImportCatalogView.test.tsx and sourceImportCatalogModel.test.ts.'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('retire:CatalogView:SourceImportWizard.metadata:505')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

create or replace view planning_query_store.frontend_component_file_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.exported_symbol,
    imported.raw_file,
    null::text as source_path,
    null::text as source_content_sha256
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select
    local_file.component_id,
    local_file.file_path,
    local_file.file_role,
    local_file.exported_symbol,
    local_file.raw_file,
    local_file.source_path,
    local_file.source_content_sha256
  from planning_query_store.frontend_component_local_files local_file
)
select
  file_ref.component_id,
  component.component_name,
  file_ref.file_path,
  file_ref.file_role,
  file_ref.exported_symbol,
  component.component_status,
  coalesce(file_ref.source_path, component.source_path) as source_path,
  coalesce(file_ref.source_content_sha256, component.source_content_sha256) as source_content_sha256
from effective_files file_ref
join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = file_ref.component_id
where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForPresentationOwnership')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForSourceImportCatalogOwnership')::boolean, false);

create or replace view planning_query_store.frontend_component_summary_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.raw_file
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select
    local_file.component_id,
    local_file.file_path,
    local_file.file_role,
    local_file.raw_file
  from planning_query_store.frontend_component_local_files local_file
),
effective_rails as (
  select
    imported.component_id,
    imported.rail_name,
    imported.raw_rail
  from planning_query_store.frontend_component_cq_rails imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails local_rail
    where local_rail.component_id = imported.component_id
      and local_rail.rail_name = imported.rail_name
  )
  union all
  select
    local_rail.component_id,
    local_rail.rail_name,
    local_rail.raw_rail
  from planning_query_store.frontend_component_local_cq_rails local_rail
),
effective_evidence as (
  select
    imported.component_id,
    imported.evidence_id
  from planning_query_store.frontend_component_evidence imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_evidence local_evidence
    where local_evidence.evidence_id = imported.evidence_id
  )
  union all
  select
    local_evidence.component_id,
    local_evidence.evidence_id
  from planning_query_store.frontend_component_local_evidence local_evidence
),
surface_rollups as (
  select
    link.component_id,
    jsonb_agg(link.surface_id order by link.surface_id) as surface_ids,
    count(*)::int as surface_count
  from planning_query_store.frontend_component_surface_link_query link
  group by link.component_id
),
file_counts as (
  select
    file_ref.component_id,
    count(*)::int as file_count
  from effective_files file_ref
  where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false)
    and not coalesce((file_ref.raw_file ->> 'retiredForPresentationOwnership')::boolean, false)
    and not coalesce((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership')::boolean, false)
    and not coalesce((file_ref.raw_file ->> 'retiredForSourceImportCatalogOwnership')::boolean, false)
  group by file_ref.component_id
),
rail_counts as (
  select
    rail_relation.component_id,
    count(*)::int as rail_count
  from (
    select distinct
      rail.component_id,
      rail.rail_name
    from effective_rails rail
    where not coalesce((rail.raw_rail ->> 'retiredForContextActionCatalog')::boolean, false)
    union
    select distinct
      action.component_id,
      action.rail_name
    from planning_query_store.frontend_component_context_actions action
    where action.rail_name is not null
      and action.action_status <> 'retired'
  ) rail_relation
  group by rail_relation.component_id
),
evidence_counts as (
  select
    evidence.component_id,
    count(*)::int as evidence_count
  from effective_evidence evidence
  group by evidence.component_id
),
gap_counts as (
  select
    gap.component_id,
    count(*)::int as capability_gap_count
  from planning_query_store.frontend_component_capability_gaps gap
  where gap.gap_status in ('open', 'planned', 'moved')
  group by gap.component_id
),
validation_evidence_counts as (
  select
    evidence.component_id,
    count(*)::int as evidence_ref_count
  from planning_query_store.frontend_component_validation_evidence evidence
  where evidence.evidence_status = 'current'
  group by evidence.component_id
)
select
  component.component_id,
  component.component_name,
  component.component_kind,
  component.component_status,
  component.reuse_decision,
  component.frontend_owner,
  component.responsibility,
  component.package_name,
  component.route_scope,
  component.plugin_scope,
  component.capability_gaps,
  component.evidence_refs,
  coalesce(surface_rollups.surface_ids, '[]'::jsonb) as surface_ids,
  coalesce(surface_rollups.surface_count, 0) as surface_count,
  coalesce(file_counts.file_count, 0) as file_count,
  coalesce(rail_counts.rail_count, 0) as rail_count,
  coalesce(evidence_counts.evidence_count, 0) as evidence_count,
  coalesce(gap_counts.capability_gap_count, 0) as capability_gap_count,
  coalesce(validation_evidence_counts.evidence_ref_count, 0) as evidence_ref_count,
  component.source_path,
  component.source_content_sha256,
  component.imported_at,
  coalesce(component.raw_component ->> 'fileOwnershipModel', 'owned-files') as file_ownership_model,
  coalesce((component.raw_component ->> 'fileCountZeroIsValid')::boolean, false) as file_count_zero_is_valid
from planning_query_store.frontend_component_effective_component_query component
left join surface_rollups
  on surface_rollups.component_id = component.component_id
left join file_counts
  on file_counts.component_id = component.component_id
left join rail_counts
  on rail_counts.component_id = component.component_id
left join evidence_counts
  on evidence_counts.component_id = component.component_id
left join gap_counts
  on gap_counts.component_id = component.component_id
left join validation_evidence_counts
  on validation_evidence_counts.component_id = component.component_id;

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-CATALOG-MODEL-SRP',
    'architecture-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
    'RenderSourceImportCatalogView',
    'source-import-catalog-model-ownership',
    'Source Import catalog read-model symbols live in sourceImportCatalogModel.ts instead of the wizard flow model.',
    jsonb_build_object(
      'redGreen', true,
      'redFailure', 'sourceImportCatalogModel.ts was absent and sourceImportWizardModel.ts exported catalog read-model symbols.',
      'componentOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('evidence:source-import-catalog-model-srp:505')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-WIZARD-FLOW-MODEL-SRP',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'OpenCanvasSourceImportDialog',
    'source-import-wizard-flow-model-ownership',
    'Source Import wizard flow policy remains tested separately from catalog rendering and search projection.',
    jsonb_build_object(
      'componentOwner', 'web.component.canvas.SourceImportDialog',
      'catalogModelReplacement', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    md5('evidence:source-import-wizard-flow-model-srp:505')
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
