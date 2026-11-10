// @vitest-environment jsdom

/** Owned concern: prove CanvasShell source-import wizard lifecycle and completion wiring. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportSourcesResult } from '../../ports/workspace';
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

  it('opens management without inheriting the retained object selection', async () => {
    // The gear must carry its intent through the shell, rather than reopen the retained source selection.
    await renderShell({ sourceImportInitialSelection: { connectionId: 'old', sourceObjects: [] } });
    await act(async () => {
      const manage = shellState.canvasViewportProps?.onManageConnections as () => void;
      manage();
    });
    expect(shellState.sourceImportWizardProps).toMatchObject({
      entry: { intent: 'manage-connections' },
    });
    expect(
      (shellState.sourceImportWizardProps?.entry as { initialSelection?: unknown }).initialSelection
    ).toBeUndefined();
  });

  it('rejects a completion from an earlier import after management supersedes it', async () => {
    // A stale request cannot consume the pending dbt continuation or complete against a newer dialog entry.
    const onComplete = vi.fn();
    const onConsumed = vi.fn();
    await renderShell({
      sourceImportInitialSelection: { kind: 'dbt-source-binding', sourceTableDeclarations: [] },
      onSourceImportInitialSelectionConsumed: onConsumed,
      graphCommands: { onSourceImportComplete: onComplete },
    });
    const earlierComplete = shellState.sourceImportWizardProps?.onComplete as (
      result: ImportSourcesResult
    ) => void;
    await act(async () => {
      (shellState.canvasViewportProps?.onManageConnections as () => void)();
      earlierComplete(buildGraphDraftSourceImportResult());
    });
    expect(onComplete).not.toHaveBeenCalled();
    expect(onConsumed).not.toHaveBeenCalled();
  });

  it('does not reinterpret an old retained prefill as an entry in a new Canvas', async () => {
    // A new owner invalidates an opening; retaining the same object must not grant it to another Canvas.
    const initialSelection = { connectionId: 'old', sourceObjects: [] };
    await renderShell({ sourceImportInitialSelection: initialSelection });
    await renderShellProps(
      buildCanvasShellProps({
        sourceImportInitialSelection: initialSelection,
        panels: { activeCanvasId: 'another-canvas' },
      })
    );
    expect(shellState.sourceImportWizardProps).toBeNull();
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
    await act(async () => {
      (shellState.canvasViewportProps?.onOpenSourceImport as () => void)();
    });
    expect(shellState.sourceImportWizardProps).toMatchObject({
      canvasId: props.panels.activeCanvasId,
      onComplete: expect.any(Function),
    });
  });

  it('opens the source import wizard from the viewport contextual source command', async () => {
    await renderShell();

    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeTypeOf('function');

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
        (() => void) | undefined;
      openDataRegistry?.();
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
      entry: { intent: 'import-sources', initialSelection: undefined },
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
    expect(shellState.sourceImportWizardProps).toBeNull();
  });
});
