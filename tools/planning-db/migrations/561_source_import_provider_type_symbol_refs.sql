-- Complete the Source Import supported-provider catalog rail with the exported
-- type aliases derived from the provider constant. The aliases are part of the
-- public web/API command contract and belong to the CreateWarehouseConnection rail.

with target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1'
    and rail_name = 'CreateWarehouseConnection'
),
new_symbol_refs(ref) as (
  values
    ('apps/web/src/app/ports/workspace.ts#WarehouseConnectionType'),
    ('apps/api/src/application/ports/warehouseSourceImport.ts#WarehouseConnectionType')
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from new_symbol_refs
      ) refs
    ) as symbol_refs
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = patched.symbol_refs,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{supportedProviderCatalog,sharedSymbols}',
      (
        select jsonb_agg(to_jsonb(ref) order by ref)
        from (
          select distinct existing.ref
          from jsonb_array_elements_text(
            coalesce(
              rail.raw_manifest #> '{supportedProviderCatalog,sharedSymbols}',
              '[]'::jsonb
            )
          ) existing(ref)
          union
          select ref from new_symbol_refs
        ) refs
      ),
      true
    ),
    '{supportedProviderCatalog,typeAliasesRegistered}',
    'true'::jsonb,
    true
  ),
  source_path = 'tools/planning-db/migrations/561_source_import_provider_type_symbol_refs.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:provider-type-symbol-refs:561'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
