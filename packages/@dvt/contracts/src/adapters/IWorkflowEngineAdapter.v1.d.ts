export interface ExecuteStepRequest {
  tenantId: string;
  planId: string;
  runId: string;
  stepId: string;
  stepType: string;
  stepData: Record<string, unknown>;
  idempotencyKey?: string;
  timeout?: number;
}
export interface ExecuteStepResult {
  runId: string;
  stepId: string;
  status: string;
  output?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  duration: number;
  executedAt: number;
}
export interface WorkflowRunState {
  tenantId: string;
  planId: string;
  runId: string;
  status: string;
  currentStep?: string;
  completedSteps: Map<string, string>;
  failedSteps: Map<string, string>;
  startedAt: number;
  completedAt?: number;
  totalDuration?: number;
}
export interface IWorkflowEngineAdapter {
  createRun(
    tenantId: string,
    planId: string,
    planData: Record<string, unknown>
  ): Promise<WorkflowRunState>;
  startRun(tenantId: string, runId: string): Promise<WorkflowRunState>;
  executeStep(request: ExecuteStepRequest): Promise<ExecuteStepResult>;
  executeStepBatch(requests: ExecuteStepRequest[]): Promise<ExecuteStepResult[]>;
  pauseRun(tenantId: string, runId: string, reason: string): Promise<WorkflowRunState>;
  resumeRun(tenantId: string, runId: string): Promise<WorkflowRunState>;
  terminateRun(tenantId: string, runId: string, reason?: string): Promise<WorkflowRunState>;
  getRunState(tenantId: string, runId: string): Promise<WorkflowRunState | undefined>;
  replayRun(tenantId: string, runId: string): Promise<void>;
  archiveRun(tenantId: string, runId: string): Promise<void>;
  health(): Promise<{
    healthy: boolean;
    message?: string;
  }>;
  close(): Promise<void>;
}
//# sourceMappingURL=IWorkflowEngineAdapter.v1.d.ts.map
