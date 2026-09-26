/** Initialize a consumer from the connected model's canonical output, preserving its subtree. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import {
  prepareSelectedRelationUnary,
  commitSelectedRelationUnary,
} from './canvasSelectedRelationUnary';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

export async function initializeConnectedModelProjection(args: {
  target: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
}): Promise<CanonicalNode | null> {
  const incoming = new Set(
    args.edges.filter((edge) => edge.targetId === args.target.id).map((edge) => edge.sourceId)
  );
  if (incoming.size !== 1) return null;
  const producer = args.nodes.find((node) => incoming.has(node.id));
  if (producer?.pluginId !== 'dvt' || producer.kind !== 'dvt:transform') return null;
  const session = new CanvasRelationAnalysisSession(args.target.id);
  try {
    if (readDvtTransformAuthoringAuthority(args.target) != null) return null;
    session.receive(resolveCanvasSubstraitGraphBindings({ ...args, node: producer }).document);
    const prepared = await prepareSelectedRelationUnary(
      session,
      {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
      },
      'project'
    );
    const document = await commitSelectedRelationUnary(
      session,
      prepared,
      create(RelSchema, {
        relType: {
          case: 'project',
          value: {
            common: {
              relAnchor: prepared.binding.relAnchor,
              emitKind: {
                case: 'emit',
                value: {
                  outputMapping: prepared.schema.fields.map((_, ordinal) => ordinal),
                },
              },
            },
            input: prepared.input.relation,
            expressions: [],
          },
        },
      })
    );
    return applyDvtSubstraitSemanticDocument(
      args.target,
      encodeDvtSubstraitSemanticDocument(document)
    );
  } catch {
    // An incomplete producer remains a dependency in the draft, never a fabricated output.
    return null;
  } finally {
    session.dispose();
  }
}
