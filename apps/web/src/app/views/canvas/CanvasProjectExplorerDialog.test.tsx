// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasProjectExplorerDialog } from './CanvasProjectExplorerDialog';

describe('CanvasProjectExplorerDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    container.remove();
  });

  it('localizes the project explorer and exposes explicit and Escape close paths', async () => {
    const onClose = vi.fn();
    const onRestoreFocus = vi.fn();

    function Harness(): JSX.Element {
      const [open, setOpen] = useState(true);
      return (
        <CanvasProjectExplorerDialog
          open={open}
          activeCanvasId="ventas"
          canvasDocuments={[
            {
              id: 'ventas',
              kind: 'transformation',
              title: 'Ventas',
              environmentId: 'dev',
            },
          ]}
          onSelectCanvas={vi.fn()}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
          onRestoreFocus={onRestoreFocus}
        />
      );
    }

    await act(async () => root.render(<Harness />));

    const dialog = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-project-explorer-dialog"]'
    );
    expect(dialog?.textContent).toContain('Explorar proyecto');
    expect(dialog?.textContent).toContain('Canvas actual');
    expect(dialog?.textContent).toContain('Cerrar');
    expect(dialog?.textContent).not.toContain('Explore project');
    expect(
      Array.from(
        dialog?.querySelectorAll('button') ?? [],
        (button) => button.getAttribute('aria-label') ?? button.textContent?.trim()
      )
    ).toEqual(expect.arrayContaining(['Cerrar ventana del explorador de proyecto', 'Cerrar']));

    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(
        document.body.querySelector('[data-slot="canvas-project-explorer-dialog"]')
      ).toBeNull();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onRestoreFocus).toHaveBeenCalledTimes(1));
  });
});
