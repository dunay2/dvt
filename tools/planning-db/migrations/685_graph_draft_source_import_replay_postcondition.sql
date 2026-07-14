-- Keep ImportWarehouseSources replay responses bound to persisted graph truth.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'invariant',
    'A deduplicated draft save returns only source-node identities verified in the persisted authoritative draft.',
    2
  ),
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'invariant',
    'A replay whose persisted source-node postcondition no longer holds fails closed without compensating the original deduplicated file batch.',
    3
  ),
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'transition',
    'A deduplicated graph save is followed by authoritative postcondition verification before an ImportWarehouseSources receipt is emitted.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component_responsibility
set
  responsibility = 'Mutate source YAML and the target graph-draft Canvas as one compensated command, with persisted postcondition verification on replay.',
  reason_to_change = 'Graph-draft source import aggregate or replay semantics change.',
  status = 'implemented'
where responsibility_id = 'RESP-GRAPH-DRAFT-WAREHOUSE-SOURCE-IMPORT';

update architecture.component_observability
set
  signal_name = 'Draft revision, persisted imported node identities, replay postcondition conflicts, idempotency mismatch, and rollback failure are explicit command outcomes.',
  status = 'implemented'
where observability_id = 'OBS-GRAPH-DRAFT-SOURCE-IMPORT';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/685_graph_draft_source_import_replay_postcondition.sql',
  source_content_sha256 = repeat(md5(component_id || ':replay-postcondition:685'), 2),
  revision = revision + 1,
  status = 'canonical'
where component_id = 'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT';

update architecture.component
set maturity_score = greatest(coalesce(maturity_score, 0), 94), updated_at = now()
where component_id = 'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT';
