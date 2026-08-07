// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import { createPlatformHealthSnapshot } from '../capabilities/platform-health/testing/platformHealthFixtures';
import type { FrontendOperabilitySink } from './ports/frontendOperability';
import { createBrokenRootShellNode } from './Root.bootstrapRoute.test.support';
import { withTestQueryClient } from '../testing/reactQueryHarness';
import {
  APPLICATION_LANGUAGE_STORAGE_KEY,
  useApplicationLanguageStore,
} from './stores/applicationLanguageStore';

describe('AppRouteErrorBoundary frontend operability', () => {
  it('records one normalized route failure per boundary activation', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(
      createBrokenRootShellNode(capability, ['/broken'], {
        frontendOperabilitySink: { record },
      })
    );

    try {
      await waitFor(() => {
        expect(record).toHaveBeenCalledWith({
          type: 'frontend.route.failed',
          routeId: 'broken.route',
          reasonCode: 'route-boundary-activated',
        });
      });
      expect(record).toHaveBeenCalledTimes(1);
    } finally {
      consoleErrorSpy.mockRestore();
      await mounted.cleanup();
    }
  });

  it('updates the mounted recovery surface when the application language changes', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const languageSpy = vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(createBrokenRootShellNode(capability));

    try {
      await waitFor(() => {
        expect(mounted.container.textContent).toContain('The application hit an unexpected error.');
      });

      await act(async () => {
        useApplicationLanguageStore.getState().configureApplicationLanguage('es');
      });

      await waitFor(() => {
        expect(mounted.container.textContent).toContain(
          'La aplicación encontró un error inesperado.'
        );
        expect(mounted.container.textContent).toContain('Volver al espacio de trabajo');
      });
    } finally {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
      localStorage.removeItem(APPLICATION_LANGUAGE_STORAGE_KEY);
      languageSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      await mounted.cleanup();
    }
  });
});
