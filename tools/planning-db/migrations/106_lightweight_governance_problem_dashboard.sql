-- Keep the cross-surface dashboard query operational.
-- Component integrity remains available through its dedicated rail because the
-- current component_integrity_query is expensive enough to own separately.
create or replace view planning_query_store.governance_problem_dashboard_query as
select
  'rail-vocabulary'::text as problem_surface,
  finding_kind,
  severity,
  rail_name as subject_id,
  null::text as component_id,
  source_path as path,
  duplicate_count as evidence_count,
  action_hint,
  metadata
from planning_query_store.command_query_rail_vocabulary_query
union all
select
  'code-symbols'::text as problem_surface,
  finding_kind,
  severity,
  symbol_id as subject_id,
  component_id,
  source_path as path,
  duplicate_count as evidence_count,
  action_hint,
  metadata
from planning_query_store.code_symbol_problem_query
union all
select
  'source-drift'::text as problem_surface,
  finding_kind,
  severity,
  source_path as subject_id,
  null::text as component_id,
  source_path as path,
  reference_count as evidence_count,
  action_hint,
  metadata
from planning_query_store.governed_source_drift_query;
