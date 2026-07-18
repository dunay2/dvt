import type { DbtProjectGraphProjection } from '@dvt/contracts';

import type { WorkspaceStorageScope } from './workspaceFiles.js';

type ProjectedNode = DbtProjectGraphProjection['nodes'][number];
type ProjectedEdge = DbtProjectGraphProjection['edges'][number];

export type AnalyzeDbtProjectInput = Readonly<{
  scope: WorkspaceStorageScope;
  projectRoot: string;
}>;

export type DbtProjectAnalysisResource = Omit<ProjectedNode, 'visualEditability'> &
  Readonly<{
    codeOnlyReasons: readonly string[];
  }>;

export type DbtProjectAnalysisDependency = Omit<ProjectedEdge, 'id'>;

export type DbtProjectAnalysis = Readonly<{
  status: 'valid' | 'invalid' | 'unavailable';
  adapterType?: string;
  projectRevision: Readonly<{
    projectRoot: string;
    projectName?: string;
    contentSetSha256: string;
    analyzedAt: string;
    analyzerVersion: string;
    dbtVersion?: string;
  }>;
  analysisSha256: string;
  resources: readonly DbtProjectAnalysisResource[];
  dependencies: readonly DbtProjectAnalysisDependency[];
  diagnostics: DbtProjectGraphProjection['diagnostics'];
}>;

export interface IDbtProjectAnalyzerPort {
  analyze(input: AnalyzeDbtProjectInput): Promise<DbtProjectAnalysis>;
}
