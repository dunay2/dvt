-- Repoint BottomOperationalDrawer local feature rails away from files that
-- were planned but never landed. The implementation is currently split across
-- legacy bottom-console model vocabulary and OperationalDrawerPanels.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-BOTTOM-OPERATIONAL-DRAWER-LOCAL-SOURCE-REPOINT-20260618',
  'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
  'Bottom operational drawer local feature source repoint',
  'Architecture / Web',
  'review',
  'The local feature-mechanization rails for the bottom operational drawer referenced planned files that were not committed. Source drift must be resolved by pointing to tracked implementation files and preserving the missing planned paths as deprecated metadata, not by recreating phantom files.',
  'hidden_authority',
  'BuildBottomOperationalDrawerLogModel;RenderBottomOperationalDrawer',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

with rail_mapping (
  rail_name,
  new_source_path,
  deprecated_source_path,
  implementation_refs
) as (
  values
    (
      'BuildBottomOperationalDrawerLogModel',
      'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BottomConsoleDrawerModel',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BottomConsoleDrawerModelBase',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BuildBottomConsoleDrawerModelInput',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#buildBottomConsoleDrawerModel'
      )
    ),
    (
      'RenderBottomOperationalDrawer',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
      jsonb_build_array(
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerTabs',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerBody'
      )
    )
),
source_files as (
  select
    file_ref.path,
    file_ref.source_content_sha256
  from planning_query_store.governance_file_query file_ref
  join rail_mapping mapping
    on mapping.new_source_path = file_ref.path
)
update planning_query_store.feature_mechanization_local_rails rail
set
  source_path = mapping.new_source_path,
  source_content_sha256 = source_files.source_content_sha256,
  symbol_refs = mapping.implementation_refs,
  implementation_refs = mapping.implementation_refs,
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'deprecatedSourcePath',
      mapping.deprecated_source_path,
      'currentImplementationSourcePath',
      mapping.new_source_path,
      'sourceRepointDesign',
      'PLANNING-DB-BOTTOM-OPERATIONAL-DRAWER-LOCAL-SOURCE-REPOINT-20260618'
    ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'deprecatedSourcePaths',
      jsonb_build_array(mapping.deprecated_source_path),
      'currentImplementationSourcePath',
      mapping.new_source_path
    ),
  updated_at = now()
from rail_mapping mapping
join source_files
  on source_files.path = mapping.new_source_path
where rail.rail_name = mapping.rail_name
  and rail.feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1';
