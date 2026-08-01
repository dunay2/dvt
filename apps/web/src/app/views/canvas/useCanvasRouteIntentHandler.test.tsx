// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanvasRouteIntent } from './canvasLegacyRouteIntent';
import {
  useCanvasRouteIntentHandler,
  type CanvasRouteIntentHandlerArgs,
} from './useCanvasRouteIntentHandler';

function Harness(props: CanvasRouteIntentHandlerArgs): null {
  useCanvasRouteIntentHandler(props);
  return null;
}

describe('useCanvasRouteIntentHandler', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  function createArgs(intent: CanvasRouteIntent | null): CanvasRouteIntentHandlerArgs {
    const onUnavailableLegacySurface = vi.fn();
    const onConsumed = vi.fn();
    return {
      request:
        intent == null
          ? null
          : {
              intent,
              onUnavailableLegacySurface,
              onConsumed,
            },
      columnLevelLineageEnabled: false,
      canOpenProjectCode: true,
      onOpenProjectCode: vi.fn(),
      onToggleColumnLevelLineage: vi.fn(),
    };
  }

  async function render(args: CanvasRouteIntentHandlerArgs): Promise<void> {
    await act(async () => root.render(<Harness {...args} />));
  }

  it('opens project Code and consumes one route request exactly once', async () => {
    const args = createArgs({
      kind: 'open-contextual-workbench',
      workbenchId: 'project-code',
    });

    await render(args);
    await render({ ...args });

    expect(args.onOpenProjectCode).toHaveBeenCalledTimes(1);
    expect(args.request?.onConsumed).toHaveBeenCalledTimes(1);
    expect(args.onToggleColumnLevelLineage).not.toHaveBeenCalled();
  });

  it('waits for a Canvas authority before consuming a project Code intent', async () => {
    const args = createArgs({
      kind: 'open-contextual-workbench',
      workbenchId: 'project-code',
    });

    await render({ ...args, canOpenProjectCode: false });

    expect(args.onOpenProjectCode).not.toHaveBeenCalled();
    expect(args.request?.onConsumed).not.toHaveBeenCalled();

    await render(args);

    expect(args.onOpenProjectCode).toHaveBeenCalledTimes(1);
    expect(args.request?.onConsumed).toHaveBeenCalledTimes(1);
  });

  it('enables the lineage lens only when it is not already active', async () => {
    const intent = { kind: 'enable-lens', lensId: 'column-lineage' } as const;
    const inactiveArgs = createArgs(intent);

    await render(inactiveArgs);
    expect(inactiveArgs.onToggleColumnLevelLineage).toHaveBeenCalledTimes(1);
    expect(inactiveArgs.request?.onConsumed).toHaveBeenCalledTimes(1);

    await render({ ...inactiveArgs, request: null });
    const activeArgs = { ...createArgs(intent), columnLevelLineageEnabled: true };
    await render(activeArgs);

    expect(activeArgs.onToggleColumnLevelLineage).not.toHaveBeenCalled();
    expect(activeArgs.request?.onConsumed).toHaveBeenCalledTimes(1);
  });

  it('reports a retired surface instead of silently discarding the deep-link intent', async () => {
    const args = createArgs({
      kind: 'unavailable-legacy-surface',
      surfaceId: 'artifacts',
    });

    await render(args);

    expect(args.request?.onUnavailableLegacySurface).toHaveBeenCalledWith('artifacts');
    expect(args.request?.onConsumed).toHaveBeenCalledTimes(1);
    expect(args.onOpenProjectCode).not.toHaveBeenCalled();
  });
});
