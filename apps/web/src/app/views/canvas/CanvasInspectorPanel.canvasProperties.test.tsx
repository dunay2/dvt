// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasInspectorPanel } from './CanvasInspectorPanel';

describe('CanvasInspectorPanel canvas properties', () => {
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
    vi.clearAllMocks();
  });

  function renderCanvasInspector(
    canvas: NonNullable<React.ComponentProps<typeof CanvasInspectorPanel>['canvas']>
  ): void {
    act(() => {
      root.render(
        <CanvasInspectorPanel
          node={null}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: canvas.canEdit,
            onApplyNodeDraft: vi.fn(),
          }}
          canvas={canvas}
        />
      );
    });
  }

  it('shows active canvas properties and applies a rename', () => {
    const onApplyCanvasPatch = vi.fn();
    const onDeleteCanvas = vi.fn();

    renderCanvasInspector({
      id: 'canvas-modeling',
      kind: 'transformation',
      title: 'Modeling',
      environmentId: 'dev',
      defaultPermission: 'write',
      executionEnvironmentOptions: [
        { value: 'dev', label: 'Development' },
        { value: 'prod', label: 'Production' },
      ],
      canEdit: true,
      canDelete: true,
      onApplyCanvasPatch,
      onDeleteCanvas,
    });

    const titleInput = container.querySelector('input[name="canvas-title"]') as HTMLInputElement;
    const environmentSelect = container.querySelector(
      'select[name="canvas-environment"]'
    ) as HTMLSelectElement;

    expect(container.textContent).toContain('Canvas properties');
    expect(titleInput.value).toBe('Modeling');
    expect(container.textContent).toContain('canvas-modeling');
    expect(environmentSelect.value).toBe('dev');

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(titleInput, 'Modeling v2');
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    act(() => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyCanvasPatch).toHaveBeenCalledWith({ title: 'Modeling v2' });

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Delete')
    );

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDeleteCanvas).toHaveBeenCalledTimes(1);
  });

  it('lets the active canvas select its execution environment', () => {
    const onApplyCanvasPatch = vi.fn();

    renderCanvasInspector({
      id: 'canvas-modeling',
      kind: 'transformation',
      title: 'Modeling',
      environmentId: 'dev',
      defaultPermission: 'write',
      executionEnvironmentOptions: [
        { value: 'dev', label: 'Development' },
        { value: 'stage', label: 'Staging' },
        { value: 'prod', label: 'Production' },
      ],
      canEdit: true,
      canDelete: true,
      onApplyCanvasPatch,
      onDeleteCanvas: vi.fn(),
    });

    const environmentSelect = container.querySelector(
      'select[name="canvas-environment"]'
    ) as HTMLSelectElement;

    expect(environmentSelect.value).toBe('dev');
    expect(Array.from(environmentSelect.options).map((option) => option.textContent)).toEqual([
      'Development',
      'Staging',
      'Production',
    ]);

    act(() => {
      environmentSelect.value = 'prod';
      environmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    act(() => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyCanvasPatch).toHaveBeenCalledWith({ environmentId: 'prod' });
  });

  it('keeps canvas properties read-only when the route cannot mutate canvases', () => {
    renderCanvasInspector({
      id: 'canvas-modeling',
      kind: 'transformation',
      title: 'Modeling',
      executionEnvironmentOptions: [{ value: 'dev', label: 'Development' }],
      canEdit: false,
      canDelete: false,
      onApplyCanvasPatch: vi.fn(),
      onDeleteCanvas: vi.fn(),
    });

    const titleInput = container.querySelector('input[name="canvas-title"]');
    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Delete')
    );

    expect(titleInput?.getAttribute('disabled')).not.toBeNull();
    expect(deleteButton?.getAttribute('disabled')).not.toBeNull();
  });
});
