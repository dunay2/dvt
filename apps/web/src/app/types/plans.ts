import type { PlanRef } from './engine';

export interface PlanStepPoliciesViewModel {
  retries?: number;
  timeout?: number;
  concurrency?: number;
  warehouse?: string;
}

export interface PlanStepViewModel {
  id: string;
  /**
   * Canonical step kind preserved from the contracts boundary.
   *
   * The web shell may choose its own display treatment, but the plan port
   * should not coerce planning semantics into legacy DBT-specific enums.
   */
  type: string;
  name: string;
  nodes: string[];
  policies: PlanStepPoliciesViewModel;
}

export interface PlanPreviewSummaryViewModel {
  executor: 'postgres' | 'dbt';
  nodeCount: number;
  stepCount: number;
  sourceTables: string[];
  sinkTables: string[];
}

export interface PlanPreviewPersistedViewModel {
  planRecordId: string;
  canonicalPlanSha256: string;
}

export interface PlanPreviewArtifactRefViewModel {
  repo: string;
  path: string;
  ref?: string;
  commitSha?: string;
  contentSha256?: string;
}

export interface PlanPreviewProvenanceViewModel {
  graphArtifact?: PlanPreviewArtifactRefViewModel;
  sqlArtifact?: PlanPreviewArtifactRefViewModel;
}

export interface PlanPreviewViewModel {
  summary?: PlanPreviewSummaryViewModel;
  persisted?: PlanPreviewPersistedViewModel;
  provenance?: PlanPreviewProvenanceViewModel;
}

export interface PlanViewModel {
  planId: string;
  planVersion: string;
  planRef?: PlanRef;
  generatedAt: string;
  adapter: string;
  target: string;
  steps: PlanStepViewModel[];
  estimatedCost?: number;
  capabilities: string[];
  preview?: PlanPreviewViewModel;
}
