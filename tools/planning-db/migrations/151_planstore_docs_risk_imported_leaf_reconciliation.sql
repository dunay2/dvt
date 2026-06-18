-- Re-assert the PlanStore docs/risk/evidence unit as a leaf documentation
-- component. The local component definition already marks children_required
-- false, but imported governance_components are the effective source for an
-- imported component id, so the imported row must carry the same leaf semantics.

update planning_query_store.governance_components component
set
  name = 'Plan-store docs, reviews, risk, and evidence',
  level = 'component',
  status = 'review',
  governance_state = 'review',
  canonical_role = 'none',
  evidence_state = 'review-required',
  is_drift = false,
  is_legacy = false,
  children_required = false,
  ddd_owner = 'PlanStoreDocsRiskEvidence',
  cq_rails = 'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix',
  governance_refs = jsonb_build_array(
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    'docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md',
    'docs/contracts/planner/plan-store-records-v1.md',
    'docs/planning/status/system-governance-planstore-file-ownership-20260501.md'
  ),
  fowler_signals = jsonb_build_array(
    'published_language',
    'decision_record',
    'risk_register'
  ),
  raw_component = jsonb_set(
    component.raw_component || jsonb_build_object(
      'name',
      'Plan-store docs, reviews, risk, and evidence',
      'level',
      'component',
      'status',
      'review',
      'childrenRequired',
      false,
      'dddOwner',
      'PlanStoreDocsRiskEvidence',
      'cqRails',
      'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix',
      'ownedConcern',
      'PlanStore docs, ADRs, evidence, risk entries, command/query matrix, and status sources that govern runtime PlanStore implementation components.',
      'publicApi',
      jsonb_build_array(
        'ReadPlanStoreDocsRiskStatus',
        'ReadPlanStoreCommandQueryMatrix'
      ),
      'invariants',
      jsonb_build_array(
        'PlanStore docs/risk/evidence is a documentation leaf; runtime implementation files stay owned by specific PlanStore implementation leaves.'
      ),
      'fowlerSignals',
      jsonb_build_array(
        'published_language',
        'decision_record',
        'risk_register'
      ),
      'reconciledBy',
      '151_planstore_docs_risk_imported_leaf_reconciliation'
    ),
    '{unitReferences}',
    (
      select jsonb_agg(
        case
          when ref.value->>'id' = 'SYS-PLANSTORE-DOCS-RISK'
            then ref.value || jsonb_build_object(
              'name',
              'Plan-store docs, reviews, risk, and evidence',
              'level',
              'component',
              'status',
              'review',
              'childrenRequired',
              false,
              'dddOwner',
              'PlanStoreDocsRiskEvidence',
              'cqRails',
              'ReadPlanStoreDocsRiskStatus;ReadPlanStoreCommandQueryMatrix',
              'ownedConcern',
              'PlanStore docs, ADRs, evidence, risk entries, command/query matrix, and status sources that govern runtime PlanStore implementation components.',
              'publicApi',
              jsonb_build_array(
                'ReadPlanStoreDocsRiskStatus',
                'ReadPlanStoreCommandQueryMatrix'
              ),
              'invariants',
              jsonb_build_array(
                'PlanStore docs/risk/evidence is a documentation leaf; runtime implementation files stay owned by specific PlanStore implementation leaves.'
              ),
              'fowlerSignals',
              jsonb_build_array(
                'published_language',
                'decision_record',
                'risk_register'
              )
            )
          else ref.value
        end
        order by ref.ordinality
      )
      from jsonb_array_elements(component.raw_component->'unitReferences')
        with ordinality as ref(value, ordinality)
    )
  )
where component.component_id = 'SYS-PLANSTORE-DOCS-RISK';
