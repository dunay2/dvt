/**
 * Owned concern: verify Run readiness help and command admission.
 * Why: each suite protects one presentation contract.
 * Corner: existing negative paths and focus assertions remain intact.
 */
import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';
import { createShellTopBarHarness } from './ShellTopBar.test-support';
import { buildCanvasRunContribution } from './shellRunContribution.test-fixtures';

describe('Run readiness help and command admission', () => {
  const shell = createShellTopBarHarness();

  // The reason must remain discoverable without occupying header space or enabling Run.
  it('shows blocked Run readiness on focus without rendering a persistent header label', async () => {
    const contribution = buildCanvasRunContribution();
    useOperationalDrawerContributionStore.setState({
      contribution,
    });

    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    const topBar = shell.container.querySelector('[data-slot="shell-top-bar"]');
    const runStatus = topBar?.querySelector('[data-slot="shell-run-status-indicator"]');
    const runStatusLabel = topBar?.querySelector('[data-slot="shell-run-status-label"]');
    const runCommand = topBar?.querySelector<HTMLButtonElement>('[data-slot="shell-run-command"]');

    expect(runStatus).not.toBeNull();
    expect(runStatus?.textContent).not.toContain('Preview required');
    expect(runStatusLabel).toBeNull();
    expect(runStatus?.getAttribute('tabindex')).toBe('0');
    expect(runCommand).not.toBeNull();
    expect(runCommand?.textContent).toBe('Run');
    expect(runCommand?.disabled).toBe(true);
    expect(topBar?.textContent).not.toContain('Plan');
    await act(async () => (runStatus as HTMLElement).focus());
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Preview required')
    );
    await act(async () => fireEvent.click(runCommand!));
    expect(contribution.runs.onStartRun).not.toHaveBeenCalled();
  });

  it('reveals disabled Run help on tap without invoking the command', async () => {
    // Touch users have no hover; the blocked command must still explain its prerequisite.
    const contribution = buildCanvasRunContribution();
    useOperationalDrawerContributionStore.setState({ contribution });
    await act(async () => shell.root.render(shell.render('/canvas')));
    const target = shell.container.querySelector<HTMLElement>(
      '[data-slot="shell-run-status-indicator"]'
    )!;
    await act(async () => fireEvent.click(target));
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Preview required')
    );
    expect(
      shell.container.querySelector<HTMLButtonElement>('[data-slot="shell-run-command"]')?.disabled
    ).toBe(true);
    expect(contribution.runs.onStartRun).not.toHaveBeenCalled();
    await act(async () => fireEvent.keyDown(document, { key: 'Escape' }));
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
  });

  it('localizes Canvas run status, command, and accessible name from the application preference', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    useOperationalDrawerContributionStore.setState({
      contribution: buildCanvasRunContribution(),
    });

    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    const runStatus = shell.container.querySelector('[data-slot="shell-run-status-indicator"]');
    const runCommand = shell.container.querySelector<HTMLButtonElement>(
      '[data-slot="shell-run-command"]'
    );
    expect(runStatus?.textContent).not.toContain('Vista previa obligatoria');
    expect(runStatus?.getAttribute('aria-label')).toContain('Estado de ejecución del Canvas');
    expect(runCommand?.textContent).toContain('Ejecutar');
    expect(runCommand?.getAttribute('aria-label')).toBe('Ejecutar');
    await act(async () => (runStatus as HTMLElement).focus());
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
        'Vista previa obligatoria'
      )
    );
  });

  it('routes the compact top-bar Run command through the Canvas operational contribution', async () => {
    const onStartRun = vi.fn();
    useOperationalDrawerContributionStore.setState({
      contribution: buildCanvasRunContribution({
        tabs: [
          { id: 'log', label: 'Log', count: null },
          { id: 'problems', label: 'Problems', count: 0 },
          { id: 'runs', label: 'Runs', count: null },
          { id: 'preview', label: 'Preview', count: null },
          { id: 'data', label: 'Data', count: null },
        ],
        runs: {
          activeRunId: null,
          canStartRun: true,
          controls: null,
          onStartRun,
          status: 'ready',
          summary: 'Run is ready after the current execution preview.',
        },
        preview: {
          status: 'ready',
          summary: 'Preview ready.',
          blockers: [],
          canPreview: true,
          onPreviewExecutionPlan: vi.fn(),
          selectionRecovery: null,
        },
      }),
    });

    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    const topBar = shell.container.querySelector('[data-slot="shell-top-bar"]');
    const runCommand = topBar?.querySelector<HTMLButtonElement>('[data-slot="shell-run-command"]');

    const runStatus = topBar?.querySelector('[data-slot="shell-run-status-indicator"]');
    expect(runStatus?.textContent).not.toContain('Ready');
    expect(runStatus?.getAttribute('tabindex')).toBeNull();
    expect(runCommand?.disabled).toBe(false);
    await act(async () => runCommand!.focus());
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Ready')
    );

    await act(async () => {
      fireEvent.click(runCommand!);
    });

    expect(onStartRun).toHaveBeenCalledTimes(1);
  });
});
