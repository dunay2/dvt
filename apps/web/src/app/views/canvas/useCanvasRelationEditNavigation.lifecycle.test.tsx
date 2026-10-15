// @vitest-environment jsdom
/** Decisions belong to their committed Model/edit lifetime, never a stale render. */
import { act } from 'react';
import { flushSync } from 'react-dom';
import { describe, expect, it } from 'vitest';
import { setupWorkbenchTest } from './CanvasRelationalTreeWorkbench.test-support';
import { mountRelationNavigation } from './relationEditNavigation.test-support';

describe('relational navigation lifetime', () => {
  setupWorkbenchTest();

  it.each([{ modelId: 'model-b' }, { selectedRelationId: 'elsewhere' }, { editing: false }])(
    'invalidates a pending decision after scope change %j',
    (patch) => {
      const host = mountRelationNavigation();
      act(() => host.binding.select('destination'));
      const obsolete = host.binding;
      host.render(patch);
      expect(host.binding.pending).toBe(false);
      act(() => {
        obsolete.apply();
        obsolete.discard();
      });
      expect(host.apply).not.toHaveBeenCalled();
      expect(host.cancel).not.toHaveBeenCalled();
      expect(host.select).not.toHaveBeenCalled();
    }
  );

  it('keeps equivalent wrapper refreshes but reads current Apply eligibility', () => {
    const host = mountRelationNavigation();
    act(() => host.binding.select('destination'));
    const rendered = host.binding;
    host.render({ session: { ...host.context.session, canApply: false } });
    expect(host.binding.pending).toBe(true);
    act(() => rendered.apply());
    expect(host.apply).not.toHaveBeenCalled();
    host.render({ session: { ...host.context.session, canApply: true } });
    act(() => host.binding.apply());
    expect(host.apply).toHaveBeenCalledOnce();
    expect(host.select).toHaveBeenCalledExactlyOnceWith('destination');
  });

  it.each(['apply', 'discard'] as const)(
    'ignores an obsolete outcome after %s changes Model',
    (decision) => {
      const host = mountRelationNavigation();
      act(() => host.binding.select('destination'));
      const invalidate = (): void => flushSync(() => host.render({ modelId: 'replacement-model' }));
      if (decision === 'apply')
        host.apply.mockImplementationOnce(() => {
          invalidate();
          return { outcome: 'no_changes' };
        });
      else host.cancel.mockImplementationOnce(invalidate);
      act(() => host.binding[decision]());
      expect(host.binding.pending).toBe(false);
      expect(host.select).not.toHaveBeenCalled();
    }
  );

  it('does not let an old destination binding consume its replacement', () => {
    const host = mountRelationNavigation();
    act(() => host.binding.select('first'));
    const obsolete = host.binding;
    act(() => host.binding.select('replacement'));
    act(() => {
      obsolete.apply();
      obsolete.discard();
      obsolete.stay();
    });
    expect(host.binding.pending).toBe(true);
    expect(host.apply).not.toHaveBeenCalled();
    expect(host.cancel).not.toHaveBeenCalled();
    act(() => host.binding.discard());
    expect(host.select).toHaveBeenCalledExactlyOnceWith('replacement');
  });

  it('invalidates callbacks on unmount', () => {
    const host = mountRelationNavigation();
    act(() => host.binding.select('destination'));
    const obsolete = host.binding;
    host.unmount();
    act(() => {
      obsolete.apply();
      obsolete.discard();
      obsolete.select('other');
    });
    expect(host.apply).not.toHaveBeenCalled();
    expect(host.cancel).not.toHaveBeenCalled();
    expect(host.select).not.toHaveBeenCalled();
  });

  it('does not navigate when Apply unmounts its owner before returning', () => {
    const host = mountRelationNavigation();
    act(() => host.binding.select('destination'));
    host.apply.mockImplementationOnce(() => {
      flushSync(() => host.unmount());
      return { outcome: 'no_changes' };
    });
    act(() => host.binding.apply());
    expect(host.apply).toHaveBeenCalledOnce();
    expect(host.select).not.toHaveBeenCalled();
  });

  it('consumes Discard synchronously before duplicate and reentrant deliveries', () => {
    const host = mountRelationNavigation();
    act(() => host.binding.select('destination'));
    const decision = host.binding;
    host.cancel.mockImplementationOnce(() => decision.discard());
    act(() => {
      decision.discard();
      decision.discard();
      decision.apply();
    });
    expect(host.cancel).toHaveBeenCalledOnce();
    expect(host.apply).not.toHaveBeenCalled();
    expect(host.select).toHaveBeenCalledExactlyOnceWith('destination');
  });
});
