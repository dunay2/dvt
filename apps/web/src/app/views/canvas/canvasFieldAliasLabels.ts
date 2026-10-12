/** Qualify presentation with occurrence aliases, never physical names or input ordinals. */
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

type Field = DvtSubstraitFieldBindingV1;

export function createCanvasFieldAliasLabels(
  sourceOf: (field: Field) => Field | undefined,
  relationAlias: (relationId: string) => string | undefined
): (field: Field) => string {
  const qualifiers = new Map<string, string | undefined>();
  return (field) => {
    let origin = field;
    const path = new Map<string, Field>();
    while (!qualifiers.has(origin.fieldId)) {
      if (path.has(origin.fieldId)) throw new Error('Cyclic field lineage cannot be labelled.');
      path.set(origin.fieldId, origin);
      const source = sourceOf(origin);
      if (source == null) break;
      origin = source;
    }
    const qualifier = qualifiers.get(origin.fieldId) ?? relationAlias(origin.relationId);
    for (const id of path.keys()) qualifiers.set(id, qualifier);
    const name = field.displayName ?? origin.displayName ?? '—';
    return qualifier == null ? name : `${qualifier}.${name}`;
  };
}
