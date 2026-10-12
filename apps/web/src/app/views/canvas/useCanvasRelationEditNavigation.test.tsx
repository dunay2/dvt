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
            applyRejection: null,
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
          applyRejection: null,
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
});
