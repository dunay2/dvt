/** Owned concern: map authoritative dbt analysis freshness to honest UI semantics. */
import type { DbtYamlDescriptionAppliedReceipt } from '@dvt/contracts';

import type { DbtYamlDescriptionEditorCopy } from './dbtYamlDescriptionEditorCopy';

export type DbtYamlDescriptionAnalysisTone = 'success' | 'warning' | 'error';

export type DbtYamlDescriptionAnalysisPresentation = Readonly<{
  label: string;
  message: string;
  tone: DbtYamlDescriptionAnalysisTone;
}>;

export function resolveDbtYamlDescriptionAnalysisPresentation(
  freshness: DbtYamlDescriptionAppliedReceipt['analysis']['freshness'],
  copy: DbtYamlDescriptionEditorCopy
): DbtYamlDescriptionAnalysisPresentation {
  switch (freshness) {
    case 'fresh':
      return {
        label: copy.analysisFreshLabel,
        message: copy.appliedMessage,
        tone: 'success',
      };
    case 'stale-last-valid':
      return {
        label: copy.analysisStaleLabel,
        message: copy.analysisStaleMessage,
        tone: 'warning',
      };
    case 'invalid':
      return {
        label: copy.analysisInvalidLabel,
        message: copy.analysisInvalidMessage,
        tone: 'error',
      };
    case 'unavailable':
      return {
        label: copy.analysisUnavailableLabel,
        message: copy.analysisUnavailableMessage,
        tone: 'error',
      };
  }
}
