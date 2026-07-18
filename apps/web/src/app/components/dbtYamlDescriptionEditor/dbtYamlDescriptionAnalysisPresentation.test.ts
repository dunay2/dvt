import { describe, expect, it } from 'vitest';

import { resolveDbtYamlDescriptionEditorCopy } from './dbtYamlDescriptionEditorCopy';
import { resolveDbtYamlDescriptionAnalysisPresentation } from './dbtYamlDescriptionAnalysisPresentation';

const COPY = resolveDbtYamlDescriptionEditorCopy('en');

describe('dbt YAML description analysis presentation', () => {
  it.each([
    ['fresh', 'success', COPY.analysisFreshLabel],
    ['stale-last-valid', 'warning', COPY.analysisStaleLabel],
    ['invalid', 'error', COPY.analysisInvalidLabel],
    ['unavailable', 'error', COPY.analysisUnavailableLabel],
  ] as const)('maps %s analysis to %s semantics', (freshness, tone, label) => {
    expect(resolveDbtYamlDescriptionAnalysisPresentation(freshness, COPY)).toMatchObject({
      label,
      tone,
    });
  });
});
