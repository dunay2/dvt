import { describe, expect, it, vi } from 'vitest';

import { projectCanvasNodeFlowAdapter } from '../components/canvas/canvasNodeFlowAdapterProjection';
import { buildSemanticWorkbenchCanvasProcess } from './SemanticWorkbenchLab';
import { SEMANTIC_WORKBENCH_SOURCE } from './semanticWorkbenchFixture';

describe('SemanticWorkbenchLab node inspection', () => {
  it('routes double-click and Properties through the existing inspection seam', () => {
    const onInspectNode = vi.fn();
    const process = buildSemanticWorkbenchCanvasProcess(onInspectNode);
    const sourceNode = process.nodes.find((node) => node.id === SEMANTIC_WORKBENCH_SOURCE.id);
    expect(sourceNode).toBeDefined();

    const projection = projectCanvasNodeFlowAdapter({
      nodeId: sourceNode!.id,
      data: sourceNode!.data,
      selected: false,
      onColumnLayoutChange: vi.fn(),
    });
    const actionIds = projection.contextMenuModel.actionGroups.flatMap((group) =>
      group.actions.map((action) => action.id)
    );

    expect(actionIds).toContain('open-properties');

    projection.openNode();
    projection.runAction('open-properties');

    expect(onInspectNode.mock.calls).toEqual([
      [sourceNode!.id, 'code'],
      [sourceNode!.id, 'general'],
    ]);
  });
});
