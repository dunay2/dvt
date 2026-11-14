/**
 * Owned concern: verify Project command and snapshot picker lifetimes.
 * Why: each suite protects one presentation contract.
 * Corner: existing negative paths and focus assertions remain intact.
 */
import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useCanvasWorkspaceMenuContributionStore } from '../../views/canvas/canvasWorkspaceMenuContributionStore';
import { createShellTopBarHarness } from './ShellTopBar.test-support';

describe('Project command and snapshot picker lifetimes', () => {
  const shell = createShellTopBarHarness();

  it('opens the localized new-project dialog from Project and returns focus without changing scope', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tenants: [{ tenantId: 'acme-corp', canCreateProject: true }],
            projects: [],
            integrityFindings: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    );

    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    const projectMenuTrigger = shell.container.querySelector<HTMLElement>(
      '[data-slot="shell-workspace-menu-trigger"]'
    );
    await act(async () => {
      fireEvent.pointerDown(projectMenuTrigger!);
    });

    const newProjectCommand = await waitFor(() => {
      const command = document.body.querySelector<HTMLElement>(
        '[data-slot="shell-new-project-command"]'
      );
      expect(command?.textContent).toContain('Nuevo proyecto');
      return command!;
    });

    await act(async () => {
      fireEvent.click(newProjectCommand);
    });

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="project-creation-dialog"]')).not.toBeNull();
      expect(document.body.textContent).toContain('Crea un proyecto');
    });
    expect(document.body.textContent).not.toContain('Tenant');

    const cancelButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === 'Cancelar'
    );
    await act(async () => {
      fireEvent.click(cancelButton!);
    });

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="project-creation-dialog"]')).toBeNull();
      expect(document.activeElement).toBe(projectMenuTrigger);
    });
    expect(useSessionStore.getState().projectId).toBe('dbt-analytics');
  });

  it('keeps unavailable Project snapshot commands disabled and never dispatches them', async () => {
    const rejectedCommand = vi.fn();
    useCanvasWorkspaceMenuContributionStore.setState({
      contribution: {
        canExportProjectSnapshot: false,
        canImportProjectSnapshot: false,
        canOpenProjectCode: false,
        onExportProjectSnapshot: rejectedCommand,
        onImportProjectSnapshotFile: rejectedCommand,
        onOpenProjectCode: rejectedCommand,
      },
    });
    await act(async () => shell.root.render(shell.render('/canvas')));
    await act(async () => {
      fireEvent.pointerDown(
        shell.container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!
      );
    });
    const commands = await waitFor(() => {
      const entries = document.body.querySelectorAll<HTMLElement>(
        '[data-slot^="canvas-workspace-"][role="menuitem"]'
      );
      expect(entries).toHaveLength(2);
      return [...entries];
    });
    for (const command of commands) {
      expect(command.getAttribute('aria-disabled')).toBe('true');
      await act(async () => fireEvent.click(command));
    }
    expect(rejectedCommand).not.toHaveBeenCalled();
  });

  it('retains the snapshot receiver until selection, then closes Project and restores focus', async () => {
    const onImportProjectSnapshotFile = vi.fn();
    useCanvasWorkspaceMenuContributionStore.setState({
      contribution: {
        canExportProjectSnapshot: false,
        canImportProjectSnapshot: true,
        onImportProjectSnapshotFile,
      },
    });
    await act(async () => shell.root.render(shell.render('/canvas')));
    const fileTrigger = shell.container.querySelector<HTMLElement>(
      '[data-slot="shell-workspace-menu-trigger"]'
    )!;
    await act(async () => {
      fireEvent.pointerDown(fileTrigger);
    });
    const input = await waitFor(() => {
      const receiver = document.querySelector<HTMLInputElement>(
        '[data-slot="canvas-workspace-import-input"]'
      );
      expect(receiver).not.toBeNull();
      return receiver!;
    });
    const openPicker = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    const command = document.querySelector<HTMLElement>(
      '[data-slot="canvas-workspace-import-command"]'
    )!;
    await act(async () => {
      command.focus();
      fireEvent.keyDown(command, { key: 'Enter', code: 'Enter' });
    });
    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(input.isConnected).toBe(true);
    expect(onImportProjectSnapshotFile).not.toHaveBeenCalled();
    await act(async () => fireEvent.change(input, { target: { files: [] } }));
    expect(input.isConnected).toBe(true);
    expect(fileTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(onImportProjectSnapshotFile).not.toHaveBeenCalled();
    const file = new File(['{}'], 'project.json', { type: 'application/json' });
    await act(async () => fireEvent.change(input, { target: { files: [file] } }));
    expect(onImportProjectSnapshotFile).toHaveBeenCalledExactlyOnceWith(file);
    expect(input.value).toBe('');
    openPicker.mockRestore();
    await waitFor(() => {
      expect(input.isConnected).toBe(false);
      expect(fileTrigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(fileTrigger);
    });
    await act(async () => fireEvent.pointerDown(fileTrigger));
    const reopenedInput = await waitFor(() => {
      const receiver = document.querySelector<HTMLInputElement>(
        '[data-slot="canvas-workspace-import-input"]'
      );
      expect(receiver).not.toBeNull();
      return receiver!;
    });
    await act(async () => fireEvent.change(reopenedInput, { target: { files: [file] } }));
    expect(onImportProjectSnapshotFile).toHaveBeenCalledTimes(2);
    expect(onImportProjectSnapshotFile).toHaveBeenLastCalledWith(file);
    await waitFor(() => {
      expect(reopenedInput.isConnected).toBe(false);
      expect(document.activeElement).toBe(fileTrigger);
    });
  });
});
