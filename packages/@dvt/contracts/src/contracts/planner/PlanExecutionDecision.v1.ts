/**
 * Planner-owned explanation of which graph subjects are admitted to an
 * immutable execution plan.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Keep execution decisions in the persisted plan artifact so Web renders planner truth without reconstructing selection semantics.
 * @consequence Planner, API, and Web share one immutable execution-decision vocabulary.
 * @version 1.0.0
 */
export const PLAN_EXECUTION_DECISION_STATUS = {
  run: 'RUN',
  skip: 'SKIP',
  partial: 'PARTIAL',
} as const;

export const PLAN_EXECUTION_DECISION_REASON = {
  selectedRoot: 'SELECTED_ROOT',
  selectedClosure: 'SELECTED_CLOSURE',
  outsideSelectedClosure: 'OUTSIDE_SELECTED_CLOSURE',
  boundedSelection: 'BOUNDED_SELECTION',
} as const;

export type PlanExecutionRunDecision = Readonly<{
  subjectId: string;
  subjectKind: 'node';
  status: typeof PLAN_EXECUTION_DECISION_STATUS.run;
  reasonCode:
    | typeof PLAN_EXECUTION_DECISION_REASON.selectedRoot
    | typeof PLAN_EXECUTION_DECISION_REASON.selectedClosure;
}>;

export type PlanExecutionSkipDecision = Readonly<{
  subjectId: string;
  subjectKind: 'node';
  status: typeof PLAN_EXECUTION_DECISION_STATUS.skip;
  reasonCode: typeof PLAN_EXECUTION_DECISION_REASON.outsideSelectedClosure;
}>;

export type PlanExecutionPartialDecision = Readonly<{
  subjectId: 'selection';
  subjectKind: 'selection';
  status: typeof PLAN_EXECUTION_DECISION_STATUS.partial;
  reasonCode: typeof PLAN_EXECUTION_DECISION_REASON.boundedSelection;
  includedNodeIds: readonly string[];
  excludedNodeIds: readonly string[];
}>;

export type PlanExecutionDecision =
  PlanExecutionRunDecision | PlanExecutionSkipDecision | PlanExecutionPartialDecision;
