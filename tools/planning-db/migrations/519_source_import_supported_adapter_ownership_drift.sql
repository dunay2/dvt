-- Reconcile the supported-adapter posture with effective component ownership.
-- WarehouseConnectionCreateForm is a source-import step presentation file, not a
-- root component file, and the old warehouseConnectionTypes symbol was retired.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'owns',
    'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
    7
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

with target_rail as (
  select 'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection'::text as rail_id
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
      where existing.ref <> 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx#warehouseConnectionTypes'
    ) as symbol_refs,
    (
      select jsonb_agg(value order by value ->> 'path', value ->> 'name')
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(value)
      where not (
        value ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx'
        and value ->> 'name' = 'warehouseConnectionTypes'
      )
    ) as manifest_symbols
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rail on target_rail.rail_id = rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = coalesce(patched.symbol_refs, '[]'::jsonb),
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/519_source_import_supported_adapter_ownership_drift.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:supported-adapter-ownership-drift:519'),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
