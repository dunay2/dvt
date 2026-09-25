/** Compose the selected output with a fresh Read; cache and canonical commit stay shared. */
import { equals } from '@bufbuild/protobuf';
import { NamedStructSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { allocateDvtRelationId } from '@dvt/contracts';
import { deriveRelationSchema, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceRelation, toSourceRelationInput } from './canvasSourceRelation';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanonicalComposition } from './canvasCanonicalComposition';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';

export async function composeSourceRelation(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    signal?: AbortSignal;
    input: CanvasDvtCompositionInput;
    operation: CanvasRelationalOperation;
    predicate?: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>;
  }>
) {
  const target = session.locate(request.relationId, request.expectedRevision);
  const schema = await session.query(request.relationId, request.signal);
  const read = createSourceRelation(toSourceRelationInput(request.input), target.nextAnchor);
  for (const id of session.matchingSources(request.input.sourceRef, request.expectedRevision)) {
    const prior = session.locate(id, request.expectedRevision).relation.relType;
    const next = read.relation.relType;
    if (
      prior.case !== 'read' ||
      next.case !== 'read' ||
      !equals(NamedStructSchema, prior.value.baseSchema!, next.value.baseSchema!) ||
      JSON.stringify(prior.value.readType) !== JSON.stringify(next.value.readType)
    )
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Repeated occurrences must retain their physical source schema.',
        id
      );
  }
  const readSchema = deriveRelationSchema({ ...read, inputs: [], consumers: [] }, []);
  const binding = {
    relationId: allocateDvtRelationId(),
    relAnchor: target.nextAnchor + 1,
    displayName: request.operation,
  };
  const right = read.fields.find(
    (field) => field.displayName === request.predicate?.rightFieldName
  );
  const built = createCanonicalComposition({
    plan: target.plan,
    binding,
    operation: request.operation,
    inputs: [target, read],
    schemas: [schema.fields, readSchema],
    ...(request.predicate == null || right == null
      ? {}
      : {
          predicate: {
            leftFieldId: request.predicate.leftSourceFieldId,
            rightFieldId: right.fieldId,
          },
        }),
  });
  return commitSelectedRelation(session, {
    ...request,
    intent: 'insert',
    replacement: built,
    dependencies: [read],
    extensions: built.extensions,
    createdInputs: new Map([
      [binding.relationId, [target.binding.relationId, read.binding.relationId]],
      [read.binding.relationId, []],
    ]),
  });
}
