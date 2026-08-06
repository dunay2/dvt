// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  WorkspaceScopeIdentity,
  WorkspaceScopeSelectionPort,
  WorkspaceScopeSelectionState,
} from '../../ports/workspaceScopeSelection';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { resolveShellTopBarCopy } from './copy';
import { ShellWorkspaceScopeSelector } from './ShellWorkspaceScopeSelector';

describe('ShellWorkspaceScopeSelector', () => {
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
    act(() => root.unmount());
    container.remove();
  });

  it('shows the current-project explanation when no alternative grant exists', async () => {
    const selectedProject = {
      tenantId: 'tenant',
      projectId: 'project-a',
      environmentId: 'dev',
    };
    const snapshot = createSelectionSnapshot(selectedProject, [selectedProject]);
    const port: WorkspaceScopeSelectionPort = {
      getSelection: () => snapshot,
      subscribeSelection: () => () => undefined,
      selectWorkspaceScope: (scope) => ({ status: 'selected', selectedScope: scope }),
    };

    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{ ...createAppServicesTestOverrides(), workspaceScopeSelection: port }}
        >
          <ShellWorkspaceScopeSelector copy={resolveShellTopBarCopy('en')} />
        </AppServicesProvider>
      );
    });

    expect(container.textContent).toContain('Projects available in this session');
    expect(container.textContent).toContain('No other project is available in this session.');
  });

  it('selects an explicitly listed server-granted project', async () => {
    const projectA = { tenantId: 'tenant', projectId: 'project-a', environmentId: 'dev' };
    const projectB = { tenantId: 'tenant', projectId: 'project-b', environmentId: 'stage' };
    let snapshot = createSelectionSnapshot(projectA, [projectA, projectB]);
    const subscribers = new Set<() => void>();
    const selectWorkspaceScope = vi.fn((scope: WorkspaceScopeIdentity) => {
      snapshot = createSelectionSnapshot(scope, [projectA, projectB]);
      subscribers.forEach((subscriber) => subscriber());
      return { status: 'selected' as const, selectedScope: scope };
    });
    const port: WorkspaceScopeSelectionPort = {
      getSelection: () => snapshot,
      subscribeSelection: (subscriber) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      },
      selectWorkspaceScope,
    };

    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{ ...createAppServicesTestOverrides(), workspaceScopeSelection: port }}
        >
          <ShellWorkspaceScopeSelector copy={resolveShellTopBarCopy('en')} />
        </AppServicesProvider>
      );
    });

    const projectBButton = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('project-b')
    );
    expect(projectBButton).toBeDefined();

    await act(async () => {
      fireEvent.click(projectBButton!);
    });

    expect(selectWorkspaceScope).toHaveBeenCalledWith(projectB);
    expect(projectBButton?.getAttribute('aria-pressed')).toBe('true');
  });
});

function createSelectionSnapshot(
  selectedScope: WorkspaceScopeIdentity,
  availableScopes: readonly WorkspaceScopeIdentity[]
): WorkspaceScopeSelectionState {
  return {
    selectedScope,
    availableScopes,
    targetAdapter: 'temporal',
    availableTargetAdapters: ['temporal'],
    status: 'selected' as const,
  };
}
