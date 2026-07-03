-- Reconcile CreateWarehouseConnection presentation ownership after the source
-- import wizard was split into DB-first leaf components. The form belongs to
-- the wizard step leaf that renders connection creation, not to the older
-- SourceImportDialog aggregate component alias.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.SourceImportDialog'
  and file_path = 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx';

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
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
  'component',
  'WarehouseConnectionCreateForm',
  jsonb_build_object(
    'responsibility', 'Render the governed warehouse connection creation form for the Add Source connection step.',
    'rail', 'CreateWarehouseConnection',
    'supportedAdapterTypes', jsonb_build_array('postgres'),
    'credentialPosture', 'credentialRef only; no raw secret capture',
    'reassignedFromComponent', 'web.component.canvas.SourceImportDialog',
    'ownershipRule', 'Connection-step presentation files are owned by SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS.'
  ),
  'tools/planning-db/migrations/520_source_import_create_connection_file_owner_reconcile.sql',
  md5('file:WarehouseConnectionCreateForm:SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS:520')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails rail
set
  documentation_refs = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct case
        when existing.ref = 'planning-db:component/web.component.canvas.SourceImportDialog'
          then 'planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
        else existing.ref
      end as ref
      from jsonb_array_elements_text(coalesce(rail.documentation_refs, '[]'::jsonb)) existing(ref)
    ) refs
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{componentGuides}',
      (
        select jsonb_agg(to_jsonb(ref) order by ref)
        from (
          select distinct case
            when existing.ref = 'web.component.canvas.SourceImportDialog'
              then 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
            else existing.ref
          end as ref
          from jsonb_array_elements_text(
            coalesce(rail.raw_manifest -> 'componentGuides', '[]'::jsonb)
          ) existing(ref)
        ) refs
      ),
      true
    ),
    '{symbols}',
    (
      select jsonb_agg(
        case
          when value ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx'
            then jsonb_set(value, '{dddOwner}', to_jsonb('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'::text), true)
          else value
        end
        order by value ->> 'path', value ->> 'name'
      )
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(value)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/520_source_import_create_connection_file_owner_reconcile.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:file-owner-reconcile:520'),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_id = 'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection';

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
  'EV-SOURCE-IMPORT-CREATE-CONNECTION-FILE-OWNER-RECONCILE',
  'architecture-test',
  'current',
  'pnpm planning:db:query frontend-component-files --filter apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx --limit 20',
  'CreateWarehouseConnection',
  'source-import-create-connection-file-ownership',
  'WarehouseConnectionCreateForm.tsx resolves to SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS and no longer to web.component.canvas.SourceImportDialog in the frontend component file projection.',
  jsonb_build_object(
    'componentOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'retiredOwner', 'web.component.canvas.SourceImportDialog',
    'file', 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx'
  ),
  'tools/planning-db/migrations/520_source_import_create_connection_file_owner_reconcile.sql',
  md5('EV-SOURCE-IMPORT-CREATE-CONNECTION-FILE-OWNER-RECONCILE:520')
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
