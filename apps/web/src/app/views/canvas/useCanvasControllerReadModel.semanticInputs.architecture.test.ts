import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const READ_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasControllerReadModel.ts'
);

describe('useCanvasControllerReadModel semantic input sharing', () => {
  it('keeps whole-graph column-function materialization outside the per-node projector call', () => {
    expect(READ_MODEL_SOURCE).toContain('const columnFunctionNodes = useMemo(');
    expect(READ_MODEL_SOURCE).toContain('const columnFunctionEdges = useMemo(');

    const callStart = READ_MODEL_SOURCE.indexOf('projectCanvasColumnFunctionMenus({');
    const callEnd = READ_MODEL_SOURCE.indexOf('presentationTruth:', callStart);
    const projectorInputs = READ_MODEL_SOURCE.slice(callStart, callEnd);

    expect(projectorInputs).toContain('nodes: columnFunctionNodes');
    expect(projectorInputs).toContain('edges: columnFunctionEdges');
    expect(projectorInputs).not.toContain('[...graphModel.canonicalNodesById.values()]');
    expect(projectorInputs).not.toContain('graphModel.edges.map');
  });
});
