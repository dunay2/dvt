/** Owned concern: project one canonical Substrait output into an operable, non-persistent expression view. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { inspectDvtSubstraitCalculatedExpression } from './canvasDvtSubstraitCalculatedExpression';
import type {
  DvtSubstraitProjection,
  DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitColumnFunctions } from './canvasDvtSubstraitProjection';

type DvtSubstraitColumnFunction = ReturnType<typeof resolveDvtSubstraitColumnFunctions>[number];

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
      arguments: readonly DvtSubstraitOperableExpression[];
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

function readSourceOrdinal(expression: Expression): number | null {
  if (expression.rexType.case !== 'selection') return null;
  const reference = expression.rexType.value;
  const segment =
    reference.referenceType.case === 'directReference'
      ? reference.referenceType.value.referenceType
      : undefined;
  return reference.rootType.case === 'rootReference' &&
    segment?.case === 'structField' &&
    segment.value.child == null &&
    segment.value.field >= 0
    ? segment.value.field
    : null;
}

function resolveScalarCapability(args: {
  draft: DvtSubstraitProjectionDraft;
  projection: DvtSubstraitProjection;
  functionReference: number;
}): DvtSubstraitColumnFunction | null {
  const declaration = args.draft.plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.functionAnchor === args.functionReference
  );
  if (declaration?.mappingType.case !== 'extensionFunction') return null;
  const signature = declaration.mappingType.value.name;
  const functionName = signature.endsWith(':str') ? signature.slice(0, -':str'.length) : null;
  return functionName == null
    ? null
    : (resolveDvtSubstraitColumnFunctions({
        dataType: 'text',
        provider: args.projection.source.sourceRef.connectionRef.provider,
      }).find((candidate) => candidate.name === functionName) ?? null);
}

function projectCanonicalExpression(args: {
  draft: DvtSubstraitProjectionDraft;
  projection: DvtSubstraitProjection;
  expression: Expression;
}): DvtSubstraitOperableExpression | null {
  const calculated = inspectDvtSubstraitCalculatedExpression(args.draft.plan, args.expression);
  if (calculated?.calculation.kind === 'string-literal') {
    return {
      kind: 'literal',
      literalType: 'string',
      value: calculated.calculation.value,
    };
  }
  if (calculated?.calculation.kind === 'timestamp-literal') {
    return {
      kind: 'literal',
      literalType: 'timestamp-tz',
      value: calculated.calculation.value,
    };
  }
  if (calculated?.calculation.kind === 'row-number') {
    const orderBy = sourceFieldReference({
      draft: args.draft,
      projection: args.projection,
      sourceOrdinal: calculated.calculation.orderSourceOrdinal,
    });
    return orderBy == null ? null : { kind: 'row-number', orderBy };
  }

  const sourceOrdinal = readSourceOrdinal(args.expression);
  if (sourceOrdinal != null) {
    return sourceFieldReference({
      draft: args.draft,
      projection: args.projection,
      sourceOrdinal,
    });
  }

  if (args.expression.rexType.case !== 'scalarFunction') return null;
  const scalar = args.expression.rexType.value;
  const capability = resolveScalarCapability({
    draft: args.draft,
    projection: args.projection,
    functionReference: scalar.functionReference,
  });
  if (capability == null) return null;
  const projectedArguments = scalar.arguments.map((argument) =>
    argument.argType.case === 'value'
      ? projectCanonicalExpression({
          draft: args.draft,
          projection: args.projection,
          expression: argument.argType.value,
        })
      : null
  );
  if (projectedArguments.length === 0 || projectedArguments.some((argument) => argument == null)) {
    return null;
  }
  return {
    kind: 'scalar-function',
    capabilityId: capability.capabilityId,
    name: capability.name,
    arguments: projectedArguments.filter((argument) => argument != null),
  };
}

export function projectDvtSubstraitOperableOutput(args: {
  draft: DvtSubstraitProjectionDraft;
  projection: DvtSubstraitProjection;
  fieldId: string;
}): DvtSubstraitOperableOutput | null {
  const output = args.projection.outputs.find((candidate) => candidate.fieldId === args.fieldId);
  if (output == null) return null;
  const root = args.draft.plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  const emit = project?.case === 'project' ? project.value.common?.emitKind : undefined;
  if (project?.case !== 'project' || emit?.case !== 'emit') return null;

  const sourceFieldCount = args.projection.source.fields.length;
  const mapping = emit.value.outputMapping[output.outputOrdinal];
  if (mapping == null) return null;
  const expression =
    mapping < sourceFieldCount
      ? sourceFieldReference({
          draft: args.draft,
          projection: args.projection,
          sourceOrdinal: mapping,
        })
      : projectCanonicalExpression({
          draft: args.draft,
          projection: args.projection,
          expression: project.value.expressions[mapping - sourceFieldCount]!,
        });

  return expression == null
    ? null
    : {
        fieldId: output.fieldId,
        alias: output.name,
        expression,
      };
}
