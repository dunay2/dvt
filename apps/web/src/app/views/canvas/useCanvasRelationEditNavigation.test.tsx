// @vitest-environment jsdom
/** Selection decisions preserve the existing transaction on rejection and never duplicate Apply. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useCanvasRelationEditNavigation } from './useCanvasRelationEditNavigation';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';

describe('relation edit navigation', () => {
  setupWorkbenchTest();

  it.each([false, true])(
    'leaves the selected relation only after an accepted Apply (rejected: %s)',
    (rejected) => {
      const select = vi.fn();
      const cancel = vi.fn();
      const apply = vi.fn(() =>
        rejected
          ? { outcome: 'rejected' as const, reason: 'node_unavailable' as const }
          : { outcome: 'no_changes' as const }
      );
      let navigation: ReturnType<typeof useCanvasRelationEditNavigation>;
      function Host(): null {
        navigation = useCanvasRelationEditNavigation({
          editing: true,
          selectedRelationId: 'editing',
          onSelect: select,
          session: {
            apply,
            cancel,
            canApply: true,
            hasUnappliedChanges: true,
          },
        });
        return null;
      }
      act(() => root.render(<Host />));
      act(() => navigation.select('destination'));
      expect(navigation!.pending).toBe(true);
      act(() => {
        navigation.apply();
        if (!rejected) navigation.apply();
      });
      expect(apply).toHaveBeenCalledOnce();
      expect(navigation!.pending).toBe(rejected);
      expect(cancel).not.toHaveBeenCalled();
      if (rejected) expect(select).not.toHaveBeenCalled();
      else expect(select).toHaveBeenCalledExactlyOnceWith('destination');
    }
  );

  it('exits an unchanged edit on selection without applying or asking for confirmation', () => {
    const select = vi.fn();
    const cancel = vi.fn();
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    let navigation: ReturnType<typeof useCanvasRelationEditNavigation>;
    function Host(): null {
      navigation = useCanvasRelationEditNavigation({
        editing: true,
        selectedRelationId: 'editing',
        onSelect: select,
        session: {
          apply,
          cancel,
          canApply: true,
          hasUnappliedChanges: false,
        },
      });
      return null;
    }
    act(() => root.render(<Host />));
    act(() => navigation.select('destination'));
    expect(navigation!.pending).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledExactlyOnceWith('destination');
    expect(apply).not.toHaveBeenCalled();
  });

  it.each(['stay', 'discard'] as const)(
    'keeps blocked Apply inert and requires an explicit %s decision',
    (decision) => {
      const select = vi.fn();
      const cancel = vi.fn();
      const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
      let navigation: ReturnType<typeof useCanvasRelationEditNavigation>;
      function Host(): null {
        navigation = useCanvasRelationEditNavigation({
          editing: true,
          selectedRelationId: 'editing',
          onSelect: select,
          session: { apply, cancel, canApply: false, hasUnappliedChanges: true },
        });
        return null;
      }
      act(() => root.render(<Host />));
      act(() => {
        navigation.apply();
        navigation.discard();
        navigation.select('editing');
      });
      expect(navigation!.pending).toBe(false);
      expect(apply).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
      act(() => navigation.select('destination'));
      expect(navigation!.pending).toBe(true);
      act(() => navigation.apply());
      expect(navigation!.pending).toBe(true);
      expect(apply).not.toHaveBeenCalled();
      act(() => navigation[decision]());
      expect(navigation!.pending).toBe(false);
      expect(apply).not.toHaveBeenCalled();
      if (decision === 'stay') {
        expect(cancel).not.toHaveBeenCalled();
        expect(select).not.toHaveBeenCalled();
      } else {
        expect(cancel).toHaveBeenCalledOnce();
        expect(select).toHaveBeenCalledExactlyOnceWith('destination');
      }
    }
  );
});
