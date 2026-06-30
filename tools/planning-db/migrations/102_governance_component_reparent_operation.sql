alter table planning_query_store.governance_component_local_operations
  drop constraint if exists governance_component_local_operations_operation_type_check;

alter table planning_query_store.governance_component_local_operations
  add constraint governance_component_local_operations_operation_type_check
    check (operation_type in ('component_create', 'component_reparent'));
