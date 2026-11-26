/** Owned concern: query the authoritative semantic analysis of a selected dbt model. */
import type {
  DbtSelectedModelAnalysis,
  DbtSelectedModelExecutionSqlSelection,
} from '@dvt/contracts';

import type { DbtProjectFilesAuthorityBinding } from './dbtProjectGraph';

export type DbtSelectedModelAnalysisTarget = Readonly<{
  canvasId: string;
  schemaVersion?: DbtProjectFilesAuthorityBinding['schemaVersion'];
  authority?: DbtProjectFilesAuthorityBinding['authority'];
}>;

export interface IDbtSelectedModelAnalysisQueryPort {
  analyzeSelectedModel(
    binding: DbtSelectedModelAnalysisTarget,
    selectedUniqueId: string,
    executionSql?: DbtSelectedModelExecutionSqlSelection
  ): Promise<DbtSelectedModelAnalysis>;
}
