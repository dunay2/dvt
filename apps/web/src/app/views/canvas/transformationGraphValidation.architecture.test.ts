import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const VALIDATION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'transformationGraphValidation.ts'
);

describe('transformationGraphValidation architecture', () => {
  it('stays a thin facade over validation scope, rules, and result seams', () => {
    expect(VALIDATION_SOURCE).toContain("'./transformationGraphValidationScope'");
    expect(VALIDATION_SOURCE).toContain("'./transformationGraphValidationRules'");
    expect(VALIDATION_SOURCE).toContain("'./transformationGraphValidationResults'");
    expect(VALIDATION_SOURCE).not.toContain('buildPreviewGraphSignature');
    expect(VALIDATION_SOURCE).not.toContain('hasValidTransformationEdgeOrder');
    expect(VALIDATION_SOURCE).not.toContain('mapCanonicalRole');
  });
});
