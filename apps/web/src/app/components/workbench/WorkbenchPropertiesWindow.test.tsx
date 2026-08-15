// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchPropertiesWindow } from './WorkbenchPropertiesWindow';

describe('WorkbenchPropertiesWindow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.replaceChildren();
  });

  it('owns the reusable dialog, tab, body, and action regions', async () => {
    const onCancel = vi.fn();
    const onApply = vi.fn();

    await act(async () => {
      root.render(
        <WorkbenchPropertiesWindow
          open
          title="Canvas properties"
          description="Edit Canvas properties"
          closeLabel="Close Canvas properties"
          tabsLabel="Canvas property sections"
          cancelLabel="Cancel"
          applyLabel="Apply"
          onCancel={onCancel}
          onApply={onApply}
          sections={[
            { id: 'appearance', label: 'Appearance', content: <div>Background</div> },
            { id: 'grid', label: 'Grid', content: <div>Grid size</div> },
          ]}
        />
      );
    });

    const dialog = document.body.querySelector<HTMLElement>(
      '[data-slot="workbench-properties-window"]'
    );
    expect(dialog).not.toBeNull();
    expect(dialog?.classList).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    expect(dialog?.querySelector('[data-slot="workbench-properties-header"]')).not.toBeNull();
    expect(dialog?.querySelector('[data-slot="workbench-properties-body"]')).not.toBeNull();
    expect(dialog?.querySelector('[data-slot="workbench-properties-footer"]')).not.toBeNull();
    expect(dialog?.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(dialog?.textContent).toContain('Background');

    const gridTab = [...(dialog?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])].find(
      (tab) => tab.textContent === 'Grid'
    );
    await act(async () => fireEvent.mouseDown(gridTab!, { button: 0, ctrlKey: false }));
    await waitFor(() => expect(dialog?.textContent).toContain('Grid size'));

    const apply = dialog?.querySelector<HTMLButtonElement>(
      '[data-slot="workbench-properties-apply"]'
    );
    await act(async () => fireEvent.click(apply!));
    expect(onApply).toHaveBeenCalledTimes(1);

    const cancel = dialog?.querySelector<HTMLButtonElement>(
      '[data-slot="workbench-properties-cancel"]'
    );
    await act(async () => fireEvent.click(cancel!));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });
});
