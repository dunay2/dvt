// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockExecutionPlan } from '../../testing/fixtures/mockDbtData';
import { PlanPreviewModal } from './Modals';

describe('PlanPreviewModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('does not close itself when Start Run is clicked', async () => {
    const onClose = vi.fn();
    const onStartRun = vi.fn();

    await act(async () => {
      root.render(
        <PlanPreviewModal
          open={true}
          onClose={onClose}
          plan={mockExecutionPlan}
          startRunMessage="Preview is stale. Re-run Plan before starting."
          onStartRun={onStartRun}
        />
      );
    });

    const startRunButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Run')
    );
    expect(startRunButton).toBeTruthy();

    await act(async () => {
      startRunButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onStartRun).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
