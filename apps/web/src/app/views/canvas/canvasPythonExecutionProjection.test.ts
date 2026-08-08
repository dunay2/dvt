import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasPythonExecutionProjection } from './canvasPythonExecutionProjection';
import {
  applyPythonCodeAuthoringDraft,
  createPythonCodeAuthoringDraft,
  seedPythonCodeNodeMetadata,
} from './pythonCodeAuthoringModel';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

const FIRST = pythonNode('python-a', 'Prepare input', 'result = {"value": inputs["value"]}', {
  value: 21,
});
const SECOND = pythonNode(
  'python-b',
  'Calculate result',
  'result = {"double": inputs["value"] * 2}',
  { value: 21 }
);
const EDGE: CanonicalEdge = {
  id: 'edge-a-b',
  sourceId: FIRST.id,
  targetId: SECOND.id,
  relation: 'custom',
};

describe('buildCanvasPythonExecutionProjection', () => {
  it('closes an explicit root over upstream dependencies and projects one immutable plan graph', () => {
    const projection = buildCanvasPythonExecutionProjection({
      canonicalNodes: [FIRST, SECOND],
      canonicalEdges: [EDGE],
      selectionIntent: { mode: 'explicit', nodeIds: [SECOND.id] },
      workspaceNodeIds: [FIRST.id, SECOND.id],
      executionScope: SCOPE,
    });

    expect(projection.ok).toBe(true);
    if (!projection.ok) return;
    expect(projection.requestedRootNodeIds).toEqual([SECOND.id]);
    expect(projection.derivedDependencyNodeIds).toEqual([FIRST.id]);
    expect(projection.scopedNodeIds).toEqual([FIRST.id, SECOND.id]);
    expect(projection.selection).toEqual({
      mode: 'explicit',
      nodeIds: [FIRST.id, SECOND.id],
    });
    expect(projection.graphSource).toEqual({
      kind: 'generic-graph-v1',
      sourceFamily: 'python-code',
      sourceVersion: '1.0',
      nodes: [
        expect.objectContaining({
          nodeId: FIRST.id,
          stepKind: 'EXECUTE_PYTHON_CODE',
          dependsOn: [],
          stepTypeConfig: expect.objectContaining({
            scope: SCOPE,
            runtimeRef: 'python-runtime:cpython-3-13',
            source: 'result = {"value": inputs["value"]}',
            inputs: { value: 21 },
          }),
        }),
        expect.objectContaining({
          nodeId: SECOND.id,
          stepKind: 'EXECUTE_PYTHON_CODE',
          dependsOn: [FIRST.id],
          stepTypeConfig: expect.objectContaining({
            scope: SCOPE,
            runtimeRef: 'python-runtime:cpython-3-13',
            source: 'result = {"double": inputs["value"] * 2}',
            inputs: { value: 21 },
          }),
        }),
      ],
    });
  });

  it('builds the same signature for the same graph and configuration', () => {
    const args = {
      canonicalNodes: [FIRST, SECOND],
      canonicalEdges: [EDGE],
      selectionIntent: { mode: 'workspace' as const, nodeIds: [] },
      workspaceNodeIds: [FIRST.id, SECOND.id],
      executionScope: SCOPE,
    };

    const first = buildCanvasPythonExecutionProjection(args);
    const second = buildCanvasPythonExecutionProjection(args);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.draftSignature).toBe(second.draftSignature);
  });

  it('changes the draft signature when source changes', () => {
    const changed = pythonNode(
      SECOND.id,
      SECOND.name,
      'result = {"double": inputs["value"] * 3}',
      { value: 21 }
    );
    const original = buildCanvasPythonExecutionProjection({
      canonicalNodes: [FIRST, SECOND],
      canonicalEdges: [EDGE],
      selectionIntent: { mode: 'workspace', nodeIds: [] },
      workspaceNodeIds: [FIRST.id, SECOND.id],
      executionScope: SCOPE,
    });
    const edited = buildCanvasPythonExecutionProjection({
      canonicalNodes: [FIRST, changed],
      canonicalEdges: [EDGE],
      selectionIntent: { mode: 'workspace', nodeIds: [] },
      workspaceNodeIds: [FIRST.id, changed.id],
      executionScope: SCOPE,
    });

    expect(original.ok).toBe(true);
    expect(edited.ok).toBe(true);
    if (original.ok && edited.ok) expect(edited.draftSignature).not.toBe(original.draftSignature);
  });

  it('fails closed for an empty or unavailable explicit selection', () => {
    expect(
      buildCanvasPythonExecutionProjection({
        canonicalNodes: [FIRST],
        canonicalEdges: [],
        selectionIntent: { mode: 'explicit', nodeIds: [] },
        workspaceNodeIds: [FIRST.id],
        executionScope: SCOPE,
      })
    ).toMatchObject({ ok: false });
    expect(
      buildCanvasPythonExecutionProjection({
        canonicalNodes: [FIRST],
        canonicalEdges: [],
        selectionIntent: { mode: 'explicit', nodeIds: ['missing'] },
        workspaceNodeIds: [FIRST.id],
        executionScope: SCOPE,
      })
    ).toMatchObject({ ok: false, message: expect.stringContaining('missing') });
  });

  it('fails closed when the authorized scope is absent', () => {
    expect(
      buildCanvasPythonExecutionProjection({
        canonicalNodes: [FIRST],
        canonicalEdges: [],
        selectionIntent: { mode: 'workspace', nodeIds: [] },
        workspaceNodeIds: [FIRST.id],
      })
    ).toEqual({
      ok: false,
      message: 'Python node Prepare input requires an authorized execution scope.',
    });
  });
});

function pythonNode(
  id: string,
  name: string,
  source: string,
  inputs: Record<string, null | boolean | number | string>
): CanonicalNode {
  const seed: CanonicalNode = {
    id,
    name,
    pluginId: 'dvt.python',
    kind: 'python:code',
    role: 'transform',
    status: 'idle',
    tags: ['python'],
    metadata: seedPythonCodeNodeMetadata(),
  };
  return applyPythonCodeAuthoringDraft(seed, {
    ...createPythonCodeAuthoringDraft(seed)!,
    source,
    inputsJson: JSON.stringify(inputs),
    runtimeRef: 'python-runtime:cpython-3-13',
  });
}
