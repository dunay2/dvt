/** Shared mounting only; each suite owns its navigation behavior assertions. */
import React, { act, StrictMode } from 'react';
import { vi } from 'vitest';
import {
  useCanvasRelationEditNavigation,
  type CanvasRelationEditNavigationSession,
} from './useCanvasRelationEditNavigation';
import { root } from './CanvasRelationalTreeWorkbench.test-support';

export function mountRelationNavigation() {
  const apply = vi.fn<CanvasRelationEditNavigationSession['apply']>(() => ({
    outcome: 'no_changes',
  }));
  const cancel = vi.fn();
  const select = vi.fn();
  let context = {
    modelId: 'model-a',
    editing: true,
    selectedRelationId: 'origin' as string | null,
    session: { apply, cancel, hasUnappliedChanges: true, canApply: true },
    onSelect: select,
  };
  let binding: ReturnType<typeof useCanvasRelationEditNavigation>;
  function Host() {
    binding = useCanvasRelationEditNavigation(context);
    return null;
  }
  const render = (patch: Partial<typeof context> = {}) => {
    context = { ...context, ...patch };
    act(() =>
      root.render(
        <StrictMode>
          <Host />
        </StrictMode>
      )
    );
  };
  render();
  return {
    apply,
    cancel,
    select,
    render,
    get context() {
      return context;
    },
    get binding() {
      return binding;
    },
    unmount: () => act(() => root.render(null)),
  };
}
