/**
 * @file packages/@dvt/engine/src/contracts/executionPlan.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The executable plan declares metadata and steps as a canonical contract independent of the runtime
 * @consequence The engine validates and routes execution over a stable plan structure across adapters
 * @version 1.1.0
 * @date 2026-02-22
 */
export interface ExecutionPlan {
  metadata: {
    planId: string;
    planVersion: string;
    schemaVersion: string;
    /**
     * Version of the ExecutionPlan contract schema (planner → engine API version).
     * The engine rejects plans with an unknown contractVersion.
     * Current supported: "1.0.0"
     */
    contractVersion: string;
    /**
     * Version of the planner binary that generated this plan.
     * Used for audit and reproducibility. Not validated by the engine.
     */
    plannerVersion?: string;
    /**
     * Full 40-character git SHA of the planner at generation time.
     * Used for reproducibility and incident tracing.
     */
    plannerGitSha?: string;
    /**
     * ISO 8601 UTC timestamp of when this plan was generated.
     * Used for staleness checks and audit trails.
     */
    generatedAt?: string;
    /**
     * SHA-256 hex of the JCS-canonicalized PlannerInputEnvelope.
     * Informational for traceability/reproducibility.
     */
    inputHashSha256?: string;
    requiresCapabilities?: string[];
    fallbackBehavior?: 'reject' | 'emulate' | 'degrade';
    targetAdapter?: 'temporal' | 'conductor' | 'any' | 'mock';
  };
  steps: Array<
    {
      stepId: string;
      kind?: string;
      type?: 'task' | 'gateway';
      gateway?: {
        dslVersion: '1.0';
        expression: string;
      };
      /**
       * Optional DAG dependencies for interpreter execution.
       * If omitted, consumers may execute in declaration order.
       */
      dependsOn?: string[];
    } & Record<string, unknown>
  >;
}
