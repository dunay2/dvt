import { describe, expect, it } from 'vitest';

import { getRouteWorkbenchStatusToneClassName } from '../../components/workbench/routeWorkbenchTableTokens';
import { getDetailStateBadge, getRunStatusTone, isKnownRunField } from './runStatesModel';

describe('runStatesModel', () => {
  it('detects known and unknown run fields', () => {
    expect(isKnownRunField('dev')).toBe(true);
    expect(isKnownRunField('unknown')).toBe(false);
    expect(isKnownRunField('unknown-plan')).toBe(false);
    expect(isKnownRunField(undefined)).toBe(false);
  });

  it('maps run status to badge tone class', () => {
    expect(getRunStatusTone('completed')).toBe(getRouteWorkbenchStatusToneClassName('success'));
    expect(getRunStatusTone('running')).toBe(getRouteWorkbenchStatusToneClassName('running'));
    expect(getRunStatusTone('failed')).toBe(getRouteWorkbenchStatusToneClassName('danger'));
  });

  it('maps detail state to label', () => {
    expect(getDetailStateBadge('snapshot-plus-events')).toBe('snapshot+timeline');
    expect(getDetailStateBadge('snapshot-only')).toBe('snapshot-only');
  });
});
