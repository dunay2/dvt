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
  source_content_sha256
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
  source_content_sha256
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
  source_content_sha256
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
  source_content_sha256
from planning_query_store.governance_remediation;

create or replace view planning_query_store.governance_drift_query as
select
  path,
  owning_unit,
  root_unit,
  domain_unit,
  component_unit,
  source_path,
  source_content_sha256,
  array_remove(array[
    case when stored_file_id is distinct from derived_file_id then 'file_id' end,
    case when stored_path_hash is distinct from derived_path_hash then 'path_hash' end,
    case
      when stored_governance_hash is distinct from derived_governance_hash
      then 'governance_hash'
    end,
    case
      when stored_state_fingerprint is distinct from derived_state_fingerprint
      then 'state_fingerprint'
    end
  ], null) as drift_fields,
  stored_file_id,
  derived_file_id,
  stored_path_hash,
  derived_path_hash,
  stored_governance_hash,
  derived_governance_hash,
  stored_state_fingerprint,
  derived_state_fingerprint
from planning_query_store.governance_file_hash_drift;
