// @vitest-environment jsdom
/** Selection decisions preserve the existing transaction and consume effects once. */
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { setupWorkbenchTest } from './CanvasRelationalTreeWorkbench.test-support';
import { mountRelationNavigation } from './relationEditNavigation.test-support';
import type { CanvasRelationalTreeApplyResult } from './canvasRelationalTreeWorkbench.types';

describe('relation edit navigation', () => {
  setupWorkbenchTest();

  it.each([false, true])(
    'awaits deferred Apply before navigation (rejected: %s)',
    async (rejected) => {
      const host = mountRelationNavigation();
      let finish!: (result: CanvasRelationalTreeApplyResult) => void;
      const pending = new Promise<CanvasRelationalTreeApplyResult>((resolve) => {
        finish = resolve;
      });
      host.apply.mockReturnValue(pending);
      act(() => host.binding.select('destination'));
      act(() => {
        host.binding.apply();
        host.binding.apply();
      });
      expect(host.apply).toHaveBeenCalledOnce();
      expect(host.select).not.toHaveBeenCalled();
      await act(async () => {
        finish(
          rejected ? { outcome: 'rejected', reason: 'invalid_draft' } : { outcome: 'no_changes' }
        );
        await pending;
      });
      if (rejected) {
        expect(host.select).not.toHaveBeenCalled();
        expect(host.binding.pending).toBe(true);
      } else expect(host.select).toHaveBeenCalledExactlyOnceWith('destination');
    }
  );

  it.each([false, true])('navigates only after accepted Apply (rejected: %s)', (rejected) => {
    const host = mountRelationNavigation();
    host.apply.mockReturnValue(
      rejected ? { outcome: 'rejected', reason: 'node_unavailable' } : { outcome: 'no_changes' }
    );
    act(() => host.binding.select('destination'));
    const decision = host.binding;
    act(() => {
      decision.apply();
      decision.apply();
    });
    expect(host.apply).toHaveBeenCalledOnce();
    expect(host.binding.pending).toBe(rejected);
    expect(host.cancel).not.toHaveBeenCalled();
    if (rejected) {
      expect(host.select).not.toHaveBeenCalled();
      host.apply.mockReturnValue({ outcome: 'no_changes' });
      act(() => host.binding.apply());
      expect(host.apply).toHaveBeenCalledTimes(2);
    }
    expect(host.select).toHaveBeenCalledExactlyOnceWith('destination');
  });

  it.each([false, true])(
    'navigates an unchanged selection without Apply (editing: %s)',
    (editing) => {
      const host = mountRelationNavigation();
      host.render({ editing, session: { ...host.context.session, hasUnappliedChanges: false } });
      host.cancel.mockImplementationOnce(() => host.binding.select('reentrant'));
      act(() => host.binding.select(null));
      expect(host.binding.pending).toBe(false);
      expect(host.cancel).toHaveBeenCalledTimes(editing ? 1 : 0);
      expect(host.select).toHaveBeenCalledExactlyOnceWith(null);
      expect(host.apply).not.toHaveBeenCalled();
    }
  );

  it.each(['stay', 'discard'] as const)(
    'keeps blocked Apply inert before explicit %s',
    (decision) => {
      const host = mountRelationNavigation();
      host.render({ session: { ...host.context.session, canApply: false } });
      act(() => {
        host.binding.apply();
        host.binding.discard();
        host.binding.select('origin');
      });
      expect(host.binding.pending).toBe(false);
      act(() => host.binding.select('destination'));
      act(() => host.binding.apply());
      expect(host.binding.pending).toBe(true);
      act(() => host.binding[decision]());
      expect(host.binding.pending).toBe(false);
      expect(host.apply).not.toHaveBeenCalled();
      if (decision === 'stay') {
        expect(host.cancel).not.toHaveBeenCalled();
        expect(host.select).not.toHaveBeenCalled();
      } else {
        expect(host.cancel).toHaveBeenCalledOnce();
        expect(host.select).toHaveBeenCalledExactlyOnceWith('destination');
      }
    }
  );

  it('preserves a thrown Apply for a fresh attempt without admitting reentrant decisions', () => {
    const host = mountRelationNavigation();
    act(() => host.binding.select('destination'));
    const decision = host.binding;
    host.apply.mockImplementationOnce(() => {
      decision.apply();
      decision.discard();
      decision.select('reentrant');
      throw new Error('command failed');
    });
    act(() => expect(() => decision.apply()).toThrow('command failed'));
    expect(host.binding.pending).toBe(true);
    act(() => decision.apply());
    expect(host.apply).toHaveBeenCalledOnce();
    expect(host.cancel).not.toHaveBeenCalled();
    expect(host.select).not.toHaveBeenCalled();
    act(() => host.binding.apply());
    expect(host.apply).toHaveBeenCalledTimes(2);
    expect(host.select).toHaveBeenCalledExactlyOnceWith('destination');
  });
});
