// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RePlanRequiredModal } from './Modals';

describe('RePlanRequiredModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('uses Execution Preview action copy instead of re-plan commands', async () => {
    await act(async () => {
      root.render(<RePlanRequiredModal open={true} onClose={vi.fn()} onRePlan={vi.fn()} />);
    });

    const bodyText = document.body.textContent ?? '';

    expect(bodyText).toContain('Execution Preview Required');
    expect(bodyText).toContain('Preview execution plan');
    expect(bodyText).not.toContain('execution plan again before starting');
    expect(bodyText).not.toContain('Re-Plan');
    expect(bodyText).not.toContain('Create New Plan');
  });
});
