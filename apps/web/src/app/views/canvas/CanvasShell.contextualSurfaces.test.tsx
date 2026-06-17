// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportSourcesResult, IWarehouseSourceImportPort } from '../../ports/workspace';
import {
  buildCanvasShellProps,
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';

const shellState = getCanvasShellState();

describe('CanvasShell contextual surfaces', () => {
  let container: HTMLDivElement;
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let renderShellProps: (props: CanvasShellProps) => Promise<void>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    container = harness.container;
    renderShell = harness.render;
    renderShellProps = harness.renderProps;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
  });

  it('wires source import as a contextual viewport command when graph edits are allowed', async () => {
    await renderShell();

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: true,
    });
    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeTypeOf('function');
    expect(shellState.sourceImportWizardProps).toMatchObject({
      sourceImportOptions: [
        expect.objectContaining({ id: 'includeColumns' }),
        expect.objectContaining({ id: 'addTests' }),
        expect.objectContaining({ id: 'addFreshness' }),
      ],
    });
  });

  it('keeps ready-canvas node creation in the viewport context contract instead of a rail', async () => {
    const props = await renderShell();

    expect(shellState.canvasViewportProps).toMatchObject({
      authoringNodeKinds: props.panels.authoringNodeKinds,
      onCreateAuthoringNode: props.graphCommands.onCreateAuthoringNode,
    });
  });

  it('hides viewport source import affordances when source import is unavailable', async () => {
    await renderShell({
      layout: {
        canOpenSourceImport: false,
      },
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: false,
    });
    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeUndefined();
  });

  it('hides viewport source import affordances when the dbt source import plugin is unavailable', async () => {
    await renderShell({
      panels: {
        runtimeCapabilities: {
          plugins: {
            dbt: {
              available: false,
              reason: 'disabled in test',
            },
          },
        },
      },
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: false,
    });
    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeUndefined();
    expect(shellState.sourceImportWizardProps).toMatchObject({
      sourceImportOptions: [],
    });
  });

  it('wires source import completion and imported-node focus through the shell surfaces', async () => {
    const props = await renderShell({
      panels: {
        importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
      },
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
      onImportedNodeFocusComplete: props.graphCommands.onImportedNodeFocusComplete,
    });
    expect(shellState.sourceImportWizardProps).toMatchObject({
      onComplete: expect.any(Function),
    });
  });

  it('opens the source import wizard from the viewport contextual source command', async () => {
    const warehouseSourceImport = {
      listWarehouseConnections: vi.fn(),
      listWarehouseTables: vi.fn(),
      createWarehouseConnection: vi.fn(),
      testWarehouseConnection: vi.fn(),
      importSources: vi.fn(),
    } satisfies IWarehouseSourceImportPort;

    await renderShell({ warehouseSourceImport });

    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeTypeOf('function');

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
        | (() => void)
        | undefined;
      openDataRegistry?.();
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
      initialSelection: undefined,
    });
  });

  it('keeps the canvas source-import anchor until the wizard completes', async () => {
    const onSourceImportComplete = vi.fn();
    await renderShell({
      graphCommands: {
        onSourceImportComplete,
      },
    });

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
        | ((flowPosition?: { x: number; y: number }) => void)
        | undefined;
      openDataRegistry?.({ x: 420, y: 260 });
    });

    await act(async () => {
      const complete = shellState.sourceImportWizardProps?.onComplete as
        | ((result: ImportSourcesResult) => void)
        | undefined;
      complete?.({
        success: true,
        importedNodeIds: ['src_erp_orders'],
        sourcesCreated: 1,
        tablesImported: 1,
        yamlFiles: ['models/sources/src_erp.yml'],
        grouping: 'schema',
        options: {
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });
    });

    expect(onSourceImportComplete).toHaveBeenCalledWith(
      expect.objectContaining({ importedNodeIds: ['src_erp_orders'] }),
      { canvasPosition: { x: 420, y: 260 } }
    );
  });

  it('opens a contextual project explorer from the viewport command using real canvas documents', async () => {
    const onSelectCanvas = vi.fn();

    await renderShell({
      panels: {
        activeCanvasId: 'sales-canvas',
        activeCanvas: {
          id: 'sales-canvas',
          title: 'Sales canvas',
          kind: 'dbt',
          environmentId: 'dev',
        },
        canvasDocuments: [
          {
            id: 'sales-canvas',
            title: 'Sales canvas',
            kind: 'dbt',
            environmentId: 'dev',
          },
          {
            id: 'dvt-flow',
            title: 'DVT flow',
            kind: 'transformation',
            environmentId: 'dev',
          },
        ],
      },
      canvasCommands: {
        onSelectCanvas,
      },
    });

    await act(async () => {
      const openProjectExplorer = shellState.canvasViewportProps?.onOpenProjectExplorer as
        | (() => void)
        | undefined;
      openProjectExplorer?.();
    });

    expect(container.querySelector('[data-slot="canvas-project-explorer-dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Sales canvas');
    expect(container.textContent).toContain('DVT flow');

    const dvtFlowButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Open DVT flow'
    );
    expect(dvtFlowButton).toBeDefined();

    await act(async () => {
      dvtFlowButton?.click();
    });

    expect(onSelectCanvas).toHaveBeenCalledWith('dvt-flow');
  });

  it('opens contextual canvas settings from the viewport command using view commands', async () => {
    const onToggleGridVisible = vi.fn();
    const onToggleSnapToGrid = vi.fn();

    await renderShell({
      chromeCommands: {
        onToggleGridVisible,
        onToggleSnapToGrid,
      },
    });

    await act(async () => {
      const openCanvasSettings = shellState.canvasViewportProps?.onOpenCanvasSettings as
        | (() => void)
        | undefined;
      openCanvasSettings?.();
    });

    expect(container.querySelector('[data-slot="canvas-settings-dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Canvas settings');

    const gridButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Hide grid'
    );
    const snapButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Enable snap'
    );
    expect(gridButton).toBeDefined();
    expect(snapButton).toBeDefined();

    await act(async () => {
      gridButton?.click();
      snapButton?.click();
    });

    expect(onToggleGridVisible).toHaveBeenCalledTimes(1);
    expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
  });

  it('closes the import wizard if edit permissions are revoked while it is open', async () => {
    await renderShell();

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
        | (() => void)
        | undefined;
      openDataRegistry?.();
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
    });

    await renderShellProps(
      buildCanvasShellProps({
        panels: {
          userPermissions: {
            canPlan: false,
            canRun: false,
            canEditEdges: false,
          },
        },
      })
    );

    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeUndefined();
    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: false,
    });
  });
});
