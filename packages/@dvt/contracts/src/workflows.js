'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowSignals = exports.RUN_PLAN_WORKFLOW = void 0;
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
exports.RUN_PLAN_WORKFLOW = 'runPlanWorkflow';
exports.WorkflowSignals = {
  PAUSE: 'pause',
  RESUME: 'resume',
  CANCEL: 'cancel',
  RETRY_STEP: 'retry_step',
  RETRY_RUN: 'retry_run',
};
//# sourceMappingURL=workflows.js.map
