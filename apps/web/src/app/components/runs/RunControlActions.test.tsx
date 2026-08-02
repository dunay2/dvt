// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RunControlActions } from './RunControlActions';

describe('RunControlActions', () => {
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

  async function renderActions(
    props: Partial<React.ComponentProps<typeof RunControlActions>> = {}
  ): Promise<void> {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    await act(async () => {
      root?.render(
        <RunControlActions
          runId="run_1"
          availability={{
            cancel: { available: true },
            recover: { available: false, reason: 'run_active' },
          }}
          activity={null}
          outcome={null}
          failure={null}
          onCancel={vi.fn()}
          onRecover={vi.fn()}
          {...props}
        />
      );
    });
  }

  it('fails closed when backend availability is absent', async () => {
    await renderActions({ availability: undefined });
    expect(container?.querySelector('[data-slot="run-control-actions"]')).toBeNull();
  });

  it('enables only backend-authorized actions and exposes the unavailable reason', async () => {
    await renderActions();

    const cancel = container?.querySelector<HTMLButtonElement>('[data-slot="run-cancel-action"]');
    const recover = container?.querySelector<HTMLButtonElement>('[data-slot="run-recover-action"]');
    expect(cancel?.disabled).toBe(false);
    expect(recover?.disabled).toBe(true);
    expect(recover?.getAttribute('aria-description')).toContain('fails or is cancelled');
  });

  it('renders localized command labels and disables concurrent commands', async () => {
    await renderActions({
      locale: 'es-ES',
      compact: false,
      activity: { action: 'cancel', runId: 'run_1' },
    });

    expect(container?.textContent).toContain('Cancelar ejecucion');
    expect(container?.textContent).toContain('Recuperar ejecucion');
    expect(
      container?.querySelector<HTMLButtonElement>('[data-slot="run-cancel-action"]')?.disabled
    ).toBe(true);
  });

  it('explains when recovery context integrity cannot be verified', async () => {
    await renderActions({
      availability: {
        cancel: { available: false, reason: 'run_terminal' },
        recover: { available: false, reason: 'source_context_untrusted' },
      },
    });

    expect(
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="run-recover-action"]')
        ?.getAttribute('aria-description')
    ).toContain('cannot be verified');
  });
});
