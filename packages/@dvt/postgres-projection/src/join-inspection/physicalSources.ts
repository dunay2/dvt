/** Validates repeated physical provenance without conflating it with occurrence identity. */
import type { DvtSubstraitNInputJoinProjection } from '../substraitJoinReadModel.js';

export function hasConsistentJoinPhysicalSources(
  inputs: DvtSubstraitNInputJoinProjection['inputs']
): boolean {
  const sources = new Map<string, DvtSubstraitNInputJoinProjection['inputs'][number]>();
  for (const input of inputs) {
    // The owning inspector has already established one exact connection.
    const key = input.sourceRef.sourceObjectId;
    const existing = sources.get(key);
    if (
      existing != null &&
      (existing.schema !== input.schema ||
        existing.table !== input.table ||
        existing.fields.length !== input.fields.length ||
        existing.fields.some((field, index) => {
          const other = input.fields[index]!;
          return (
            field.name !== other.name ||
            field.dataType !== other.dataType ||
            field.nullable !== other.nullable
          );
        }))
    )
      return false;
    sources.set(key, input);
  }
  return true;
}
