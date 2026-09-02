// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePointerGraceDismiss } from './usePointerGraceDismiss';

function PointerGraceHarness(props: { enabled: boolean }): React.JSX.Element {
  const [dismissed, setDismissed] = useState(false);
  const surfaceProps = usePointerGraceDismiss({
    enabled: props.enabled,
    onDismiss: () => setDismissed(true),
  });

  return (
    <div data-slot="pointer-grace-surface" data-dismissed={String(dismissed)} {...surfaceProps} />
  );
}

describe('usePointerGraceDismiss', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    vi.useRealTimers();
  });

  it('dismisses a pointer surface after one second when the pointer never enters', () => {
    act(() => root.render(<PointerGraceHarness enabled />));

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(surface().dataset.dismissed).toBe('false');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(surface().dataset.dismissed).toBe('true');
  });

  it('starts grace on leave and cancels it when the pointer re-enters', () => {
    act(() => root.render(<PointerGraceHarness enabled />));
    act(() => {
      fireEvent.pointerOver(surface());
    });
    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(surface().dataset.dismissed).toBe('false');

    act(() => {
      fireEvent.pointerOut(surface());
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent.pointerOver(surface());
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(surface().dataset.dismissed).toBe('false');

    act(() => {
      fireEvent.pointerOut(surface());
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(surface().dataset.dismissed).toBe('true');
  });

  it('does not time out a surface opened for keyboard interaction', () => {
    act(() => root.render(<PointerGraceHarness enabled={false} />));

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(surface().dataset.dismissed).toBe('false');
  });

  function surface(): HTMLDivElement {
    return container.querySelector<HTMLDivElement>('[data-slot="pointer-grace-surface"]')!;
  }
});
