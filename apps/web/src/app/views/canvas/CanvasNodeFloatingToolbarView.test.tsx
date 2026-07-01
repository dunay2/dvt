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

  it('renders node floating toolbar actions with unavailable freeze posture', () => {
    const onOpenCode = vi.fn();
    const onOpenMore = vi.fn();
    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      position: { x: 320, y: 160 },
      onOpenCode,
      onOpenMore,
    });

    act(() => {
      root.render(<CanvasNodeFloatingToolbarView model={model} />);
    });

    const toolbar = document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.parentElement).toBe(document.body);
    expect(toolbar?.getAttribute('data-token-scope')).toBe('canvas-node-floating-toolbar');
    expect((toolbar as HTMLElement).style.getPropertyValue('--node-toolbar-x')).toBe('320px');
    expect((toolbar as HTMLElement).style.getPropertyValue('--node-toolbar-y')).toBe('160px');

    expect(button('Código')).not.toBeNull();
    expect(button('Código')?.getAttribute('data-action-state')).toBe('available');
    expect(button('Congelar')).not.toBeNull();
    expect(button('Congelar')?.getAttribute('data-action-state')).toBe('unavailable');
    expect(button('Congelar')?.getAttribute('aria-disabled')).toBe('true');
    expect(button('Congelar')?.getAttribute('title')).toBe(
      'La política de congelado del nodo aún no está disponible.'
    );
    expect(button('Seleccionar para ejecución')).toBeNull();
    expect(button('Más acciones')).not.toBeNull();
    expect(button('Más acciones')?.textContent).toBe('');

    act(() => {
      button('Código')?.click();
      button('Más acciones')?.click();
    });

    expect(onOpenCode).toHaveBeenCalledWith('model_orders');
    expect(onOpenMore).toHaveBeenCalledWith('model_orders');
  });

  function button(label: string): HTMLButtonElement | null {
    return document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  }
});
