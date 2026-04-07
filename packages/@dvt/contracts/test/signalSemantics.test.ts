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

  it('does not derive PAUSE and RESUME run events in the current semantics version', () => {
    expect(getSignalDerivedEventType('PAUSE')).toBeNull();
    expect(getSignalDerivedEventType('RESUME')).toBeNull();
  });

  it('fails closed when an adapter declares an unsupported semantics version', () => {
    expect(() => getSignalDerivedEventType('PAUSE', ['2.0.0'])).toThrow(
      /SIGNAL_SEMANTICS_VERSION_UNSUPPORTED/
    );
  });

  it('returns null for adapter-owned signals with no engine-derived event', () => {
    expect(getSignalDerivedEventType('CANCEL')).toBeNull();
    expect(getSignalDerivedEventType('RETRY_STEP')).toBeNull();
    expect(getSignalDerivedEventType('RETRY_RUN')).toBeNull();
  });
});
