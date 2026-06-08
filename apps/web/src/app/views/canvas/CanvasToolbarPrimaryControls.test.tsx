// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasToolbarPrimaryControls } from './CanvasToolbarPrimaryControls';

const DEFAULT_PROPS: React.ComponentProps<typeof CanvasToolbarPrimaryControls> = {
  authoringNodeKinds: [],
  canEditEdges: true,
  canExportProjectSnapshot: true,
  canImportProjectSnapshot: true,
  canPlan: true,
  canPlanGraph: true,
  canRun: true,
  canStartRun: true,
  canvasAuthoringMode: 'transformation',
  onExportProjectSnapshot: vi.fn(),
  onImportProjectSnapshotFile: vi.fn(),
  onPlan: vi.fn(),
  onRun: vi.fn(),
  workflowStatusClass: '',
  workflowStatusLabel: 'Plan required',
  workflowStatusTitle: 'Plan required',
};

describe('CanvasToolbarPrimaryControls', () => {
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
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('groups import and export commands under one project menu', async () => {
    const onExportProjectSnapshot = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbarPrimaryControls
          {...DEFAULT_PROPS}
          onExportProjectSnapshot={onExportProjectSnapshot}
        />
      );
    });

    expect(
      container.querySelector('[data-slot="canvas-toolbar-project-menu-trigger"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-toolbar-export-command"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-toolbar-import-command"]')).toBeNull();

    await act(async () => {
      fireEvent.pointerDown(
        container.querySelector('[data-slot="canvas-toolbar-project-menu-trigger"]')!
      );
    });

    await waitFor(() => {
      expect(
        document.body.querySelector('[data-slot="canvas-toolbar-export-command"]')
      ).not.toBeNull();
      expect(
        document.body.querySelector('[data-slot="canvas-toolbar-import-command"]')
      ).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(document.body.querySelector('[data-slot="canvas-toolbar-export-command"]')!);
    });

    expect(onExportProjectSnapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps project snapshot import functional through the project menu', async () => {
    const onImportProjectSnapshotFile = vi.fn();
    const snapshotFile = new File(['{}'], 'snapshot.json', { type: 'application/json' });

    await act(async () => {
      root.render(
        <CanvasToolbarPrimaryControls
          {...DEFAULT_PROPS}
          onImportProjectSnapshotFile={onImportProjectSnapshotFile}
        />
      );
    });

    await act(async () => {
      fireEvent.pointerDown(
        container.querySelector('[data-slot="canvas-toolbar-project-menu-trigger"]')!
      );
    });

    await waitFor(() => {
      expect(
        document.body.querySelector('[data-slot="canvas-toolbar-import-command"]')
      ).not.toBeNull();
    });

    await act(async () => {
      fireEvent.change(container.querySelector('input[type="file"]')!, {
        target: { files: [snapshotFile] },
      });
    });

    expect(onImportProjectSnapshotFile).toHaveBeenCalledWith(snapshotFile);
  });
});
