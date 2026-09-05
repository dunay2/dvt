// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CanvasWorkspaceMenuContributionRegistrar,
  CanvasWorkspaceTopBarIdentity,
  CanvasWorkspaceMenuControls,
} from './CanvasWorkspaceMenuControls';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

describe('CanvasWorkspaceMenuControls', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    container.remove();
    vi.clearAllMocks();
  });

  it('renders contributed project snapshot commands in the Workspace menu', async () => {
    const onExportProjectSnapshot = vi.fn();
    const onImportProjectSnapshotFile = vi.fn();
    const onOpenProjectExplorer = vi.fn();
    const onOpenProjectCode = vi.fn();
    const onProjectCodeSelected = vi.fn();
    const onImportDbtProject = vi.fn();
    const snapshotFile = new File(['{}'], 'project-snapshot.json', {
      type: 'application/json',
    });

    await act(async () => {
      root.render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Workspace</DropdownMenuTrigger>
          <DropdownMenuContent forceMount>
            <CanvasWorkspaceMenuContributionRegistrar
              canExportProjectSnapshot
              canImportProjectSnapshot
              canOpenProjectExplorer
              canOpenProjectCode
              canImportDbtProject
              onExportProjectSnapshot={onExportProjectSnapshot}
              onImportProjectSnapshotFile={onImportProjectSnapshotFile}
              onOpenProjectExplorer={onOpenProjectExplorer}
              onOpenProjectCode={onOpenProjectCode}
              onImportDbtProject={onImportDbtProject}
            />
            <CanvasWorkspaceMenuControls onProjectCodeSelected={onProjectCodeSelected} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    });

    await act(async () => {
      document.body
        .querySelector<HTMLDivElement>('[data-slot="canvas-workspace-export-command"]')
        ?.click();
    });

    expect(onExportProjectSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.body
        .querySelector<HTMLDivElement>('[data-slot="canvas-workspace-explore-project-command"]')
        ?.click();
    });
    await act(async () => {
      document.body
        .querySelector<HTMLDivElement>('[data-slot="canvas-workspace-open-project-code-command"]')
        ?.click();
    });

    expect(onOpenProjectExplorer).toHaveBeenCalledTimes(1);
    expect(onOpenProjectCode).toHaveBeenCalledTimes(1);
    expect(onProjectCodeSelected).toHaveBeenCalledTimes(1);
    expect(onProjectCodeSelected.mock.invocationCallOrder[0]).toBeLessThan(
      onOpenProjectCode.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );

    await act(async () => {
      document.body
        .querySelector<HTMLDivElement>('[data-slot="canvas-workspace-import-dbt-project-command"]')
        ?.click();
    });

    expect(onImportDbtProject).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.change(
        document.body.querySelector<HTMLInputElement>(
          '[data-slot="canvas-workspace-import-input"]'
        )!,
        {
          target: { files: [snapshotFile] },
        }
      );
    });

    expect(onImportProjectSnapshotFile).toHaveBeenCalledWith(snapshotFile);
  });

  it('renders the active Canvas identity as minimal shell top-bar context', async () => {
    await act(async () => {
      root.render(
        <>
          <CanvasWorkspaceMenuContributionRegistrar
            activeCanvas={{
              id: 'warehouse-canvas',
              kind: 'transformation',
              title: 'Warehouse project',
            }}
            canExportProjectSnapshot
            canImportProjectSnapshot
            onExportProjectSnapshot={vi.fn()}
            onImportProjectSnapshotFile={vi.fn()}
          />
          <CanvasWorkspaceTopBarIdentity />
        </>
      );
    });

    const activeCanvasIdentity = container.querySelector(
      '[data-slot="shell-active-canvas-identity"]'
    );

    expect(activeCanvasIdentity).not.toBeNull();
    expect(activeCanvasIdentity?.textContent).toBe('Warehouse project');
    expect(activeCanvasIdentity?.getAttribute('data-canvas-id')).toBe('warehouse-canvas');
    expect(activeCanvasIdentity?.getAttribute('data-kind')).toBe('transformation');
    expect(container.textContent).not.toContain('Export');
    expect(container.textContent).not.toContain('Import');
  });

  it('renders project commands and active Canvas context in the configured language', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await act(async () => {
      root.render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Espacio de trabajo</DropdownMenuTrigger>
          <DropdownMenuContent forceMount>
            <CanvasWorkspaceMenuContributionRegistrar
              activeCanvas={{ id: 'transformaciones', kind: 'transformation', title: 'Ventas' }}
              canExportProjectSnapshot
              canImportProjectSnapshot
              canOpenProjectExplorer
              canOpenProjectCode
              canImportDbtProject
              onExportProjectSnapshot={vi.fn()}
              onImportProjectSnapshotFile={vi.fn()}
              onOpenProjectExplorer={vi.fn()}
              onOpenProjectCode={vi.fn()}
              onImportDbtProject={vi.fn()}
            />
            <CanvasWorkspaceMenuControls />
            <CanvasWorkspaceTopBarIdentity />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    });

    expect(document.body.textContent).toContain('Importar proyecto dbt');
    expect(document.body.textContent).toContain('Acciones del proyecto');
    expect(document.body.textContent).toContain('Instantáneas del proyecto');
    expect(document.body.textContent).toContain('Explorar proyecto');
    expect(document.body.textContent).toContain('Abrir código del proyecto');
    expect(document.body.textContent).not.toContain('Open project code');
    expect(
      document.body
        .querySelector('[data-slot="shell-active-canvas-identity"]')
        ?.getAttribute('aria-label')
    ).toBe('Canvas activo: Ventas');
    expect(
      document.body.querySelector('[data-slot="shell-active-canvas-identity"]')?.textContent
    ).toBe('Ventas');
  });

  it('does not let a stale Workspace menu cleanup clear an active replacement contribution', async () => {
    const staleContribution = {
      canExportProjectSnapshot: false,
      canImportProjectSnapshot: false,
      canOpenProjectExplorer: false,
      canOpenProjectCode: false,
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
      onOpenProjectExplorer: vi.fn(),
      onOpenProjectCode: vi.fn(),
    };
    const activeContribution = {
      canExportProjectSnapshot: true,
      canImportProjectSnapshot: true,
      canOpenProjectExplorer: true,
      canOpenProjectCode: true,
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
      onOpenProjectExplorer: vi.fn(),
      onOpenProjectCode: vi.fn(),
    };

    const { registerCanvasWorkspaceMenuContribution, clearCanvasWorkspaceMenuContribution } =
      useCanvasWorkspaceMenuContributionStore.getState();

    registerCanvasWorkspaceMenuContribution(staleContribution);
    registerCanvasWorkspaceMenuContribution(activeContribution);
    clearCanvasWorkspaceMenuContribution(staleContribution);

    await waitFor(() => {
      expect(useCanvasWorkspaceMenuContributionStore.getState().contribution).toBe(
        activeContribution
      );
    });

    clearCanvasWorkspaceMenuContribution(activeContribution);

    expect(useCanvasWorkspaceMenuContributionStore.getState().contribution).toBeNull();
  });

  it('keeps one registered snapshot while parent callback identities change', async () => {
    const onExportProjectSnapshot = vi.fn();
    const onImportProjectSnapshotFile = vi.fn();

    const renderRegistrar = (onImportDbtProject: () => void): React.ReactElement => (
      <CanvasWorkspaceMenuContributionRegistrar
        canExportProjectSnapshot={false}
        canImportProjectSnapshot={false}
        canImportDbtProject
        onExportProjectSnapshot={onExportProjectSnapshot}
        onImportProjectSnapshotFile={onImportProjectSnapshotFile}
        onImportDbtProject={onImportDbtProject}
      />
    );

    const firstCommand = vi.fn();
    await act(async () => {
      root.render(renderRegistrar(firstCommand));
    });
    const firstContribution = useCanvasWorkspaceMenuContributionStore.getState().contribution;

    const latestCommand = vi.fn();
    await act(async () => {
      root.render(renderRegistrar(latestCommand));
    });

    const latestContribution = useCanvasWorkspaceMenuContributionStore.getState().contribution;
    expect(latestContribution).toBe(firstContribution);
    latestContribution?.onImportDbtProject?.();
    expect(firstCommand).not.toHaveBeenCalled();
    expect(latestCommand).toHaveBeenCalledTimes(1);
  });
});
