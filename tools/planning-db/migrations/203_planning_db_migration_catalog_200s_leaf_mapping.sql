-- Extend the Planning DB migration catalog leaf mapping to post-199 migration
-- files. Applied migrations remain executable history; age alone is not a
-- deprecation signal.

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
  'PLANNING-DB-MIGRATION-CATALOG-200S-LEAF-MAPPING-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB migration catalog 200-series leaf mapping',
  'Architecture / Planning DB / CI',
  'review',
  'Migration 197 correctly modeled SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING as the owner for component leaf-mapping migrations from 180 onward, but its ownership patterns stopped at 18*.sql and 19*.sql. The Canvas controller component mapping migrations 200 through 202 therefore fell back to the migration aggregate and component-quality reported file_without_leaf_component. This migration extends the governed ownership pattern to the 200-series migration files without creating a parallel inventory or deprecating executable migration history.',
  'boundary_drift',
  'ReadPlanningDbLeafMappingMigrations;ReadComponentProfile;ValidateComponentIntegrity',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-MIGRATION-CATALOG-200S-LEAF-MAPPING-20260619',
    'component',
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-MIGRATION-CATALOG-200S-LEAF-MAPPING-20260619',
    'component',
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-MIGRATION-CATALOG-200S-LEAF-MAPPING-20260619',
    'path',
    'tools/planning-db/migrations/2*.sql',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/203_planning_db_migration_catalog_200s_leaf_mapping.sql',
  source_content_sha256 = md5('SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING:203')
    || md5('planning-db-migration-catalog-200s-leaf-mapping:203'),
  owned_concern = 'Planning DB component leaf-mapping, docs catalog, API HTTP, test evidence, runtime state-store, archive, evidence, risk register, engine architecture, migration catalog split, and post-199 component-map correction migrations.',
  cq_rails = 'ReadPlanningDbLeafMappingMigrations'
where component_id = 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING',
  'owns',
  'tools/planning-db/migrations/2*.sql',
  2
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING',
    'invariant',
    'Tracked 200-series Planning DB migration files must resolve to the leaf-mapping migration component, not the migration aggregate.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING',
    'non_goal',
    'Do not deprecate applied Planning DB migrations only because they are old; deprecated status requires explicit nonfunctional or superseded evidence.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    3
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  public_contract = 'Planning DB component leaf-mapping, docs catalog split, runtime/API/test split, archive/evidence/risk docs split, migration catalog split, and post-199 component-map correction migration changes.',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING';

update architecture.component_responsibility
set
  responsibility = 'Own Planning DB component leaf-mapping, docs catalog, API HTTP, test evidence, runtime state-store, archive, evidence, risk register, engine architecture, migration catalog split, and post-199 component-map correction migrations.',
  reason_to_change = 'Planning DB component leaf mapping, docs catalog split, runtime/API/test split, archive/evidence/risk docs split, migration catalog split, post-199 component-map correction, or migration ownership pattern changes.',
  ddd_owner = 'PlanningDbLeafMappingMigrationReadModel',
  status = 'implemented'
where
  responsibility_id = 'RESP-SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING';
