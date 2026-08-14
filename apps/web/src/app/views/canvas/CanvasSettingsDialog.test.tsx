// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasSettingsDialog } from './CanvasSettingsDialog';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

describe('CanvasSettingsDialog', () => {
  let container: HTMLDivElement;
  let root: Root;
  let focusReturnTarget: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    focusReturnTarget = document.createElement('button');
    document.body.append(container, focusReturnTarget);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    focusReturnTarget.remove();
  });

  it('uses localized Radix focus and Escape behavior', async () => {
    const onClose = vi.fn();
    const copy = resolveCanvasViewCopy('es');

    function Harness(): JSX.Element {
      const [open, setOpen] = useState(true);

      return (
        <CanvasSettingsDialog
          open={open}
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          canUseCostOverlay
          costOverlayEnabled={false}
          gridSize={20}
          canvasPalette="#101826"
          canvasGridVisible
          canvasGridColor="#101826"
          canvasSnapToGrid={false}
          canvasEmptyStateGuideVisible
          canAutoLayout={false}
          copy={copy}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleGridVisible={vi.fn()}
          onGridColorChange={vi.fn()}
          onToggleSnapToGrid={vi.fn()}
          onSetCanvasEmptyStateGuideVisible={vi.fn()}
          onGridSizeChange={vi.fn()}
          onCanvasPaletteChange={vi.fn()}
          onAutoLayout={vi.fn()}
          onRestoreFocus={() => focusReturnTarget.focus()}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        />
      );
    }

    focusReturnTarget.focus();
    await act(async () => root.render(<Harness />));

    const dialog = document.body.querySelector<HTMLElement>('[data-slot="canvas-settings-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Propiedades del canvas');
    expect(dialog?.textContent).toContain('Preferencias de visualización del grafo');
    expect(
      dialog?.querySelector('[data-slot="workbench-properties-cancel"]')?.textContent
    ).toContain('Cancelar');
    await waitFor(() => expect(dialog?.contains(document.activeElement)).toBe(true));

    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="canvas-settings-dialog"]')).toBeNull();
      expect(document.activeElement).toBe(focusReturnTarget);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('buffers tabbed Canvas changes and applies only the changed rails', async () => {
    const onToggleImpact = vi.fn();
    const onToggleColumns = vi.fn();
    const onToggleCostOverlay = vi.fn();
    const onToggleGridVisible = vi.fn();
    const onGridColorChange = vi.fn();
    const onToggleSnapToGrid = vi.fn();
    const onSetCanvasEmptyStateGuideVisible = vi.fn();
    const onGridSizeChange = vi.fn();
    const onCanvasPaletteChange = vi.fn();
    const onAutoLayout = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <CanvasSettingsDialog
          open
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          canUseCostOverlay
          costOverlayEnabled={false}
          gridSize={20}
          canvasPalette="#101826"
          canvasGridVisible
          canvasGridColor="#94a3b8"
          canvasSnapToGrid={false}
          canvasEmptyStateGuideVisible
          canAutoLayout
          onToggleImpact={onToggleImpact}
          onToggleColumns={onToggleColumns}
          onToggleCostOverlay={onToggleCostOverlay}
          onGridSizeChange={onGridSizeChange}
          onCanvasPaletteChange={onCanvasPaletteChange}
          onToggleGridVisible={onToggleGridVisible}
          onGridColorChange={onGridColorChange}
          onToggleSnapToGrid={onToggleSnapToGrid}
          onSetCanvasEmptyStateGuideVisible={onSetCanvasEmptyStateGuideVisible}
          onAutoLayout={onAutoLayout}
          onClose={onClose}
        />
      );
    });

    const dialog = document.body.querySelector<HTMLElement>('[data-slot="canvas-settings-dialog"]');
    expect(dialog?.querySelectorAll('[role="tab"]')).toHaveLength(3);

    const impactSwitch = dialog?.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-properties-impact"]'
    );
    const backgroundInput = dialog?.querySelector<HTMLInputElement>(
      '[data-slot="canvas-properties-background-input"]'
    );
    const layoutTab = [...(dialog?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])].find(
      (tab) => tab.textContent === 'Layout'
    );

    await act(async () => {
      fireEvent.click(impactSwitch!);
      fireEvent.change(backgroundInput!, { target: { value: '#223344' } });
      fireEvent.mouseDown(layoutTab!, { button: 0, ctrlKey: false });
    });

    const autoLayoutSwitch = dialog?.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-properties-auto-layout"]'
    );
    await act(async () => fireEvent.click(autoLayoutSwitch!));
    await act(async () =>
      fireEvent.click(
        dialog?.querySelector<HTMLButtonElement>('[data-slot="workbench-properties-apply"]')!
      )
    );

    expect(onToggleImpact).toHaveBeenCalledTimes(1);
    expect(onCanvasPaletteChange).toHaveBeenCalledWith('#223344');
    expect(onAutoLayout).toHaveBeenCalledTimes(1);
    expect(onToggleColumns).not.toHaveBeenCalled();
    expect(onToggleCostOverlay).not.toHaveBeenCalled();
    expect(onToggleGridVisible).not.toHaveBeenCalled();
    expect(onGridColorChange).not.toHaveBeenCalled();
    expect(onToggleSnapToGrid).not.toHaveBeenCalled();
    expect(onSetCanvasEmptyStateGuideVisible).not.toHaveBeenCalled();
    expect(onGridSizeChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('discards buffered changes when Cancel closes the properties window', async () => {
    const onToggleImpact = vi.fn();
    const onCanvasPaletteChange = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <CanvasSettingsDialog
          open
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          canUseCostOverlay={false}
          costOverlayEnabled={false}
          gridSize={20}
          canvasPalette="#101826"
          canvasGridVisible
          canvasGridColor="#94a3b8"
          canvasSnapToGrid={false}
          canvasEmptyStateGuideVisible
          canAutoLayout={false}
          onToggleImpact={onToggleImpact}
          onToggleColumns={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onGridSizeChange={vi.fn()}
          onCanvasPaletteChange={onCanvasPaletteChange}
          onToggleGridVisible={vi.fn()}
          onGridColorChange={vi.fn()}
          onToggleSnapToGrid={vi.fn()}
          onSetCanvasEmptyStateGuideVisible={vi.fn()}
          onAutoLayout={vi.fn()}
          onClose={onClose}
        />
      );
    });

    const dialog = document.body.querySelector<HTMLElement>('[data-slot="canvas-settings-dialog"]');
    await act(async () =>
      fireEvent.click(
        dialog?.querySelector<HTMLButtonElement>('[data-slot="canvas-properties-impact"]')!
      )
    );
    await act(async () =>
      fireEvent.click(
        dialog?.querySelector<HTMLButtonElement>('[data-slot="workbench-properties-cancel"]')!
      )
    );

    expect(onToggleImpact).not.toHaveBeenCalled();
    expect(onCanvasPaletteChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
