// @vitest-environment jsdom

import { ReactFlowProvider } from '@xyflow/react';
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasNodeShell } from './CanvasNodeShell';
import type { CanvasNodeContextMenuModel } from './canvasNodeContextMenuModel';

const CONTEXT_MENU_MODEL: CanvasNodeContextMenuModel = {
  target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders model' },
  actionGroups: [],
};

describe('CanvasNodeShell', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('opens the contextual node workbench from the node body double-click gesture', () => {
    const openWorkbench = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={vi.fn()}
          onOpenWorkbench={openWorkbench}
        >
          <div>Orders model</div>
        </CanvasNodeShell>
      );
    });

    act(() => {
      fireEvent.dblClick(container.querySelector('div')!);
    });

    expect(openWorkbench).toHaveBeenCalledOnce();
  });

  it('renders graph ports through component-owned presentation slots', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('data-port'))).toEqual(['target', 'source']);
  });
});
