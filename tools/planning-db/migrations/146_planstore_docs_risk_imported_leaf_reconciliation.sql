-- Reconcile the imported PlanStore docs/risk component after migration 145
-- materialized it as a real documentation/risk/evidence leaf. The imported
-- component row feeds governance_unit_query, so leaving children_required=true
-- keeps component-quality failing even when local ownership is correct.

with docs_risk_files as (
  select
    coalesce(jsonb_agg(file.path order by file.path), '[]'::jsonb) as owned_paths,
    count(*)::int as file_count
  from planning_query_store.governance_files file
  where file.component_unit = 'SYS-PLANSTORE-DOCS-RISK'
)
update planning_query_store.governance_components component
set
  name = 'Plan-store docs, reviews, risk, and evidence',
  status = 'review',
  governance_state = 'review',
  canonical_role = 'none',
  evidence_state = 'review-required',
  is_drift = false,
  is_legacy = false,
  children_required = false,
  file_count = greatest(component.file_count, docs_risk_files.file_count),
  ddd_owner = 'PlanStoreDocsRiskEvidence',
  cq_rails = 'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix',
  owns = case
    when docs_risk_files.file_count > 0 then docs_risk_files.owned_paths
    else component.owns
  end,
  governance_refs = jsonb_build_array(
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    'docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md',
    'docs/contracts/planner/plan-store-records-v1.md'
  ),
  fowler_signals = jsonb_build_array(
    'published_language',
    'decision_record',
    'risk_register'
  ),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired', false,
    'fileCount', greatest(component.file_count, docs_risk_files.file_count),
    'dddOwner', 'PlanStoreDocsRiskEvidence',
    'cqRails', 'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix',
    'reconciledBy', '146_planstore_docs_risk_imported_leaf_reconciliation'
  )
from docs_risk_files
where component.component_id = 'SYS-PLANSTORE-DOCS-RISK';

update planning_query_store.governance_component_local_definitions
set
  children_required = false,
  status = 'review',
  owned_concern = 'PlanStore docs, ADRs, evidence, risk entries, command/query matrix, and status sources that govern runtime PlanStore implementation components.',
  ddd_owner = 'PlanStoreDocsRiskEvidence',
  cq_rails = 'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix'
where component_id = 'SYS-PLANSTORE-DOCS-RISK';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  'SYS-PLANSTORE-DOCS-RISK',
  'owns',
  file.path,
  row_number() over (order by file.path) - 1
from planning_query_store.governance_files file
where file.component_unit = 'SYS-PLANSTORE-DOCS-RISK'
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
    'SYS-PLANSTORE-DOCS-RISK',
    'invariant',
    'PlanStore docs/risk/evidence is a leaf documentation component; runtime implementation files stay owned by specific PlanStore implementation leaves.',
    0
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'fowler_signal',
    'published_language',
    0
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'fowler_signal',
    'decision_record',
    1
  ),
  (
    'SYS-PLANSTORE-DOCS-RISK',
    'fowler_signal',
    'risk_register',
    2
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
