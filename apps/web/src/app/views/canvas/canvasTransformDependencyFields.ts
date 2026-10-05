/**
 * Owned concern: preserve field identities while canonical dependency layers are rebuilt.
 * @baseline ADR-0064: field IDs identify occurrences, including nested field children.
 * @decision Retain passthrough identities by symbol and nested position, never by label.
 * @consequence Reordering calculations does not duplicate producer IDs or orphan children.
 * @version 1.0.0
 */
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import { createRelationPassthroughFields } from './canvasRelationPassthroughFields';
import { rootFields } from './canvasDerivedOutputExpression';
import type { TransformDependencyModel } from './canvasTransformDependencyModel';

export function retainTransformLayerFields(
  args: Readonly<{
    relationId: string;
    input: readonly DvtSubstraitFieldBindingV1[];
    symbols: readonly string[];
    previous: readonly DvtSubstraitFieldBindingV1[];
    previousSymbols: readonly string[];
    producerIds: ReadonlySet<string>;
  }>
): DvtSubstraitFieldBindingV1[] {
  const fresh = createRelationPassthroughFields(args.relationId, args.input);
  const previousRoots = rootFields(args.previous);
  const identities = new Map<string, string>();
  for (const field of fresh) {
    const previous =
      field.parentFieldId == null
        ? previousRoots[args.previousSymbols.indexOf(args.symbols[field.outputOrdinal]!)]
        : args.previous.find(
            (candidate) =>
              candidate.parentFieldId === identities.get(field.parentFieldId!) &&
              candidate.outputOrdinal === field.outputOrdinal
          );
    identities.set(
      field.fieldId,
      previous != null && !args.producerIds.has(previous.fieldId) ? previous.fieldId : field.fieldId
    );
  }
  return fresh.map((field) => ({
    ...field,
    fieldId: identities.get(field.fieldId)!,
    ...(field.parentFieldId == null ? {} : { parentFieldId: identities.get(field.parentFieldId)! }),
  }));
}

export type TransformPublicOutput = Readonly<{ field: DvtSubstraitFieldBindingV1; symbol: string }>;

export function publishTransformFields(
  model: TransformDependencyModel,
  outputs: readonly TransformPublicOutput[],
  physical: readonly DvtSubstraitFieldBindingV1[],
  mapping: readonly number[]
) {
  const baseIds = new Set(rootFields(model.input.fields).map((field) => field.fieldId));
  return outputs.flatMap(({ field, symbol }, ordinal) => {
    const { operandFieldIds: _operands, ...identity } = field;
    const retained = new Set([field.fieldId]);
    for (const id of retained)
      for (const child of model.root.fields.filter((entry) => entry.parentFieldId === id))
        retained.add(child.fieldId);
    return [
      {
        ...identity,
        outputOrdinal: ordinal,
        sourceFieldId: baseIds.has(symbol) ? symbol : physical[mapping[ordinal]!]!.fieldId,
      },
      ...model.root.fields.filter(
        (child) => child.parentFieldId != null && retained.has(child.fieldId)
      ),
    ];
  });
}
