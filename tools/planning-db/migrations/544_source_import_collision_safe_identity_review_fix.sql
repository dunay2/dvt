-- Preserve source-import idempotency and collision-safe YAML identity under the
-- canonical ImportWarehouseSources command rail. This is a review-fix migration
-- for the stable path slice, not a new source-import rail.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'invariant',
    'ImportWarehouseSources must recognize retired raw-lower source node ids when importing the same physical warehouse table so existing drafts remain idempotent after source id normalization.',
    20
  ),
  (
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'invariant',
    'Warehouse source YAML grouping and dbt source names must disambiguate schema/database identifiers that normalize to the same slug instead of merging physically distinct sources.',
    21
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'transition',
    'apps/api/test/application/services/warehouseSourceYaml.test.ts now covers slug-colliding warehouse identifiers and source-name disambiguation for ImportWarehouseSources.',
    20
  ),
  (
    'SYS-API-TESTS-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'transition',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts now covers retired raw-lower source node id idempotency for ImportWarehouseSources.',
    21
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'EV-SOURCE-IMPORT-COLLISION-SAFE-YAML-IDENTITY',
    'unit-test',
    'current',
    'apps/api/test/application/services/warehouseSourceYaml.test.ts',
    'ImportWarehouseSources',
    'source-import-collision-safe-yaml-identity',
    'Warehouse source YAML paths and dbt source names stay distinct when schema/database identifiers normalize to the same slug.',
    jsonb_build_object(
      'asserts',
      jsonb_build_array(
        'groupTablesForYaml creates two collision-safe YAML paths',
        'buildWarehouseSourceYamlUpdates emits two collision-safe source names'
      ),
      'reviewComment',
      'Disambiguate slug-colliding YAML groups'
    ),
    'tools/planning-db/migrations/544_source_import_collision_safe_identity_review_fix.sql',
    md5('evidence:source-import-collision-safe-yaml-identity:544')
  ),
  (
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'EV-SOURCE-IMPORT-RETIRED-NODE-ID-IDEMPOTENCY',
    'unit-test',
    'current',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'ImportWarehouseSources',
    'source-import-retired-node-id-idempotency',
    'ImportWarehouseSources does not create a duplicate node when a draft still contains the retired raw-lower source node id for the same table.',
    jsonb_build_object(
      'asserts',
      jsonb_build_array(
        'sourcesCreated equals 0',
        'importedNodeIds remains empty',
        'existing retired node remains the draft node'
      ),
      'reviewComment',
      'Preserve idempotency for retired source IDs'
    ),
    'tools/planning-db/migrations/544_source_import_collision_safe_identity_review_fix.sql',
    md5('evidence:source-import-retired-node-id-idempotency:544')
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

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_manifest, '{}'::jsonb),
        '{symbols}',
        (
          select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
          from (
            select distinct on (symbol ->> 'path', symbol ->> 'name') symbol
            from (
              select (
                existing.symbol ||
                case
                  when existing.symbol ? 'cypressCoverage' then '{}'::jsonb
                  else jsonb_build_object(
                    'cypressCoverage',
                    'not_applicable: existing Source Import symbol is validated by the rail unit and Cypress evidence registered on this feature'
                  )
                end
              ) as symbol
              from jsonb_array_elements(coalesce(raw_manifest -> 'symbols', '[]'::jsonb)) existing(symbol)
              union all
              select jsonb_build_object(
                'name',
                symbol_name,
                'path',
                symbol_path,
                'dddOwner',
                'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
                'cqRails',
                jsonb_build_array('ImportWarehouseSources'),
                'fowlerSignals',
                jsonb_build_array('collision_safe_identity', 'idempotent_import'),
                'architectureGuard',
                'apps/api/test/application/services/warehouseSourceYaml.test.ts',
                'cypressCoverage',
                'not_applicable: backend ImportWarehouseSources behavior is covered by API unit tests',
                'unitTests',
                jsonb_build_array(
                  'apps/api/test/application/services/warehouseSourceYaml.test.ts',
                  'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
                )
              )
              from (
                values
                  (
                    'groupTablesForYaml',
                    'apps/api/src/application/services/warehouseSourceYamlDescriptor.ts'
                  ),
                  (
                    'toCollisionResistantYamlIdentifierPart',
                    'apps/api/src/application/services/warehouseSourceYamlDescriptor.ts'
                  ),
                  (
                    'buildDefaultSourceNameOwnerIndex',
                    'apps/api/src/application/services/warehouseSourceYamlBindings.ts'
                  ),
                  (
                    'sourceOwnerIdentity',
                    'apps/api/src/application/services/warehouseSourceYamlIdentity.ts'
                  ),
                  (
                    'toSourceNodeIdCandidates',
                    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
                  ),
                  (
                    'toRetiredRawSourceNodeId',
                    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
                  ),
                  (
                    'toRetiredStableSourceNodeId',
                    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
                  ),
                  (
                    'buildWarehouseSourceYamlPathFromPart',
                    'apps/api/src/application/services/warehouseSourceYamlDescriptor.ts'
                  ),
                  (
                    'groupingValue',
                    'apps/api/src/application/services/warehouseSourceYamlDescriptor.ts'
                  )
              ) new_symbols(symbol_name, symbol_path)
            ) symbols
            order by symbol ->> 'path', symbol ->> 'name'
          ) unique_symbols
        ),
        true
      ),
      '{implementationRefs}',
      (
        select jsonb_agg(to_jsonb(ref) order by ref)
        from (
          select distinct existing.ref
          from jsonb_array_elements_text(coalesce(raw_manifest -> 'implementationRefs', '[]'::jsonb)) existing(ref)
          union
          select new_ref.ref
          from (
            values
              ('apps/api/src/application/services/warehouseSourceYamlBindings.ts'),
              ('apps/api/src/application/services/warehouseSourceYamlDescriptor.ts'),
              ('apps/api/src/application/services/warehouseSourceYamlIdentity.ts'),
              ('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
              ('apps/api/test/application/services/warehouseSourceYaml.test.ts'),
              ('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'),
              ('tools/planning-db/migrations/544_source_import_collision_safe_identity_review_fix.sql')
          ) new_ref(ref)
        ) refs
      ),
      true
    ),
    '{architectureNotes}',
    coalesce(raw_manifest -> 'architectureNotes', '[]'::jsonb) || jsonb_build_array(
      'ImportWarehouseSources preserves retired source node id idempotency and disambiguates slug-colliding warehouse identities before writing dbt source YAML or graph nodes.'
    ),
    true
  ),
  source_content_sha256 = md5(
    'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1:collision-safe-source-import-review-fix:544'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1'
  and rail_id = 'local#E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1#command#importwarehousesources';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
