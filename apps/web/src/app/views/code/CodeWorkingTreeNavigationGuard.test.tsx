// @vitest-environment jsdom

/** Owned concern: prove Code navigation waits for persistence and guards hard exits. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeWorkingTreeNavigationGuard } from './CodeWorkingTreeNavigationGuard';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function GuardedRoute({ flush }: Readonly<{ flush: () => Promise<boolean> }>): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <>
      <CodeWorkingTreeNavigationGuard blocked flush={flush} />
      <button type="button" onClick={() => void navigate('/next')}>
        Continue
      </button>
    </>
  );
}

describe('CodeWorkingTreeNavigationGuard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('prevents hard-browser exit only while bytes are unpersisted', async () => {
    await act(async () => {
      root.render(<CodeWorkingTreeNavigationGuard blocked flush={vi.fn()} />);
    });

    const blockedExit = new Event('beforeunload', { cancelable: true });
    expect(window.dispatchEvent(blockedExit)).toBe(false);
    expect(blockedExit.defaultPrevented).toBe(true);

    await act(async () => {
      root.render(<CodeWorkingTreeNavigationGuard blocked={false} flush={vi.fn()} />);
    });
    const allowedExit = new Event('beforeunload', { cancelable: true });
    expect(window.dispatchEvent(allowedExit)).toBe(true);
  });

  it('waits for a successful flush before continuing SPA navigation', async () => {
    const persistence = deferred<boolean>();
    const flush = vi.fn(() => persistence.promise);
    const router = createMemoryRouter(
      [
        { path: '/', element: <GuardedRoute flush={flush} /> },
        { path: '/next', element: <div>Next route</div> },
      ],
      { initialEntries: ['/'] }
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')?.click();
    });

    expect(flush).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('Continue');

    await act(async () => persistence.resolve(true));
    expect(container.textContent).toContain('Next route');
  });

  it('cancels SPA navigation when persistence cannot settle', async () => {
    const flush = vi.fn(async () => false);
    const router = createMemoryRouter(
      [
        { path: '/', element: <GuardedRoute flush={flush} /> },
        { path: '/next', element: <div>Next route</div> },
      ],
      { initialEntries: ['/'] }
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')?.click();
      await Promise.resolve();
    });

    expect(flush).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('Continue');
  });
});
