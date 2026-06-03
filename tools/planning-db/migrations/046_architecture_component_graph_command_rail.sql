alter table architecture.design_operations
  drop constraint if exists design_operations_operation_type_check;

alter table architecture.design_operations
  drop constraint if exists architecture_design_operations_type_check;

alter table architecture.design_operations
  add constraint architecture_design_operations_type_check check (
    operation_type in (
      'architecture_design_create',
      'architecture_component_record',
      'architecture_relation_record'
    )
  );
