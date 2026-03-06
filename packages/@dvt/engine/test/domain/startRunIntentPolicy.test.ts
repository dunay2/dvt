import { describe, expect, it } from 'vitest';

import {
  canTransitionStartRunIntent,
  getAllowedFromStatuses,
} from '../../src/domain/startRunIntentPolicy.js';

describe('startRunIntentPolicy', () => {
  it('returns allowed source statuses by target status', () => {
    expect(getAllowedFromStatuses('DISPATCHED')).toEqual(['PENDING']);
    expect(getAllowedFromStatuses('RESOLVED')).toEqual(['PENDING', 'DISPATCHED']);
    expect(getAllowedFromStatuses('EXPIRED')).toEqual(['PENDING']);
  });

  it('validates transitions deterministically', () => {
    expect(canTransitionStartRunIntent('PENDING', 'DISPATCHED')).toBe(true);
    expect(canTransitionStartRunIntent('DISPATCHED', 'RESOLVED')).toBe(true);
    expect(canTransitionStartRunIntent('PENDING', 'RESOLVED')).toBe(true);
    expect(canTransitionStartRunIntent('PENDING', 'EXPIRED')).toBe(true);
    expect(canTransitionStartRunIntent('DISPATCHED', 'EXPIRED')).toBe(false);
    expect(canTransitionStartRunIntent('RESOLVED', 'DISPATCHED')).toBe(false);
  });
});
