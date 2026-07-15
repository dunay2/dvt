-- Make the implementation closeout visible to component path/integrity
-- queries after all relational ownership rows exist.

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;

do $$
begin
  if not exists (
    select 1
    from planning_query_store.frontend_component_file_query file
    where file.component_id = 'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION'
      and file.file_path = 'apps/web/src/app/components/dbtProjectImport/DbtProjectImportDialogView.tsx'
  ) then
    raise exception 'dbt project import presentation path is not owned by its frontend component';
  end if;
end $$;

