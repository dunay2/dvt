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
import { DropdownMenu, DropdownMenuContent } from '../ui/dropdown-menu';

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
          <DropdownMenu open modal={false}>
            <DropdownMenuContent>
              <ShellWorkspaceScopeSelector copy={resolveShellTopBarCopy('en')} />
            </DropdownMenuContent>
          </DropdownMenu>
        </AppServicesProvider>
      );
    });

    expect(document.body.textContent).toContain('Projects available in this session');
    expect(document.body.textContent).toContain('No other project is available in this session.');
  });

  it('retains the menu and accepted scope when selection is rejected', async () => {
    // A stale grant must not close the menu or mark the requested scope accepted.
    const selected = { tenantId: 'tenant', projectId: 'a', environmentId: 'dev' };
    const rejected = { ...selected, projectId: 'b' };
    const snapshot = createSelectionSnapshot(selected, [selected, rejected]);
    const onOpenChange = vi.fn();
    const onScopeSelected = vi.fn();
    const port: WorkspaceScopeSelectionPort = {
      getSelection: () => snapshot,
      subscribeSelection: () => () => undefined,
      selectWorkspaceScope: (requestedScope) => ({
        status: 'rejected',
        reason: 'workspace_scope_unavailable',
        requestedScope,
        selectedScope: selected,
      }),
    };
    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{ ...createAppServicesTestOverrides(), workspaceScopeSelection: port }}
        >
          <DropdownMenu open modal={false} onOpenChange={onOpenChange}>
            <DropdownMenuContent>
              <ShellWorkspaceScopeSelector
                copy={resolveShellTopBarCopy('en')}
                onScopeSelected={onScopeSelected}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </AppServicesProvider>
      );
    });
    const choices = document.body.querySelectorAll<HTMLElement>('[role="menuitemradio"]');
    await act(async () => {
      fireEvent.click(choices[1]!);
    });
    expect(onScopeSelected).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(choices[0]?.getAttribute('aria-checked')).toBe('true');
    expect(choices[1]?.getAttribute('aria-checked')).toBe('false');
  });

  it.each([
    {
      interaction: 'pointer click',
      activate: (button: HTMLElement) => fireEvent.click(button),
    },
    {
      interaction: 'Enter',
      activate: (button: HTMLElement) => fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' }),
    },
    {
      interaction: 'Space',
      activate: (button: HTMLElement) => fireEvent.keyDown(button, { key: ' ', code: 'Space' }),
    },
  ])(
    'selects an explicitly listed server-granted project with $interaction',
    async ({ activate }) => {
      const projectA = {
        tenantId: 'tenant',
        projectId: 'project-a',
        projectName: 'Orders',
        environmentId: 'dev',
      };
      const projectB = {
        tenantId: 'tenant',
        projectId: 'project-b',
        projectName: 'Analytics',
        environmentId: 'stage',
      };
      let snapshot = createSelectionSnapshot(projectA, [projectA, projectB]);
      const subscribers = new Set<() => void>();
      const selectWorkspaceScope = vi.fn((scope: WorkspaceScopeIdentity) => {
        snapshot = createSelectionSnapshot(scope, [projectA, projectB]);
        subscribers.forEach((subscriber) => subscriber());
        return { status: 'selected' as const, selectedScope: scope };
      });
      const onScopeSelected = vi.fn();
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
            <DropdownMenu open modal={false}>
              <DropdownMenuContent>
                <ShellWorkspaceScopeSelector
                  copy={resolveShellTopBarCopy('en')}
                  onScopeSelected={onScopeSelected}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </AppServicesProvider>
        );
      });

      const projectBButton = [
        ...document.body.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
      ].find((button) => button.textContent?.includes('Analytics'));
      expect(projectBButton).toBeDefined();
      expect(document.body.textContent).not.toContain('project-b');

      await act(async () => {
        activate(projectBButton!);
      });

      expect(selectWorkspaceScope).toHaveBeenCalledWith(projectB);
      expect(onScopeSelected).toHaveBeenCalledOnce();
      expect(projectBButton?.getAttribute('aria-checked')).toBe('true');
    }
  );
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
