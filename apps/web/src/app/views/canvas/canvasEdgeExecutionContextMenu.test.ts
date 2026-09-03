import { describe, expect, it } from 'vitest';

import { buildCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';
import { buildCanvasContextMenuModel } from './canvasInteractionCommandSurface';

function buildEdgeMenu(
  execution: ReturnType<typeof buildCanvasDependencyEdgeData>['execution']
): ReturnType<typeof buildCanvasContextMenuModel> {
  return buildCanvasContextMenuModel({
    target: {
      kind: 'edge',
      edgeId: 'orders-transform',
      sourceId: 'orders',
      targetId: 'transform',
      execution,
      screenPosition: { x: 480, y: 320 },
    },
    canMutateGraph: true,
    authoringNodeKinds: [],
  });
}

describe('Canvas edge execution context actions', () => {
  it('offers the opposite gate command for open and closed dependencies', () => {
    const openMenu = buildEdgeMenu(
      buildCanvasDependencyEdgeData({ sourceId: 'orders', targetId: 'transform' }).execution
    );
    const closedMenu = buildEdgeMenu(
      buildCanvasDependencyEdgeData({
        sourceId: 'orders',
        targetId: 'transform',
        executionGate: 'closed',
      }).execution
    );

    expect(openMenu.edgeActions).toContainEqual(
      expect.objectContaining({ action: 'set-execution-gate', gate: 'closed' })
    );
    expect(closedMenu.edgeActions).toContainEqual(
      expect.objectContaining({ action: 'set-execution-gate', gate: 'open' })
    );
  });

  it('does not offer a gate command when structural policy rejects enabling', () => {
    const menu = buildEdgeMenu(
      buildCanvasDependencyEdgeData({
        sourceId: 'orders',
        targetId: 'transform',
        canonicalMetadata: { executionDependency: false },
      }).execution
    );

    expect(menu.edgeActions).not.toContainEqual(
      expect.objectContaining({ action: 'set-execution-gate' })
    );
  });

  it('hides gate mutation with the rest of edge mutations in read-only posture', () => {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'edge',
        edgeId: 'orders-transform',
        sourceId: 'orders',
        targetId: 'transform',
        execution: buildCanvasDependencyEdgeData({ sourceId: 'orders', targetId: 'transform' })
          .execution,
        screenPosition: { x: 480, y: 320 },
      },
      canMutateGraph: false,
      authoringNodeKinds: [],
    });

    expect(model.edgeActions).toHaveLength(0);
  });
});
