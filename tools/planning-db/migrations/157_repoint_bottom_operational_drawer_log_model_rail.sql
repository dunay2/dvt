-- Reconcile local DBs that applied an earlier bottom drawer migration before
-- the BuildBottomOperationalDrawerLogModel source path was canonicalized.

update planning_query_store.feature_mechanization_local_rails
set
  source_path = 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModel',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModelBase',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BuildBottomOperationalDrawerLogModelInput',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#buildBottomOperationalDrawerLogModel'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModel',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModelBase',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BuildBottomOperationalDrawerLogModelInput',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#buildBottomOperationalDrawerLogModel'
  ),
  raw_manifest = replace(
    raw_manifest::text,
    'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts'
  )::jsonb,
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts'
    ),
    source_content_sha256
  ),
  revision = revision + 1,
  updated_at = now()
where
  feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
  and normalized_rail_name = 'buildbottomoperationaldrawerlogmodel'
  and source_path = 'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts';
