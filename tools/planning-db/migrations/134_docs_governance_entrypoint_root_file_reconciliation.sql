-- Reconcile root documentation files missed by the first Docs governance split.
-- They are active entrypoint/governance-policy files, so they are claimed by
-- SYS-DOCS-GOVERNANCE-ENTRYPOINTS instead of left on the composite root.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'owns',
    'docs/index.md',
    9
  ),
  (
    'SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'owns',
    'docs/generated-docs-policy.json',
    10
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
    'SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'public_api',
    'docs/index.md',
    3
  ),
  (
    'SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'public_api',
    'docs/generated-docs-policy.json',
    4
  ),
  (
    'SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'invariant',
    'Docs root navigation and generated-doc policy files must be owned by the entrypoints component rather than the composite documentation root.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
