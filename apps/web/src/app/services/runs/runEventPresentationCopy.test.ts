import { describe, expect, it } from 'vitest';

import { resolveRunEventHeadline } from './runEventPresentationCopy';

describe('resolveRunEventHeadline', () => {
  it('returns governed shared copy for known event headline keys', () => {
    expect(resolveRunEventHeadline('stepStarted')).toBe('Step started');
    expect(resolveRunEventHeadline('runCompleted')).toBe('Run completed');
  });

  it('falls back to the runtime event type for unknown events', () => {
    expect(resolveRunEventHeadline('fallback', 'CustomEvent')).toBe('CustomEvent');
  });
});
