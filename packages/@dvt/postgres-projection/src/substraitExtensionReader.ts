import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

const ADMITTED_URNS = new Set([
  'extension:io.substrait:functions_arithmetic',
  'extension:io.substrait:functions_string',
]);

export function hasExactAdmittedExtensions(plan: Plan, usedAnchors: ReadonlySet<number>): boolean {
  const declared = plan.extensions.flatMap((entry) =>
    entry.mappingType.case === 'extensionFunction' ? [entry.mappingType.value] : []
  );
  const urnAnchors = new Set(declared.map(({ extensionUrnReference }) => extensionUrnReference));
  return (
    declared.length === plan.extensions.length &&
    new Set(declared.map(({ functionAnchor }) => functionAnchor)).size === declared.length &&
    declared.every(({ functionAnchor }) => usedAnchors.has(functionAnchor)) &&
    usedAnchors.size === declared.length &&
    plan.extensionUrns.length === urnAnchors.size &&
    plan.extensionUrns.every(
      (entry) => urnAnchors.has(entry.extensionUrnAnchor) && ADMITTED_URNS.has(entry.urn)
    )
  );
}
