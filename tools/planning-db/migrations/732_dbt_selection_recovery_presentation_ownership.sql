begin;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  and pattern_kind = 'owns'
  and pattern = 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
  'owns',
  'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx',
  4
);

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
  'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx',
  'presentation-primitives',
  'OperationalDrawerRecoverySurface;OperationalDrawerRecoveryScopeGrid;OperationalDrawerRecoveryScopeGroup;OperationalDrawerRecoveryActions;OperationalDrawerRecoveryReceipt;OperationalDrawerRecoveryFailure',
  jsonb_build_object('ownership', 'owned', 'tokenized', true),
  'tools/planning-db/migrations/732_dbt_selection_recovery_presentation_ownership.sql',
  md5('file:selection-recovery-presentation-primitives:732')
)
on conflict (component_id, file_path, file_role) do update set
  file_role = excluded.file_role,
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256;

do $$
declare
  owned_file_count integer;
begin
  select count(*) into owned_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    and raw_file ->> 'ownership' = 'owned';

  if owned_file_count <> 3 then
    raise exception 'Selection recovery view requires three owned production files, found %', owned_file_count;
  end if;
end $$;

commit;
