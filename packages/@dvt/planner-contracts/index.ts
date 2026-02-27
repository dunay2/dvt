export interface PlannerInputStep {
  stepId: string;
  type: 'task' | 'gateway';
  dependsOn: string[];
  gateway?: {
    dslVersion: '1.0';
    expression: string;
  };
}

export interface PlannerInputEnvelope {
  version: '1.0';
  workflowSpec: {
    workflowId: string;
    steps: PlannerInputStep[];
  };
  executionIntent: {
    type: 'full' | 'partial' | 'resume';
    selection?: string[];
  };
  environment: {
    target: 'production' | 'staging' | 'test';
  };
  engineHints?: {
    requiredCapabilities: string[];
  };
}

export type PlannerInputV1 = PlannerInputEnvelope;
