import { describe, expect, it } from 'vitest';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitCrossDraft,
  createDvtSubstraitMixedCrossDraft,
} from './canvasDvtSubstraitCrossComposition';
import { resolveCanvasRelationalTreeAuthoringCandidates } from './canvasRelationalTreeAuthoringModel';
import { sourceNode, transformNode, edge } from './CanvasRelationalTreeWorkbench.test-support';

describe('CROSS append admission', () => {
  const nodes = ['a', 'b', 'c', 'd'].map((name) => sourceNode(name, name));
  const transform = transformNode();
  const edges = nodes.map((node) => edge(node.id));
  const inputs = resolveCanvasDvtCompositionInputs({
    targetNodeId: transform.id,
    nodes: [...nodes, transform],
    edges,
  });
  const join = createDvtSubstraitJoinDraft({
    left: inputs[0]!,
    right: inputs[1]!,
    targetNodeId: transform.id,
    joinType: JoinRel_JoinType.LEFT,
  });

  it.each(['mixed', 'pure'] as const)(
    'admits only executable append for an existing %s CROSS',
    (shape) => {
      const draft =
        shape === 'mixed'
          ? createDvtSubstraitMixedCrossDraft(join, inputs[2]!)
          : createDvtSubstraitCrossDraft({ inputs: inputs.slice(0, 3) });
      const before = globalThis.structuredClone(draft);
      const candidates = resolveCanvasRelationalTreeAuthoringCandidates({
        operation: 'cross_join',
        inputs,
        selectedInputIds: ['a', 'b', 'c'],
        joinDraft: draft,
        targetNodeId: transform.id,
        nodes: [...nodes, transform],
        edges,
      });
      expect(candidates.find((candidate) => candidate.nodeId === 'd')).toMatchObject({
        selectable: shape === 'pure',
        reason: shape === 'pure' ? null : 'semantically-unavailable',
      });
      expect(draft).toEqual(before);
    }
  );
});
