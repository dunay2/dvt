// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasPlaygroundHost } from './CanvasPlaygroundHost';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';

const canvasKinds: readonly CanvasKindRegistration[] = [
  {
    kind: 'transformation',
    pluginId: 'dvt',
    label: 'Transformation',
    description: 'Flow-based transformation canvas for the protected authoring draft.',
    createTitle: 'Transformation canvas',
    nodeKinds: [],
  },
];

function renderHost(overrides: Partial<React.ComponentProps<typeof CanvasPlaygroundHost>> = {}): {
  container: HTMLDivElement;
  onCreateCanvasDocument: ReturnType<typeof vi.fn>;
  root: Root;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onCreateCanvasDocument = vi.fn();

  act(() => {
    root.render(
      <CanvasPlaygroundHost
        canvasKinds={canvasKinds}
        onCreateCanvasDocument={onCreateCanvasDocument}
        {...overrides}
      />
    );
  });

  return {
    container,
    onCreateCanvasDocument,
    root,
  };
}

describe('CanvasPlaygroundHost', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('presents the shared Canvas entrypoint inside the active workspace context', () => {
    const { container, root } = renderHost();

    expect(container.textContent).toContain('Canvas');
    expect(container.textContent).not.toContain('Active workspace');
    expect(container.textContent).not.toContain('tenant-a / project-orders / dev');
    expect(container.textContent).not.toContain('Adapter: temporal');
    expect(container.textContent).not.toContain('Choose a canvas template');
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(container.querySelector('button')?.textContent).toBe('Start canvas');
    expect(container.textContent).not.toContain('dbt canvas');
    expect(container.textContent).not.toContain('governed canvas kind');

    act(() => {
      root.unmount();
    });
  });

  it('dispatches the shared Canvas through the host-owned create command', async () => {
    const { container, onCreateCanvasDocument, root } = renderHost();
    const transformationButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start canvas')
    );

    expect(transformationButton).not.toBeUndefined();

    await act(async () => {
      transformationButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCreateCanvasDocument).toHaveBeenCalledTimes(1);
    expect(onCreateCanvasDocument).toHaveBeenCalledWith({
      kind: 'transformation',
      title: 'Canvas',
    });

    act(() => {
      root.unmount();
    });
  });

  it('renders the unavailable Canvas choice as disabled instead of a no-op button', async () => {
    const { container, onCreateCanvasDocument, root } = renderHost({
      onCreateCanvasDocument: undefined,
      unavailableMessage: 'Graph edits are unavailable for this workspace scope.',
    });
    const templateButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-slot="canvas-playground-template-choice"]'
    );

    expect(container.textContent).toContain(
      'Graph edits are unavailable for this workspace scope.'
    );
    expect([...templateButtons].every((button) => button.disabled)).toBe(true);

    await act(async () => {
      templateButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCreateCanvasDocument).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
