// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCanvasNodeFloatingToolbarModel } from './canvasNodeFloatingToolbarModel';
import { CanvasNodeFloatingToolbarView } from './CanvasNodeFloatingToolbarView';

describe('CanvasNodeFloatingToolbarView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the node floating toolbar with code, freeze, green play, and overflow actions', () => {
    const onOpenCode = vi.fn();
    const onToggleExecutionSelection = vi.fn();
    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      selectedForExecution: false,
      position: { x: 320, y: 160 },
      onOpenCode,
      onToggleExecutionSelection,
    });

    act(() => {
      root.render(<CanvasNodeFloatingToolbarView model={model} />);
    });

    const toolbar = container.querySelector('[data-slot="canvas-node-floating-toolbar"]');
    expect(toolbar).not.toBeNull();
    expect((toolbar as HTMLElement).style.getPropertyValue('--node-toolbar-x')).toBe('320px');
    expect((toolbar as HTMLElement).style.getPropertyValue('--node-toolbar-y')).toBe('160px');

    expect(button('Código')).not.toBeNull();
    expect(button('Congelar')?.getAttribute('aria-disabled')).toBe('true');
    const playButton = button('Seleccionar para ejecución');
    expect(playButton).not.toBeNull();
    expect(playButton?.dataset.tone).toBe('success');
    expect(button('Más acciones')?.getAttribute('aria-disabled')).toBe('true');

    act(() => {
      playButton?.click();
    });

    expect(onToggleExecutionSelection).toHaveBeenCalledWith('model_orders', true);
  });

  function button(label: string): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  }
});
