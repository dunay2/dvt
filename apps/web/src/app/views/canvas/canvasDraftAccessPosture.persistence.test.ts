import { describe, expect, it } from 'vitest';
import {
  deriveCanvasDraftAccessPosture,
  toCanvasDraftStatusState,
  type DeriveCanvasDraftAccessPostureArgs,
} from './canvasDraftAccessPostureModel';

const base: DeriveCanvasDraftAccessPostureArgs = {
  draftAccessMode: 'writable',
  draftCapabilityReason: 'authorized',
  draftFormatError: null,
  authTransportPosture: 'none',
  recoveryReason: null,
  draftSaveStatus: 'idle',
};
const denials: readonly [string, Partial<DeriveCanvasDraftAccessPostureArgs>][] = [
  ['session expired', { authTransportPosture: 'unauthorized_final' }],
  ['read only', { draftAccessMode: 'read_only' }],
  ['scope forbidden', { draftAccessMode: 'forbidden' }],
  ['format error', { draftFormatError: { reason: 'corrupt_payload' } }],
];

describe.each(denials)('draft persistence after %s', (_, denial) => {
  it.each(['saving', 'failed'] as const)(
    'never reports %s local edits as durable',
    (draftSaveStatus) => {
      const posture = deriveCanvasDraftAccessPosture({ ...base, ...denial, draftSaveStatus });
      expect(posture.mutationBlocked).toBe(true);
      expect(toCanvasDraftStatusState(posture).persistence).toBe(
        draftSaveStatus === 'saving' ? 'blocked' : 'failed'
      );
    }
  );
  it('keeps a clean read-only session free of unsaved-change warnings', () => {
    expect(
      toCanvasDraftStatusState(deriveCanvasDraftAccessPosture({ ...base, ...denial })).persistence
    ).toBe('durable');
  });
  it('retains a save conflict even when access denial takes visual priority', () => {
    expect(
      toCanvasDraftStatusState(
        deriveCanvasDraftAccessPosture({ ...base, ...denial, recoveryReason: 'stale_conflict' })
      ).persistence
    ).toBe('blocked');
  });
});
