/** Compose the selected output with a fresh Read; cache and canonical commit stay shared. */
import { clone, equals } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { NamedStructSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { allocateDvtRelationId } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import { deriveRelationSchema, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceRelation, toSourceRelationInput } from './canvasSourceRelation';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanonicalComposition } from './canvasCanonicalComposition';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';
import { nextSourceOccurrenceAlias } from './relational-source-occurrence/sourceOccurrenceAlias';

export async function composeSourceRelation(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    signal?: AbortSignal;
    input: CanvasDvtCompositionInput;
    occurrence?: ReturnType<typeof createSourceRelation>;
    operation: CanvasRelationalOperation;
    predicate?: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>;
  }>
) {
  const target = session.locate(request.relationId, request.expectedRevision);
  const schema = await session.query(request.relationId, request.signal);
  const read =
    request.occurrence == null
      ? createSourceRelation(toSourceRelationInput(request.input), target.nextAnchor)
      : {
          ...request.occurrence,
          relation: clone(RelSchema, request.occurrence.relation),
          binding: { ...request.occurrence.binding, relAnchor: target.nextAnchor },
        };
  if (
    read.relation.relType.case !== 'read' ||
    read.binding.sourceRef == null ||
    read.binding.sourceRef.sourceObjectId !== request.input.sourceRef.sourceObjectId ||
    !hasSameConnectionRef(
      read.binding.sourceRef.connectionRef,
      request.input.sourceRef.connectionRef
    )
  )
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Occurrence must match the selected source.'
    );
  read.relation.relType.value.common!.relAnchor = target.nextAnchor;
  const aliases = session.sourceAliases(request.expectedRevision);
  if (request.occurrence != null && aliases.has(read.binding.displayName))
    throw new SubstraitAnalysisError('invalid_binding', 'Instance alias is already in use.');
  if (request.occurrence == null)
    read.binding.displayName = nextSourceOccurrenceAlias(read.binding.displayName, aliases);
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
