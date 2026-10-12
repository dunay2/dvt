import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import { unsupportedProfile, type ProfileInspection } from './inspection.js';

export type FunctionIdentity = Readonly<{ urn: string; name: string }>;
export type ResolvedFunctionReference = FunctionIdentity & Readonly<{ urnAnchor: number }>;

/** Resolves references, not capability admission. Never selects an ambiguous first match. */
export function resolveFunctionReference(
  plan: Plan,
  functionAnchor: number
): ProfileInspection<ResolvedFunctionReference> {
  const declarations = plan.extensions.flatMap((entry) =>
    entry.mappingType.case === 'extensionFunction' &&
    entry.mappingType.value.functionAnchor === functionAnchor
      ? [entry.mappingType.value]
      : []
  );
  if (declarations.length !== 1) {
    return unsupportedProfile(
      declarations.length === 0 ? 'missing-function-anchor' : 'ambiguous-function-anchor'
    );
  }
  const declaration = declarations[0]!;
  const urnAnchor = declaration.extensionUrnReference;
  const urns = plan.extensionUrns.filter((entry) => entry.extensionUrnAnchor === urnAnchor);
  if (urns.length !== 1) {
    return unsupportedProfile(urns.length === 0 ? 'missing-urn-anchor' : 'ambiguous-urn-anchor');
  }
  return { ok: true, value: { urnAnchor, urn: urns[0]!.urn, name: declaration.name } };
}
