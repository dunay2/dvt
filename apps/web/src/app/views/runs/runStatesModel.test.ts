import { describe, expect, it } from 'vitest';

import { getDetailStateBadge, getRunStatusTone, isKnownRunField } from './runStatesModel';

describe('runStatesModel', () => {
  it('detects known and unknown run fields', () => {
    expect(isKnownRunField('dev')).toBe(true);
    expect(isKnownRunField('unknown')).toBe(false);
    expect(isKnownRunField('unknown-plan')).toBe(false);
    expect(isKnownRunField(undefined)).toBe(false);
  });

  it('maps run status to badge tone class', () => {
    expect(getRunStatusTone('completed')).toBe('bg-green-600');
    expect(getRunStatusTone('running')).toBe('bg-blue-600');
    expect(getRunStatusTone('failed')).toBe('bg-red-600');
  });

  it('maps detail state to label', () => {
    expect(getDetailStateBadge('snapshot-plus-events')).toBe('snapshot+timeline');
    expect(getDetailStateBadge('snapshot-only')).toBe('snapshot-only');
  });
});
