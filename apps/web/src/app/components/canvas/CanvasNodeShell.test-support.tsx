/** Own the mounted DOM lifetime shared by the card gesture, menu and port proofs. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, vi } from 'vitest';
import type { CanvasNodeContextMenuModel } from './canvasNodeContextMenuModel';

export const CONTEXT_MENU_MODEL: CanvasNodeContextMenuModel = {
  target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders model' },
  actionGroups: [
    {
      id: 'edit',
      label: 'Edit',
      actions: [
        {
          id: 'duplicate-node',
          label: 'Duplicate',
          intent: 'command',
          disabled: false,
        },
      ],
    },
  ],
};

export function setupCanvasNodeShellTestSurface() {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  return {
    get container() {
      return container;
    },
    get root() {
      return root;
    },
  };
}
