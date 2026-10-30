/** Owned concern: query the authoritative semantic analysis of a selected dbt model. */
import type { DbtSelectedModelAnalysis } from '@dvt/contracts';

import type { DbtProjectFilesAuthorityBinding } from './dbtProjectGraph';

export interface IDbtSelectedModelAnalysisQueryPort {
  analyzeSelectedModel(
    binding: DbtProjectFilesAuthorityBinding,
    selectedUniqueId: string
  ): Promise<DbtSelectedModelAnalysis>;
}
