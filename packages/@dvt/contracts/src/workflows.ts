/** Canonical workflow names and signals used across engine & adapters */
export const RUN_PLAN_WORKFLOW = 'runPlanWorkflow' as const;

export const WorkflowSignals = {
  PAUSE: 'pause',
  RESUME: 'resume',
  CANCEL: 'cancel',
  RETRY_STEP: 'retry_step',
  RETRY_RUN: 'retry_run',
} as const;

export type WorkflowSignal = (typeof WorkflowSignals)[keyof typeof WorkflowSignals];
