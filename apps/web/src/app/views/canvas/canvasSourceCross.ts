/** CROSS composes typed occurrences with the same canonical builder used for transformed inputs. */
import { allocateDvtRelationId } from '@dvt/contracts';
import { deriveRelationSchema, type RelationChangeSet } from '@dvt/substrait-analysis';
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import { createCanonicalComposition } from './canvasCanonicalComposition';
import { createSourceRelation, toSourceRelationInput } from './canvasSourceRelation';
import { createSourceDocument, createSourcePlan } from './canvasSourceDocument';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';

export function createSourceCross(inputs: readonly CanvasDvtCompositionInput[]) {
  const first = inputs[0];
  if (first == null || inputs.length < 2) throw new Error('CROSS requires at least two inputs.');
  if (
    inputs.some(
      (input) => !hasSameConnectionRef(first.sourceRef.connectionRef, input.sourceRef.connectionRef)
    )
  )
    throw new Error('Inputs must use the same execution connection.');
  const reads = inputs.map((input, port) =>
    createSourceRelation(toSourceRelationInput(input), port + 1)
  );
  const entries: RelationChangeSet['upserts'][number][] = [...reads];
  const schemas = reads.map((read) =>
    deriveRelationSchema({ ...read, inputs: [], consumers: [] }, [])
  );
  const plan = createSourcePlan();
  let result: RelationChangeSet['upserts'][number] = reads[0]!;
  let schema = schemas[0]!;
  for (let port = 1; port < reads.length; port += 1) {
    const previousId = result.binding.relationId;
    result = createCanonicalComposition({
      plan,
      operation: 'cross_join',
      binding: {
        relationId: allocateDvtRelationId(),
        relAnchor: entries.length + 1,
        displayName: 'cross_join',
      },
      inputs: [result, reads[port]!],
      schemas: [schema, schemas[port]!],
    });
    schema = deriveRelationSchema(
      { ...result, inputs: [previousId, reads[port]!.binding.relationId], consumers: [] },
      [schema, schemas[port]!]
    );
    entries.push(result);
  }
  return createSourceDocument(entries, result, plan);
}
