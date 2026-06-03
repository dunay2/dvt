create or replace view planning_query_store.governance_file_query as
select
  path,
  file_id,
  owning_unit,
  root_unit,
  domain_unit,
  component_unit,
  owner_level,
  unit_status,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  ddd_owner,
  cq_rails,
  source_path,
  source_content_sha256,
  governance_refs,
  raw_file
from planning_query_store.governance_files;

create or replace view planning_query_store.governance_component_query as
select
  component_id,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  children_required,
  file_count,
  ddd_owner,
  cq_rails,
  source_path,
  source_content_sha256,
  unit_path,
  owns,
  excludes,
  governance_refs,
  fowler_signals,
  raw_component
from planning_query_store.governance_components;

create or replace view planning_query_store.governance_coverage_query as
select
  coverage_id,
  coverage_kind,
  name,
  count_value,
  file_count,
  component_id,
  metadata,
  source_path,
  source_content_sha256,
  raw_coverage
from planning_query_store.governance_coverage;

create or replace view planning_query_store.governance_remediation_query as
select
  task_id,
  task_type,
  priority,
  component_unit,
  component_file_map,
  root_unit,
  domain_unit,
  ddd_owner,
  cq_rails,
  blocking,
  reason,
  file_count,
  document_count,
  source_path,
  source_content_sha256,
  files,
  documents,
  expected_validation,
  raw_task
from planning_query_store.governance_remediation;
