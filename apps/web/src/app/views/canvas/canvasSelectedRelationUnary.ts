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
import { reconnectSelectedRelation } from './canvasSelectedRelationChange';

export type SelectedUnaryRequest = Readonly<{
  intent: 'insert' | 'edit';
  relationId: string;
  expectedRevision: number;
  signal?: AbortSignal;
}>;

export async function prepareSelectedRelationUnary(
  session: CanvasRelationAnalysisSession,
  request: SelectedUnaryRequest,
  operator: 'filter' | 'sort' | 'fetch'
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

export function commitSelectedRelationUnary(
  session: CanvasRelationAnalysisSession,
  prepared: Awaited<ReturnType<typeof prepareSelectedRelationUnary>>,
  relation: Rel,
  extensions?: RelationChangeSet['extensions']
): SubstraitDocument {
  const { request, binding, fields } = prepared;
  request.signal?.throwIfAborted();
  const reconnected =
    request.intent === 'edit'
      ? { upserts: [] }
      : reconnectSelectedRelation(
          session,
          request.relationId,
          relation,
          binding.relationId,
          request.expectedRevision
        );
  return session.apply({
    expectedRevision: request.expectedRevision,
    removed: [],
    ...reconnected,
    upserts: [{ relation, binding, fields }, ...reconnected.upserts],
    ...(extensions == null ? {} : { extensions }),
  });
}
