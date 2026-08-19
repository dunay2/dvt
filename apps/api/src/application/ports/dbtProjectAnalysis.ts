import type { DbtProjectGraphProjection, DbtProjectSourceTableDeclaration } from '@dvt/contracts';

import type { WorkspaceStorageScope } from './workspaceFiles.js';

type ProjectedNode = DbtProjectGraphProjection['nodes'][number];
type ProjectedEdge = DbtProjectGraphProjection['edges'][number];

export type DbtProjectSourceIdentityRef = Readonly<{
  database: string;
  connectionId: string;
  schema: string;
  databaseUser: string;
}>;

export type AnalyzeDbtProjectInput = Readonly<{
  scope: WorkspaceStorageScope;
  projectRoot: string;
  operation?:
    Readonly<{ kind: 'parse' }> | Readonly<{ kind: 'compile'; selectors: readonly string[] }>;
}>;

export type DbtProjectAnalysisResource = Omit<
  ProjectedNode,
  'sourceIdentity' | 'visualEditability'
> &
  Readonly<{
    codeOnlyReasons: readonly string[];
    sourceIdentityRef?: DbtProjectSourceIdentityRef;
    sourceTableDeclaration?: DbtProjectSourceTableDeclaration;
    compiledSql?: string;
  }>;

export type DbtProjectAnalysisDependency = Omit<ProjectedEdge, 'id'>;

export type DbtProjectAnalysisIdentity = Readonly<{
  uniqueId: string;
  resourceType: 'model' | 'source' | 'test' | 'snapshot' | 'seed' | 'macro';
  name: string;
  packageName: string;
  sourceName?: string;
  originalFilePath?: string;
  dependencyUniqueIds: readonly string[];
  macroUniqueIds: readonly string[];
}>;

export type DbtProjectAnalysisFile = Readonly<{
  path: string;
  revisionSha256: string;
  byteLength: number;
  kind:
    | 'project_config'
    | 'model'
    | 'source'
    | 'test'
    | 'snapshot'
    | 'seed'
    | 'macro'
    | 'schema'
    | 'other';
}>;

export type DbtProjectSourceRange = Readonly<{ startByte: number; endByte: number }>;

type DbtProjectSemanticRegionBase = Readonly<{
  regionId: string;
  ownerUniqueIds: readonly string[];
  path: string;
  kind: 'ref' | 'source' | 'jinja';
  range: DbtProjectSourceRange;
  sourceSha256: string;
}>;

export type DbtProjectSemanticRegion =
  | (DbtProjectSemanticRegionBase &
      Readonly<{ classification: 'supported'; targetUniqueId: string }>)
  | (DbtProjectSemanticRegionBase & Readonly<{ classification: 'code_only'; reasonCode: string }>);

export type DbtProjectSemanticDiagnostic = Readonly<{
  code: 'dbt_semantic_region_code_only';
  severity: 'warning';
  message: string;
  subject: Readonly<{
    kind: 'region';
    path: string;
    regionId: string;
  }>;
  evidence: Readonly<{
    path: string;
    range: DbtProjectSourceRange;
  }>;
}>;

export type DbtProjectSemanticEvidence = Readonly<{
  files: readonly DbtProjectAnalysisFile[];
  identities: readonly DbtProjectAnalysisIdentity[];
  regions: readonly DbtProjectSemanticRegion[];
  diagnostics: readonly DbtProjectSemanticDiagnostic[];
}>;

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
  semanticEvidence: DbtProjectSemanticEvidence;
}>;

export interface IDbtProjectAnalyzerPort {
  analyze(input: AnalyzeDbtProjectInput): Promise<DbtProjectAnalysis>;
}
