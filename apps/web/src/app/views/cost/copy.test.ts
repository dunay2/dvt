import { describe, expect, it } from 'vitest';

import { resolveCostViewCopy } from './copy';

describe('resolveCostViewCopy', () => {
  it('returns English copy for en locale', () => {
    const copy = resolveCostViewCopy('en-US');

    expect(copy.title).toBe('Cost');
    expect(copy.durationByRunSeriesLabel).toBe('Run duration (s)');
    expect(copy.costCaptureUnavailable).toBe('Cost capture unavailable');
  });

  it('falls back to English for another locale', () => {
    const copy = resolveCostViewCopy('fr-FR');

    expect(copy.title).toBe('Cost');
    expect(copy.costCaptureStatus).toBe('Cost capture status');
  });
});
