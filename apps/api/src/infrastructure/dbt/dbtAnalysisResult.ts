/**
 * Owned concern: construct deterministic native analysis evidence; diagnostics never expose process output.
 * @decision Derive identity from one consistent evidence shape with fixed safe diagnostics.
 * @consequence Process output and private paths never become public diagnostic text.
 */
import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
} from '../../application/ports/dbtProjectAnalysis.js';

import { deriveDbtAnalysisSha256 } from './dbtAnalysisIdentity.js';
import type { DbtAnalysisReuseDisposition } from './dbtAnalysisReuse.js';
import { EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE } from './dbtProjectSemanticEvidence.js';

export const ANALYZER_VERSION = 'dvt-dbt-analyzer.v2';

export type DbtAnalysisWork = {
  reuse: DbtAnalysisReuseDisposition;
  snapshotMs: number;
  processMs: number;
  projectionMs: number;
  sourceFiles: number;
  sourceBytes: number;
};

export type DbtAnalysisMeasurement = Readonly<
  DbtAnalysisWork & {
    operation: 'parse' | 'compile';
    status: DbtProjectAnalysis['status'];
    totalMs: number;
  }
>;

export function buildDbtAnalysisRevision(
  projectRoot: string,
  contentSetSha256: string,
  analyzedAt: string
): DbtProjectAnalysis['projectRevision'] {
  return { projectRoot, contentSetSha256, analyzedAt, analyzerVersion: ANALYZER_VERSION };
}

export function unavailableDbtAnalysis(
  projectRevision: DbtProjectAnalysis['projectRevision'],
  code: string,
  message: string,
  semanticEvidence = EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE
): DbtProjectAnalysis {
  return buildDbtAnalysisResult({
    status: 'unavailable',
    projectRevision,
    resources: [],
    dependencies: [],
    diagnostics: [{ code, severity: 'error', message }],
    semanticEvidence,
  });
}

export function invalidDbtAnalysis(
  projectRevision: DbtProjectAnalysis['projectRevision'],
  semanticEvidence = EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE,
  operation: NonNullable<AnalyzeDbtProjectInput['operation']>['kind'] = 'parse'
): DbtProjectAnalysis {
  return buildDbtAnalysisResult({
    status: 'invalid',
    projectRevision,
    resources: [],
    dependencies: [],
    semanticEvidence,
    diagnostics: [
      {
        code: 'dbt_project_invalid',
        severity: 'error',
        message:
          operation === 'compile'
            ? 'dbt compile rejected the selected models. Review them in a trusted dbt environment.'
            : 'dbt parse rejected the project. Review it in a trusted dbt environment.',
      },
    ],
  });
}

/** The identity includes the same evidence for successful and failed native work. */
export function buildDbtAnalysisResult(
  result: Omit<DbtProjectAnalysis, 'analysisSha256'>
): DbtProjectAnalysis {
  return {
    ...result,
    analysisSha256: deriveDbtAnalysisSha256({
      status: result.status,
      contentSetSha256: result.projectRevision.contentSetSha256,
      analyzerVersion: result.projectRevision.analyzerVersion,
      ...(result.projectRevision.dbtVersion === undefined
        ? {}
        : { dbtVersion: result.projectRevision.dbtVersion }),
      ...(result.adapterType === undefined ? {} : { adapterType: result.adapterType }),
      resources: result.resources,
      dependencies: result.dependencies,
      diagnostics: result.diagnostics,
      semanticEvidence: result.semanticEvidence,
    }),
  };
}
