// @vitest-environment jsdom

/** Owned concern: prove honest working-tree synchronization presentation. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeWorkingTreeStatus } from './CodeWorkingTreeStatus';

const COPY = {
  synchronized: { label: 'Synchronized', message: 'Working tree matches the editor.' },
  modified: { label: 'Modified', message: 'Changes are waiting to synchronize.' },
  syncing: { label: 'Syncing', message: 'Updating the working tree.' },
  conflict: { label: 'Conflict', message: 'Reload the newer working-tree revision.' },
  failed: { label: 'Update failed', message: 'The working tree could not be updated.' },
  read_only: { label: 'Read only', message: 'This file cannot be changed.' },
  retryLabel: 'Retry',
  reloadLabel: 'Reload file',
} as const;

describe('CodeWorkingTreeStatus', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    container = null;
    root = null;
  });

  function render(
    phase: Parameters<typeof CodeWorkingTreeStatus>[0]['phase'],
    callbacks: { onRetry?: () => void; onReload?: () => void } = {}
  ): void {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    act(() => {
      root?.render(
        <CodeWorkingTreeStatus
          phase={phase}
          copy={COPY}
          onRetry={callbacks.onRetry ?? vi.fn()}
          onReload={callbacks.onReload ?? vi.fn()}
        />
      );
    });
  }

  it.each([
    ['synchronized', 'Synchronized', 'Working tree matches the editor.'],
    ['modified', 'Modified', 'Changes are waiting to synchronize.'],
    ['syncing', 'Syncing', 'Updating the working tree.'],
    ['read_only', 'Read only', 'This file cannot be changed.'],
  ] as const)('renders %s posture without a Save action', (phase, label, message) => {
    render(phase);

    expect(container?.textContent).toContain(label);
    expect(container?.textContent).toContain(message);
    expect(container?.querySelector('[data-slot="code-working-tree-status"]')).not.toBeNull();
    expect(container?.textContent).not.toContain('Save');
  });

  it('offers retry only for a failed working-tree update', () => {
    const onRetry = vi.fn();
    render('failed', { onRetry });

    const button = container?.querySelector<HTMLButtonElement>('button');
    expect(button?.textContent).toBe('Retry');
    act(() => button?.click());
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('offers authoritative reload for a revision conflict', () => {
    const onReload = vi.fn();
    render('conflict', { onReload });

    const button = container?.querySelector<HTMLButtonElement>('button');
    expect(button?.textContent).toBe('Reload file');
    act(() => button?.click());
    expect(onReload).toHaveBeenCalledOnce();
  });
});
