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
