// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Node } from '@xyflow/react';

import {
  buildCanonicalNode,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
} from './useCanvasGraphHandlers.test.support';

const READ_MODEL_COMMANDS = [
  'handleInspectNode',
  'handleDuplicateNode',
  'handleRemoveNode',
  'handleToggleNodeSelection',
  'handleAttachSchemaToNode',
  'handleColumnPortActivate',
  'handleApplyCanvasColumnFunction',
  'handleApplyCanvasStructuredField',
  'handleAddCanvasCalculatedColumn',
  'handleToggleCanvasColumnOutput',
  'handleReorderCanvasColumnOutput',
  'handleColumnDisclosureChange',
  'handleAutomapCanvasColumns',
  'handleRemoveColumnMapping',
  'resolveCanvasAlgebraicCompositionOperations',
  'handleComposeCanvasNodes',
] as const;

describe('useCanvasGraphHandlers geometry isolation', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('keeps semantic command identities stable when one of 30 nodes moves', async () => {
    const canonicalNodes = Array.from({ length: 30 }, (_, index) =>
      buildCanonicalNode(
        index === 0 ? 'source-node' : `model-${index}`,
        index === 0 ? 'input' : 'transform'
      )
    );
    const initialNodes: Node[] = canonicalNodes.map((node, index) => ({
      id: node.id,
      data: { name: node.name },
      position: { x: index * 10, y: index * 5 },
    }));
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes,
      nodes: initialNodes,
    });

    await harness.render();
    const initialHandlers = harness.latest();
    expect(initialHandlers).not.toBeNull();

    const movedNodes = initialNodes.map((node, index) =>
      index === 15 ? { ...node, position: { x: 640, y: 480 } } : node
    );
    await harness.render(movedNodes);
    const movedHandlers = harness.latest();

    for (const command of READ_MODEL_COMMANDS) {
      expect(movedHandlers?.[command]).toBe(initialHandlers?.[command]);
    }

    act(() => {
      movedHandlers?.handleAttachSchemaToNode('source-node', 'analytics');
    });

    const nextNodes = harness.setNodes.mock.calls.at(-1)?.[0] as Node[];
    expect(nextNodes).toEqual(expect.any(Array));
    expect(nextNodes[15]).toBe(movedNodes[15]);
    expect(nextNodes[0]?.position).toBe(movedNodes[0]?.position);
    expect(nextNodes[0]?.data.metadata).toEqual(expect.objectContaining({ schema: 'analytics' }));

    harness.cleanup();
  });
});
