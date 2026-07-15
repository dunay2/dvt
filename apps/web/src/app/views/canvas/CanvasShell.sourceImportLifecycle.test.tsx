// @vitest-environment jsdom

/** Owned concern: prove CanvasShell source-import wizard lifecycle and completion wiring. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportSourcesResult, IWarehouseSourceImportPort } from '../../ports/workspace';
import { buildGraphDraftSourceImportResult } from '../../../testing/sourceImportTestFixtures';
import {
  buildCanvasShellProps,
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';

const shellState = getCanvasShellState();

describe('CanvasShell source import lifecycle', () => {
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let renderShellProps: (props: CanvasShellProps) => Promise<void>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    renderShell = harness.render;
    renderShellProps = harness.renderProps;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
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
      canvasId: props.panels.activeCanvasId,
      onComplete: expect.any(Function),
    });
  });

  it('opens the source import wizard from the viewport contextual source command', async () => {
    const warehouseSourceImport = {
      listWarehouseConnections: vi.fn(),
      listSourceObjects: vi.fn(),
      createWarehouseConnection: vi.fn(),
      testWarehouseConnection: vi.fn(),
      importSources: vi.fn(),
    } satisfies IWarehouseSourceImportPort;

    await renderShell({ warehouseSourceImport });

    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeTypeOf('function');

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
        (() => void) | undefined;
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
        ((flowPosition?: { x: number; y: number }) => void) | undefined;
      openDataRegistry?.({ x: 420, y: 260 });
    });

    await act(async () => {
      const complete = shellState.sourceImportWizardProps?.onComplete as
        ((result: ImportSourcesResult) => void) | undefined;
      complete?.(buildGraphDraftSourceImportResult());
    });

    expect(onSourceImportComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: expect.objectContaining({ importedNodeIds: ['src_erp_orders'] }),
      }),
      { canvasPosition: { x: 420, y: 260 } }
    );
  });

  it('closes the import wizard if source import eligibility is revoked while it is open', async () => {
    await renderShell();

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
        (() => void) | undefined;
      openDataRegistry?.();
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
    });

    await renderShellProps(
      buildCanvasShellProps({
        layout: {
          canOpenSourceImport: false,
        },
      })
    );

    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeUndefined();
    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: false,
    });
  });
});
