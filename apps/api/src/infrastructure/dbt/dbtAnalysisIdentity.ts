import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import type {
  DbtProjectAnalysis,
  DbtProjectAnalysisDependency,
  DbtProjectAnalysisResource,
  DbtProjectSemanticEvidence,
} from '../../application/ports/dbtProjectAnalysis.js';

export const DBT_ANALYSIS_IDENTITY_VERSION = 'dvt-dbt-analysis.v2';

export type DbtAnalysisIdentityInput = Readonly<{
  status: DbtProjectAnalysis['status'];
  contentSetSha256: string;
  analyzerVersion: string;
  dbtVersion?: string;
  adapterType?: string;
  resources: readonly DbtProjectAnalysisResource[];
  dependencies: readonly DbtProjectAnalysisDependency[];
  diagnostics: DbtProjectAnalysis['diagnostics'];
  semanticEvidence: DbtProjectSemanticEvidence;
}>;

export function deriveDbtAnalysisSha256(input: DbtAnalysisIdentityInput): string {
  return sha256HexUtf8(
    jcsCanonicalize({
      identityVersion: DBT_ANALYSIS_IDENTITY_VERSION,
      status: input.status,
      contentSetSha256: input.contentSetSha256,
      analyzerVersion: input.analyzerVersion,
      dbtVersion: input.dbtVersion,
      adapterType: input.adapterType,
      resources: input.resources,
      dependencies: input.dependencies,
      diagnostics: input.diagnostics,
      semanticEvidence: input.semanticEvidence,
    })
  );
}
