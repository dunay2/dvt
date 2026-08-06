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
          canvasGridVisible
          canvasGridColor="#101826"
          canvasSnapToGrid={false}
          canvasEmptyStateGuideVisible
          copy={copy}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleGridVisible={vi.fn()}
          onGridColorChange={vi.fn()}
          onToggleSnapToGrid={vi.fn()}
          onSetCanvasEmptyStateGuideVisible={vi.fn()}
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
    expect(dialog?.textContent).toContain('Configuracion de canvas');
    expect(dialog?.textContent).toContain('Preferencias de visualizacion del grafo');
    expect(
      dialog?.querySelector('[data-slot="canvas-settings-close-command"]')?.textContent
    ).toContain('Cerrar configuracion de canvas');
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
});
