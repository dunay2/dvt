import { describe, expect, it } from 'vitest';

import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  getSignalDerivedEventType,
  resolveSignalSemanticsContract,
} from '../src/contracts/engine/SignalSemantics.v1.js';

describe('SignalSemantics contract', () => {
  it('resolves current semantics by default', () => {
    const contract = resolveSignalSemanticsContract();
    expect(contract.version).toBe(CURRENT_SIGNAL_SEMANTICS_VERSION);
  });

  it('maps PAUSE and RESUME to engine-owned run events', () => {
    expect(getSignalDerivedEventType('PAUSE')).toBe('RunPaused');
    expect(getSignalDerivedEventType('RESUME')).toBe('RunResumed');
  });

  it('returns null for adapter-owned signals with no engine-derived event', () => {
    expect(getSignalDerivedEventType('CANCEL')).toBeNull();
    expect(getSignalDerivedEventType('RETRY_STEP')).toBeNull();
    expect(getSignalDerivedEventType('RETRY_RUN')).toBeNull();
  });
});
