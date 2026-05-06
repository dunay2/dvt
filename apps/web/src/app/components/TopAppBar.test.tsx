// @vitest-environment jsdom
/** Owned concern: verify ShellTopBar workspace context remains read-only in main chrome. */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from '../stores/sessionStore';
import ShellTopBar from './TopAppBar';

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
        <MemoryRouter initialEntries={['/canvas']}>
          <ShellTopBar />
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
    expect(contextTrigger?.textContent).toContain('Context');
    expect(topBar?.querySelector('[data-slot="shell-workspace-selectors"]')).toBeNull();
    expect(topBar?.querySelectorAll('[role="combobox"]')).toHaveLength(0);
  });
});
