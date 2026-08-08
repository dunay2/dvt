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
    const scrollbar = scrollRegion?.querySelector('[data-slot="scroll-area-scrollbar"]');

    expect(scrollRegion).not.toBeNull();
    expect(scrollbar?.getAttribute('data-state')).toBe('visible');
    expect(document.body.textContent).toContain('Cancel');
    expect(document.body.textContent).toContain('Attach sources to canvas');
  });
});
