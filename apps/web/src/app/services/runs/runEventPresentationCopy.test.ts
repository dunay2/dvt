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

  it('resolves known event headlines in Spanish without translating unknown technical types', () => {
    expect(resolveRunEventHeadline('stepStarted', undefined, 'es')).toBe('Paso iniciado');
    expect(resolveRunEventHeadline('runCompleted', undefined, 'es')).toBe('Ejecución completada');
    expect(resolveRunEventHeadline('fallback', 'CustomEvent', 'es')).toBe('CustomEvent');
  });
});
