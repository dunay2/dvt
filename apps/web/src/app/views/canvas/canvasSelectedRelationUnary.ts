/** Resolve and commit a unary edit through the existing revisioned analysis boundary. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { allocateDvtRelationId } from '@dvt/contracts';
import {
  SubstraitAnalysisError,
  type RelationChangeSet,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createRelationPassthroughFields } from './canvasRelationPassthroughFields';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';

export type SelectedUnaryRequest = Readonly<{
  intent: 'insert' | 'edit';
  relationId: string;
  expectedRevision: number;
  signal?: AbortSignal;
}>;

export async function prepareSelectedRelationUnary(
  session: CanvasRelationAnalysisSession,
  request: SelectedUnaryRequest,
  operator: 'filter' | 'sort' | 'fetch' | 'aggregate' | 'project'
) {
  request.signal?.throwIfAborted();
  const target = session.locate(request.relationId, request.expectedRevision);
  const editing = request.intent === 'edit';
  if (editing && target.relation.relType.case !== operator)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'The selected operator has changed.',
      request.relationId
    );
  const inputId = editing ? target.inputs[0]! : request.relationId;
  const [schema] = await Promise.all([
    session.query(inputId, request.signal),
    ...(editing ? [session.query(request.relationId, request.signal)] : []),
  ]);
  request.signal?.throwIfAborted();
  const input = session.locate(inputId, request.expectedRevision);
  const binding = editing
    ? target.binding
    : {
        relationId: allocateDvtRelationId(),
        relAnchor: target.nextAnchor,
        displayName: operator,
      };
  return {
    request,
    target,
    input,
    schema: schema!,
    binding,
    fields: editing
      ? target.fields
      : createRelationPassthroughFields(binding.relationId, schema!.bindings),
  };
}

export async function commitSelectedRelationUnary(
  session: CanvasRelationAnalysisSession,
  prepared: Awaited<ReturnType<typeof prepareSelectedRelationUnary>>,
  relation: Rel,
  extensions?: RelationChangeSet['extensions']
): Promise<SubstraitDocument> {
  const { request, binding, fields } = prepared;
  return commitSelectedRelation(session, {
    ...request,
    replacement: { relation, binding, fields },
    extensions,
    createdInputs: new Map(
      request.intent === 'insert' ? [[binding.relationId, [prepared.input.binding.relationId]]] : []
    ),
  });
}
