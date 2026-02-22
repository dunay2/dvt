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
export declare const RUN_PLAN_WORKFLOW: 'runPlanWorkflow';
export declare const WorkflowSignals: {
  readonly PAUSE: 'pause';
  readonly RESUME: 'resume';
  readonly CANCEL: 'cancel';
  readonly RETRY_STEP: 'retry_step';
  readonly RETRY_RUN: 'retry_run';
};
export type WorkflowSignal = (typeof WorkflowSignals)[keyof typeof WorkflowSignals];
//# sourceMappingURL=workflows.d.ts.map
