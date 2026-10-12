/**
 * Owned concern: revalidate changed operand types with the existing admitted scalar catalogue.
 * @baseline ADR-0064: declared protobuf result types do not prove invocation compatibility.
 * @decision Reuse the canonical builder and require identical invocation semantics.
 * @consequence Retyping preserves URN, arguments and options or rejects the entire edit.
 * @version 1.0.0
 */
import { clone, equals } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_ScalarFunctionSchema,
  type Expression,
  type Expression_ScalarFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import { deriveExpressionSchema, type SchemaField } from '@dvt/substrait-analysis';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveFunctionReference,
  type DvtSubstraitColumnFunction,
} from '@dvt/postgres-projection';
import { buildDvtSubstraitScalarFunction } from './canvasDvtSubstraitScalarFunction';
import { derivedOutputDataType } from './canvasDerivedOutputExpression';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';

type FunctionIdentity = Readonly<{ urn: string; name: string }>;

function matchesIdentity(
  capability: DvtSubstraitColumnFunction,
  identity: FunctionIdentity
): boolean {
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (item) => item.entryId === capability.capabilityId
  );
  return (
    entry?.kind === 'standard' &&
    entry.identity.sourceKind === 'simple-extension' &&
    entry.identity.urn === identity.urn &&
    (entry.overloads?.some((overload) => overload.signature === identity.name) ??
      capability.signature === identity.name)
  );
}

/** Enum invocations may contain builder-owned trailing values; full reconstruction must match. */
function authoringOperands(fn: Expression_ScalarFunction): readonly (readonly Expression[])[] {
  const values = fn.arguments.flatMap((argument) =>
    argument.argType.case === 'value' ? [argument.argType.value] : []
  );
  return values.length === fn.arguments.length
    ? [values]
    : values.map((_, ordinal) => values.slice(0, ordinal + 1));
}

function tryRetypeScalar(
  fn: Expression_ScalarFunction,
  identity: FunctionIdentity,
  operands: readonly Expression[],
  inputs: readonly SchemaField[],
  plan: Plan,
  provider: string
): boolean {
  const dataTypes = operands.map(
    (operand) =>
      derivedOutputDataType(deriveExpressionSchema(operand, inputs).type) ?? 'unsupported'
  );
  const capability = resolveDvtSubstraitColumnFunctions({
    dataTypes,
    provider,
    resolution: 'complete',
  }).find((candidate) => matchesIdentity(candidate, identity));
  if (capability == null) return false;
  // Speculative function declarations are private; never clone the relational Plan tree.
  const declarations = clone(PlanSchema, { ...plan, relations: [] });
  const replacement = buildDvtSubstraitScalarFunction({
    plan: declarations,
    provider,
    operands,
    dataTypes,
    capabilityId: capability.capabilityId,
  })?.rexType;
  if (replacement?.case !== 'scalarFunction') return false;
  const { functionReference, outputType } = replacement.value;
  if (
    !equals(
      Expression_ScalarFunctionSchema,
      { ...fn, functionReference, outputType },
      replacement.value
    )
  )
    return false;
  fn.functionReference = functionReference;
  fn.outputType = outputType;
  plan.extensions = declarations.extensions;
  plan.extensionUrns = declarations.extensionUrns;
  return true;
}

function retypeScalar(
  fn: Expression_ScalarFunction,
  inputs: readonly SchemaField[],
  plan: Plan,
  provider: string
): void {
  const identity = resolveFunctionReference(plan, fn.functionReference);
  if (
    identity.ok &&
    authoringOperands(fn).some((operands) =>
      tryRetypeScalar(fn, identity.value, operands, inputs, plan, provider)
    )
  )
    return;
  throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.typeConflict);
}

export function retypeTransformExpression(
  expression: Expression,
  inputs: readonly SchemaField[],
  plan: Plan,
  provider: string
): Expression {
  const result = clone(ExpressionSchema, expression);
  const declarations = clone(PlanSchema, { ...plan, relations: [] });
  const nodes: Expression[] = [];
  const pending: unknown[] = [result];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node == null || typeof node !== 'object') continue;
    if ('$typeName' in node && node.$typeName === 'substrait.Expression')
      nodes.push(node as Expression);
    pending.push(...Object.values(node));
  }
  for (const node of nodes.reverse()) {
    if (node.rexType.case === 'scalarFunction')
      retypeScalar(node.rexType.value, inputs, declarations, provider);
  }
  plan.extensions = declarations.extensions;
  plan.extensionUrns = declarations.extensionUrns;
  return result;
}
