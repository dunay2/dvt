// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MetricEvidenceHotspot } from './MetricEvidenceHotspot';

describe('MetricEvidenceHotspot', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document
      .querySelectorAll('[data-slot="tooltip-content"]')
      .forEach((element) => element.remove());
    if (previousResizeObserver === undefined) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    } else {
      globalThis.ResizeObserver = previousResizeObserver;
    }
  });

  it('reveals complete estimated evidence on keyboard focus', async () => {
    await act(async () => {
      root.render(
        <MetricEvidenceHotspot
          detail="Estimated using schema width. Confidence: low."
          tone="estimated"
          value="Est. 17.4 MB"
        />
      );
    });

    const trigger = container.querySelector<HTMLElement>('[data-slot="metric-evidence-hotspot"]');
    expect(trigger?.getAttribute('title')).toBeNull();
    expect(trigger?.getAttribute('tabindex')).toBe('0');
    expect(trigger?.getAttribute('data-tone')).toBe('estimated');

    await act(async () => {
      trigger?.focus();
      await Promise.resolve();
    });

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain(
      'Estimated using schema width'
    );
  });

  it('can remain outside the tab sequence when nested in an existing control', () => {
    act(() => {
      root.render(<MetricEvidenceHotspot detail="125,000 rows." focusable={false} value="125k" />);
    });

    expect(
      container.querySelector('[data-slot="metric-evidence-hotspot"]')?.getAttribute('tabindex')
    ).toBeNull();
  });

  it('uses a native button only when the evidence value has an action', () => {
    const onActivate = vi.fn();
    act(() => {
      root.render(
        <MetricEvidenceHotspot
          detail="Code lives at models/orders.sql."
          onActivate={onActivate}
          value="File"
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="metric-evidence-hotspot"]'
    );
    expect(trigger?.tagName).toBe('BUTTON');
    expect(trigger?.type).toBe('button');
    expect(trigger?.className).toContain('cursor-pointer');

    act(() => {
      fireEvent.click(trigger!);
    });

    expect(onActivate).toHaveBeenCalledOnce();
  });
});
