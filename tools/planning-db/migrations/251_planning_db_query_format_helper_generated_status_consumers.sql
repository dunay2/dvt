-- Extend the canonical Planning DB query format helper to the remaining
-- generated-status consumers after migration 250 was applied locally.

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-QUERY-FORMAT-HELPER-COMPONENT-20260619',
    'path',
    'scripts/generate-db-surface-inventory.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-QUERY-FORMAT-HELPER-COMPONENT-20260619',
    'path',
    'scripts/generate-knowledge-intake-literature.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-QUERY-FORMAT-HELPER-COMPONENT-20260619',
    'path',
    'scripts/planning-db-surface-inventory-check.cjs',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FORMAT',
  'consumer',
  'DB surface inventory generator, knowledge-intake generator, and surface inventory check import the canonical textValue helper.',
  0
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component_relation
set
  source_refs = jsonb_build_array(
    'scripts/planning-db/query-format.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/generate-db-surface-inventory.cjs',
    'scripts/generate-knowledge-intake-literature.cjs',
    'scripts/planning-db-surface-inventory-check.cjs'
  ),
  status = 'implemented',
  updated_at = now()
where relation_id = 'REL-CI-GOVERNANCE-SCRIPTS-CONTAINS-PLANNING-DB-QUERY-FORMAT';
