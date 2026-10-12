/** Instance labels are unique within a model; physical names and semantic identities stay intact. */
import {
  CANVAS_AUTHORING_FIELD_LIMITS_V1,
  CanvasHumanNameV1Schema,
  type DvtSubstraitRelationBindingV1,
} from '@dvt/contracts';

export function sourceOccurrenceAliases(
  bindings: readonly DvtSubstraitRelationBindingV1[],
  exceptRelationId?: string
): ReadonlySet<string> {
  return new Set(
    bindings.flatMap((binding) =>
      (binding.sourceRef != null || binding.producerRef != null) &&
      binding.relationId !== exceptRelationId &&
      binding.displayName != null
        ? [binding.displayName.trim()]
        : []
    )
  );
}

export function nextSourceOccurrenceAlias(base: string, occupied: ReadonlySet<string>): string {
  const name = CanvasHumanNameV1Schema.parse(base);
  let alias = name;
  for (let ordinal = 2; occupied.has(alias); ordinal += 1) {
    const suffix = ` ${ordinal}`;
    const budget = CANVAS_AUTHORING_FIELD_LIMITS_V1.humanNameCodePoints - suffix.length;
    // This generates a new label, never truncates an explicitly requested rename.
    alias = `${[...name].slice(0, budget).join('')}${suffix}`;
  }
  return alias;
}
