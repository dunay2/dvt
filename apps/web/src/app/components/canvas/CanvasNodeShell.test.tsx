// @vitest-environment jsdom

import { ReactFlowProvider } from '@xyflow/react';
import { fireEvent } from '@testing-library/dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasNodeShell } from './CanvasNodeShell';
import type { CanvasNodeContextMenuModel } from './canvasNodeContextMenuModel';
import { canvasNodeEmbeddedControlProps } from './canvasNodeInteractionBoundary';

const CONTEXT_MENU_MODEL: CanvasNodeContextMenuModel = {
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

const canvasNodeShellCssPath = resolve(import.meta.dirname, 'CanvasNodeShell.module.css');
const themeCssPath = resolve(import.meta.dirname, '../../../styles/theme.css');

describe('CanvasNodeShell', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
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

  it('opens the node through one Properties intent on body double-click', () => {
    const openNode = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={vi.fn()}
          onOpenNode={openNode}
        >
          <div>Orders model</div>
        </CanvasNodeShell>
      );
    });

    act(() => {
      fireEvent.dblClick(container.querySelector('div')!);
    });

    expect(openNode).toHaveBeenCalledOnce();
  });

  it('does not enter the node when double-click starts on an embedded node control', () => {
    const openNode = vi.fn();
    const onContextMenuAction = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={onContextMenuAction}
          onOpenNode={openNode}
        >
          <button type="button" {...canvasNodeEmbeddedControlProps}>
            Inline control
          </button>
        </CanvasNodeShell>
      );
    });

    act(() => {
      fireEvent.dblClick(container.querySelector('button')!);
    });

    expect(openNode).not.toHaveBeenCalled();
    expect(onContextMenuAction).not.toHaveBeenCalled();
  });

  it('opens node operations from a native right-click on the node body', async () => {
    const onContextMenuAction = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={onContextMenuAction}
        >
          <div data-testid="node-body">Orders model</div>
        </CanvasNodeShell>
      );
    });

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    const target = container.querySelector('[data-testid="node-body"]')!;
    await act(async () => {
      target.dispatchEvent(event);
    });

    expect(document.querySelector('[data-slot="canvas-node-context-menu"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="canvas-node-context-menu"]')?.textContent).toContain(
      'Duplicate'
    );
    expect(onContextMenuAction).not.toHaveBeenCalled();
  });

  it('opens node operations only for the explicit upper action request', async () => {
    const onContextMenuAction = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={CONTEXT_MENU_MODEL}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={onContextMenuAction}
        >
          <button type="button" data-testid="upper-node-actions">
            More node actions
          </button>
        </CanvasNodeShell>
      );
    });

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 240,
      clientY: 160,
    });
    Object.defineProperty(event, 'dvtNodeActionsRequest', { value: true });

    await act(async () => {
      container.querySelector('[data-testid="upper-node-actions"]')?.dispatchEvent(event);
    });

    expect(document.querySelector('[data-slot="canvas-node-context-menu"]')).not.toBeNull();
    const duplicateAction = document.querySelector<HTMLElement>(
      '[data-slot="canvas-node-context-menu-item"]'
    );
    expect(duplicateAction?.textContent).toContain('Duplicate');

    await act(async () => {
      duplicateAction?.click();
    });
    expect(onContextMenuAction).toHaveBeenCalledWith('duplicate-node');
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

  it('renders graph ports with caller-owned semantic tones', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourceHandleTone="source"
            targetHandleTone="model"
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('data-tone'))).toEqual(['model', 'source']);
  });

  it('renders graph ports with caller-owned accessible labels', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourcePortLabel="Localized outgoing port"
            targetPortLabel="Localized incoming port"
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('aria-label'))).toEqual([
      'Localized incoming port',
      'Localized outgoing port',
    ]);
  });

  it('renders graph ports with caller-owned compatibility state and descriptions', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourcePortLabel="Outgoing port"
            targetPortLabel="Incoming port"
            sourcePortCompatibility={{
              state: 'available',
              compatibleNodeNames: ['Orders model'],
              description: 'Compatible with Orders model',
            }}
            targetPortCompatibility={{
              state: 'blocked',
              compatibleNodeNames: [],
              description: 'No compatible upstream nodes',
            }}
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(container.querySelectorAll('[data-slot="canvas-node-port-handle"]'));

    expect(ports.map((port) => port.getAttribute('data-port-compatibility'))).toEqual([
      'blocked',
      'available',
    ]);
    expect(ports.map((port) => port.getAttribute('title'))).toEqual([
      'No compatible upstream nodes',
      'Compatible with Orders model',
    ]);
  });

  it('renders graph ports with stable React Flow handle ids', () => {
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

    expect(ports.map((port) => port.getAttribute('data-handleid'))).toEqual(['target', 'source']);
  });

  it('keeps graph port tone colors in global design tokens instead of component-local hex values', () => {
    const componentCss = readFileSync(canvasNodeShellCssPath, 'utf8');
    const themeCss = readFileSync(themeCssPath, 'utf8');

    expect(componentCss).not.toMatch(/#[0-9a-fA-F]{3,8}/u);
    expect(componentCss).toContain(".portHandle[data-tone='control']");
    expect(themeCss).toContain('--canvas-node-port-source-ring');
    expect(themeCss).toContain('--canvas-node-port-model-ring');
    expect(themeCss).toContain('--canvas-node-port-test-ring');
    expect(themeCss).toContain('--canvas-node-port-output-ring');
    expect(themeCss).toContain('--canvas-node-port-control-ring');
  });

  it('uses grab cursors for graph connection ports', () => {
    const componentCss = readFileSync(canvasNodeShellCssPath, 'utf8');

    expect(componentCss).toMatch(/\.portHandle\s*\{[^}]*cursor:\s*grab\s*!important;/su);
    expect(componentCss).toMatch(/\.portHandle:active\s*\{[^}]*cursor:\s*grabbing\s*!important;/su);
    expect(componentCss).toMatch(
      /react-flow:has\(\.react-flow__handle\.connectingfrom\)\s+\.react-flow__pane[^}]*cursor:\s*grabbing\s*!important;/su
    );
    expect(componentCss).toMatch(
      /react-flow:has\(\.react-flow__handle\.connectingfrom\)\s+\.react-flow__pane\s+\*[^}]*cursor:\s*grabbing\s*!important;/su
    );
    expect(componentCss).not.toContain('cursor: crosshair;');
  });
});
