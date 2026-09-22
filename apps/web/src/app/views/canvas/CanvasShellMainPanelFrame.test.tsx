// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CanvasShellContextualWorkbenchSplit } from './CanvasShellMainPanelFrame';
import type { CanvasShellContextualWorkbench } from './canvasShell.types';

it('retains the same viewport and local disclosure state across inspector open, replace and close', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  function Viewport(): JSX.Element {
    const [expanded, setExpanded] = useState(false);
    return (
      <button data-testid="viewport-state" onClick={() => setExpanded(true)}>
        {expanded ? 'expanded' : 'collapsed'}
      </button>
    );
  }
  const render = (workbench?: CanvasShellContextualWorkbench): void => {
    act(() =>
      root.render(
        <CanvasShellContextualWorkbenchSplit baseSurface={<Viewport />} workbench={workbench} />
      )
    );
  };
  try {
    render();
    const viewport = container.querySelector<HTMLButtonElement>('[data-testid="viewport-state"]')!;
    act(() => viewport.click());
    const workbench: CanvasShellContextualWorkbench = {
      id: 'output-expression',
      presentation: 'docked',
      title: 'Properties',
      closeLabel: 'Close',
      panel: <p>Canonical expression</p>,
      requestClose: async () => true,
    };
    render(workbench);
    render({ ...workbench, title: 'Another output' });
    render();
    expect(container.querySelector('[data-testid="viewport-state"]')).toBe(viewport);
    expect(viewport.textContent).toBe('expanded');
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
