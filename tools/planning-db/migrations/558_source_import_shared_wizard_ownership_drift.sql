-- Reconcile remaining Source Import wizard ownership drift exposed by the
-- frontend-component-files query. The Add Source dialog may reference child
-- components, but each concrete source file needs one visible owner.

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
  'apps/web/src/app/components/sourceImportWizard/copy.ts',
  'copy-contract',
  'sourceImportWizardCopy',
  jsonb_build_object(
    'responsibility',
    'Own the Add Source dialog copy contract shared by wizard frame, connection, selection, metadata, review, and result surfaces.',
    'rail',
    'OpenCanvasSourceImportDialog',
    'reassignedFromComponentIds',
    jsonb_build_array(
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
    )
  ),
  'tools/planning-db/migrations/558_source_import_shared_wizard_ownership_drift.sql',
  md5('file:SourceImportDialog:copy-contract:558')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

with retired_files(component_id, file_path, file_role, exported_symbol, reassigned_to_component, reassigned_rail, reason) as (
  values
    (
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'copy-contract',
      'sourceImportWizardCopy.selectionBasket',
      'web.component.canvas.SourceImportDialog',
      'OpenCanvasSourceImportDialog',
      'Source Import copy is a dialog-wide presentation contract, not a catalog leaf-owned file.'
    ),
    (
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'copy-contract',
      'sourceImportWizardCopy.review.registryFileLabel',
      'web.component.canvas.SourceImportDialog',
      'OpenCanvasSourceImportDialog',
      'Source Import copy is a dialog-wide presentation contract, not a wizard-step leaf-owned file.'
    ),
    (
      'web.component.canvas.SourceImportDialog',
      'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
      'component',
      'ReviewStep',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      'ImportWarehouseSources',
      'The review step is a concrete wizard-step container and must not remain visible under the dialog aggregate.'
    ),
    (
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
      'state-controller',
      'useSourceImportWizard',
      'web.component.canvas.SourceImportDialog',
      'OpenCanvasSourceImportDialog',
      'The wizard controller coordinates the complete dialog state and import port, not only the catalog query view.'
    )
)
insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
select
  retired_files.component_id,
  retired_files.file_path,
  retired_files.file_role,
  retired_files.exported_symbol,
  jsonb_build_object(
    'retiredForSourceImportSharedOwnership', true,
    'reassignedToComponent', retired_files.reassigned_to_component,
    'reassignedRail', retired_files.reassigned_rail,
    'reason', retired_files.reason
  ),
  'tools/planning-db/migrations/558_source_import_shared_wizard_ownership_drift.sql',
  md5('retire:' || retired_files.component_id || ':' || retired_files.file_path || ':' || retired_files.file_role || ':558')
from retired_files
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
  and not coalesce((file_ref.raw_file ->> 'retiredForSourceImportCatalogOwnership')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForSourceImportStepOwnership')::boolean, false)
  and not coalesce((file_ref.raw_file ->> 'retiredForSourceImportSharedOwnership')::boolean, false);

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
    and not coalesce((file_ref.raw_file ->> 'retiredForSourceImportStepOwnership')::boolean, false)
    and not coalesce((file_ref.raw_file ->> 'retiredForSourceImportSharedOwnership')::boolean, false)
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
values (
  'web.component.canvas.SourceImportDialog',
  'EV-SOURCE-IMPORT-SHARED-WIZARD-OWNERSHIP-DEDUP',
  'architecture-test',
  'current',
  'pnpm planning:db:query frontend-component-files --path apps/web/src/app/components/sourceImportWizard/copy.ts --limit 80',
  'OpenCanvasSourceImportDialog',
  'source-import-shared-wizard-ownership-dedup',
  'Shared Source Import wizard files have one visible owner matching their responsibility: dialog copy and controller on SourceImportDialog, review step on SourceImportWizardSteps.',
  jsonb_build_object(
    'dialogOwnedFiles',
    jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
    ),
    'wizardStepOwnedFiles',
    jsonb_build_array('apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx'),
    'retiredOwners',
    jsonb_build_array(
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      'web.component.canvas.SourceImportDialog'
    )
  ),
  'tools/planning-db/migrations/558_source_import_shared_wizard_ownership_drift.sql',
  md5('EV-SOURCE-IMPORT-SHARED-WIZARD-OWNERSHIP-DEDUP:558')
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
