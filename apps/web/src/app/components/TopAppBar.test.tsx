// @vitest-environment jsdom
/** Owned concern: verify ShellTopBar workspace context remains read-only in main chrome. */

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildShellNavigationModel } from '../shell/shellNavigationModel';
import { useSessionStore } from '../stores/sessionStore';
import { resolveShellTopBarCopy } from './shell/copy';
import ShellTopBar from './TopAppBar';

const TEST_NAVIGATION_MODEL = buildShellNavigationModel([]);

describe('ShellTopBar workspace context', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useSessionStore.setState({
      tenantId: 'acme-corp',
      projectId: 'dbt-analytics',
      environmentId: 'dev',
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps workspace scope as read-only context in the main top bar', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/runs']}>
          <ShellTopBar navigationModel={TEST_NAVIGATION_MODEL} />
        </MemoryRouter>
      );
    });

    const topBar = container.querySelector('[data-slot="shell-top-bar"]');
    const identityBadge = container.querySelector('[data-slot="shell-project-identity-badge"]');
    const contextTrigger = container.querySelector('[data-slot="shell-workspace-context-trigger"]');

    expect(identityBadge).not.toBeNull();
    expect(identityBadge?.textContent).toContain('dbt-analytics');
    expect(identityBadge?.textContent).toContain('dev');
    expect(contextTrigger).not.toBeNull();
    expect(contextTrigger?.textContent).toContain('Workspace context');
    expect(topBar?.querySelector('[data-slot="shell-workspace-selectors"]')).toBeNull();
    expect(topBar?.querySelectorAll('[role="combobox"]')).toHaveLength(0);
  });

  it('keeps Canvas top bar low-noise and moves navigation plus context into the shell menu', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/canvas']}>
          <ShellTopBar navigationModel={TEST_NAVIGATION_MODEL} />
        </MemoryRouter>
      );
    });

    const topBar = container.querySelector('[data-slot="shell-top-bar"]');

    expect(topBar?.querySelector('[data-slot="shell-project-identity-badge"]')).toBeNull();
    expect(topBar?.querySelector('[data-slot="shell-workspace-context-trigger"]')).toBeNull();
    expect(topBar?.querySelector('[data-slot="shell-git-ref"]')).toBeNull();
    expect(topBar?.querySelector('[data-slot="shell-top-bar-canvas-controls"]')).toBeNull();

    await act(async () => {
      fireEvent.pointerDown(container.querySelector('[data-slot="shell-menu-trigger"]')!);
    });

    await waitFor(() => {
      const menuLinks = [
        ...document.body.querySelectorAll<HTMLAnchorElement>(
          '[data-slot="shell-menu-navigation-link"]'
        ),
      ];

      expect(menuLinks.map((link) => link.getAttribute('href'))).toEqual(['/plugins', '/admin']);
      expect(document.body.textContent).toContain('Workspace context');
      expect(document.body.textContent).toContain('dbt-analytics');
      expect(document.body.textContent).toContain('dev');
    });
  });

  it('resolves Spanish shell copy for the menu and workspace context labels', () => {
    expect(resolveShellTopBarCopy('es-ES')).toMatchObject({
      shell: 'Vista',
      globalNavigation: 'Navegacion',
      workspaceContext: 'Contexto del workspace',
      projectScope: 'Proyecto',
      environmentScope: 'Entorno',
    });
  });
});
