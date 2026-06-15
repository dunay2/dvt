alter table architecture.design_scope
  drop constraint if exists architecture_design_scope_subject_kind_check;

alter table architecture.design_scope
  add constraint architecture_design_scope_subject_kind_check check (
    subject_kind in (
      'component',
      'relation',
      'contract',
      'port',
      'flow',
      'check',
      'path',
      'query',
      'decision',
      'evidence',
      'risk',
      'test'
    )
  );

alter table architecture.design_operations
  drop constraint if exists design_operations_operation_type_check;

alter table architecture.design_operations
  drop constraint if exists architecture_design_operations_type_check;

alter table architecture.design_operations
  add constraint architecture_design_operations_type_check check (
    operation_type in (
      'architecture_design_create',
      'architecture_component_record',
      'architecture_relation_record',
      'architecture_contract_record',
      'architecture_port_record',
      'architecture_fitness_scan',
      'architecture_test_record',
      'architecture_observability_record'
    )
  );
