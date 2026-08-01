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
   * should not coerce planning semantics into retired DBT-specific enums.
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

export interface PlanPreviewSelectionIntentViewModel {
  mode: 'explicit' | 'workspace';
  requestedRootNodeIds: string[];
  derivedDependencyNodeIds: string[];
  authorizedScopeNodeIds: string[];
}

export interface PlanPreviewArtifactRefViewModel {
  repo: string;
  path: string;
  ref?: string;
  commitSha?: string;
  contentSha256?: string;
}

export type PlanPreviewProvenanceViewModel =
  | {
      kind?: 'transformation-git-artifacts';
      graphArtifact?: PlanPreviewArtifactRefViewModel;
      sqlArtifact?: PlanPreviewArtifactRefViewModel;
    }
  | {
      kind: 'dbt-project-files';
      canvasId: string;
      projectRoot: string;
      contentSetSha256: string;
      analysisSha256: string;
      dbtVersion: string;
      selectedUniqueIds: string[];
      executionTarget: {
        provider: string;
        adapter: string;
        targetName: string;
        credentialRef: string;
      };
    };

export interface PlanPreviewViewModel {
  summary?: PlanPreviewSummaryViewModel;
  persisted?: PlanPreviewPersistedViewModel;
  provenance?: PlanPreviewProvenanceViewModel;
  selectionIntent?: PlanPreviewSelectionIntentViewModel;
}

export type PlanExecutionDecisionViewModel =
  | Readonly<{
      subjectId: string;
      subjectKind: 'node';
      status: 'RUN';
      reasonCode: 'SELECTED_ROOT' | 'SELECTED_CLOSURE';
    }>
  | Readonly<{
      subjectId: string;
      subjectKind: 'node';
      status: 'SKIP';
      reasonCode: 'OUTSIDE_SELECTED_CLOSURE';
    }>
  | Readonly<{
      subjectId: 'selection';
      subjectKind: 'selection';
      status: 'PARTIAL';
      reasonCode: 'BOUNDED_SELECTION';
      includedNodeIds: string[];
      excludedNodeIds: string[];
    }>;

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
  decisions?: PlanExecutionDecisionViewModel[];
  preview?: PlanPreviewViewModel;
}
