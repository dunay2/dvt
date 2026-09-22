import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import { countProfile } from './count.js';
import { resolveFunctionReference, type FunctionIdentity } from './functionReference.js';
import { unsupportedProfile, type ProfileInspection } from './inspection.js';
import type { FunctionProfile, ProfileFunction } from './invocation.js';
import { rowNumberProfile } from './rowNumber.js';

/** Executable bindings only. Semantic support remains owned by the contracts catalogue. */
export const functionProfiles = [
  countProfile,
  rowNumberProfile,
] as const satisfies readonly FunctionProfile[];

function profileKey(kind: ProfileFunction['$typeName'], identity: FunctionIdentity): string {
  return JSON.stringify([kind, identity.urn, identity.name]);
}

const inspectors = new Map<string, FunctionProfile>(
  functionProfiles.map((profile) => [profileKey(profile.kind, profile.identity), profile])
);

export function inspectFunctionProfile(
  plan: Plan,
  fn: ProfileFunction
): ProfileInspection<FunctionProfile> {
  const reference = resolveFunctionReference(plan, fn.functionReference);
  if (!reference.ok) return reference;
  const profile = inspectors.get(profileKey(fn.$typeName, reference.value));
  if (profile == null) return unsupportedProfile('unsupported-function-identity');
  const supported = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
    (entry) =>
      entry.kind === 'standard' &&
      entry.category === profile.category &&
      entry.profileStatus === 'supported-profile' &&
      entry.identity.sourceKind === 'simple-extension' &&
      entry.identity.urn === profile.identity.urn &&
      entry.identity.name === profile.identity.name
  );
  if (!supported) return unsupportedProfile('unsupported-catalogue-capability');
  const inspection = profile.inspect(fn);
  return inspection.ok ? { ok: true, value: profile } : inspection;
}
