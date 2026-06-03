import { describe, expect, it } from 'vitest';

import { defaultCardinalityPolicy, validateMetricLabels } from '../src/policy/cardinalityPolicy';

describe('validateMetricLabels', () => {
  it('rejects high-cardinality labels', () => {
    expect(() => validateMetricLabels({ runId: 'r-1' }, defaultCardinalityPolicy)).toThrow(
      /Forbidden metric label key/
    );
  });

  it('rejects plan hashes as metric labels', () => {
    expect(() =>
      validateMetricLabels({ planSha: 'a'.repeat(64) }, defaultCardinalityPolicy)
    ).toThrow(/Forbidden metric label key/);
  });

  it('accepts low-cardinality labels', () => {
    expect(() =>
      validateMetricLabels({ adapter: 'temporal', result: 'ok' }, defaultCardinalityPolicy)
    ).not.toThrow();
  });
});
