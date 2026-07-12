-- Remove JSON shadows of normalized consumers, rails, and evidence. The
-- interaction boundary is shared across plugins; its scope and dependencies
-- are expressed through relational component and rail records only.

update planning_query_store.frontend_component_local_components
set
  plugin_scope = null,
  evidence_refs = '[]'::jsonb,
  raw_component = (
    coalesce(raw_component, '{}'::jsonb)
      - 'consumers'
      - 'governingRails'
  ) || jsonb_build_object(
    'relationAuthority', 'architecture.component_relation',
    'railAuthority', 'planning_query_store.frontend_component_local_cq_rails',
    'evidenceAuthority', 'planning_query_store.frontend_component_validation_evidence'
  ),
  source_path = 'tools/planning-db/migrations/599_canvas_node_interaction_boundary_relational_cleanup.sql',
  source_content_sha256 = md5('component:CanvasNodeInteractionBoundary:relational-cleanup:599'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeInteractionBoundary';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'web.component.canvas.CanvasNodeInteractionBoundary',
  'invariant',
  'Consumers, rails, and validation evidence are queried from normalized relations rather than duplicated JSON arrays.',
  1
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
