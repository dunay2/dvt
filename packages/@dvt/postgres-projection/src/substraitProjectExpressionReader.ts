import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import { readCalculatedExpression } from './substraitCalculatedExpressionReader.js';
import type { DvtCalculatedExpression } from './substraitProjectionReadModel.js';

const STRING_FUNCTION_URN = 'extension:io.substrait:functions_string';

export type ProjectExpression =
  | Readonly<{ sourceOrdinal: number; operations: readonly string[] }>
  | Readonly<{ calculation: DvtCalculatedExpression }>;

export function readProjectExpression(
  plan: Plan,
  expression: Expression,
  sourceFieldCount: number,
  usedFunctionAnchors: Set<number>
): ProjectExpression | null {
  const calculated = readCalculatedExpression(plan, expression);
  if (calculated != null) {
    calculated.functionAnchors.forEach((anchor) => usedFunctionAnchors.add(anchor));
    return { calculation: calculated.calculation };
  }
  const operations: string[] = [];
  let current = expression;
  while (current.rexType.case === 'scalarFunction') {
    const fn = current.rexType.value;
    const declaration = plan.extensions.find(
      (entry) =>
        entry.mappingType.case === 'extensionFunction' &&
        entry.mappingType.value.functionAnchor === fn.functionReference
    );
    if (declaration?.mappingType.case !== 'extensionFunction') return null;
    const value = declaration.mappingType.value;
    const urn = plan.extensionUrns.find(
      (entry) => entry.extensionUrnAnchor === value.extensionUrnReference
    )?.urn;
    const name = value.name.endsWith(':str') ? value.name.slice(0, -4) : null;
    const supported = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
      (entry) =>
        entry.kind === 'standard' &&
        entry.category === 'scalar-function' &&
        entry.profileStatus === 'supported-profile' &&
        entry.identity.sourceKind === 'simple-extension' &&
        entry.identity.urn === STRING_FUNCTION_URN &&
        entry.identity.name === name
    );
    const argument = fn.arguments[0]?.argType;
    if (
      !supported ||
      urn !== STRING_FUNCTION_URN ||
      fn.arguments.length !== 1 ||
      argument?.case !== 'value' ||
      fn.options.length !== 0 ||
      fn.outputType?.kind.case !== 'string' ||
      fn.outputType.kind.value.typeVariationReference !== 0 ||
      fn.outputType.kind.value.nullability !== Type_Nullability.NULLABLE
    ) {
      return null;
    }
    usedFunctionAnchors.add(fn.functionReference);
    operations.push(name!);
    current = argument.value;
  }
  if (current.rexType.case !== 'selection') return null;
  const reference = current.rexType.value;
  const segment =
    reference.referenceType.case === 'directReference'
      ? reference.referenceType.value.referenceType
      : undefined;
  if (
    reference.rootType.case !== 'rootReference' ||
    segment?.case !== 'structField' ||
    segment.value.child != null ||
    segment.value.field < 0 ||
    segment.value.field >= sourceFieldCount
  ) {
    return null;
  }
  return { sourceOrdinal: segment.value.field, operations: operations.reverse() };
}
