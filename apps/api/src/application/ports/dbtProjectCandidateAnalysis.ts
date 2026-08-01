import type { DbtProjectAnalysis, DbtProjectAnalysisFile } from './dbtProjectAnalysis.js';
import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type AnalyzeDbtProjectCandidateInput = Readonly<{
  scope: WorkspaceStorageScope;
  projectRoot: string;
  expectedContentSetSha256: string;
  expectedFiles: readonly DbtProjectAnalysisFile[];
  candidate: Readonly<{
    path: string;
    expectedContentSha256: string;
    content: string;
  }>;
}>;

export type DbtProjectCandidateAnalysisResult =
  | Readonly<{ kind: 'analyzed'; analysis: DbtProjectAnalysis }>
  | Readonly<{
      kind: 'conflict';
      reason: 'project_revision_changed';
      changedPaths: readonly string[];
    }>;

export interface IDbtProjectCandidateAnalyzerPort {
  analyzeCandidate(
    input: AnalyzeDbtProjectCandidateInput
  ): Promise<DbtProjectCandidateAnalysisResult>;
}
