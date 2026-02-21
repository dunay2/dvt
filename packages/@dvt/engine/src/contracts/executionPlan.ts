/**
 * @file packages/@dvt/engine/src/contracts/executionPlan.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The executable plan declares metadata and steps as a canonical contract independent of the runtime
 * @consequence The engine validates and routes execution over a stable plan structure across adapters
 * @version 1.0.0
 * @date 2026-02-21
 */
export interface ExecutionPlan {
  metadata: {
    planId: string;
    planVersion: string;
    schemaVersion: string;
    requiresCapabilities?: string[];
    fallbackBehavior?: 'reject' | 'emulate' | 'degrade';
    targetAdapter?: 'temporal' | 'conductor' | 'any' | 'mock';
  };
  steps: Array<
    {
      stepId: string;
      kind?: string;
      /**
       * Optional DAG dependencies for interpreter execution.
       * If omitted, consumers may execute in declaration order.
       */
      dependsOn?: string[];
    } & Record<string, unknown>
  >;
}
