/** Insert a dataset passthrough ProjectRel through the shared selected-relation boundary. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  commitSelectedRelationUnary,
  prepareSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';

export async function insertSelectedRelationTransform(
  session: CanvasRelationAnalysisSession,
  request: Omit<SelectedUnaryRequest, 'intent'>
) {
  const prepared = await prepareSelectedRelationUnary(
    session,
    { ...request, intent: 'insert' },
    'project'
  );
  const relation = create(RelSchema, {
    relType: {
      case: 'project',
      value: {
        common: { relAnchor: prepared.binding.relAnchor },
        input: prepared.input.relation,
      },
    },
  });
  const document = await commitSelectedRelationUnary(session, prepared, relation);
  return { document, relationId: prepared.binding.relationId };
}
