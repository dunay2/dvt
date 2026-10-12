/**
 * One identity per addressable Read schema field; never infer or repair identities.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Share complete Read field coverage between persistence and schema derivation.
 * @consequence Missing or extra identities fail closed without migration or positional repair.
 * @version 1.0.0
 */
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

import type { DvtSubstraitHierarchyFieldV1 } from './DvtSubstraitFieldBindingHierarchy.v1.js';

export function validateDvtSubstraitReadFieldCoverageV1(
  types: readonly Type[],
  fields: readonly DvtSubstraitHierarchyFieldV1[]
): string | null {
  const error = 'A Read must have exactly one stable identity binding for each schema field.';
  const children = new Map<string | undefined, Map<number, DvtSubstraitHierarchyFieldV1>>();
  const identities = new Set<string>();
  for (const field of fields) {
    const siblings = children.get(field.parentFieldId) ?? new Map();
    if (
      identities.has(field.fieldId) ||
      siblings.has(field.outputOrdinal) ||
      !Number.isInteger(field.outputOrdinal) ||
      field.outputOrdinal < 0
    )
      return error;
    identities.add(field.fieldId);
    siblings.set(field.outputOrdinal, field);
    children.set(field.parentFieldId, siblings);
  }
  let covered = 0;
  const pending: { parent?: string; types: readonly Type[] }[] = [{ types }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    const siblings = children.get(current.parent);
    if ((siblings?.size ?? 0) !== current.types.length) return error;
    for (let ordinal = 0; ordinal < current.types.length; ordinal += 1) {
      const field = siblings?.get(ordinal);
      if (field == null) return error;
      covered += 1;
      const kind = current.types[ordinal]!.kind;
      if (kind.case === 'struct') pending.push({ parent: field.fieldId, types: kind.value.types });
      else if (children.has(field.fieldId)) return error;
    }
  }
  return covered === fields.length ? null : error;
}
