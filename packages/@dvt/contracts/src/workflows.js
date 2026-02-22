/**
 * @file packages/@dvt/contracts/src/workflows.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Canonical workflow names and signal identifiers are centralized as contract constants
 * @consequence Engine and adapters share deterministic workflow/signal literals without drift
 * @version 1.0.0
 * @date 2026-02-21
 */
/** Canonical workflow names and signals used across engine & adapters */
export const RUN_PLAN_WORKFLOW = 'runPlanWorkflow';
export const WorkflowSignals = {
  PAUSE: 'pause',
  RESUME: 'resume',
  CANCEL: 'cancel',
  RETRY_STEP: 'retry_step',
  RETRY_RUN: 'retry_run',
};
//# sourceMappingURL=workflows.js.map
