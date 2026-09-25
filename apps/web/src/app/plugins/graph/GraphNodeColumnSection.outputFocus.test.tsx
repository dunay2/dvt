// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('column output focus ownership', () => {
  let container: HTMLDivElement;
  let root: Root;
  let frame: FrameRequestCallback;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 1;
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function render(output: boolean, enabled = true): void {
    act(() =>
      root.render(
        <GraphNodeColumnSection
          expanded
          nodeId="model"
          columns={[{ id: 'id', name: 'id', type: 'integer', output }]}
          onColumnOutputToggle={enabled ? vi.fn() : undefined}
        />
      )
    );
  }
  it('keeps a pending output control focusable without accepting activation', () => {
    render(true);
    const button = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-output-state"]'
    )!;
    act(() => button.focus());
    render(true, false);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    act(() => fireEvent.click(button));
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(button);
    render(false);
    expect(document.activeElement).toBe(button);
  });
  it.each(['pointer', 'keyboard'] as const)(
    'keeps the same control focused after %s activation and disclosure restoration',
    (input) => {
      render(true);
      const button = container.querySelector<HTMLButtonElement>(
        '[data-slot="graph-node-column-output-state"]'
      )!;
      const disclosure = container.querySelector<HTMLButtonElement>(
        '[data-slot="graph-node-column-toggle"]'
      )!;
      act(() => {
        disclosure.focus();
        if (input === 'pointer') fireEvent.pointerDown(button);
        else button.focus();
        fireEvent.click(button, { detail: input === 'pointer' ? 1 : 0 });
        disclosure.focus();
      });
      render(false);
      act(() => frame(0));
      expect(document.activeElement).toBe(button);
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }
  );
  it('does not steal focus from a subsequent intentional disclosure action', () => {
    render(true);
    const button = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-output-state"]'
    )!;
    const disclosure = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    )!;
    act(() => {
      button.focus();
      fireEvent.click(button);
      fireEvent.pointerDown(disclosure);
      disclosure.focus();
    });
    act(() => frame(0));
    expect(document.activeElement).toBe(disclosure);
  });
});
