// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunControlActions } from './RunControlActions';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

describe('RunControlActions', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    container = null;
    root = null;
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
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

    expect(container?.textContent).toContain('Cancelar ejecución');
    expect(container?.textContent).toContain('Recuperar ejecución');
    expect(
      container?.querySelector<HTMLButtonElement>('[data-slot="run-cancel-action"]')?.disabled
    ).toBe(true);
  });

  it('reacts to the application language when no local locale override is supplied', async () => {
    await renderActions({ compact: false });
    expect(container?.textContent).toContain('Cancel run');

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    });

    expect(container?.textContent).toContain('Cancelar ejecución');
    expect(
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="run-recover-action"]')
        ?.getAttribute('aria-description')
    ).toContain('recuperación');
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

  it('explains when the original execution plan is unavailable', async () => {
    await renderActions({
      availability: {
        cancel: { available: false, reason: 'run_terminal' },
        recover: { available: false, reason: 'source_plan_unavailable' },
      },
    });

    expect(
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="run-recover-action"]')
        ?.getAttribute('aria-description')
    ).toContain('execution plan is no longer available');
  });

  it('explains when the original runtime adapter is unavailable', async () => {
    await renderActions({
      availability: {
        cancel: { available: false, reason: 'run_terminal' },
        recover: { available: false, reason: 'source_adapter_unavailable' },
      },
    });

    expect(
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="run-recover-action"]')
        ?.getAttribute('aria-description')
    ).toContain('runtime adapter is not configured');
  });

  it('asks the user to open the run when list recovery evidence is unknown', async () => {
    await renderActions({
      locale: 'es',
      availability: {
        cancel: { available: false, reason: 'run_terminal' },
        recover: { available: false, reason: 'recovery_evidence_unknown' },
      },
    });

    expect(
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="run-recover-action"]')
        ?.getAttribute('aria-description')
    ).toContain('Abre la ejecución');
  });

  it('explains when cancellation is waiting for authoritative runtime dispatch', async () => {
    await renderActions({
      availability: {
        cancel: { available: false, reason: 'dispatch_pending' },
        recover: { available: false, reason: 'run_active' },
      },
    });

    expect(
      container
        ?.querySelector<HTMLButtonElement>('[data-slot="run-cancel-action"]')
        ?.getAttribute('aria-description')
    ).toContain('after runtime dispatch completes');
  });
});
