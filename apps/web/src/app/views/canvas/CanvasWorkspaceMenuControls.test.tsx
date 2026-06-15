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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders contributed project snapshot commands in the Workspace menu', async () => {
    const onExportProjectSnapshot = vi.fn();
    const onImportProjectSnapshotFile = vi.fn();
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
              onExportProjectSnapshot={onExportProjectSnapshot}
              onImportProjectSnapshotFile={onImportProjectSnapshotFile}
            />
            <CanvasWorkspaceMenuControls />
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

  it('renders the active canvas identity as minimal shell top-bar context', async () => {
    await act(async () => {
      root.render(
        <>
          <CanvasWorkspaceMenuContributionRegistrar
            activeCanvas={{
              id: 'warehouse-dbt',
              kind: 'dbt',
              title: 'Warehouse dbt',
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
    expect(activeCanvasIdentity?.textContent).toContain('Warehouse dbt');
    expect(activeCanvasIdentity?.getAttribute('data-canvas-id')).toBe('warehouse-dbt');
    expect(activeCanvasIdentity?.getAttribute('data-kind')).toBe('dbt');
    expect(container.textContent).not.toContain('Export');
    expect(container.textContent).not.toContain('Import');
  });

  it('does not let a stale Workspace menu cleanup clear an active replacement contribution', async () => {
    const staleContribution = {
      canExportProjectSnapshot: false,
      canImportProjectSnapshot: false,
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
    };
    const activeContribution = {
      canExportProjectSnapshot: true,
      canImportProjectSnapshot: true,
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
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
});
