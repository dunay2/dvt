/**
 * Owned concern: verify View language and focus recovery.
 * Why: each suite protects one presentation contract.
 * Corner: existing negative paths and focus assertions remain intact.
 */
import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import {
  APPLICATION_LANGUAGE_STORAGE_KEY,
  useApplicationLanguageStore,
} from '../../stores/applicationLanguageStore';
import { resolveShellTopBarCopy } from './copy';
import { createShellTopBarHarness } from './ShellTopBar.test-support';
import * as viewMenu from './ShellViewMenu.template';

describe('View language and focus recovery', () => {
  const shell = createShellTopBarHarness();

  it('keeps Canvas properties out of the global View menu', async () => {
    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    await act(async () => {
      fireEvent.pointerDown(shell.container.querySelector('[data-slot="shell-menu-trigger"]')!);
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Panels');
      expect(document.body.textContent).toContain('Language');
      expect(document.body.textContent).not.toContain('Canvas background');
      expect(document.body.textContent).not.toContain('Grid size');
      expect(document.body.textContent).not.toContain('Reset grid');
      expect(document.body.textContent).not.toContain('Canvas properties');
      expect(document.body.textContent).not.toContain('Layout');
    });
  });

  it('keeps View recovery and project commands in focus mode without making the logo interactive', async () => {
    useUiLayoutStore.setState({ focusMode: true });
    await act(async () => {
      shell.root.render(shell.render('/legacy'));
    });
    expect(
      shell.container.querySelector('[data-slot="shell-workspace-menu-trigger"]')
    ).not.toBeNull();
    expect(shell.container.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
    expect(shell.container.querySelector('[data-slot="shell-menu-trigger"]')).not.toBeNull();
    expect(
      shell.container.querySelector('[data-slot="shell-brand-identity"]')?.closest('button, a')
    ).toBeNull();
  });

  it('resolves Spanish shell copy for the menu and workspace context labels', () => {
    expect(resolveShellTopBarCopy('es-ES')).toMatchObject({
      shell: 'Vista',
      projectSettings: 'Propiedades del proyecto',
      globalNavigation: 'Navegación',
      workspaceContext: 'Contexto del proyecto',
      projectScope: 'Proyecto',
      environmentScope: 'Entorno',
      deploymentScope: 'Adaptador de despliegue',
      canvasColorHexValue: 'Valor hexadecimal',
      canvasColorInputLabel: 'Establecer el color hexadecimal del fondo del Canvas',
      gridSize: 'Tamaño de rejilla',
      gridDensityDefault: 'Predeterminada',
    });
  });

  it('changes the application language from the View menu without reloading', async () => {
    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    await act(async () => {
      fireEvent.pointerDown(shell.container.querySelector('[data-slot="shell-menu-trigger"]')!);
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Language');
      const menu = document.body.querySelector<HTMLElement>('[data-slot="shell-language-menu"]');
      expect(menu).not.toBeNull();
    });

    const spanishLanguageCommand = await waitFor(() => {
      const command = document.body.querySelector<HTMLElement>(
        '[data-slot="shell-language-option-es"]'
      );
      expect(command).not.toBeNull();
      return command as HTMLElement;
    });

    await act(async () => {
      fireEvent.click(spanishLanguageCommand!);
    });

    expect(useApplicationLanguageStore.getState().language).toBe('es');
    expect(
      shell.container.querySelector('[data-slot="shell-menu-trigger"]')?.textContent
    ).toContain('Vista');
    expect(
      shell.container
        .querySelector('[data-slot="shell-workspace-menu-trigger"]')
        ?.getAttribute('aria-label')
    ).toContain('Propiedades del proyecto');
    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="shell-language-menu"]')).toBeNull();
    });
  });

  it.each([false, true])(
    'honors View close focus ownership when a newer control received focus: %s',
    async (transferFocus) => {
      await act(async () => shell.root.render(shell.render('/canvas')));
      const trigger = shell.container.querySelector<HTMLButtonElement>(
        '[data-slot="shell-menu-trigger"]'
      )!;
      const nextControl = document.createElement('button');
      nextControl.textContent = 'Next workbench control';
      document.body.appendChild(nextControl);
      await act(async () => {
        trigger.focus();
        fireEvent.pointerDown(trigger);
      });
      const command = await waitFor(() => {
        const item = document.body.querySelector<HTMLElement>(
          '[data-slot="shell-language-option-es"]'
        );
        expect(item).not.toBeNull();
        return item!;
      });
      await act(async () => {
        fireEvent.click(command);
        if (transferFocus) nextControl.focus();
      });
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
      expect(useApplicationLanguageStore.getState().language).toBe('es');
      expect(document.body.querySelector('[data-slot="shell-language-menu"]')).toBeNull();
      expect(document.activeElement).toBe(transferFocus ? nextControl : trigger);
    }
  );

  it.each([
    [' ES-mx ', 'en', 'es', true],
    ['en-GB', 'es', 'en', true],
    ['fr-FR', 'es', 'es', false],
    ['', 'es', 'es', false],
  ] as const)(
    'admits callback language %j through the preference owner',
    async (raw, initial, expected, accepted) => {
      const template = vi.spyOn(viewMenu, 'ShellViewMenuTemplate');
      const previousDocumentLanguage = document.documentElement.lang;
      const previousPreference = localStorage.getItem(APPLICATION_LANGUAGE_STORAGE_KEY);
      try {
        useApplicationLanguageStore.getState().configureApplicationLanguage(initial);
        await act(async () => shell.root.render(shell.render('/canvas')));
        await act(async () => {
          fireEvent.pointerDown(shell.container.querySelector('[data-slot="shell-menu-trigger"]')!);
        });
        await waitFor(() => {
          expect(document.body.querySelector('[data-slot="shell-language-menu"]')).not.toBeNull();
        });
        const before = useApplicationLanguageStore.getState();
        const beforePreference = localStorage.getItem(APPLICATION_LANGUAGE_STORAGE_KEY);
        const beforeDocumentLanguage = document.documentElement.lang;
        const props = template.mock.lastCall![0];
        await act(async () => props.onLanguageSelected(raw));
        expect(useApplicationLanguageStore.getState().language).toBe(expected);
        expect(document.documentElement.lang).toBe(expected);
        expect(useApplicationLanguageStore.getState() === before).toBe(!accepted);
        if (!accepted) {
          expect(localStorage.getItem(APPLICATION_LANGUAGE_STORAGE_KEY)).toBe(beforePreference);
          expect(document.documentElement.lang).toBe(beforeDocumentLanguage);
        }
        await waitFor(() => {
          expect(document.body.querySelector('[data-slot="shell-language-menu"]') === null).toBe(
            accepted
          );
        });
      } finally {
        template.mockRestore();
        document.documentElement.lang = previousDocumentLanguage;
        if (previousPreference === null) localStorage.removeItem(APPLICATION_LANGUAGE_STORAGE_KEY);
        else localStorage.setItem(APPLICATION_LANGUAGE_STORAGE_KEY, previousPreference);
      }
    }
  );
});
