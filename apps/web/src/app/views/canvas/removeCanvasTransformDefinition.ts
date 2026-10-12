/**
 * Owned concern: remove an unreferenced Transform definition through the canonical mutation rail.
 * @baseline ADR-0064: hiding a public field does not delete its canonical calculation.
 * @decision Reject live consumers, then rebuild the remaining dependency layers atomically.
 * @consequence Public identities survive while obsolete internal stages are removed, not orphaned.
 * @version 1.0.0
 */
import { clone } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';
import { transformExpressionDependencies } from './canvasTransformExpressionReferences';
import { buildTransformDependencyPlan } from './canvasTransformDependencyPlan';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';
import { rootFields } from './canvasDerivedOutputExpression';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';

export async function removeCanvasTransformDefinition(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    definitionId: string;
    signal?: AbortSignal;
  }>
) {
  request.signal?.throwIfAborted();
  const root = session.locate(request.relationId, request.expectedRevision);
  if (root.relation.relType.case !== 'project' || root.binding.authoringOwnerRelationId != null)
    throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
  const model = readCanvasTransformDependencyModel(root, (id) =>
    session.locate(id, request.expectedRevision)
  );
  const removed = model.definitions.find((definition) => definition.id === request.definitionId);
  if (removed == null)
    throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
  const definitions = model.definitions.filter((definition) => definition !== removed);
  const consumers = definitions.filter((definition) =>
    transformExpressionDependencies(definition.expression, definition.inputIds).includes(removed.id)
  );
  if (consumers.length > 0)
    throw new TransformDependencyError(
      TRANSFORM_DEPENDENCY_REJECTION.referenced,
      consumers.map(
        (definition) =>
          definition.output?.displayName ?? definition.binding.displayName ?? definition.id
      )
    );
  const input = await session.query(model.input.binding.relationId, request.signal);
  const outputs = rootFields(root.fields)
    .map((field) => ({ field, symbol: model.outputIds[field.outputOrdinal]! }))
    .filter((output) => output.symbol !== removed.id);
  const plan = clone(PlanSchema, { ...root.plan, relations: [] });
  const changes = buildTransformDependencyPlan({
    model,
    definitions,
    outputs,
    inputSchema: input.fields,
    plan,
    provider: session.executionProvider(request.expectedRevision),
    nextAnchor: root.nextAnchor,
  });
  return commitSelectedRelation(session, {
    ...request,
    intent: 'edit',
    ...changes,
    extensions: plan,
  });
}
