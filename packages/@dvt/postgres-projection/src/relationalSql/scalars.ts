/** Match catalogue identities and validate a target binding before lowering. */
import type { Expression_ScalarFunction } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import type { PostgresAstNode } from '../postgresAst.js';
import { resolveFunctionReference } from '../substrait-profile/functionReference.js';

import { scalarBindings } from './scalarBindings.js';
import { unsupported } from './scope.js';

export function scalarSql(
  plan: Plan,
  fn: Expression_ScalarFunction,
  args: readonly PostgresAstNode[],
  types: readonly Type[]
): PostgresAstNode {
  const reference = resolveFunctionReference(plan, fn.functionReference);
  if (!reference.ok) return unsupported(reference.reason);
  const identity = reference.value;
  const name = identity.name.split(':')[0]!;
  const binding = Object.hasOwn(scalarBindings, name) ? scalarBindings[name]! : undefined;
  const capability = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (entry) =>
      entry.kind === 'standard' &&
      entry.category === 'scalar-function' &&
      entry.profileStatus === 'supported-profile' &&
      entry.identity.sourceKind === 'simple-extension' &&
      entry.identity.urn === identity.urn &&
      entry.identity.name === name
  );
  if (
    binding == null ||
    capability?.kind !== 'standard' ||
    identity.urn !== `extension:io.substrait:${binding.family}`
  )
    return unsupported('Scalar function has no admitted PostgreSQL binding.');
  const options = capability.invocation?.options ?? [];
  if (
    identity.name !== (capability.invocation?.signature ?? binding.signature) ||
    args.length < binding.minimum ||
    (binding.maximum != null && args.length > binding.maximum) ||
    !binding.accepts(fn, types) ||
    fn.options.length !== options.length ||
    fn.options.some(
      (option, ordinal) =>
        option.name !== options[ordinal]?.name ||
        option.preference.join() !== options[ordinal]?.preference.join()
    ) ||
    fn.outputType?.kind.case !== binding.output ||
    fn.outputType.kind.value.typeVariationReference !== 0 ||
    fn.outputType.kind.value.nullability !==
      (binding.required ? Type_Nullability.REQUIRED : Type_Nullability.NULLABLE)
  )
    return unsupported('Scalar invocation differs from the admitted signature.');
  return binding.sql(args);
}
