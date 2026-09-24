import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { toJson } from '@bufbuild/protobuf';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import type { IndexedRelation } from './relationIndex.js';
import { localRelation } from './relationMessage.js';

export function fingerprintEnvironment(plan: Plan): string {
  return sha256HexUtf8(jcsCanonicalize(toJson(PlanSchema, { ...plan, relations: [] })));
}

/** Merkle dependency fingerprint. Display-only relation aliases do not alter result semantics. */
export function fingerprintRelation(
  entry: IndexedRelation,
  inputs: readonly string[],
  environment: string,
  rootNames?: readonly string[]
): string {
  return sha256HexUtf8(
    jcsCanonicalize({
      environment,
      rootNames: rootNames ?? null,
      relation: toJson(RelSchema, localRelation(entry.relation)),
      source: entry.binding.sourceRef ?? null,
      fields: entry.fields.map(({ description: _description, ...field }) => field),
      inputs,
    })
  );
}
