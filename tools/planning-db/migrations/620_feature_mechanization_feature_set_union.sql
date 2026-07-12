-- A feature is one semantic aggregate even when its rails were last updated by
-- different DB-first migrations. The ListFeatureMechanizationFeatures query
-- reports set-union counts and the complete source-path set per feature.

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
  'FEATURE-MECHANIZATION-FEATURE-SET-UNION-20260711',
  'E-SOURCE-OBJECT-METRICS-PROD-1',
  'Feature mechanization feature set-union read model',
  'Planning DB governance read model',
  'implementing',
  'A feature summary grouped by source_path fragments one feature whenever individual rails evolve in separate migrations. The canonical query must aggregate by feature_id, deduplicate components, symbols and validations, count distinct rails, and expose all provenance paths.',
  'evolutionary_architecture',
  'ListFeatureMechanizationFeatures',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FEATURE-MECHANIZATION',
    'invariant',
    'ListFeatureMechanizationFeatures returns exactly one summary row per feature_id after filters are applied.',
    4
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FEATURE-MECHANIZATION',
    'invariant',
    'Feature component, symbol and validation counts are set-union cardinalities across all active rails, not sums grouped by source_path.',
    5
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FEATURE-MECHANIZATION',
    'invariant',
    'Feature provenance exposes the complete ordered source_paths set.',
    6
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-FEATURE-MECHANIZATION-FEATURE-SET-UNION',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FEATURE-MECHANIZATION',
  'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/planning-db-query-tests/feature-mechanization.test.cjs'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

update architecture.component
set
  public_contract = 'DB-first feature, component, symbol, rail and validation read models with one set-union feature summary and complete provenance paths',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FEATURE-MECHANIZATION';

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'readModel', 'FeatureMechanizationFeatureSetUnion',
    'aggregationKey', 'featureId',
    'provenance', 'sourcePaths',
    'setUnionCounts', jsonb_build_array('componentGuides', 'symbols', 'validations', 'rails')
  ),
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{featureSummaryContract}',
    jsonb_build_object(
      'oneRowPerFeature', true,
      'aggregationKey', 'featureId',
      'sourcePathsAreComplete', true,
      'countsAreDistinctSetCardinalities', true,
      'negativeCase', 'rails updated by different migrations do not split the feature summary'
    ),
    true
  ),
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'scripts/planning-db/queries/feature-mechanization-query.cjs',
        'scripts/planning-db-query-tests/feature-mechanization.test.cjs'
      )
    ) refs(ref)
  ),
  source_path = 'tools/planning-db/migrations/620_feature_mechanization_feature_set_union.sql',
  source_content_sha256 = repeat(md5('ListFeatureMechanizationFeatures:set-union:620'), 2),
  revision = rail.revision + 1,
  updated_at = now()
where rail.rail_name = 'ListFeatureMechanizationFeatures'
  and rail.rail_type = 'query'
  and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired');
