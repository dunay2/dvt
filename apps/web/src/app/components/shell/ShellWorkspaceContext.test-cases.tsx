/**
 * Owned concern: verify read-only workspace identity and project context.
 * Why: each suite protects one presentation contract.
 * Corner: existing negative paths and focus assertions remain intact.
 */
import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore';
import { createShellTopBarHarness } from './ShellTopBar.test-support';

describe('read-only workspace identity and project context', () => {
  const shell = createShellTopBarHarness();

  // Project commands have one rail owner; recreating File in the header duplicates discovery.
  it('shows read-only context in the header and operational details only in properties', async () => {
    await act(async () => shell.root.render(shell.render('/canvas')));
    const breadcrumb = shell.container.querySelector('[data-slot="shell-workspace-breadcrumb"]');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb?.closest('[data-slot="shell-top-bar"]')).not.toBeNull();
    expect(breadcrumb?.getAttribute('aria-label')).toBe('Workspace context');
    expect(breadcrumb?.textContent).toContain('acme-corp');
    expect(breadcrumb?.textContent).toContain('dbt-analytics');
    expect(breadcrumb?.querySelector('[aria-current="location"]')?.textContent).toBe('dev');
    expect(breadcrumb?.querySelector('a, button, input, [role="combobox"]')).toBeNull();
    expect(breadcrumb?.textContent).not.toContain('temporal');
    await act(async () =>
      fireEvent.pointerDown(
        shell.container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!
      )
    );
    const properties = document.querySelector('[data-slot="shell-menu-workspace-context"]');
    expect(properties?.textContent).toContain('temporal');
    expect(properties?.querySelector('[data-slot="shell-workspace-tenant-context"]')).toBeNull();
    expect(document.querySelector('[data-slot="shell-workspace-context-details"]')).toBeNull();
  });

  // A scope change must update identity without leaving stale names in either entry point.
  it('tracks granted project names and falls back to raw ids after a scope change', async () => {
    const projectName = 'Analytics with a deliberately long project name';
    useSessionStore.setState({
      availableWorkspaces: [
        { tenantId: 'acme-corp', projectId: 'dbt-analytics', environmentId: 'dev', projectName },
      ],
    });
    await act(async () => shell.root.render(shell.render('/canvas')));
    const breadcrumb = shell.container.querySelector('[data-slot="shell-workspace-breadcrumb"]')!;
    expect(breadcrumb.textContent).toContain(projectName);
    expect(
      breadcrumb
        .querySelector('[data-slot="shell-workspace-project-context"]')
        ?.getAttribute('title')
    ).toBe(`Project: ${projectName}`);
    await act(async () =>
      useSessionStore.setState({ projectId: 'unlabelled-project', environmentId: 'staging' })
    );
    expect(breadcrumb.textContent).toContain('unlabelled-project');
    expect(breadcrumb.textContent).not.toContain(projectName);
    expect(breadcrumb.querySelector('[aria-current="location"]')?.textContent).toBe('staging');
    expect(
      shell.container
        .querySelector('[data-slot="shell-workspace-menu-trigger"]')
        ?.getAttribute('aria-label')
    ).toContain('unlabelled-project');
  });

  it('keeps one project context in the rail even on uncataloged routes', async () => {
    await act(async () => shell.root.render(shell.render('/legacy')));
    const trigger = shell.container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!;
    expect(trigger.closest('[data-slot="left-navigation-rail"]')).not.toBeNull();
    expect(trigger.getAttribute('aria-label')).toContain('dbt-analytics');
    expect(
      shell.container.querySelectorAll('[data-slot="shell-workspace-menu-trigger"]')
    ).toHaveLength(1);
    await act(async () => fireEvent.pointerDown(trigger));
    expect(
      shell.container.querySelector('[data-slot="shell-workspace-breadcrumb"]')?.textContent
    ).toContain('dev');
    expect(
      shell.container.querySelector('[data-slot="shell-top-bar"] [role="combobox"]')
    ).toBeNull();
  });

  it.each(['/canvas', '/runs/run_123'])(
    'keeps product workbench top bar low-noise on %s while separating workspace navigation from View controls',
    async (pathname) => {
      await act(async () => {
        shell.root.render(shell.render(pathname));
      });

      const topBar = shell.container.querySelector('[data-slot="shell-top-bar"]');
      const workspaceMenuTrigger = shell.container.querySelector(
        '[data-slot="shell-workspace-menu-trigger"]'
      );

      expect(topBar?.querySelector('[data-slot="shell-project-identity-badge"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-workspace-context-trigger"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-git-ref"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-top-bar-canvas-controls"]')).toBeNull();
      expect(workspaceMenuTrigger).not.toBeNull();
      expect(workspaceMenuTrigger?.getAttribute('aria-label')).toContain('Project properties');
      expect(workspaceMenuTrigger?.getAttribute('aria-label')).toContain('dbt-analytics');
      expect(topBar?.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-menu-trigger"]')).not.toBeNull();

      await act(async () => {
        fireEvent.pointerDown(shell.container.querySelector('[data-slot="shell-menu-trigger"]')!);
      });

      await waitFor(() => {
        expect(document.body.textContent).toContain('View options');
        expect(document.body.textContent).toContain('Panels');
        expect(
          document.body.querySelectorAll('[data-slot="shell-menu-navigation-link"]')
        ).toHaveLength(0);
        expect(document.body.textContent).not.toContain('Workspace context');
      });

      expect(
        topBar?.querySelector('[data-slot="shell-brand-identity"]')?.getAttribute('aria-label')
      ).toBe('Raven');
      expect(topBar?.querySelector('[data-slot="shell-app-menu-trigger"]')).toBeNull();

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.pointerDown(
          shell.container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!
        );
      });

      await waitFor(() => {
        expect(
          document.body.querySelectorAll('[data-slot="shell-menu-navigation-link"]')
        ).toHaveLength(0);
        expect(document.body.textContent).toContain('Project properties');
        expect(document.body.textContent).toContain('dbt-analytics');
        expect(document.body.textContent).toContain('dev');
        expect(document.body.textContent).toContain('Deployment adapter');
        expect(document.body.textContent).toContain('temporal');
        expect(document.body.textContent).toContain('Projects available in this session');
        expect(document.body.textContent).toContain(
          'No other project is available in this session.'
        );
        expect(
          document.body.querySelector('[data-slot="shell-new-project-command"]')
        ).not.toBeNull();
        expect(
          document.body.querySelector('[data-slot="canvas-workspace-open-project-code-command"]')
        ).toBeNull();
        expect(document.body.querySelector('[data-slot="shell-menu-git-context"]')).toBeNull();
      });
    }
  );
});
