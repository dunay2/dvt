// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasPlaygroundTabStrip } from './CanvasPlaygroundTabStrip';
import { canvasViewCopy } from './copy';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';

const transformationCanvasKind: CanvasKindRegistration = {
  kind: 'transformation',
  pluginId: 'dvt',
  label: 'Transformation',
  description: 'Author transformation pipelines.',
  createTitle: 'Transformation canvas',
  emptyState: {
    title: 'No graph content loaded',
    editableMessage: 'Add governed nodes to start authoring.',
    firstNodeLabel: 'Add first node',
    firstNodeHelper: 'Choose a node kind.',
  },
  nodeKinds: [],
};

function renderTabStrip(props?: Partial<React.ComponentProps<typeof CanvasPlaygroundTabStrip>>): {
  container: HTMLDivElement;
  root: Root;
  onCreateCanvasDocument: ReturnType<typeof vi.fn>;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onCreateCanvasDocument = vi.fn();

  act(() => {
    root.render(
      <CanvasPlaygroundTabStrip
        tabState={{
          activeTabId: 'workspace-draft-canvas',
          tabs: [
            {
              id: 'workspace-draft-canvas',
              title: 'Sales canvas',
              kind: 'transformation',
              kindLabel: 'Transformation',
              source: 'workspace_draft',
            },
          ],
        }}
        availableCanvasKinds={[transformationCanvasKind]}
        canEditEdges={true}
        onCreateCanvasDocument={onCreateCanvasDocument}
        {...props}
      />
    );
  });

  return {
    container,
    root,
    onCreateCanvasDocument,
  };
}

describe('CanvasPlaygroundTabStrip', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('requires confirmation before replacing the current draft canvas with a blank canvas', async () => {
    const { container, onCreateCanvasDocument, root } = renderTabStrip();

    const newCanvasButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(canvasViewCopy.newCanvasLabel)
    );
    expect(newCanvasButton).not.toBeUndefined();

    await act(async () => {
      newCanvasButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCreateCanvasDocument).not.toHaveBeenCalled();
    const confirmButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(canvasViewCopy.replaceCanvasConfirmLabel)
    );
    expect(confirmButton).not.toBeUndefined();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCreateCanvasDocument).toHaveBeenCalledTimes(1);
    expect(onCreateCanvasDocument).toHaveBeenCalledWith({
      kind: 'transformation',
      title: 'Transformation canvas',
      mode: 'replace_current',
    });

    act(() => {
      root.unmount();
    });
  });

  it('keeps the replacement action disabled when graph edits are gated', () => {
    const { container, onCreateCanvasDocument, root } = renderTabStrip({
      canEditEdges: false,
    });

    const newCanvasButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(canvasViewCopy.newCanvasLabel)
    );
    expect(newCanvasButton).not.toBeUndefined();
    expect(newCanvasButton?.getAttribute('disabled')).not.toBeNull();
    expect(onCreateCanvasDocument).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
