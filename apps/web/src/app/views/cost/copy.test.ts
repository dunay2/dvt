import { describe, expect, it } from 'vitest';

import { resolveCostViewCopy } from './copy';

describe('resolveCostViewCopy', () => {
  it('returns English copy for en locale', () => {
    const copy = resolveCostViewCopy('en-US');

    expect(copy.title).toBe('Cost');
    expect(copy.durationSeriesLabel).toBe('Duration (s)');
  });

  it('falls back to English for unsupported locales', () => {
    const copy = resolveCostViewCopy('es-ES');

    expect(copy.title).toBe('Cost');
    expect(copy.currentRunEstimate).toBe('Current run estimate');
  });
});
