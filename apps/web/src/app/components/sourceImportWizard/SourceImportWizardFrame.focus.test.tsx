// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceImportWizardFrame } from './SourceImportWizardFrame';

describe('SourceImportWizardFrame focus', () => {
  let container: HTMLDivElement;
  let focusReturnTarget: HTMLButtonElement;
  let root: Root;
  let previousResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    focusReturnTarget = document.createElement('button');
    document.body.append(container, focusReturnTarget);
    root = createRoot(container);
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    focusReturnTarget.remove();
    if (previousResizeObserver === undefined) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    } else {
      globalThis.ResizeObserver = previousResizeObserver;
    }
  });

  it('owns focus while open and restores the Canvas opener after Escape', async () => {
    const onClose = vi.fn();

    function Harness(): JSX.Element {
      const [open, setOpen] = useState(true);

      return (
        <SourceImportWizardFrame
          open={open}
          activeContentId="connections"
          isResultStep={false}
          isProcessing={false}
          canImport={false}
          sections={<button type="button">Connections</button>}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
          onRestoreFocus={() => focusReturnTarget.focus()}
          onDone={vi.fn()}
          onImport={vi.fn()}
        >
          <button type="button">Catalog content</button>
        </SourceImportWizardFrame>
      );
    }

    focusReturnTarget.focus();
    await act(async () => root.render(<Harness />));

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    await waitFor(() => expect(dialog?.contains(document.activeElement)).toBe(true));

    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(focusReturnTarget);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps bounded review overflow discoverable while footer actions remain visible', async () => {
    await act(async () =>
      root.render(
        <SourceImportWizardFrame
          open
          activeContentId="selected"
          isResultStep={false}
          isProcessing={false}
          canImport
          sections={<button type="button">Selected</button>}
          onClose={vi.fn()}
          onDone={vi.fn()}
          onImport={vi.fn()}
        >
          <div style={{ height: 1200 }}>Selected source review</div>
        </SourceImportWizardFrame>
      )
    );

    const scrollRegion = document.body.querySelector(
      '[data-slot="source-import-wizard-content-scroll"]'
    );
    expect(scrollRegion).not.toBeNull();
    expect(scrollRegion?.getAttribute('data-overflow-affordance')).toBe('always');
    expect(document.body.querySelectorAll('[data-slot="dialog-footer"] button')).toHaveLength(2);
  });

  it('moves from the header and keeps the dialog inside the viewport', async () => {
    const renderFrame = (open: boolean): void => {
      root.render(
        <SourceImportWizardFrame
          open={open}
          activeContentId="connections"
          isResultStep={false}
          isProcessing={false}
          canImport={false}
          sections={<button type="button">Connections</button>}
          onClose={vi.fn()}
          onDone={vi.fn()}
          onImport={vi.fn()}
        >
          <button type="button">Catalog content</button>
        </SourceImportWizardFrame>
      );
    };
    await act(async () => renderFrame(true));

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    const dragHandle = dialog.querySelector<HTMLElement>('[data-slot="dialog-header"]')!;
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(262, 184, 500, 400));
    dragHandle.setPointerCapture = vi.fn();

    act(() => {
      fireEvent.pointerDown(dragHandle, {
        pointerId: 7,
        button: 0,
        clientX: 300,
        clientY: 220,
      });
      fireEvent.pointerMove(dragHandle, {
        pointerId: 7,
        clientX: 5_000,
        clientY: 5_000,
      });
      fireEvent.pointerUp(dragHandle, { pointerId: 7 });
    });

    expect(dragHandle.setPointerCapture).toHaveBeenCalledWith(7);
    expect(dialog.style.left).toBe('calc(50% + 246px)');
    expect(dialog.style.top).toBe('calc(50% + 168px)');

    await act(async () => renderFrame(false));
    await act(async () => renderFrame(true));

    const reopenedDialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(reopenedDialog.style.left).toBe('calc(50% + 0px)');
    expect(reopenedDialog.style.top).toBe('calc(50% + 0px)');
  });
});
