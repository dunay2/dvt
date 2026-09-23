import { create } from '@bufbuild/protobuf';
import {
  RelSchema,
  SetRel_SetOp,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import {
  sourceNode,
  sourceRef,
  transformNode,
  edge,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  createDvtSubstraitStringJoinDraft,
  type DvtSubstraitJoinInput,
} from './canvasDvtSubstraitJoinComposition';
import type { CanvasRelationalAnalysisArgs } from './canvasRelationalAnalysis';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasRelationalCompositionTruth } from './canvasRelationalCompositionTruth';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';

function composed(kind: 'join' | 'cross' | 'set'): CanvasRelationalAnalysisArgs {
  const sources = ['alpha', 'beta'].map((name) => sourceNode(name, name));
  const operand = (name: string): DvtSubstraitJoinInput => ({
    source: { nodeId: name, schema: 'public', table: name, sourceRef: sourceRef(name) },
    fields: [`${name}_id`],
    fieldTypes: ['string' as const],
  });
  const draft = createDvtSubstraitStringJoinDraft({
    left: operand('alpha'),
    right: operand('beta'),
    leftFieldName: 'alpha_id',
    rightFieldName: 'beta_id',
    targetNodeId: 'transform',
  });
  const root = draft.plan.relations[0]!.relType;
  if (root.case !== 'root') throw new Error('Expected root');
  const join = root.value.input?.relType;
  if (join?.case !== 'join') throw new Error('Expected join');
  function filtered(input: Rel, id: string): Rel {
    const anchor = Math.max(...draft.sidecar.relations.map((binding) => binding.relAnchor)) + 1;
    draft.sidecar.relations.push({ relationId: id, relAnchor: anchor, displayName: id });
    return create(RelSchema, {
      relType: {
        case: 'filter',
        value: {
          common: { relAnchor: anchor },
          input,
          condition: {
            rexType: { case: 'literal', value: { literalType: { case: 'boolean', value: true } } },
          },
        },
      },
    });
  }
  const left = filtered(join.value.left!, 'filtered-a');
  const right = filtered(join.value.right!, 'filtered-b');
  join.value.left = left;
  join.value.right = right;
  if (kind === 'cross')
    root.value.input = create(RelSchema, {
      relType: { case: 'cross', value: { common: join.value.common, left, right } },
    });
  if (kind === 'set') {
    root.value.input = create(RelSchema, {
      relType: {
        case: 'set',
        value: {
          common: {
            relAnchor: join.value.common!.relAnchor,
            emitKind: { case: 'direct', value: {} },
          },
          inputs: [left, right],
          op: SetRel_SetOp.UNION_ALL,
        },
      },
    });
    // Positional SET has the width of one input, not the concatenated JOIN width.
    root.value.names.splice(1);
    draft.sidecar.fields = draft.sidecar.fields.filter((field) => field.outputOrdinal === 0);
  }
  const schemas = deriveSubstraitSchemas(draft);
  expect(schemas.schemas.get(schemas.index.rootId)).toHaveLength(kind === 'set' ? 1 : 2);
  const node = applyDvtSubstraitSemanticDocument(
    transformNode(),
    encodeDvtSubstraitSemanticDocument(draft)
  );
  return { node, nodes: [...sources, node], edges: sources.map((source) => edge(source.id)) };
}

describe('composition classification over transformed operands', () => {
  it.each([
    ['join', 'inner_join'],
    ['cross', 'cross_join'],
    ['set', 'union_all'],
  ] as const)('recognizes %s independently of either operand shape', (kind, operation) => {
    const args = composed(kind);
    const tree = projectCanvasRelationalTree(args);
    expect(tree.ok).toBe(true);
    expect(resolveCanvasRelationalCompositionTruth(args)).toEqual({
      state: 'canonical',
      connectedInputCount: 2,
      operation,
    });
  });

  it('keeps missing topology explicit without losing the composition identity', () => {
    const args = composed('cross');
    expect(
      resolveCanvasRelationalCompositionTruth({ ...args, edges: args.edges.slice(0, 1) })
    ).toEqual({
      state: 'incomplete',
      connectedInputCount: 1,
      missingInputCount: 1,
      canonicalOperation: 'cross_join',
    });
  });
});
