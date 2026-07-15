// @vitest-environment jsdom

/** Owned concern: prove CanvasShell exposes source-import commands only when allowed. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';

const shellState = getCanvasShellState();

describe('CanvasShell source import availability', () => {
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    renderShell = harness.render;
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

  it('keeps file-authoritative source import available when edge mutation is blocked', async () => {
    await renderShell({
      panels: {
        userPermissions: {
          canPlan: false,
          canRun: false,
          canEditEdges: false,
        },
      },
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: true,
    });
    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeTypeOf('function');
  });

  it('keeps viewport source import affordances when dbt is unavailable but warehouse import is available', async () => {
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

  it('hides viewport source import affordances when the warehouse source plugin is unavailable', async () => {
    await renderShell({
      panels: {
        runtimeCapabilities: {
          plugins: {
            'dvt.warehouse-source': {
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
});
