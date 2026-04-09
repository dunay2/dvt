// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppServicesProvider } from '../services/AppServicesContext';
import Console from './Console';

vi.mock('./console/useConsoleLogStream', () => ({
  useConsoleLogStream: () => ({
    lines: [],
    isLoading: false,
    runId: undefined,
  }),
}));

describe('Console copy by data-source mode', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows API-mode non-live guidance without internal roadmap wording', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ mode: 'api' }}>
          <Console />
        </AppServicesProvider>
      );
    });

    expect(document.body.textContent).toContain(
      'Start a run to see run events here. Live log streaming is not available in API mode yet.'
    );
  });

  it('shows generic execution copy in mock mode', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ mode: 'mock' }}>
          <Console />
        </AppServicesProvider>
      );
    });

    expect(document.body.textContent).toContain('Start a run to see execution output here.');
  });
});
