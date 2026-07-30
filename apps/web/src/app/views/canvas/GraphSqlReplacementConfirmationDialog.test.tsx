// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
import { GraphSqlReplacementConfirmationDialog } from './GraphSqlReplacementConfirmationDialog';

describe('GraphSqlReplacementConfirmationDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('presents localized ambiguous paths and delegates cancel or explicit replacement', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    await act(async () => {
      root.render(
        <GraphSqlReplacementConfirmationDialog
          open
          paths={['models/orders.sql', 'models/customers.sql']}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      );
    });

    expect(document.body.textContent).toContain(canvasViewCopy.graphSqlReplacementTitle);
    expect(document.body.textContent).toContain(canvasViewCopy.graphSqlReplacementDescription);
    expect(document.body.textContent).toContain('models/orders.sql');
    expect(document.body.textContent).toContain('models/customers.sql');

    const buttons = [...document.body.querySelectorAll('button')];
    const cancel = buttons.find(
      (button) => button.textContent === canvasViewCopy.graphSqlReplacementCancelLabel
    );
    const confirm = buttons.find(
      (button) => button.textContent === canvasViewCopy.graphSqlReplacementConfirmLabel
    );

    expect(cancel).toBeDefined();
    expect(confirm).toBeDefined();

    await act(async () => cancel?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await act(async () => confirm?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
