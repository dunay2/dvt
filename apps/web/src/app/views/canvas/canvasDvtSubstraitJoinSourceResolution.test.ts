import { describe, expect, it } from 'vitest';
import { sourceNode, transformNode, edge } from './CanvasRelationalTreeWorkbench.test-support';
import { resolveDvtSubstraitJoinEntry } from './canvasDvtSubstraitJoinSourceResolution';
import { createCanvasDvtInitialJoinDraft } from './canvasDvtInitialJoinModel';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

function graph(): {
  targetNode: ReturnType<typeof transformNode>;
  nodes: ReturnType<typeof sourceNode>[];
  edges: ReturnType<typeof edge>[];
} {
  const targetNode = transformNode();
  const nodes = [sourceNode('a', 'one'), sourceNode('b', 'two'), targetNode];
  const edges = [edge('a'), edge('b')];
  return { targetNode, nodes, edges };
}

describe('initial JOIN graph resolution', () => {
  it('resolves typed physical inputs independently of node and edge order', () => {
    const args = graph();
    const before = structuredClone(args);
    const entry = resolveDvtSubstraitJoinEntry(args)!;
    expect(entry.inputs.map((input) => input.nodeId)).toEqual(['a', 'b']);
    expect(
      entry.inputs.every((input) => input.fields.every((field) => field.joinDataType === 'string'))
    ).toBe(true);
    expect(
      resolveDvtSubstraitJoinEntry({
        ...args,
        nodes: [...args.nodes].reverse(),
        edges: [...args.edges].reverse(),
      })
    ).toEqual(entry);
    expect(args).toEqual(before);
  });

  it('checks persisted source provenance and schemas, not relation IDs encoded from node names', () => {
    const args = graph();
    const entry = resolveDvtSubstraitJoinEntry(args)!;
    const draft = createCanvasDvtInitialJoinDraft(entry.inputs, entry.pair, entry.targetNodeId)!;
    args.targetNode = applyDvtSubstraitSemanticDocument(
      args.targetNode,
      encodeDvtSubstraitSemanticDocument(draft)
    );
    expect(
      resolveDvtSubstraitJoinEntry({ ...args, requirePersistedAuthority: true })
    ).not.toBeNull();
    args.nodes[0] = sourceNode('a', 'changed-table');
    expect(resolveDvtSubstraitJoinEntry({ ...args, requirePersistedAuthority: true })).toBeNull();
  });

  it.each([
    'missing-edge',
    'ambiguous-input',
    'connection',
    'unsupported-type',
    'wrong-target',
  ] as const)('rejects invalid initial graph: %s', (fault) => {
    const args = graph();
    if (fault === 'missing-edge') args.edges.pop();
    if (fault === 'ambiguous-input') {
      args.nodes.push(sourceNode('c', 'third'));
      args.edges.push(edge('c'));
    }
    if (fault === 'connection')
      args.nodes[1] = {
        ...args.nodes[1]!,
        metadata: {
          ...args.nodes[1]!.metadata,
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'other',
              provider: 'postgres',
            },
            sourceObjectId: 'public.two',
          },
        },
      };
    if (fault === 'unsupported-type')
      args.nodes[1] = {
        ...args.nodes[1]!,
        metadata: { ...args.nodes[1]!.metadata, columns: [{ name: 'id', type: 'unknown' }] },
      };
    if (fault === 'wrong-target') args.targetNode = sourceNode('transform', 'source');
    expect(resolveDvtSubstraitJoinEntry(args)).toBeNull();
  });
});
