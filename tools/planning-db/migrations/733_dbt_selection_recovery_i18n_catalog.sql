begin;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  and pattern in (
    'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.ts',
    'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.test.ts'
  );

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  and file_path in (
    'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.ts',
    'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.test.ts'
  );

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  and pattern = 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryMessages.ts';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
  'owns',
  'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryMessages.ts',
  1
);

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
  'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryMessages.ts',
  'i18n-message-contract',
  'OperationalDrawerSelectionRecoveryMessages;formatOperationalDrawerSelectionRecoveryReceipt',
  jsonb_build_object('ownership', 'owned', 'translations', 'CanvasViewCopy'),
  'tools/planning-db/migrations/733_dbt_selection_recovery_i18n_catalog.sql',
  md5('file:selection-recovery-i18n-messages:733')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256;

do $$
declare
  stale_copy_count integer;
  i18n_file_count integer;
begin
  select count(*) into stale_copy_count
  from planning_query_store.frontend_component_file_query
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    and file_path ilike '%SelectionRecoveryCopy%';

  select count(*) into i18n_file_count
  from planning_query_store.frontend_component_file_query
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    and file_path = 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryMessages.ts';

  if stale_copy_count <> 0 then
    raise exception 'Selection recovery retains % stale local-copy files', stale_copy_count;
  end if;

  if i18n_file_count <> 1 then
    raise exception 'Selection recovery requires one canonical i18n message contract, found %', i18n_file_count;
  end if;
end $$;

commit;
