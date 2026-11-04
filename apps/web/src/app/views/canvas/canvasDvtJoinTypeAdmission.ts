/** Owned concern: bind physical Canvas metadata to existing canonical JOIN operand types. */
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
export { resolvePostgresInputDataType as resolveCanvasDvtJoinDataType } from '@dvt/postgres-projection';

export function hasCompatibleCanvasDvtJoinFields(
  left: readonly Readonly<{ joinDataType: DvtSubstraitJoinDataType | null }>[],
  right: readonly Readonly<{ joinDataType: DvtSubstraitJoinDataType | null }>[]
): boolean {
  const leftTypes = new Set(left.map((field) => field.joinDataType).filter((type) => type != null));
  return right.some((field) => field.joinDataType != null && leftTypes.has(field.joinDataType));
}

/** Suggest an editable pair, not a key inference or an implicit type conversion. */
export function resolveCanvasDvtJoinFieldPair<
  Left extends Readonly<{ name: string; joinDataType: DvtSubstraitJoinDataType | null }>,
  Right extends Readonly<{ name: string; joinDataType: DvtSubstraitJoinDataType | null }>,
>(left: readonly Left[], right: readonly Right[]): Readonly<{ left: Left; right: Right }> | null {
  let fallback: Readonly<{ left: Left; right: Right }> | null = null;
  for (const leftField of left) {
    if (leftField.joinDataType == null) continue;
    for (const rightField of right) {
      if (leftField.joinDataType !== rightField.joinDataType) continue;
      const pair = { left: leftField, right: rightField };
      if (leftField.name === rightField.name) return pair;
      fallback ??= pair;
    }
  }
  return fallback;
}
