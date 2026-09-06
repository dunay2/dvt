/** Owned concern: project one canonical Substrait output into an operable, non-persistent expression view. */
import type {
  DvtSubstraitProjection,
  DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitColumnFunctions } from './canvasDvtSubstraitProjection';

export type DvtSubstraitOperableExpression =
  | Readonly<{
      kind: 'field-ref';
      fieldId: string;
      name: string;
      dataType: string;
    }>
  | Readonly<{
      kind: 'literal';
      literalType: 'string' | 'timestamp-tz';
      value: string;
    }>
  | Readonly<{
      kind: 'scalar-function';
      capabilityId: string;
      name: string;
      arguments: readonly [DvtSubstraitOperableExpression];
    }>
  | Readonly<{
      kind: 'row-number';
      orderBy: DvtSubstraitOperableExpression;
    }>;

export type DvtSubstraitOperableOutput = Readonly<{
  fieldId: string;
  alias: string;
  expression: DvtSubstraitOperableExpression;
}>;

function sourceFieldReference(args: {
  draft: DvtSubstraitProjectionDraft;
  projection: DvtSubstraitProjection;
  sourceOrdinal: number;
}): DvtSubstraitOperableExpression | null {
  const sourceRelation = args.draft.sidecar.relations.filter((relation) => relation.sourceRef != null);
  if (sourceRelation.length !== 1) return null;
  const sourceBindings = args.draft.sidecar.fields
    .filter((field) => field.relationId === sourceRelation[0]!.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const field = args.projection.source.fields[args.sourceOrdinal];
  const binding = sourceBindings[args.sourceOrdinal];
  if (
    field == null ||
    binding == null ||
    binding.outputOrdinal !== args.sourceOrdinal ||
    binding.displayName !== field.name
  ) {
    return null;
  }
  return {
    kind: 'field-ref',
    fieldId: binding.fieldId,
    name: field.name,
    dataType: field.dataType,
  };
}

export function projectDvtSubstraitOperableOutput(args: {
  draft: DvtSubstraitProjectionDraft;
  projection: DvtSubstraitProjection;
  fieldId: string;
}): DvtSubstraitOperableOutput | null {
  const output = args.projection.outputs.find((candidate) => candidate.fieldId === args.fieldId);
  if (output == null) return null;
  const calculation = output.calculation;

  let expression: DvtSubstraitOperableExpression | null = null;
  if (calculation?.kind === 'string-literal') {
    expression = { kind: 'literal', literalType: 'string', value: calculation.value };
  } else if (calculation?.kind === 'timestamp-literal') {
    expression = { kind: 'literal', literalType: 'timestamp-tz', value: calculation.value };
  } else if (calculation?.kind === 'row-number') {
    const orderBy = sourceFieldReference({
      draft: args.draft,
      projection: args.projection,
      sourceOrdinal: calculation.orderSourceOrdinal,
    });
    expression = orderBy == null ? null : { kind: 'row-number', orderBy };
  } else if (calculation == null && output.sourceFieldName != null) {
    const sourceOrdinal = args.projection.source.fields.findIndex(
      (field) => field.name === output.sourceFieldName
    );
    expression =
      sourceOrdinal < 0
        ? null
        : sourceFieldReference({ draft: args.draft, projection: args.projection, sourceOrdinal });
    if (expression == null) return null;

    for (const operation of output.operations ?? []) {
      const capability = resolveDvtSubstraitColumnFunctions({
        dataType: expression.kind === 'field-ref' ? expression.dataType : 'string',
        provider: args.projection.source.sourceRef.connectionRef.provider,
      }).find((candidate) => candidate.name === operation);
      if (capability == null) return null;
      expression = {
        kind: 'scalar-function',
        capabilityId: capability.capabilityId,
        name: capability.name,
        arguments: [expression],
      };
    }
  }

  return expression == null
    ? null
    : {
        fieldId: output.fieldId,
        alias: output.name,
        expression,
      };
}
